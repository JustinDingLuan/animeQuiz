import { supabase } from './supabase.js';

const quizElements = {
  drawQuestionButton:
    document.querySelector('#draw-question-button'),

  status:
    document.querySelector('#quiz-status'),

  content:
    document.querySelector('#quiz-content'),

  hintCount:
    document.querySelector('#quiz-hint-count'),

  hintList:
    document.querySelector('#quiz-hint-list'),

  nextHintButton:
    document.querySelector('#next-hint-button'),

  answerForm:
    document.querySelector('#quiz-answer-form'),

  answerInput:
    document.querySelector('#quiz-answer'),

  quizResult:
    document.querySelector('#quiz-result'),
};

const quizState = {
  question: null,
  visibleHintCount: 0,
  answered: false,
};

async function fiveHintQuestion() {
  // 確認題目有幾題?
  const { count, error: countError } = await supabase
    .from('questions')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('question_type', 'five_hints');

  if (countError) {
    throw countError;
  }

  if (!count) {
    return null;
  }  

  // 選題目
  const randomOffset =
    Math.floor(Math.random() * count);

  const { data: question, error } = await supabase
    .from('questions')
    .select(`
      id,
      question_type,
      answer_type,
      question_hints (
        id,
        hint_order,
        hint_text
      )
    `)
    .eq('question_type', 'five_hints')
    .order('id', { ascending: true })
    .range(randomOffset, randomOffset)
    .single();

  if (error) {
    throw error;
  }

  question.question_hints.sort(
    (firstHint, secondHint) =>
      firstHint.hint_order - secondHint.hint_order
  );

  return question;
}
  

async function drawQuestion() {
  quizElements.drawQuestionButton.disabled = true;
  quizElements.status.textContent = '正在抽取題目……';

  try {
    const question =
      await fiveHintQuestion();

    if (!question) {
      quizElements.status.textContent = '目前沒有可使用的五提示題目';
      return;
    }

    quizState.question = question;
    quizState.visibleHintCount = 1;
    quizState.answered = false;

    quizElements.answerInput.value = '';
    quizElements.answerInput.disabled = false;
    quizElements.quizResult.textContent = '';
    quizElements.content.hidden = false;

    renderQuizHints();

    quizElements.status.textContent =
      '題目抽取完成';
  } catch (error) {
    console.error('抽取題目失敗：', error);

    quizElements.status.textContent =
      `抽取題目失敗：${error.message}`;
  } finally {
    quizElements.drawQuestionButton.disabled = false;
  }
}

function renderQuizHints() {
  quizElements.hintList.replaceChildren();

  const hints =
    quizState.question.question_hints;

  const visibleHints = hints.slice(
    0,
    quizState.visibleHintCount
  );

  for (const hint of visibleHints) {
    const listItem =
      document.createElement('li');

    listItem.textContent = hint.hint_text;

    quizElements.hintList.appendChild(listItem);
  }

  quizElements.hintCount.textContent =
    String(quizState.visibleHintCount);

  quizElements.nextHintButton.disabled =
    quizState.visibleHintCount >= hints.length;
}

function showNextHint() {
  if (!quizState.question || quizState.answered) {
    return;
  }

  const hints =
    quizState.question.question_hints;

  if (
    quizState.visibleHintCount >= hints.length
  ) {
    return;
  }

  quizState.visibleHintCount += 1;

  renderQuizHints();
}

async function checkAnswer(question_id, userAnswer) {
  // const { data, error } = await supabase.rpc(
  //   'check_question_answer',
  //   {
  //     p_question_id: question_id,
  //     p_user_answer: userAnswer,
  //   }
  // );

  // 把 question_id 跟 userAnswer 用 https 的 post method送到後端的 /api/check-answer 來檢查答案
  const response = await fetch('/api/check-answer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      questionId: question_id,
      userAnswer: userAnswer,
    }),
  });

  
  const { isCorrect } = await response.json();
  
  if (!response.ok) {
    throw new Error(`檢查答案失敗：${isCorrect?.message || response.statusText}`);
  }
  
  return isCorrect === true;
}

async function submitQuizAnswer(event) {
  event.preventDefault();
  const userAnswer =
    quizElements.answerInput.value;

  if (!quizState.question || quizState.answered) {
    return;
  }

  console.log({
    questionId: quizState.question.id,
    userAnswer,
  });
  
  try {
    const isCorrect = await checkAnswer(quizState.question.id, userAnswer);
    
    quizElements.quizResult.textContent = isCorrect ? '回答正確！':'回答錯誤！';
    console.log(userAnswer);

    if (isCorrect) {
      quizElements.quizResult.textContent = '回答正確！'
    }
    else {
      quizElements.quizResult.textContent = '回答錯誤！'
      quizElements.answerInput.value = '';
    }
  } 
  catch (error) {
    console.error('檢查答案失敗：', error);
    quizElements.quizResult.textContent = `檢查答案失敗：${error.message}`;
  }  
}

export function initQuiz() {
  quizElements.drawQuestionButton.addEventListener(
    'click',
    drawQuestion
  );

  quizElements.nextHintButton.addEventListener(
    'click',
    showNextHint
  );

  quizElements.answerForm.addEventListener(
    'submit',
    submitQuizAnswer
  );
}
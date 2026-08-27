import './styles.css';
import { supabase } from './supabase.js';

const quizElements = {
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
  
  progress:
  document.querySelector('#quiz-progress'),

  nextQuestionButton:
  document.querySelector('#next-question-button'),
};

const quizState = {
  sessionId: null,

  question: null,
  visibleHintCount: 0,
  answered: false,

  questionCount: 0,
  currentScore: 0,
};


async function apiRequest(url, {method = 'GET', body, headers={}} = {}) {
  const requestOptions = {
    method,
    headers: {
      ...headers,
    },
  };

  if (body !== undefined) {
    requestOptions.body = JSON.stringify(body);
    requestOptions.headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, requestOptions);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.message || response.statusText);
  }

  return result;
}

async function requestQuizSession(questionType, questionCount) {  
  const result = await apiRequest('/api/create-quiz-session', {
    method: 'POST',
    body: {
      questionType,
      questionCount,
    },
  });

  return result;
}

async function startQuiz(questionType, questionCount) {
  try {
    // 看 quiz_session.js 的 createQuizSession
    // 裡面有 session_id、question_count、current_question
    const session = await requestQuizSession(questionType, questionCount);
    // quizElements.status.textContent = '測驗開始！';

    quizState.sessionId = session.session_id;
    quizState.questionCount = questionCount;

    const currentQuestion = session.current_question;
    quizState.question = currentQuestion;    
    quizState.visibleHintCount = 1;
    quizState.answered = false;
    // browser 提供的原生 web storage，不用 import 任何東西
    sessionStorage.setItem('quizSessionId', session.session_id);
    // 清空 list，避免裡面有甚麼奇怪的初始內容
    quizElements.hintList.replaceChildren();

    const hint = document.createElement('li');
    hint.textContent = currentQuestion.hint.hint_text;
    quizElements.hintList.appendChild(hint);
    quizElements.hintCount.textContent = String(currentQuestion.hints_revealed);

    quizElements.progress.textContent = `第1題 / 共${questionCount}題, 目前分數: ${quizState.currentScore}`;
    quizElements.answerInput.value = '';
    quizElements.answerInput.disabled = false;
    quizElements.quizResult.textContent = '';
    quizElements.content.hidden = false;
  } 
  catch (error) {    
    console.error('建立測驗失敗：', error);
  }
}  
// async function fiveHintQuestion() {
//   // 確認題目有幾題?
//   const { count, error: countError } = await supabase
//     .from('questions')
//     .select('id', {
//       count: 'exact',
//       head: true,
//     })
//     .eq('question_type', 'five_hints');

//   if (countError) {
//     throw countError;
//   }

//   if (!count) {
//     return null;
//   }  

//   // 選題目
//   const randomOffset =
//     Math.floor(Math.random() * count);

//   const { data: question, error } = await supabase
//     .from('questions')
//     .select(`
//       id,
//       question_type,
//       answer_type,
//       question_hints (
//         id,
//         hint_order,
//         hint_text
//       )
//     `)
//     .eq('question_type', 'five_hints')
//     .order('id', { ascending: true })
//     .range(randomOffset, randomOffset)
//     .single();

//   if (error) {
//     throw error;
//   }

//   question.question_hints.sort(
//     (firstHint, secondHint) =>
//       firstHint.hint_order - secondHint.hint_order
//   );

//   return question;
// }
  

// async function drawQuestion() {
//   quizElements.drawQuestionButton.disabled = true;
//   quizElements.status.textContent = '正在抽取題目……';

//   try {
//     const question =
//       await fiveHintQuestion();

//     if (!question) {
//       quizElements.status.textContent = '目前沒有可使用的五提示題目';
//       return;
//     }

//     quizState.question = question;
//     quizState.visibleHintCount = 1;
//     quizState.answered = false;

//     quizElements.answerInput.value = '';
//     quizElements.answerInput.disabled = false;
//     quizElements.quizResult.textContent = '';
//     quizElements.content.hidden = false;

//     renderQuizHints();

//     quizElements.status.textContent =
//       '題目抽取完成';
//   } catch (error) {
//     console.error('抽取題目失敗：', error);

//     quizElements.status.textContent =
//       `抽取題目失敗：${error.message}`;
//   } finally {
//     quizElements.drawQuestionButton.disabled = false;
//   }
// }

async function requestNextHint(sessionId) {
  const encodedSessionId = encodeURIComponent(sessionId);
  const result = await apiRequest(`/api/quiz-session/${encodedSessionId}/reveal-next-hint`, {
    method: 'POST',
  });

  return result;
}

async function showNextHint() {
  // 應該設計成可以讓使用者一直回答? 先不放 quizState.answered 的判斷
  if (!quizState.sessionId || !quizState.question) {
    return;
  }

  quizElements.nextHintButton.disabled = true;
  try {
    const result = await requestNextHint(quizState.sessionId);
    if (!result.hint) {
      quizElements.status.textContent = '沒有更多提示了';
      return;
    }
    
    const listItem = document.createElement('li');
    listItem.textContent = result.hint.hint_text;
    quizElements.hintList.appendChild(listItem);
    quizState.visibleHintCount = result.hints_revealed;
    quizElements.hintCount.textContent = String(result.hints_revealed);

    // 如果已經沒有提示可用了，把按鈕 disable 掉
    quizElements.nextHintButton.disabled = !result.has_next_hint;
  }
  catch (error) {
    console.error('取得下一個提示失敗：', error);
    quizElements.status.textContent = `取得下一個提示失敗：${error.message}`;
    // 一般請求錯誤時允許使用者重試。
    quizElements.nextHintButton.disabled = false;
  }
}

async function requestCheckAnswer(sessionId, userAnswer) {
  const encodedSessionId = encodeURIComponent(sessionId);
  const result = await apiRequest(`/api/quiz-session/${encodedSessionId}/check-quiz-answer`, {
    method: 'POST',
    body: {userAnswer}
  });
  return result;
}

async function submitQuizAnswer(event) {
  event.preventDefault();
  const userAnswer =
    quizElements.answerInput.value.trim();

  if (
    !quizState.sessionId ||
    !quizState.question ||
    quizState.answered ||
    !userAnswer
  ) {
    return;
  }
  
  try {
    const result = await requestCheckAnswer(quizState.sessionId, userAnswer);

    if (result.is_correct) {
      quizState.answered = true;
      quizState.currentScore += result.score;
      // 這邊應該要把下一題帶上來?
      // 不用，等按下下一題的時候才要帶上來
      quizElements.progress.textContent = 
      `第${quizState.question.question_order}題 / 共${quizState.questionCount}題, 
      目前分數: ${quizState.currentScore}`;

      quizElements.quizResult.textContent = `回答正確！獲得 ${result.score} 分`;
      quizElements.answerInput.disabled = true;
      quizElements.nextHintButton.disabled = true;
      quizElements.nextQuestionButton.hidden = false;
    }
    else {
      quizElements.quizResult.textContent =
        `回答錯誤！目前答對可獲得 ${result.available_score} 分`;
      quizElements.answerInput.value = '';
    }
  } 
  catch (error) {
    console.error('檢查答案失敗：', error);
    quizElements.quizResult.textContent = `檢查答案失敗：${error.message}`;
  }  
}

async function requestNextQuestion(sessionId) {
  const encodedSessionId = encodeURIComponent(sessionId);
  const result = await apiRequest(`/api/quiz-session/${encodedSessionId}/next-question`, {
    method: 'POST',
  });

  return result;
}

async function nextQuestion() {
  if (!quizState.sessionId) {
    return;
  }

  quizElements.nextQuestionButton.disabled = true;
  try {
    const result = await requestNextQuestion(quizState.sessionId);
    if (!result.current_question) {
      quizElements.status.textContent = '已經沒有下一題了';
      return;
    }
    // 把所有內容都換成下一題，並重置必要內容: 使用者輸入、hint 數量、hint list
    quizState.question = result.current_question;
    quizState.visibleHintCount = 1;
    quizState.answered = false;

    // 直接清空 list，避免裡面有甚麼奇怪的初始內容
    quizElements.hintList.replaceChildren();
    const hint = document.createElement('li');
    hint.textContent = result.current_question.hint.hint_text;
    quizElements.hintList.appendChild(hint);

    quizElements.hintCount.textContent = String(result.current_question.hints_revealed);
    quizElements.progress.textContent =
      `第${quizState.question.question_order}題 / 共${quizState.questionCount}題, 目前分數: ${quizState.currentScore}`;

    quizElements.answerInput.value = '';
    quizElements.nextHintButton.disabled = false;
    quizElements.nextQuestionButton.hidden = true;    
    quizElements.answerInput.disabled = false;

  }
  catch (error) {
    console.error('取得下一題失敗：', error);
    quizElements.status.textContent = `取得下一題失敗：${error.message}`;
  }
  finally {
    quizElements.nextQuestionButton.disabled = false;
  }
}

export function initQuiz(questionType, questionCount) {
  quizElements.nextHintButton.addEventListener(
    'click',
    showNextHint
  );

  quizElements.answerForm.addEventListener(
    'submit',
    submitQuizAnswer
  );

  quizElements.nextQuestionButton.addEventListener(
    'click',
    nextQuestion
  );

  startQuiz(questionType, questionCount);
}

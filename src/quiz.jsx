import './styles.css';
import './quiz.css';
import { useState, useRef, useEffect } from 'react';
import { apiRequest } from './client/apiRequest.js';

const quizModes = {
  five_hints_guess_character: {
    question_type: 'five_hints',
    answer_type: 'character',
  },

  five_hints_guess_anime: {
    question_type: 'five_hints',
    answer_type: 'anime',
  },
}

const quizModeLabels = {
  five_hints_guess_character: '五提示猜角色',
  five_hints_guess_anime: '五提示猜動畫',
}

async function requestQuizSession(quizMode, questionCount) {  
  const result = await apiRequest('/api/create-quiz-session', {
    method: 'POST',
    body: {
      quizMode,
      questionCount,
    },
  });

  return result;
}

export function Quiz({quizMode, questionCount}) { 
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState(null);
  // questionCount 在建立 session 的時候就固定了，不用去更動他
  const [visibleHintCount, setVisibleHintCount] = useState(0);
  // const [answered, setAnswered] = useState(false);

  // const submittingRef = useRef(false);
  // const [isSubmitting, setIsSubmitting] = useState(false);
  // 控制所有按鈕
  const actionLock = useRef(false);
  const [pendingAction, setPendingAction] = useState(null);
  const isBusy = pendingAction !== null;
  
  const [isCorrect, setIsCorrect] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  // 
  const [hints, setHints] = useState([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [resultMessage, setResultMessage] = useState('');
  const [hasNextHint, setHasNextHint] = useState(true);
  const [hasNextQuestion, setHasNextQuestion] = useState(true);

  useEffect(() => {
    async function startQuiz() {
      try {
        resetToEmptyState();

        const session = await requestQuizSession(quizMode, questionCount);
        setSessionId(session.session_id);        

        const currentQuestion = session.current_question;
        setQuestion(currentQuestion);
        setVisibleHintCount(currentQuestion.hints_revealed);
        setHints([currentQuestion.hint.hint_text]);
        
        sessionStorage.setItem('quizSessionId', session.session_id);

      } 
      catch (error) {
        console.error('建立測驗失敗：', error);
      }
    }

    startQuiz();
  }, [quizMode, questionCount]);
  // 一開始的時候拿不到 question，因為 useEffect 還沒跑完，所以先回傳 loading 的資訊給使用者看
  // 等 useEffect 跑完之後，question 就會有值了，畫面就會重新 render
  if (!question) {
    return (
      <main className="quiz-page">
        <section className="quiz-loading" aria-live="polite">
          <span className="quiz-loading-spinner" aria-hidden="true" />
          <p>正在準備題目……</p>
        </section>
      </main>
    );
  }
  

  function resetToEmptyState() {    
    // setAnsered(false);
    // setIsSubmitting(false);        
    setIsCorrect(false);    
    setUserAnswer('');
    setResultMessage('');    
  }

  async function quizAction(actionName, actionFunction) {
    if (actionLock.current) {
      return;
    }

    // 先搶到的動作會先執行，然後把門鎖起來
    actionLock.current = actionName;
    setPendingAction(actionName);
    // 最後再把門鎖打開，讓下一個動作可以執行
    try {
      await actionFunction();
    }
    finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  }

  async function showNextHint() {
    try {
      await quizAction('showNextHint', async () => {
        const result = await requestNextHint(sessionId);
        if (!result.hint) {
          console.log('沒有更多提示了');
          setHasNextHint(false);
          return;
        }
        
        setHints((prevHints) => {return [...prevHints, result.hint.hint_text]});
        setVisibleHintCount(result.hints_revealed);
      });
    } 
    catch (error) {
      console.error('取得下一個提示失敗：', error);
    }
  }

  async function nextQuestion() {
    try {
      await quizAction('nextQuestion', async () => {
        const result = await requestNextQuestion(sessionId);

        if (result.game_over) {
          setHasNextQuestion(false);
          console.log('已經沒有下一題了');
          const encodedSessionId = encodeURIComponent(sessionId);
          window.location.assign(`/gameResult.html?sessionId=${encodedSessionId}`);
          return;
        }
        // 換到下一題的時候記得把 isCorrect 設回 false，不然無法輸入
        resetToEmptyState();
        setQuestion(result.next_question);
        setVisibleHintCount(result.next_question.hints_revealed);      
        setHints([result.next_question.hint.hint_text]);
        setHasNextHint(true);
      }); 
    }
    catch (error) {
      console.error('取得下一題失敗：', error);
    }
  }

  async function submitQuizAnswer(event) {
    event.preventDefault();    
    // if (submittingRef.current) {
    //     return;
    // }
    // submittingRef.current = true;
    // setIsSubmitting(true);

    const normalizedUserAnswer = userAnswer.trim();
    if (!sessionId || !question || !normalizedUserAnswer) {
      console.log('缺少必要的參數', {sessionId, question, normalizedUserAnswer});
      return;
    }

    if (isCorrect) {
      console.log('已經答對了，無法再提交答案');
      return;
    }
    
    try {
      await quizAction('submitQuizAnswer', async () => {
        const result = await requestCheckAnswer(sessionId, normalizedUserAnswer);
        // setResultMessage('');

        if (result.is_correct) {
          setIsCorrect(true);
          setResultMessage(`回答正確！獲得 ${result.score} 分`);
          setCurrentScore(result.current_total_score);
          console.log(`回答正確！獲得 ${result.score} 分`);
        } 
        else {        
          setResultMessage(`回答錯誤！目前答對可獲得 ${result.available_score} 分`);
          setUserAnswer('');
        }
      });
    }
    catch (error) {
      console.error('提交答案失敗：', error);
    }    
  }

  async function skipQuestion() {    
    try {
      await quizAction('skipQuestion', async () => {
        const result = await requestSkipQuestion(sessionId);
        if (result.game_over) {
          setHasNextQuestion(false);
          console.log('已經沒有下一題了');

          const encodedSessionId = encodeURIComponent(sessionId);
          window.location.assign(`/gameResult.html?sessionId=${encodedSessionId}`);

          return;
        }
        // 跟下一題的邏輯一樣，換到下一題的時候記得把 isCorrect 設回 false，不然無法輸入
        resetToEmptyState();
        setHasNextHint(true);
        setVisibleHintCount(result.next_question.hints_revealed);
        setQuestion(result.next_question);
        setHints([result.next_question.hint.hint_text]);      
      });
    }
    catch (error) {
      console.error('跳過題目失敗：', error);
    }
  }

  let selectedMode = quizModes[quizMode];
  return (
    <main className="quiz-page">
      <section className="quiz-shell" aria-labelledby="quiz-title">
        <header className="quiz-header">
          <a className="quiz-back-link" href="/gameEntry.html">
            ← 返回遊戲設定
          </a>

          {/* <p className="quiz-eyebrow">ANIME FIVE HINTS</p> */}
          <h1 id="quiz-title">{quizModeLabels[quizMode]}</h1>

          <div className="quiz-progress-bar" aria-label={`第 ${question.question_order} 題，共 ${questionCount} 題`}>
            <span
              className="quiz-progress-value"
              style={{width: `${(question.question_order / questionCount) * 100}%`}}
            />
          </div>

          <div className="quiz-meta">
            <p>
              第 <strong>{question.question_order}</strong> 題
              <span aria-hidden="true"> / </span>
              共 {questionCount} 題
            </p>
            <p className="quiz-score">目前總分 <strong>{currentScore}</strong></p>
          </div>
        </header>

        <section className="quiz-hints-card" aria-labelledby="quiz-hints-title">
          <div className="quiz-section-heading">
            <div>
              <p className="quiz-section-kicker">逐步揭密</p>
              <h2 id="quiz-hints-title">{selectedMode.answer_type === 'character' ? '角色' : '動畫'}提示</h2>
            </div>
            <span className="quiz-hint-counter">
              {visibleHintCount}<small>/ 5</small>
            </span>
          </div>

          <ol className="quiz-hint-list" aria-live="polite">
          {hints.map((hint, index) => (
            <li
              className="quiz-hint-item"
              data-seal-label={`HINT ${index + 1}`}
              key={`${question.question_order}-${index}`}
            >
              <span>{hint}</span>
            </li>
          ))}
          </ol>

          <button
            className="quiz-button quiz-button-hint"
            type="button"
            onClick={showNextHint}
            disabled={isBusy || !hasNextHint}
          >
            {hasNextHint ? '撕開下一個提示' : '提示已全部揭露'}
          </button>
        </section>

        <form className="quiz-answer-card" onSubmit={submitQuizAnswer}>
          {/* <label htmlFor="quiz-answer">你的答案</label> */}
          <div className="quiz-answer-row">
            <input
              id="quiz-answer"
              value={userAnswer}
              onChange={(event) => setUserAnswer(event.target.value)}
              type="text"
              placeholder="輸入你的答案"
              autoComplete="off"
              disabled={isBusy || isCorrect}
            />
            <button
              className="quiz-button quiz-button-primary"
              type="submit"
              disabled={isBusy || isCorrect || !userAnswer.trim()}
            >
              提交答案
            </button>
          </div>
        </form>

        <p
          className={`quiz-result-message ${isCorrect ? 'is-correct' : 'is-incorrect'}`}
          aria-live="polite"
        >
          {resultMessage}
        </p>
        
        <div className="quiz-footer-action">
          {isCorrect ? (
            <button
              className="quiz-button quiz-button-primary"
              type="button"
              onClick={nextQuestion}
              disabled={isBusy || !hasNextQuestion}
            >
              下一題
            </button>
          ) : (
            <button
              className="quiz-button quiz-button-skip"
              type="button"
              onClick={skipQuestion}
              disabled={isBusy || !hasNextQuestion}
            >
              跳過此題（本題 0 分）
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

async function requestNextHint(sessionId) {
  const encodedSessionId = encodeURIComponent(sessionId);
  const result = await apiRequest(`/api/quiz-session/${encodedSessionId}/reveal-next-hint`, {
    method: 'POST',
  });

  return result;
}

async function requestCheckAnswer(sessionId, userAnswer) {
  const encodedSessionId = encodeURIComponent(sessionId);
  const result = await apiRequest(`/api/quiz-session/${encodedSessionId}/check-quiz-answer`, {
    method: 'POST',
    body: {userAnswer}
  });
  return result;
}

async function requestNextQuestion(sessionId) {
  const encodedSessionId = encodeURIComponent(sessionId);
  const result = await apiRequest(`/api/quiz-session/${encodedSessionId}/next-question`, {
    method: 'POST',
  });

  return result;
}

async function requestSkipQuestion(sessionId) {
  const encodedSessionId = encodeURIComponent(sessionId);
  const result = await apiRequest(`/api/quiz-session/${encodedSessionId}/skip-question`, {
    method: 'POST',
  });

  return result;
}

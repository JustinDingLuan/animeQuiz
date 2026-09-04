import './styles.css';
import './quiz.css';
import { useState, useRef, useEffect } from 'react';
import { apiRequest } from './client/apiRequest.js';


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

export function Quiz({questionType, questionCount}) { 
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState(null);
  // questionCount 在建立 session 的時候就固定了，不用去更動他
  const [visibleHintCount, setVisibleHintCount] = useState(0);
  const [answered, setAnswered] = useState(false);

  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        const session = await requestQuizSession(questionType, questionCount);
        setSessionId(session.session_id);        

        const currentQuestion = session.current_question;
        setQuestion(currentQuestion);
        setVisibleHintCount(currentQuestion.hints_revealed);
        setAnswered(false);
        setCurrentScore(0);
        setUserAnswer('');
        setIsCorrect(false);
        setHasNextHint(true);
        sessionStorage.setItem('quizSessionId', session.session_id);

        setHints([currentQuestion.hint.hint_text]);
      } 
      catch (error) {
        console.error('建立測驗失敗：', error);
      }
    }

    startQuiz();
  }, [questionType, questionCount]);
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

  async function showNextHint() {
    try {
      const result = await requestNextHint(sessionId);
      if (!result.hint) {
        setHasNextHint(false);
        console.log('沒有更多提示了');
        return;
      }
      
      setHints((prevHints) => {return [...prevHints, result.hint.hint_text]});
      setVisibleHintCount(result.hints_revealed);
    } 
    catch (error) {
      console.error('取得下一個提示失敗：', error);
    }
  }

  async function nextQuestion() {
    try {
      const result = await requestNextQuestion(sessionId);

      if (result.game_over) {
        setHasNextQuestion(false);
        console.log('已經沒有下一題了');
        const encodedSessionId = encodeURIComponent(sessionId);
        window.location.assign(`/gameResult.html?sessionId=${encodedSessionId}`);
        return;
      }
      // 換到下一題的時候記得把 isCorrect 設回 false，不然無法輸入
      setIsCorrect(false);
      setHasNextHint(true);
      setQuestion(result.next_question);
      setVisibleHintCount(result.next_question.hints_revealed);
      setAnswered(false);
      setHints([result.next_question.hint.hint_text]);
      setUserAnswer('');
    } 
    catch (error) {
      console.error('取得下一題失敗：', error);
    }
  }

  async function submitQuizAnswer(event) {
    event.preventDefault();    
    if (submittingRef.current) {
        return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);

    const normalizedUserAnswer = userAnswer.trim();
    if (!sessionId || !question || answered || !normalizedUserAnswer) {
      return;
    }
    
    try {
      const result = await requestCheckAnswer(sessionId, normalizedUserAnswer);
      setResultMessage('');

      if (result.is_correct) {
        setIsCorrect(true);
        setResultMessage(`回答正確！獲得 ${result.score} 分`);
        console.log(`回答正確！獲得 ${result.score} 分`);

        setAnswered(true);
        // setCurrentScore((prevScore) => {return prevScore + result.score});
        setCurrentScore(result.current_total_score);
      } 
      else {        
        setResultMessage(`回答錯誤！目前答對可獲得 ${result.available_score} 分`);
        setUserAnswer('');
      }
    } 
    catch (error) {
      console.error('提交答案失敗：', error);
    }
    finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  }

  async function skipQuestion() {
    try {
      const result = await requestSkipQuestion(sessionId);
      if (result.game_over) {
        setHasNextQuestion(false);
        console.log('已經沒有下一題了');

        const encodedSessionId = encodeURIComponent(sessionId);
        window.location.assign(`/gameResult.html?sessionId=${encodedSessionId}`);

        return;
      }
      // 跟下一題的邏輯一樣，換到下一題的時候記得把 isCorrect 設回 false，不然無法輸入
      setIsCorrect(false);
      setHasNextHint(true);
      setVisibleHintCount(result.next_question.hints_revealed);
      setQuestion(result.next_question);
      setHints([result.next_question.hint.hint_text]);
      setUserAnswer('');
      setAnswered(false);
    } 
    catch (error) {
      console.error('跳過題目失敗：', error);
    }
  }

  return (
    <main className="quiz-page">
      <section className="quiz-shell" aria-labelledby="quiz-title">
        <header className="quiz-header">
          <a className="quiz-back-link" href="/gameEntry.html">
            ← 返回遊戲設定
          </a>

          <p className="quiz-eyebrow">ANIME FIVE HINTS</p>
          <h1 id="quiz-title">五提示猜角色</h1>

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
              <h2 id="quiz-hints-title">角色提示</h2>
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
            disabled={isSubmitting || !hasNextHint}
          >
            {hasNextHint ? '撕開下一個提示' : '提示已全部揭露'}
          </button>
        </section>

        <form className="quiz-answer-card" onSubmit={submitQuizAnswer}>
          <label htmlFor="quiz-answer">你的答案</label>
          <div className="quiz-answer-row">
            <input
              id="quiz-answer"
              value={userAnswer}
              onChange={(event) => setUserAnswer(event.target.value)}
              type="text"
              placeholder="輸入角色名稱"
              autoComplete="off"
              disabled={isSubmitting || isCorrect}
            />
            <button
              className="quiz-button quiz-button-primary"
              type="submit"
              disabled={isSubmitting || isCorrect || !userAnswer.trim()}
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
          {answered ? (
            <button
              className="quiz-button quiz-button-primary"
              type="button"
              onClick={nextQuestion}
              disabled={isSubmitting || !hasNextQuestion}
            >
              下一題
            </button>
          ) : (
            <button
              className="quiz-button quiz-button-skip"
              type="button"
              onClick={skipQuestion}
              disabled={isSubmitting || !hasNextQuestion}
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

import '../styles/styles.css';
import './quiz.css';
import { useState, useRef, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/apiRequest.js';
import { getQuizMode } from '../../shared_items/quizConfig.js';
import LoadingDots from '../components/dotsAnimation.jsx';

// const quizModes = {
//   five_hints_guess_character: {
//     question_type: 'five_hints',
//     answer_type: 'character',
//   },

//   five_hints_guess_anime: {
//     question_type: 'five_hints',
//     answer_type: 'anime',
//   },
// }

// const quizModeLabels = {
//   five_hints_guess_character: '五提示猜角色',
//   five_hints_guess_anime: '五提示猜動畫',
// }

// async function requestQuizSession(quizMode, questionCount) {  
//   const result = await apiRequest('/api/create-quiz-session', {
//     method: 'POST',
//     body: {
//       quizMode,
//       questionCount,
//     },
//   });

//   return result;
// }

export function Quiz({quizMode, questionCount, roomSessionId, gameState, onGameStateChange}) {
  const navigate = useNavigate();
  const isHost = gameState.viewer === 'host';
  // const [roomState, setRoomState] = useState(null);
  // const [loadError, setLoadError] = useState('');
  // const activeQuizMode = roomState?.quiz_mode ?? quizMode;
  // const activeQuestionCount = roomState?.question_count ?? questionCount;
  // 現在會把第一個題目帶進來，可以直接初始化
  const firstQuestion = gameState?.current_question;
  const [sessionId, setSessionId] = useState(roomSessionId);
  const [question, setQuestion] = useState(firstQuestion ?? null);
  // questionCount 在建立 session 的時候就固定了，不用去更動他
  const [visibleHintCount, setVisibleHintCount] = useState(firstQuestion?.hints_revealed ?? 0);
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
  const [hints, setHints] = useState(firstQuestion?.hints ?? []);
  const [userAnswer, setUserAnswer] = useState('');
  const [resultMessage, setResultMessage] = useState('');
  const [hasNextHint, setHasNextHint] = useState(true);
  const [hasNextQuestion, setHasNextQuestion] = useState(true);

  // 給房主用
  const [questionId, setQuestionId] = useState(null);
  const [answer, setAnswer] = useState([]);

  const previousQuestionId = useRef(null);

  // 重新 render 畫面用，每兩秒都重新 render 畫面藉此同步所有人畫面
  useEffect(() => {
    const currentQuestion = gameState?.current_question;
    if (!currentQuestion) return;

    const questionChanged =
      previousQuestionId.current !== currentQuestion.question_id;

    setSessionId(roomSessionId);
    setQuestion(currentQuestion);
    setVisibleHintCount(currentQuestion.hints_revealed);
    setHints(currentQuestion.hints ?? []);
    setHasNextHint(currentQuestion.hints_revealed < 5);
    setCurrentScore(gameState.current_total_score ?? 0);
    setHasNextQuestion(gameState.question_count > 0);
    setIsCorrect(currentQuestion.is_correct === true);

    if (questionChanged) {
      setUserAnswer('');
      setResultMessage('');
      setHasNextQuestion(true);
    }

    previousQuestionId.current = currentQuestion.question_id;
    setQuestionId(currentQuestion.question_id);
  }, [gameState, roomSessionId]);

  // for 房主畫面用，所以當 questionId 以及 answer 有改變時才變更。目前只有放上顯示答案的部分
  useEffect(() => {
    let isActive = true;
    async function loadAnswer() {
      if (!isHost || !questionId || !sessionId) {
        return;
      }

      try {
        const result = await requestAnswer(sessionId);
        if (isActive && result.questionId === questionId) {
          setAnswer(result.answer);
        }

        if (result.questionId !== questionId) {
          console.error(`答案對應的題目 id 跟預期的不相符`)
        }
      } 
      catch (error) {
        console.error('取得答案失敗：', error);
      }
    }

    loadAnswer();

    return () => {
      isActive = false;
    };
  }, [isHost, questionId, sessionId]);
 
  // if (!question) {
  //   return (
  //     <main className="quiz-page">
  //       <section className="quiz-loading" aria-live="polite">
  //         <span className="quiz-loading-spinner" aria-hidden="true" />
  //         {/* <p role={loadError ? 'alert' : undefined}>{loadError || '正在準備題目……'}</p> */}
  //       </section>
  //     </main>
  //   );
  // }
  

  function resetToEmptyState() {               
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
        // if (!result.current_question.hints) {
        //   console.log('沒有更多提示了');
        //   setHasNextHint(false);
        //   return;
        // }
        
        // setHints((prevHints) => [...prevHints, result.hint]);
        // setHasNextHint(result.has_next_hint);
        // setVisibleHintCount(result.hints_revealed);
        onGameStateChange(result);
      });
    } 
    catch (error) {
      console.error('取得下一個提示失敗：', error);
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
  
  async function nextQuestion() {
    try {
      await quizAction('nextQuestion', async () => {
        const result = await requestNextQuestion(sessionId, question.question_order);

        if (result.game_over) {
          setHasNextQuestion(false);
          console.log('已經沒有下一題了');
          // const encodedSessionId = encodeURIComponent(sessionId);
          // window.location.assign(`/gameResult.html?sessionId=${encodedSessionId}`);

          // 改成 react-router-dom 的 navigate
          const encodedSessionId = encodeURIComponent(sessionId);
          navigate(`/game/${encodedSessionId}/result`); 
          return;
        }
        // 換到下一題的時候記得把 isCorrect 設回 false，不然無法輸入
        // resetToEmptyState();
        // setQuestion(result.current_question);
        // setVisibleHintCount(result.current_question.hints_revealed);
        // setHints(result.current_question.hints ? [result.current_question.hints] : []);
        // setHasNextHint(true);
        onGameStateChange(result);
      }); 
    }
    catch (error) {
      console.error('取得下一題失敗：', error);
    }
  }

  async function skipQuestion() {    
    try {
      await quizAction('skipQuestion', async () => {
        const result = await requestSkipQuestion(sessionId, question.question_order);
        if (result.game_over) {
          setHasNextQuestion(false);
          console.log('已經沒有下一題了');

          const encodedSessionId = encodeURIComponent(sessionId);
          navigate(`/game/${encodedSessionId}/result`);
          // window.location.assign(`/gameResult.html?sessionId=${encodedSessionId}`);

          return;
        }
        // 跟下一題的邏輯一樣，換到下一題的時候記得把 isCorrect 設回 false，不然無法輸入
        // resetToEmptyState();
        // setHasNextHint(true);
        // setVisibleHintCount(result.current_question.hints_revealed);
        // setQuestion(result.current_question);
        // setHints(result.current_question.hints ? [result.current_question.hints] : []);      
        onGameStateChange(result);
      });
    }
    catch (error) {
      console.error('跳過題目失敗：', error);
    }
  }

  let selectedMode = getQuizMode(quizMode);
  if (pendingAction === 'nextQuestion' || pendingAction === 'skipQuestion') {
    return (
      <main className="quiz-page">
        <section className="quiz-loading" aria-live="polite">
          <span className="quiz-loading-spinner" aria-hidden="true" />
          <p>正在載入下一題<LoadingDots /></p>
        </section>
      </main>
    );
  }

  return (
    <main className="quiz-page">
      <section className="quiz-shell" aria-labelledby="quiz-title">
        <header className="quiz-header">
          <Link to="/" className="quiz-back-link">
            ← 返回主選單
          </Link>

          {/* <p className="quiz-eyebrow">ANIME FIVE HINTS</p> */}
          <h1 id="quiz-title">{selectedMode.label}</h1>
          {/* {loadError && <p role="alert">{loadError}</p>} */}

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


        {isHost && (
          <section className="quiz-answer">
            <p>可接受答案：<strong>{answer.join(', ')}</strong></p>
          </section>
        )}

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
          {hints.map((hint) => (
            <li
              className="quiz-hint-item"
              key={`${question.question_id}-${hint.hint_order}`}
              data-seal-label={`HINT ${hint.hint_order}`}            
            >
              <span>{hint.hint_text}</span>
            </li>
          ))}
          </ol>

          <button
            className="quiz-button quiz-button-hint"
            type="button"
            onClick={showNextHint}
            disabled={isBusy || !hasNextHint || !isHost}
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
              disabled={isBusy || isCorrect || !isHost}
            />
            <button
              className="quiz-button quiz-button-primary"
              type="submit"
              disabled={isBusy || isCorrect || !isHost || !userAnswer.trim()}
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
              disabled={isBusy || !hasNextQuestion || !isHost}
            >
              下一題
            </button>
          ) : (
            <button
              className="quiz-button quiz-button-skip"
              type="button"
              onClick={skipQuestion}
              disabled={isBusy || !hasNextQuestion || !isHost}
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

async function requestNextQuestion(sessionId, questionOrder) {
  const encodedSessionId = encodeURIComponent(sessionId);
  const result = await apiRequest(`/api/quiz-session/${encodedSessionId}/next-question`, {
    method: 'POST',
    body: {question_order: questionOrder}
  });

  return result;
}

async function requestSkipQuestion(sessionId, questionOrder) {
  const encodedSessionId = encodeURIComponent(sessionId);
  const result = await apiRequest(`/api/quiz-session/${encodedSessionId}/skip-question`, {
    method: 'POST',
    body: {question_order: questionOrder}
  });
  return result;
}

async function requestAnswer(sessionId) {
  const encodedSessionId = encodeURIComponent(sessionId);
  const result = await apiRequest(`/api/quiz-session/${encodedSessionId}/get-answer`, {
    method: 'POST',    
  });
  return result;
}

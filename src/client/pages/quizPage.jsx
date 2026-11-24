import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Quiz } from './quiz.jsx';
import { apiRequest } from '../api/apiRequest.js'; 
import { supabase } from '../../lib/supabase.js';
// const params = new URLSearchParams(window.location.search);
// // 看 html 的選單 value
// const quizMode = params.get('quiz-mode');
// const questionCount = Number(params.get('question-count'));
// const roomSessionId = params.get('sessionId');
// const rootElement = document.querySelector('#root');

export default function QuizPage() {
  // const [params] = useSearchParams();
  // 放在參數裡
  const navigate = useNavigate();
  const {sessionId} = useParams();
  // lobby 給過來的資料
  // const { state } = useLocation();
  const [gameState, setGameState] = useState(null);
  // const [loadError, setLoadError] = useState(null);

  // useEffect(() => {
  //   let isActive = true;
  //   let timeoutId;

  //   async function pollGameState() {
  //     try {
  //       if (!sessionId) {
  //         console.error('缺少 sessionId');
  //         return;
  //       }
      
  //       const result = await apiRequest(`/api/quiz-session/${sessionId}/state`, {
  //         method: 'GET',
  //       });

  //       if (!isActive) return;
  //       if (result.game_over) {
  //         isActive = false;
  //         navigate(`/game/${sessionId}/result`);
  //         return;
  //       }

  //       setGameState(result);
      
  //     } 
  //     catch (error) {
  //       if (!isActive) return;
  //       console.error('取得遊戲狀態失敗', error);
  //       // setLoadError(error);
  //     }

  //     if (isActive) {
  //       timeoutId = setTimeout(pollGameState, 1000);
  //     }
  //   }

  //   pollGameState();
  //   return () => {
  //     isActive = false;
  //     clearTimeout(timeoutId);
  //   };
    
  // }, [sessionId, navigate]);

  useEffect(() => {
    if (!sessionId) {
      console.error('缺少 sessionId');
      return;
    }

    let isActive = true;
    async function refreshGameState() {
      try {
        const result = await apiRequest(
          `/api/quiz-session/${sessionId}/state`,
          { method: 'GET' }
        );

        if (!isActive) return;

        setGameState(result);
      }
      catch (error) {
        console.error('取得遊戲狀態失敗', error);
      }
    }

    // 建立此房間的 channle 並監聽是否有 'state_changed' 的事件發生
    // 如果有就執行對應的 callback function -> refreshGameState()
    const channel = supabase.channel(`quiz:${sessionId}`, {
      config: { private: true },
    })
    .on('broadcast', { event: 'state_changed' }, ({payload}) => {
      refreshGameState();

      if (!payload.judgement) {
        console.log('沒有判斷結果，可能是其他操作');
        return;
      }

      alert(
        payload.judgement.isCorrect
          ? `恭喜答對！獲得 ${payload.judgement.score} 分`
          : `回答錯誤！`
      );
    })
    .subscribe((status, error) => {
      if (error) {
        console.error('訂閱頻道失敗', error);
        return;
      }
      
      if (status === 'SUBSCRIBED') {
        // 首次加入、斷線後重新加入，都補抓最新狀態
        void refreshGameState();
      }
    });

    return () => {
      isActive = false;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  if (!gameState) {
    return (
      <main className="quiz-page">
        <section
          className="quiz-loading"
          aria-live="polite"
        >
          <span
            className="quiz-loading-spinner"
            aria-hidden="true"
          />

          <p>{'正在讀取遊戲狀態……'}</p>
        </section>
      </main>
    );
  }

  return (
    <Quiz
      quizMode={gameState?.quiz_mode}
      questionCount={Number(gameState?.question_count)}
      roomSessionId={sessionId}
      gameState={gameState}
      onGameStateChange={setGameState}
    />
  );
}

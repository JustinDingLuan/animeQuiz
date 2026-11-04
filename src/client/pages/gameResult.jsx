import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../api/apiRequest.js';
import '../styles/styles.css';

export default function GameResult() {
  const { sessionId } = useParams();  
  const { result, setResult} = useState({
    status: 'loading',
    score_ranking: [],
    message: '',
  });

  useEffect(() => {
    if (!sessionId) {
      setResult({
        status: 'error',
        score_ranking: [],
        message: '找不到這場遊戲的紀錄。',
      });
      return undefined;
    }

    const controller = new AbortController();

    async function loadGameResult() {
      try {
        const encodedSessionId = encodeURIComponent(sessionId);
        const ranking = await apiRequest(`/api/quiz-session/${encodedSessionId}/result`, {
          method: 'GET',
          signal: controller.signal,
        });
        
        setResult({
          status: 'success',
          score_ranking: ranking,
          message: '',
        });
      } 
      catch (error) {
        if (error.name === 'AbortError') {
          return;
        }

        console.error('取得遊戲結果失敗：', error);
        setResult({
          status: 'error',
          score_ranking:[],
          message: error.message,
        });
      }
    }

    loadGameResult();

    return () => controller.abort();
  }, [sessionId]);

  return (
    <main className="result-shell">
      <section
        className="result-card"
        aria-live="polite"
      >
        {result.status === 'loading' && (
          <>
            <div
              className="result-loader"
              aria-hidden="true"
            />
            <p className="result-eyebrow">Anime Quiz</p>
            <h1>正在整理成績</h1>
            <p className="result-description">
              請稍候，我們正在計算這場遊戲的結果。
            </p>
          </>
        )}

        {result.status === 'error' && (
          <>
            <div className="result-icon error" aria-hidden="true">
              !
            </div>
            <p className="result-eyebrow">讀取失敗</p>
            <h1>無法顯示結算結果</h1>
            <p className="result-description">
              {result.message}
            </p>
            <Link to="/" className="result-secondary-action">
              返回房間設定
            </Link>
          </>
        )}

        {result.status === 'success' && (
          <>
            {/* <div className="result-icon" aria-hidden="true">
              ✓
            </div> */}
            <p className="result-eyebrow">遊戲完成</p>
            <h1>最終結果</h1>
            
            <div className="score-display">
              <ol>
                {(result.score_ranking ?? []).map((player) => (
                  <li key={player.user_id}>
                    <span>{player.nickname}: {player.total_score ?? 0} 分</span>
                  </li>
                ))}
              </ol>
            </div>

            <Link to="/" className="result-primary-action">
              再玩一次
              <span aria-hidden="true">→</span>
            </Link>
          </>
        )}
      </section>
    </main>
  );
}



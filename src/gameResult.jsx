import {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

function GameResult() {
  const params = new URLSearchParams(
    window.location.search
  );
  const sessionId = params.get('sessionId');
  // 變數、操作變數用的 function
  const [resultState, setResultState] = useState({
    status: 'loading',
    score: 0,
    message: '',
  });

  useEffect(() => {
    if (!sessionId) {
      setResultState({
        status: 'error',
        score: 0,
        message: '找不到這場遊戲的紀錄。',
      });
      return undefined;
    }

    const controller = new AbortController();

    async function loadGameResult() {
      try {
        const encodedSessionId =
          encodeURIComponent(sessionId);
        const response = await fetch(
          `/api/quiz-session/${encodedSessionId}/result`,
          {signal: controller.signal}
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result?.message || '取得遊戲結果失敗'
          );
        }

        setResultState({
          status: 'success',
          score: result.current_total_score,
          message: '',
        });
      } 
      catch (error) {
        if (error.name === 'AbortError') {
          return;
        }

        console.error('取得遊戲結果失敗：', error);
        setResultState({
          status: 'error',
          score: 0,
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
        {resultState.status === 'loading' && (
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

        {resultState.status === 'error' && (
          <>
            <div className="result-icon error" aria-hidden="true">
              !
            </div>
            <p className="result-eyebrow">讀取失敗</p>
            <h1>無法顯示結算結果</h1>
            <p className="result-description">
              {resultState.message}
            </p>
            <a className="result-secondary-action" href="/gameEntry.html">
              返回遊戲設定
            </a>
          </>
        )}

        {resultState.status === 'success' && (
          <>
            <div className="result-icon" aria-hidden="true">
              ✓
            </div>
            <p className="result-eyebrow">遊戲完成</p>
            <h1>漂亮收尾！</h1>
            <p className="result-description">
              這場 Anime Quiz 的最終得分是
            </p>

            <div className="score-display">
              <strong>{resultState.score}</strong>
              <span>分</span>
            </div>

            <a className="result-primary-action" href="/gameEntry.html">
              再玩一次
              <span aria-hidden="true">→</span>
            </a>
          </>
        )}
      </section>
    </main>
  );
}

createRoot(
  document.querySelector('#root')
).render(<GameResult />);

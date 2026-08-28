import './styles.css';


const gameResultElements = {   
   summaryText: document.querySelector('#game-summary-text'),
}

const params = new URLSearchParams(window.location.search);
const sessionId = params.get('sessionId');

async function loadGameResult(sessionId) {
   if (!sessionId) {
      console.error('缺少 sessionId');      
      return;
   }

   try {
      const response = await fetch(`/api/quiz-session/${encodeURIComponent(sessionId)}/result`);
      if (!response.ok) {
         throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      gameResultElements.summaryText.textContent = 
         `遊戲結束！總分: ${result.current_total_score} 分`;
   }
   catch (error) {
      console.error('取得遊戲結果失敗：', error);
      gameResultElements.summaryText.textContent = '取得遊戲結果失敗';
   }
}

loadGameResult(sessionId);


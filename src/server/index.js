import express from 'express';
import {
  checkQuizAnswer,
  createQuizSession,
  revealNextHint,
  nextQuestion
} from './quizSession.js';

const app = express();

app.use(express.json());

app.post(
  '/api/quiz-session/:sessionId/check-quiz-answer',
  // request.body 是 HTTP request 的資料內容，只是剛好叫做 body，不是 html 裡面的那個 <body>
  async (request, response) => {
    const {sessionId} = request.params;
    const {userAnswer} = request.body;

    if (!sessionId || typeof userAnswer !== 'string' || !userAnswer.trim()) {
      return response.status(400).json({
        message: 'Session ID 或答案格式錯誤',
      });
    }

    try {
      const result = await checkQuizAnswer(sessionId, userAnswer);

      return response.status(200).json(result);
    } catch (error) {
      console.error(
        '答案判斷失敗：',
        error
      );

      return response.status(500).json({
        message: '答案判斷失敗',
      });
    }
  }
);

app.post(
  '/api/create-quiz-session',  
  async (request, response) => {
    const { questionType, questionCount } = request.body;
    // 這邊應該是不會出錯，我直接用下拉式選單弄得
    // if (
    //   typeof questionType !== 'string' ||
    //   !questionType.trim() ||
    //   !Number.isInteger(questionCount) ||
    //   questionCount <= 0
    // ) {
    //   return response.status(400).json({
    //     message: '題目類型或數量格式錯誤',
    //   });
    // }

    try {
      const quizSession = await createQuizSession(
        questionType,
        questionCount
      );

      return response.status(201).json(quizSession);
    } 
    catch (error) {
      console.error(
        '建立測驗失敗：',
        error
      );

      return response.status(500).json({
        message: '建立測驗失敗',
      });
    }
  }
);

app.post(
  '/api/quiz-session/:sessionId/reveal-next-hint',
  async (request, response) => {
    const { sessionId } = request.params;

    if (!sessionId) {
      return response.status(400).json({
        message: '缺少 sessionId',
      });
    }

    try {
      const result = await revealNextHint(sessionId);

      return response.status(200).json(result);
    } 
    catch (error) {
      console.error(
        '取得下一個提示失敗：',
        error
      );

      return response.status(500).json({
        message: '取得下一個提示失敗',
      });
    }
  }
);

app.post(
  '/api/quiz-session/:sessionId/next-question',
  async (request, response) => {
    const { sessionId } = request.params;

    if (!sessionId) {
      return response.status(400).json({
        message: '缺少 sessionId',
      });
    }
    
    try {
      const result = await nextQuestion(sessionId); 
      return response.status(200).json(result);
    }
    catch (error) {
      console.error(
        '取得下一個題目失敗：',
        error
      );

      return response.status(500).json({
        message: '取得下一個題目失敗',
      }); 
    }
  }
);

app.listen(3000, '0.0.0.0', () => {
   console.log(
      'Backend running at http://localhost:3000'
   );
});

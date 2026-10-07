import { Router } from 'express';
import { requireAuth } from '../auth.js';

import {
  checkQuizAnswer,
  createQuizSession,
  startQuizSession,
  revealNextHint,
  nextQuestion,
  skipQuestion,
  getQuizResult
} from '../quizSession.js';

const router = Router();

router.post(
   '/quiz-session/:sessionId/check-quiz-answer',
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
         // 拿到後端 給出的結果以後，把結果用 json 的形式回傳給前端
         // 前端接收到這個 json result 可以去更新畫面
         const result = await checkQuizAnswer(sessionId, userAnswer);
         
         return response.status(200).json(result);
      } 
      catch (error) {
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

// router.post(
//    '/create-quiz-session',  
//    async (request, response) => {
//       const { quizMode, questionCount } = request.body;
      
//       try {
//          const quizSession = await createQuizSession(
//             quizMode,
//             questionCount
//          );

//          return response.status(201).json(quizSession);
//       } 
//       catch (error) {
//          console.error(
//          '建立測驗失敗：',
//          error
//          );

//          return response.status(500).json({
//          message: '建立測驗失敗',
//          });
//       }
//    }
// );

router.post(
   '/rooms/:sessionId/start-game',
   requireAuth,
   async (request, response) => {
      const { sessionId } = request.params;
      // request.user.id 是 id value 不是物件
      const userId = request.user.id;
      const { quizMode, questionCount } = request.body;

      if (!sessionId || !quizMode || !questionCount) {
         return response.status(400).json({
         message: '缺少 sessionId、quizMode 或 questionCount',
         });
      }

      if (!userId) {
         return response.status(400).json({
         message: '缺少 userId',
         });
      }

      try {
         const quizSession = await startQuizSession(
            sessionId,
            userId,
            quizMode,
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

router.post(
   '/quiz-session/:sessionId/reveal-next-hint',
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

router.post(
   '/quiz-session/:sessionId/next-question',
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

router.post(
   '/quiz-session/:sessionId/skip-question',
   async (request, response) => {
      const { sessionId } = request.params;

      if (!sessionId) {
         return response.status(400).json({
         message: '缺少 sessionId',
         });
      }
      
      try {
         const result = await skipQuestion(sessionId); 
         return response.status(200).json(result);
      }
      catch (error) {
         console.error(
         '跳過題目失敗：',
         error
         );

         return response.status(500).json({
         message: '跳過題目失敗',
         }); 
      }
   }
);

router.get(
   '/quiz-session/:sessionId/result',
   async (request, response) => {
      const { sessionId } = request.params;

      if (!sessionId) {
         return response.status(400).json({
         message: '缺少 sessionId',
         });
      }

      try {
         const result = await getQuizResult(sessionId); 
         return response.status(200).json(result);
      }
      catch (error) {
         console.error(
         '取得遊戲結果失敗：',
         error
         );

         return response.status(500).json({
         message: '取得遊戲結果失敗',
         }); 
      }
   }
);

export default router;

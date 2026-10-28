import { Router } from 'express';
import { requireAuth } from '../auth.js';

import {
   createRoom, 
   joinRoom
} from '../roomEntry.js';

import { 
   getLobbyInfo,
   startGame
} from '../lobby.js';

import {
   getUserRole
} from '../auth.js';

const router = Router();

router.post(
   '/create-room',
   requireAuth,
   // 這邊應該透過 rpc 取得唯一的 roomcode?
   // user_id 自動放在 authrization header 裡面，後端可以透過 requireAuth 取得 user_id
   async (request, response) => {
      const nickname = request.body?.nickname;
      const roomCapacity = request.body?.roomCapacity;

      // if (nickname === null || nickname === undefined) {
      //    nickname = 'host';
      // }

      try {
         const { sessionId, roomCode, role } = await createRoom({
            user_id: request.user.id,
            nickname,
            roomCapacity
         });
         return response.status(201).json({ sessionId, roomCode, role });
      }
      catch (error) {
         console.error('創建房間失敗：', error);

         return response.status(error.status ?? 500).json({
         message: error.message || '創建房間失敗',
         code: error.code ?? null,
         });
      }
   }
)

router.post(
   '/join-room',
   requireAuth,
   // user_id 自動放在 authrization header 裡面，後端可以透過 requireAuth 取得 user_id  
   async (request, response) => {
      const roomCode = request.body?.roomCode;
      const nickname = request.body?.nickname;

      if (!roomCode || typeof roomCode !== 'string') {
         return response.status(400).json({
         message: '缺少 roomCode 或 roomCode 格式錯誤',
         });
      }

      // if (nickname === null || nickname === undefined || typeof nickname !== 'string' || !nickname.trim()) {
      //    nickname = 'player';
      // }    
      
      try {
         const {sessionId, role} = await joinRoom({
            user_id: request.user.id,
            roomCode,
            nickname
         });
         return response.status(200).json({ sessionId, role });
      }
      catch (error) {
         console.error('加入房間失敗：', error);

         return response.status(error.status ?? 500).json({
         message: error.message || '加入房間失敗',
         code: error.code ?? null,
         });
      }
   }
)

router.get(
   '/:sessionId/lobbyInfo',
   requireAuth,
   async (request, response) => {
      const { sessionId } = request.params;

      if (!sessionId) {
         return response.status(400).json({
         message: '缺少 sessionId',
         });
      }

      try {
         const role = await getUserRole(sessionId, request.user.id);
         if (!role) {
            return response.status(403).json({
               message: '只有該房間的成員可以查看玩家順序',
            });
         }

         const lobbyInfo = await getLobbyInfo(sessionId);
         return response.status(200).json(lobbyInfo);
      }
      catch (error) {
         console.error('取得大廳資訊失敗：', error);

         return response.status(error.status ?? 500).json({
         message: error.message || '取得大廳資訊失敗',
         code: error.code ?? null,
         });
      }
   }
)

router.post(
   '/:sessionId/start-game',
   requireAuth,
   async (request, response) => {
      const { sessionId } = request.params;

      if (!sessionId) {
         return response.status(400).json({
         message: '缺少 sessionId',
         });
      }
      const { quizMode, questionCount } = request.body;

      try {
         const userRole = await getUserRole(sessionId, request.user.id);
         console.log('你的角色: ', userRole);

         if (userRole !== 'host') {
            return response.status(403).json({
               message: '只有房主才能開始遊戲',
            });
         }

         // 開始遊戲的邏輯
         // 這邊可以透過 rpc 或是直接更新資料庫的方式來改變房間狀態為 in_progress
         // 這邊假設有一個 startGame 函式可以處理這個邏輯         
         await startGame({sessionId, quizMode, questionCount});

         return response.status(200).json({
            message: '遊戲已開始',
         });
      }
      catch (error) {
         console.error('開始遊戲失敗：', error);

         return response.status(error.status ?? 500).json({
            message: error.message || '開始遊戲失敗',
            code: error.code ?? null,
         });
      }
   }
)

export default router;

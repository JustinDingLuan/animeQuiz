import { Router } from 'express';
import { requireAuth } from '../auth.js';

import {
  createRoom, 
  joinRoom  
} from '../roomEntry.js';

import { 
  getLobbyInfo 
} from '../lobby.js';

const router = Router();

router.post(
   '/create-room',
   requireAuth,
   // 這邊應該透過 rpc 取得唯一的 roomcode?
   // user_id 自動放在 authrization header 裡面，後端可以透過 requireAuth 取得 user_id
   async (request, response) => {
      const nickname = request.body?.nickname;
      const roomCapacity = request.body?.roomCapacity;

      if (nickname === null || nickname === undefined) {
         nickname = 'host';
      }

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

      if (nickname === null || nickname === undefined || typeof nickname !== 'string' || !nickname.trim()) {
         nickname = 'player';
      }    
      
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

export default router;
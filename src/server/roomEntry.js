import { supabaseAdmin } from './databaseAdmin.js';

export async function createRoom({user_id, nickname}) {
   // 變數名稱必須跟寫 rpc 的時候一模一樣
   const { data:roomInfo, error } = await supabaseAdmin.rpc('create_host_room', {
      p_nickname: nickname,
      p_user_id: user_id,
   });

   const sessionId = roomInfo?.session_id;
   const roomCode = roomInfo?.room_code;
   const role = roomInfo?.role;
   
   if (error) {
      throw error;
   }

   console.log('createRoom - sessionId:', sessionId, 'roomCode:', roomCode, 'role:', role);
   if (!sessionId || !roomCode || !role) {
      throw new Error('無法取得 sessionId、roomCode 或 role');
   }

   if (role !== 'host') {
      throw new Error('非主持人無法創建房間');
   }


   return { sessionId, roomCode, role };
}

export async function joinRoom({user_id, roomCode, nickname}) {
   // 變數名稱必須跟寫 rpc 的時候一模一樣
   const { data, error } = await supabaseAdmin.rpc('join_room', {
      p_user_id: user_id,
      p_room_code: roomCode,
      p_nickname: nickname,
   });

   const sessionId = data?.session_id;
   const role = data?.role;

   if (!sessionId || !role) {
      throw new Error('無法取得 sessionId 或 role');
   }

   if (role !== 'player') {
      throw new Error('角色不是 player，無法加入房間');
   }

   if (error) {
      throw error;
   }

   return { sessionId, role };
}


   
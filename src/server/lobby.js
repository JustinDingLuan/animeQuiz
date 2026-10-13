import { supabaseAdmin } from './databaseAdmin.js';
import {getQuizMode} from '../shared_items/quizConfig.js';

export async function getLobbyInfo(sessionId) {
   const { data, error } = await supabaseAdmin
      .from('quiz_sessions')
      .select('room_code, room_capacity, status')
      .eq('id', sessionId)
      .single();      

   if (error) {
      throw new Error(`取得房間資訊失敗：${error.message}`);
   }

   // 計算總人數用
   const { count, countError } = await supabaseAdmin
      .from('quiz_session_members')
      // 回傳資料總數量(總共有幾個 row)，head 表示只拿到 header，不會實際拿到 row data。可節省流量
      .select('*', {count: 'exact', head: true})
      .eq('session_id', sessionId)
      

   if (countError) {
      throw new Error(`取得房間資訊失敗：${countError.message}`);
   }   

   if (!data) {
      throw new Error('房間不存在');
   }

   return {
      ...data,
      playerCount: count ?? 0,
   }
}

// 把資料庫的此 session 更新成 in_progress -> 抽題目 -> 把第一題以及提示帶到 quizPage 中
export async function startGame({sessionId, quizMode, questionCount}) {
   const selectMode = getQuizMode(quizMode);
   if (!selectMode) {
      throw new Error('題型不正確');
   }
}
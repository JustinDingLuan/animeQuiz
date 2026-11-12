import { supabaseAdmin } from './databaseAdmin.js';

export async function getRoomPlayers(sessionId) {
   const { data: players, error } = await supabaseAdmin
      .from('quiz_session_members')
      .select('user_id, nickname, join_at, answer_order')
      .eq('session_id', sessionId)
      .eq('role', 'player')
      .order('answer_order', { ascending: true });

   if (error) throw error;

   return players;
}

export async function getParticipant(sessionId) {
   const {data: session, error: sessionError} = await supabaseAdmin
      .from('quiz_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
      
   if (sessionError) {      
      throw new Error(`取得房間資訊失敗：${sessionError.message}`);
   }

   if (!session) {      
      throw new Error('房間不存在');
   }

   let query = supabaseAdmin
      .from('quiz_session_members')
      .select('user_id, nickname, join_at, answer_order')
      .eq('session_id', sessionId);

   if (session.room_mode === 'solo') {
      query = query.eq('user_id', session.created_by_user_id);
   }
   else if (session.room_mode === 'multi') {
      query = query.eq('role', 'player');
   }      

   const {data: participant, error: participantError} = await query.order('answer_order', { ascending: true });
   // if (participantError) {      
   //    throw new Error(`取得房間參與者資訊失敗：${participantError.message}`);
   // }

   // if (!participant || participant.length === 0) {      
   //    throw new Error('房間沒有參與者');
   // }

   return participant;
}
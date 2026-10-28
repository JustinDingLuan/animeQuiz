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

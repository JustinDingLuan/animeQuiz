import { supabaseAdmin } from './databaseAdmin.js';

export async function notifyQuizChanged(sessionId, judgement=null) {
   const channel = supabaseAdmin.channel(`quiz:${sessionId}`, {
      config: { private: true },
   });

   try {
      await channel.httpSend('state_changed', {sessionId, judgement});
   } 
   finally {
      await supabaseAdmin.removeChannel(channel);
   }
}

export async function notifyLobbyChanged(sessionId) {
   const channel = supabaseAdmin.channel(`lobby:${sessionId}`, {
      config: { private: true },
   });

   try {
      await channel.httpSend('lobby_changed', {sessionId});
   } 
   finally {
      await supabaseAdmin.removeChannel(channel);
   }
}


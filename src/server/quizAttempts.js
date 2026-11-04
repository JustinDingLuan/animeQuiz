import { supabaseAdmin } from './databaseAdmin.js';

const attemptColumns = 'id, session_id, question_id, default_user, user_id, answer, submit_at, status, scorer, score, answer_round';

export async function getQuestionTurn(sessionId, question, players) {
   if (players.length === 0) {
      return { current_player_id: null, starting_player_id: null, phase: null, answer_round: 1, pending_answer: null };
   }

   const startingPlayer = players[(question.question_order - 1) % players.length];
   const { data: pendingAnswer, error } = await supabaseAdmin
      .from('quiz_user_attempt')
      .select(attemptColumns)
      .eq('session_id', sessionId)
      .eq('question_id', question.question_id)
      .eq('status', 'pending')
      .maybeSingle();

   if (error) throw error;

   return {
      starting_player_id: startingPlayer.user_id,
      current_player_id: question.current_player_id ?? startingPlayer.user_id,
      answer_round: question.answer_round ?? 1,
      phase: pendingAnswer
         ? 'awaiting_judgement'
         : question.is_correct ? 'question_complete' : question.phase ?? 'waiting_answer',
      pending_answer: pendingAnswer,
   };
}

export async function submitPlayerAnswer(sessionId, userId, body = {}) {
   const { questionId, answerRound, answer } = body ?? {};
   if (
      !sessionId || !userId ||
      !/^[1-9]\d*$/.test(String(questionId ?? '')) ||
      !Number.isInteger(answerRound) || answerRound < 1 || answerRound > 32767 ||
      typeof answer !== 'string' || !answer.trim()
   ) {
      throw Object.assign(new Error('題目、作答輪次或答案格式錯誤'), { status: 400 });
   }

   const { data, error } = await supabaseAdmin.rpc('submit_quiz_answer', {
      p_session_id: sessionId,
      p_user_id: userId,
      p_question_id: String(questionId),
      p_answer_round: answerRound,
      p_answer: answer.trim(),
   });

   if (error) {
      const status = {
         '42501': 403, '22023': 400, '22P02': 400, 'P0002': 404,
         '40001': 409, '23505': 409, 'P0001': 409,
      }[error.code] ?? 500;
      throw Object.assign(new Error(status === 500 ? '答案儲存失敗，請稍後再試' : error.message), { status });
   }

   if (
      !data?.attempt?.id ||
      data.attempt.user_id !== userId ||
      String(data.attempt.question_id) !== String(questionId) ||
      data.attempt.answer_round !== answerRound ||
      data.attempt.answer !== answer.trim()
   ) {
      throw Object.assign(new Error('資料庫未回傳已儲存的作答紀錄'), { status: 500 });
   }
   return data;
}

export async function assertNoPendingAnswer(sessionId) {
   const { data, error } = await supabaseAdmin
      .from('quiz_user_attempt')
      .select('id')
      .eq('session_id', sessionId)
      .eq('status', 'pending')
      .limit(1);
   if (error) throw error;
   if (data.length > 0) {
      throw Object.assign(new Error('請先完成目前答案的裁定'), { status: 409 });
   }
}

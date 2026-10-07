import { supabaseAdmin } from './databaseAdmin.js';
import { requireRoomMember } from './lobby.js';

const modes = {
   five_hints_guess_character: { question_type: 'five_hints', answer_type: 'character' },
   five_hints_guess_anime: { question_type: 'five_hints', answer_type: 'anime' },
};

export async function startRoomGame(sessionId, userId, quizMode, questionCount) {
   const member = await requireRoomMember(sessionId, userId);
   if (member.role !== 'host') {
      throw Object.assign(new Error('只有房主可以開始遊戲'), { status: 403 });
   }
   const mode = modes[quizMode];
   if (!mode || ![5, 10, 15, 20].includes(questionCount)) {
      throw Object.assign(new Error('題型或題數不正確'), { status: 400 });
   }
   const { data: questions, error } = await supabaseAdmin
      .from('questions').select('id')
      .eq('question_type', mode.question_type).eq('answer_type', mode.answer_type);
   if (error) throw error;
   if (questions.length < questionCount) {
      throw Object.assign(new Error(`題庫只有 ${questions.length} 題，無法開始 ${questionCount} 題的遊戲`), { status: 400 });
   }
   for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
   }
   // RPC 在同一筆交易內鎖住房間、建立題目並切換狀態，避免重複開始。
   const { data, error: startError } = await supabaseAdmin.rpc('start_host_room', {
      p_session_id: sessionId,
      p_user_id: userId,
      p_quiz_mode: quizMode,
      p_question_ids: questions.slice(0, questionCount).map((question) => String(question.id)),
   });
   if (startError) throw startError;
   return data;
}

export async function getRoomGame(sessionId, userId) {
   await requireRoomMember(sessionId, userId);
   const { data: session, error } = await supabaseAdmin.from('quiz_sessions')
      .select('status, question_type, answer_type, question_count')
      .eq('id', sessionId).single();
   if (error) throw error;
   if (session.status === 'completed') return { game_over: true, session_id: sessionId };
   if (session.status !== 'in_progress') {
      throw Object.assign(new Error('遊戲尚未開始或已結束'), { status: 409 });
   }
   const { data: question, error: questionError } = await supabaseAdmin
      .from('quiz_session_questions')
      .select('question_id, question_order, hints_revealed, score, status, is_correct')
      .eq('session_id', sessionId).in('status', ['active', 'answered'])
      .order('question_order', { ascending: false }).limit(1).single();
   if (questionError) throw questionError;
   const { data: hints, error: hintsError } = await supabaseAdmin.from('question_hints')
      .select('hint_order, hint_text').eq('question_id', question.question_id)
      .lte('hint_order', question.hints_revealed).order('hint_order');
   if (hintsError) throw hintsError;
   const { data: scores, error: scoreError } = await supabaseAdmin.from('quiz_session_questions')
      .select('score').eq('session_id', sessionId).eq('is_correct', true);
   if (scoreError) throw scoreError;
   return {
      session_id: sessionId,
      quiz_mode: Object.keys(modes).find((key) => modes[key].question_type === session.question_type && modes[key].answer_type === session.answer_type),
      question_count: session.question_count,
      current_total_score: scores.reduce((total, row) => total + row.score, 0),
      current_question: { ...question, available_score: question.score, hints },
   };
}

import { supabaseAdmin } from './databaseAdmin.js';
import { checkAnswer, getAnswer} from './quizAnswer.js';
import { getRoomPlayers, getParticipant } from './roomPlayers.js';
import { getQuizMode, getQuizModeKey } from '../shared_items/quizConfig.js';

// const quizModes = {
//    five_hints_guess_character: {
//       question_type: 'five_hints',
//       answer_type: 'character',
//    },

//    five_hints_guess_anime: {
//       question_type: 'five_hints',
//       answer_type: 'anime',
//    },
// }

function shuffle(array) {
   const result = [...array];

   for (let i = result.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));
      [result[i], result[randomIndex]] = [result[randomIndex], result[i]];
   }

   return result;
}

async function getPlayerRanking(sessionId, players) {
   const {data: attempts, error: attemptsError} = await supabaseAdmin
      .from('quiz_user_attempt')
      .select('score, scorer')
      .eq('session_id', sessionId)
      .eq('status', 'correct');

   if (attemptsError) {
      console.error('取得玩家嘗試記錄失敗：', attemptsError);
      throw attemptsError;
   }

   // 計算每個玩家的總分
   const scoreByPlayer = new Map();
   for (const attempt of attempts) {
      if (!attempt.scorer) continue;
      
      const currentScore = scoreByPlayer.get(attempt.scorer) || 0;
      scoreByPlayer.set(attempt.scorer, currentScore + attempt.score);
   }
   
   const ranking = players.map(player => ({
      ...player,
      total_score: scoreByPlayer.get(player.user_id) || 0
   })).sort((a, b) => b.total_score - a.total_score);

   let currentRank = 0


   return ranking.map((player, index) => {
      if (index === 0 || player.total_score < ranking[index - 1].total_score) {
         currentRank = index + 1;
      }

      return {
         ...player,
         rank: currentRank
      }
   });
}

export async function getQuizSessionState(sessionId, viewerId) {
   // 讀取 session -> 
   // 確認題目 status -> 
   // 找 status = active 的 quiz_session_questions -> 
   // 按照 hint_revealed 取得提示 -> 
   // 回傳給前端

   const {data: session, error: sessionError} = await supabaseAdmin
      .from('quiz_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();
   
   if (sessionError) {
      console.error('取得測驗 session 失敗：', sessionError);
      throw sessionError;
   }

   if (!session) {
      throw new Error('找不到測驗 session');
   }

   const players = await getParticipant(sessionId);

   if (session.status === 'completed') {
      return {
         session_id: session.id,
         status: 'completed',
         question_count: session.question_count,
         players,
         current_question: null,
         current_total_score: await getCurrentTotalScore(sessionId),
         game_over: true,
      }
   }

   // 找到正在進行中的題目
   const {data: activeQuestion, error: activeQuestionError} = await supabaseAdmin
      .from('quiz_session_questions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .maybeSingle();
   
   if (activeQuestionError) {
      console.error('取得進行中的題目失敗：', activeQuestionError);
      throw activeQuestionError;
   }

   if (!activeQuestion) {
      throw new Error('找不到進行中的題目');
   }

   const result = await getAnswer(sessionId);

   // 把這個題目已經顯示的提示帶出來 -> hint order < hint_revealed
   const {data: currentShowedHints, error: currentHintError} = await supabaseAdmin
      .from('question_hints')
      .select('id, hint_order, hint_text')
      .eq('question_id', activeQuestion.question_id)
      .lte('hint_order', activeQuestion.hints_revealed)
      .order('hint_order', { ascending: true });

   if (currentHintError) {
      console.error('取得提示失敗：', currentHintError);
      throw currentHintError;
   }

   const quizMode = getQuizModeKey(session.question_type, session.answer_type);

   const {data: pendingAnswer, error: pendingAnswerError} = await supabaseAdmin
      .from('quiz_user_attempt')
      .select('id, answer')
      .eq('session_id', sessionId)
      .eq('status', 'pending')
      .maybeSingle();

   if (pendingAnswerError) {
      console.error('取得待處理答案失敗：', pendingAnswerError);
      throw pendingAnswerError;
   }

   const {data: viewer, error: viewerError} = await supabaseAdmin
      .from('quiz_session_members')
      .select('user_id, nickname, join_at, answer_order')
      .eq('session_id', sessionId)
      .eq('user_id', viewerId)
      .single();

   if (viewerError) {
      console.error('取得觀看者資訊失敗：', viewerError);
      throw viewerError;
   }

   const ranking = await getPlayerRanking(sessionId, players);

   return {
      session_id: session.id,
      status: session.status,
      room_mode: session.room_mode,
      quiz_mode: quizMode,
      question_count: session.question_count,
      players: players,
      current_total_score: await getCurrentTotalScore(sessionId),
      game_over: false,
      current_question: {
         question_id: activeQuestion.question_id,
         question_order: activeQuestion.question_order,         
         hints_revealed: activeQuestion.hints_revealed,
         available_score: activeQuestion.score,
         is_correct: activeQuestion.is_correct,
         hints: currentShowedHints,
         revealed_answer: result.answer
      },
      
      viewer_name: viewer.nickname,
      start_player_id: activeQuestion.start_player_id,
      current_player_id: activeQuestion.current_player_id,
      answer_round: activeQuestion.answer_round,
      phase: activeQuestion.phase,

      pending_answer: pendingAnswer,
      score_ranking: ranking
   }
}

export async function revealNextHint(sessionId) {
   const {data: sessionQuestions, error: sessionQuestionsError} = await supabaseAdmin
      .from('quiz_session_questions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .single();
      
   if (sessionQuestionsError) {
      console.log('取得進行中的題目失敗：', sessionQuestionsError);
      throw sessionQuestionsError;
   }

   if (!sessionQuestions) {      
      console.log('找不到進行中的題目');
      throw new Error('找不到進行中的題目');
   }

   if (sessionQuestions.phase === 'awaiting_judgement') {
      throw new Error('題目正在等待裁定，無法揭露提示');
   }
   
   if (sessionQuestions.hints_revealed >= 5) {
      return {
         hint: null,
         hints_revealed: sessionQuestions.hints_revealed,         
         available_score: sessionQuestions.score,
         total_hints: 5,
         has_next_hint: false,
      }
   }

   // 這裡不會有問題嗎?
   // 需要用 rpc 確保 atomic 的操作嗎?
   const nextHintOrder = sessionQuestions.hints_revealed + 1;
   const {data: nextHint, error: nextHintError} = await supabaseAdmin
   .from('question_hints')
   .select('id, hint_order, hint_text')
   .eq('question_id', sessionQuestions.question_id)
   .eq('hint_order', nextHintOrder)
   .single();

   if (nextHintError) {
      console.log(nextHintError);
      throw nextHintError;
   }

   if (!nextHint) {
      console.log('已經沒有更多提示了');
      throw new Error('已經沒有更多提示了');
   }
   
   
   // 揭露提示後，可以拿到的總分變少  
   const updates = {
      hints_revealed: nextHintOrder,
      phase: 'awaiting_answer',
      current_player_id: sessionQuestions.start_player_id,
      answer_round: sessionQuestions.answer_round + 1,
   };
   const newScore = Math.max(100, 600 - nextHintOrder * 100);

   // console.log(`已經答對了嗎? ${sessionQuestions.is_correct}`);
   if (!sessionQuestions.is_correct) {
      updates.score = newScore;
   }
   // 更新資料庫裡面關於 question 的紀錄
   const {data: updatedQuestion, error: updateQuestionError} = await supabaseAdmin
      .from('quiz_session_questions')
      .update(updates)
      .eq('session_id', sessionQuestions.session_id)
      .eq('question_id', sessionQuestions.question_id)
      .eq('hints_revealed', sessionQuestions.hints_revealed) // 確保沒有 race condition
      .select()
      .single();

   if (updateQuestionError) {      
      console.log('更新題目紀錄失敗：', updateQuestionError);
      throw updateQuestionError;
   }

   // 使用者點擊提示了，更新最後互動時間
   const {data: updatedTime, error: updateTimeError} = await supabaseAdmin
      .from('quiz_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionId)
      .select()
      .single();

   if (updateTimeError) {
      console.log('更新最後互動時間失敗：', updateTimeError);
      throw updateTimeError;
   }

   return {
      hint: {
         hint_order: nextHint.hint_order,
         hint_text: nextHint.hint_text,
      },
      hints_revealed: nextHintOrder,
      phase: 'awaiting_answer',
      available_score: newScore,
      has_next_hint: nextHintOrder < 5,
   }   
}

async function getCurrentTotalScore(sessionId) {
   const {data: totalScore, error: currentScoreError} = await supabaseAdmin
      .from('quiz_session_questions')
      .select('score')
      .eq('session_id', sessionId)
      .eq('is_correct', true);

   if (currentScoreError) {
      console.log('取得目前總分失敗：', currentScoreError);
      throw currentScoreError;
   }
   const currentTotalScore = totalScore.reduce((sum, item) => sum + item.score, 0);   
   return currentTotalScore;
}

export async function checkQuizAnswer(sessionId, userAnswer, attemptId, userId) {
   const {data: sessionQuestions, error: sessionQuestionsError} = await supabaseAdmin
      .from('quiz_session_questions')
      .select(`*`)
      .eq('session_id', sessionId)
      .eq('status', 'active')      
      .single();
      
   if (sessionQuestionsError) {
      console.error(sessionQuestionsError);
      throw sessionQuestionsError;
   }

   if (!sessionQuestions) {
      throw new Error('找不到進行中的題目');
   }

   if (sessionQuestions.phase !== 'awaiting_judgement') {      
      throw new Error('題目還沒進入裁定階段，無法提交答案');
   }

   // 已經答對的題目不能重複取得分數。
   if (sessionQuestions.is_correct === true) {
      return {
         question_order: sessionQuestions.question_order,
         is_correct: sessionQuestions.is_correct,
         score: sessionQuestions.score,
         available_score: sessionQuestions.score,
         already_answered: true,
      };
   }
   
   // quizAnswer.js 只負責依 question_id 比對角色名稱與 aliases。
   const isCorrect = await checkAnswer(sessionQuestions.question_id, userAnswer);
   
   // 更新 userAttempt
   const {data: updateAttempt, error: updateAttemptError} = await supabaseAdmin
      .from('quiz_user_attempt')
      .update({
         status: isCorrect ? 'correct' : 'incorrect', 
         score: isCorrect ? sessionQuestions.score : 0,
         scorer: isCorrect ? sessionQuestions.current_player_id : null,
      })
      .eq('id', attemptId)
      .eq('session_id', sessionQuestions.session_id)
      .eq('question_id', sessionQuestions.question_id)
      .eq('user_id', userId)
      .eq('answer_round', sessionQuestions.answer_round)
      .eq('status', 'pending')
      .select()
      .maybeSingle();      
   
   if (updateAttemptError) {      
      throw updateAttemptError;
   }

   if (!updateAttempt) {      
      throw new Error('找不到使用者嘗試紀錄，請稍後再試');
   }

   const nextPhase = isCorrect || sessionQuestions.hints_revealed >= 5 ? 'awaiting_next_question' : 'awaiting_answer';
   // 更新 question 狀態
   const {data: updatedQuestion, error: updateQuestionError} = await supabaseAdmin
      .from('quiz_session_questions')
      .update({
         user_answer: userAnswer.trim(),
         is_correct: isCorrect,
         phase: nextPhase,
      })
      .eq('session_id', sessionQuestions.session_id)
      .eq('question_id', sessionQuestions.question_id)
      .eq('status', 'active')
      .eq('phase', 'awaiting_judgement')
      .eq('current_player_id', userId)
      .eq('answer_round', sessionQuestions.answer_round)
      .select('score, is_correct')
      .single();

   if (updateQuestionError) {      
      throw updateQuestionError;
   }   

   return {      
      question_order: sessionQuestions.question_order,
      is_correct: updatedQuestion.is_correct,
      score: updatedQuestion.is_correct
         ? updatedQuestion.score
         : 0,
      available_score: updatedQuestion.score,
      already_answered: false,      
   };
}

export async function userSubmitAnswer(session_id, user_id, question_id, answer, answer_round) {
   // 檢查 session 是否存在且進行中
   const {data: session, error: sessionError} = await supabaseAdmin
      .from('quiz_sessions')
      .select('id, status, room_mode')
      .eq('id', session_id)
      .eq('status', 'in_progress')
      .maybeSingle();

   if (sessionError) {
      console.error('取得測驗 session 失敗：', sessionError);
      throw sessionError;
   }

   if (!session) {
      throw new Error('找不到進行中的測驗 session');
   }

   // 檢查題目是否存在、狀態是否為等待回答階段、玩家是否符合預期
   const {data: question, error: questionError} = await supabaseAdmin
      .from('quiz_session_questions')
      .select('question_id, status, phase, start_player_id, current_player_id, answer_round')
      .eq('session_id', session_id)
      .eq('question_id', question_id)      
      .maybeSingle();
   
   if (questionError) {
      console.error('取得進行中的題目失敗：', questionError);
      throw questionError;
   }

   if (!question) {
      throw new Error('找不到進行中的題目');      
   }
   if (question.status !== 'active') {
      throw new Error('題目不在進行中');
   }
   if (question.phase !== 'awaiting_answer') {
      throw new Error('題目不在等待回答階段');
   }
   if (question.current_player_id !== user_id) {
      throw new Error('不是該玩家的回合');
   }
   if (question.answer_round !== answer_round) {
      throw new Error('回答輪次不符合');
   }

   const {data: updatedQuestion, error: submitAnswerError} = await supabaseAdmin
      .from('quiz_session_questions')
      .update({
         user_answer: answer,
         phase: 'awaiting_judgement',
      })
      .eq('session_id', session_id)
      .eq('question_id', question_id)
      .eq('current_player_id', user_id)
      .eq('phase', 'awaiting_answer')
      .select()
      .single();

   if (submitAnswerError) {
      console.error('提交答案失敗：', submitAnswerError);
      throw submitAnswerError;
   }

   if (!updatedQuestion) {
      throw new Error('更新題目失敗');
   }

   const {data: insertAttempt, error: insertAttemptError} = await supabaseAdmin
      .from('quiz_user_attempt')
      .insert({
         session_id: session_id,
         question_id: question_id,         
         answer: answer,
         status: 'pending',
         score: 0,
         user_id: user_id,
         answer_round: answer_round,         
      })
      .select()
      .single();
      
   if (insertAttemptError) {
      console.error('插入答案嘗試失敗：', insertAttemptError);
      throw insertAttemptError;
   }

   return {
      attempt: insertAttempt, 
      room_mode: session.room_mode
   };
}

export async function advanceToNextQuestion(session_id, user_id, expected_current_question_order, action) {
   // action: answered for next_question, skipped for skip_question
   const {data, error} = await supabaseAdmin.rpc('advance_question', {
      p_session_id: session_id,
      p_user_id: user_id,
      p_expected_current_question_order: expected_current_question_order,
      p_action: action,      
   });
   // data 有區分
   // 如果結束-> data = { game_over: true, completed_question_order:  }
   // 如果還有下一題 -> data = { game_over: false, question_id, question_order:  }
   if (error) {
      console.error('前進下一題失敗：', error);
      throw error;
   }
   return data;
}

// 房主判斷答案為錯誤
export async function markAsIncorrect(session_id, question_id, attempt_id) {
   const fail = (message, status = 409) =>
      Object.assign(new Error(message), { status });

   // 1. 確認房間仍在進行中
   const { data: session, error: sessionError } = await supabaseAdmin
      .from('quiz_sessions')
      .select('id, status')
      .eq('id', session_id)
      .maybeSingle();

   if (sessionError) 
      throw sessionError;
   if (!session) 
      throw fail('找不到房間', 404);
   if (session.status !== 'in_progress') 
      throw fail('遊戲目前不在進行中');

   // 2. 查詢題目目前的狀態
   const { data: question, error: questionError } = await supabaseAdmin
      .from('quiz_session_questions')
      .select('*')
      .eq('session_id', session_id)
      .eq('question_id', question_id)
      .maybeSingle();

   if (questionError) {
      throw questionError;
   }
   if (!question) {
      throw fail('找不到題目', 404);
   }
   if (question.status !== 'active') {
      throw fail('這不是目前進行中的題目');
   }
   if (question.phase !== 'awaiting_judgement') {
      throw fail('目前沒有等待裁定的答案');
   }
   

   // 3. 取得固定玩家順序
   const players = await getParticipant(session_id);

   if (players.length === 0) {
      throw fail('房間中沒有參賽玩家');
   }

   const currentIndex = players.findIndex(
      player => player.user_id === question.current_player_id
   );

   if (currentIndex < 0) {
      throw fail('目前回答者不在玩家名單中');
   }

   // 4. 查詢本題、本輪的全部作答紀錄
   const { data: attempts, error: attemptsError } = await supabaseAdmin
      .from('quiz_user_attempt')
      .select('*')
      .eq('session_id', session_id)
      .eq('question_id', question_id)
      .eq('answer_round', question.answer_round);

   if (attemptsError) {
      throw attemptsError;
   }

   // attemptId 必須屬於這個房間、題目與輪次
   const attempt = attempts.find(
      item => String(item.id) === String(attempt_id)
   );

   if (!attempt) {
      throw new Error('找不到這個回合的作答紀錄', 404);
   }
   if (attempt.status !== 'pending') {
      throw new Error('狀態不符合預期');
   }
   if (attempt.user_id !== question.current_player_id) {
      throw new Error('作答者不符合預期');
   }
   if (attempt.answer_round !== question.answer_round) {
      console.log(`attempt.answer_round: ${attempt.answer_round}, question.answer_round: ${question.answer_round}`);
      throw new Error('回答輪次不符合預期');
   }

   const pendingAttempts = attempts.filter(
      item => item.status === 'pending'
   );

   if (pendingAttempts.length !== 1) {
      throw new Error('本輪有多筆待裁定答案');
   }

   // 5. 計算「此次也判錯後」是否全員失敗
   const failedUserIds = new Set(
      attempts
         .filter(item => item.status === 'incorrect')
         .map(item => item.user_id)
   );

   failedUserIds.add(attempt.user_id);

   const allIncorrect = players.every(
      player => failedUserIds.has(player.user_id)
   );

   let nextPlayerId = question.current_player_id;
   let nextPhase;

   if (allIncorrect) {
      // 只暫停，不真的揭露提示或切題
      nextPhase = question.hints_revealed >= 5
         ? 'awaiting_next_question'
         : 'awaiting_next_round';
   } 
   else {
      // 從目前玩家往後找，本輪尚未答錯的下一位
      for (let offset = 1; offset <= players.length; offset++) {
         const candidate =
            players[(currentIndex + offset) % players.length];

         if (!failedUserIds.has(candidate.user_id)) {
            nextPlayerId = candidate.user_id;
            break;
         }
      }

      nextPhase = 'awaiting_answer';
   }

   // 6. 裁定指定的 attempt
   const {data: updatedAttempt, error: updateAttemptError,} = await supabaseAdmin
      .from('quiz_user_attempt')
      .update({
         status: 'incorrect',
         score: 0,
         scorer: null,
      })
      .eq('id', attempt.id)
      .eq('session_id', session_id)
      .eq('question_id', question_id)
      .eq('answer_round', question.answer_round)
      .eq('user_id', question.current_player_id)
      .eq('status', 'pending')
      .select()
      .maybeSingle();

   if (updateAttemptError) {
      throw updateAttemptError;
   }
   if (!updatedAttempt) {
      throw fail('答案狀態已更新，不能重複裁定');
   }

   // 7. 移交回答權，或停在全員失敗的階段
   const {data: updatedQuestion, error: updateQuestionError,} = await supabaseAdmin
      .from('quiz_session_questions')
      .update({
         current_player_id: nextPlayerId,
         phase: nextPhase,
      })
      .eq('session_id', session_id)
      .eq('question_id', question_id)
      .eq('status', 'active')
      .eq('phase', 'awaiting_judgement')
      .eq('current_player_id', question.current_player_id)
      .eq('answer_round', question.answer_round)
      .select('question_id, current_player_id, phase, answer_round')
      .maybeSingle();

   if (updateQuestionError) {
      throw updateQuestionError;
   }
   if (!updatedQuestion) {
      throw fail('題目狀態已更新，無法移交回答權');
   }

   return {
      attemptId: attempt_id,
      answererId: question.current_player_id,
      isCorrect: false,
      score: 0,      
   };
}


export async function markAsCorrect(session_id, question_id, attempt_id) {
   const {data: session, error: sessionError} = await supabaseAdmin
      .from('quiz_sessions')
      .select('id, status')
      .eq('id', session_id)
      .maybeSingle();

   if (sessionError) {
      throw sessionError;
   }
   if (!session) {
      throw new Error('找不到房間');
   }
   if (session.status !== 'in_progress') {
      throw new Error('遊戲目前不在進行中');
   }

   // 1. 檢查題目狀態
   const {data: question, error: questionError} = await supabaseAdmin
      .from('quiz_session_questions')
      .select('*')
      .eq('session_id', session_id)
      .eq('question_id', question_id)
      .maybeSingle();

   if (questionError) {
      throw questionError;
   }
   if (!question) {
      throw new Error('找不到題目');
   }

   if (question.status !== 'active') {
      throw new Error('題目不在進行中');
   }
   if (question.phase !== 'awaiting_judgement') {
      throw new Error('題目不在等待裁定階段');
   }

   // 2.更新 user attempt
   // 先找到當下的 user 回答
   const {data: currentAttempt, error: currentAttemptError} = await supabaseAdmin
      .from('quiz_user_attempt')
      .select('*')
      .eq('id', attempt_id)
      .eq('session_id', session_id)
      .eq('question_id', question_id)
      .maybeSingle();
   
   if (currentAttemptError) {
      throw currentAttemptError;
   }
   if (!currentAttempt) {
      throw new Error('找不到回答');
   }
   if (currentAttempt.status !== 'pending') {
      throw new Error('狀態不符合預期');
   }
   if (currentAttempt.answer_round !== question.answer_round) {
      throw new Error('回答輪次不符合預期');
   }
   if (currentAttempt.user_id !== question.current_player_id) {
      throw new Error('作答者不符合預期');
   }

   // 更新狀態
   const {data: updatedAttempt, error: updateAttemptError} = await supabaseAdmin
      .from('quiz_user_attempt')
      .update({
         status: 'correct',
         score: question.score,
         scorer: currentAttempt.user_id,
      })
      .eq('id', attempt_id)
      .eq('session_id', session_id)
      .eq('question_id', question_id)
      .eq('status', 'pending')
      .eq('user_id', question.current_player_id)
      .eq('answer_round', question.answer_round)
      .select()      
      .single();

   if (updateAttemptError) {
      throw updateAttemptError;
   }
   if (!updatedAttempt) {
      throw new Error('找不到更新後的回答');
   }

   // 3. 更新題目狀態: 狀態-以回答, 階段-等待下一題
   const {data: updatedQuestion, error: updateQuestionError} = await supabaseAdmin
      .from('quiz_session_questions')
      .update({         
         is_correct: true,
         phase: 'awaiting_next_question',
      })
      .eq('session_id', session_id)
      .eq('question_id', question_id)
      .eq('status', 'active')
      .eq('phase', 'awaiting_judgement')
      .eq('current_player_id', currentAttempt.user_id)
      .eq('answer_round', question.answer_round)
      .select()
      .single();
   
   if (updateQuestionError) {
      throw updateQuestionError;
   }
   if (!updatedQuestion) {
      throw new Error('找不到更新後的題目');
   }

   return {
      attemptId: attempt_id,
      answererId: currentAttempt.user_id,
      isCorrect: true,
      score: updatedAttempt.score,
   };
}

export async function getQuizResult(session_id) {
   // 這裡不用 .single 因為就是要取得一個 session 裡面的多筆資料
   const players = await getParticipant(session_id);
   const ranking = await getPlayerRanking(session_id, players);

   return ranking;
}
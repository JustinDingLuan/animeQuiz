import { supabaseAdmin } from './databaseAdmin.js';
import {getQuizMode} from '../shared_items/quizConfig.js';
import { getRoomPlayers } from './roomPlayers.js';

export async function getLobbyInfo(sessionId) {
   const { data, error:sessionError } = await supabaseAdmin
      .from('quiz_sessions')
      .select('room_code, room_capacity, status')
      .eq('id', sessionId)
      .single();      

   if (sessionError) {
      throw new Error(`取得房間資訊失敗：${sessionError.message}`);
   }

   // 計算總人數用
   const { count, error: countError } = await supabaseAdmin
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
      players: await getRoomPlayers(sessionId),
   }
}


function shuffle(array) {
   const result = [...array];

   for (let i = result.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));
      [result[i], result[randomIndex]] = [result[randomIndex], result[i]];
   }

   return result;
}

// 把資料庫的此 session 更新成 in_progress -> 抽題目 -> 把第一題以及提示帶到 quizPage 中
export async function startGame({sessionId, quizMode, questionCount}) {
   const normlalizedQuestionCount = Number(questionCount);
   if (!Number.isInteger(normlalizedQuestionCount) || normlalizedQuestionCount <= 0) {
      throw new Error('題目數量不正確');
   }
   // 防呆，如果已經開始就直接丟出 error
   const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('quiz_sessions')
      .select('status')
      .eq('id', sessionId)
      .single();

   if (sessionError) {
      throw new Error(`取得房間資訊失敗：${sessionError.message}`);
   }

   if (!sessionData) {
      throw new Error('房間不存在');
   }

   if (sessionData.status !== 'lobby') {
      throw new Error('只有大廳狀態可以進入遊戲');
   }
   
   // 涉及到兩個操作: 抽題目、改 session 狀態，如果有其中一個操作失敗流程就會有問題。也許可以改成 rpc 一次做好?
   const selectMode = getQuizMode(quizMode);
   if (!selectMode) {
      throw new Error('題型不正確');
   }

   const { data: questions, error: questionError } = await supabaseAdmin
      .from('questions')      
      .select('id')
      .eq('question_type', selectMode.question_type)
      .eq('answer_type', selectMode.answer_type)
      
   if (questionError) {
      throw questionError;
   }

   if (questions.length < normlalizedQuestionCount) {
      console.log(`題庫中 ${selectMode.question_type} 題目數量不足，只有 ${questions.length} 題`);
      throw new Error(
         `題庫中 ${selectMode.question_type} 題目數量不足`
      );
   }

   // 從題庫中選出對應模式的題目
   const shuffledQuestions = shuffle(questions);
   const selectedQuestions = shuffledQuestions.slice(0, normlalizedQuestionCount);
   
   // 決定每題預設回答的玩家是誰
   const players = await getRoomPlayers(sessionId);
   const playerCount = players.length;

   const quizSessionRow = selectedQuestions.map((question, index) => {
      const isFirstQuestion = index === 0;
      const startPlayer = players[index % playerCount]; // 從第一位玩家開始輪流分配


      return {
         session_id: sessionId,
         question_id: question.id,
         question_order: index + 1, // 題目索引從 1 開始
         status: isFirstQuestion ? 'active' : 'pending', // 第一題設為 current，其他設為 pending
         hints_revealed: isFirstQuestion ? 1 : 0,
         score: 500,
         is_correct: null,
         user_answer: null,
         
         start_player_id: startPlayer.user_id,
         current_player_id: startPlayer.user_id,
         answer_round: 1,
         phase: 'awaiting_answer'
      };
   });

   // 把抽出的所有題目加到 quiz_session_questions 中
   const { error: insertError } = await supabaseAdmin
      .from('quiz_session_questions')
      .insert(quizSessionRow);

   if (insertError) {
      throw insertError;
   }

   // 把此 session 的 status 改成 in_progress
   const { error: updateError } = await supabaseAdmin
      .from('quiz_sessions')
      .update({ 
         status: 'in_progress', 
         question_type: selectMode.question_type, 
         answer_type: selectMode.answer_type,
         question_count: normlalizedQuestionCount,
         start: new Date().toISOString(),
         last_activity: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('status', 'lobby'); // 防呆，避免已經開始的 session 被重複更新

   if (updateError) {
      throw updateError;
   }
}

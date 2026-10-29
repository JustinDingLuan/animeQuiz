import {supabaseAdmin} from './databaseAdmin.js';
import {checkAnswer} from './quizAnswer.js';
import { getRoomPlayers } from './roomPlayers.js';
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

export async function getQuizSessionState(sessionId) {
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

   const players = await getRoomPlayers(sessionId);

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

   return {
      session_id: session.id,
      status: session.status,
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
      },
      
      start_player_id: activeQuestion.start_player_id,
      current_player_id: activeQuestion.current_player_id,
      answer_round: activeQuestion.answer_round,
      phase: activeQuestion.phase,

      pending_answer: pendingAnswer,
   }
}

// export async function startQuizSession(sessionId, userId, quizMode, questionCount) {
//    const {data: member, error: memberError} = await supabaseAdmin   
//       .from('quiz_session_members')
//       .select('role')
//       .eq('session_id', sessionId)
//       .eq('user_id', userId)
//       .maybeSingle();

//    if (memberError) {
//       throw memberError;
//    }

//    if (member.role !== 'host') {
//       throw new Error('只有房主可以開始遊戲');
//    }

//    const selectedMode = quizModes[quizMode];
   
//    const { data: questions, error: questionError } = await supabaseAdmin
//       .from('questions')
//       .select('id')
//       .eq('question_type', selectedMode.question_type)
//       .eq('answer_type', selectedMode.answer_type);

//    if (questionError) {
//       throw questionError;
//    }

//    if (questions.length < questionCount) {
//       console.log(`題庫中 ${selectedMode.question_type} 題目數量不足，只有 ${questions.length} 題`);
//       throw new Error(
//          `題庫中 ${selectedMode.question_type} 題目數量不足`
//       );
//    }

//    const shuffledQuestions = shuffle(questions);
//    const selectedQuestions = shuffledQuestions.slice(0, questionCount);
//    const firstQuestion = selectedQuestions[0];

//    // 取得第一題的提示
//    const { data: firstHint, error: firstHintError} = await supabaseAdmin
//       .from('question_hints')
//       .select('id, hint_order, hint_text')
//       .eq('question_id', firstQuestion.id)
//       .order('hint_order', { ascending: true })
//       .limit(1)
//       .single();

//    if (firstHintError) {      
//       console.log(firstHintError);
//       throw firstHintError;
//    }

//    // 建立 session 的時間
//    const now = new Date().toISOString();
//    const {data: session, error: sessionError} = await supabaseAdmin
//       .from('quiz_sessions')
//       .update({
//          question_type: selectedMode.question_type,
//          answer_type: selectedMode.answer_type,
//          question_count: questionCount,
//          status: 'in_progress',
//          start: now,
//          last_activity: now,
//          ended: null,
//          // status 有 in_progress, completed, abandoned, lobby
//       })
//       .eq('id', sessionId)
//       .eq('status', 'lobby') // 確保只有在 lobby 狀態下才能開始遊戲
//       .maybeSingle();

//    if (sessionError) {
//       console.log(sessionError);
//       throw sessionError;
//    }

//    // 建立題目紀錄，用 map 會建立所有的 rows，只是因為我們會傳第一題回去的時候，他的狀態是 active
//    const quizSessionRows = selectedQuestions.map((question, index) => {
//       const isFirstQuestion = (index === 0);
//       return {
//          session_id: sessionId,
//          question_id: question.id,
//          question_order: index + 1,
//          status: isFirstQuestion ? 'active' : 'pending',
//          hints_revealed: isFirstQuestion ? 1 : 0,
//          score: 500,
//          is_correct: null,
//          user_answer: null,
//       };
//    });

//    const { error: quizSessionError } = await supabaseAdmin
//       .from('quiz_session_questions')
//       .insert(quizSessionRows);

//    if (quizSessionError) {
//       console.log('建立題目紀錄失敗：', quizSessionError);
//       throw quizSessionError;
//    }   
      
//    return {
//       session_id: sessionId,
//       question_count: questionCount,
//       // 給前端用的
//       current_question: {
//          question_id: firstQuestion.id,
//          question_order: 1,
//          hint: {
//             hint_order: firstHint.hint_order,
//             hint_text: firstHint.hint_text,
//          },
//          hints_revealed: 1,
//          available_score: 500,
//       }
//    }
// }

// export async function createQuizSession(quizMode, questionCount) {
//    console.log(quizMode);
//    console.log(quizModes[quizMode]);
//    const selectedMode = quizModes[quizMode];
   
//    const { data: questions, error: questionError } = await supabaseAdmin
//       .from('questions')
//       .select('id')
//       .eq('question_type', selectedMode.question_type)
//       .eq('answer_type', selectedMode.answer_type);

//    if (questionError) {
//       throw questionError;
//    }

//    if (questions.length < questionCount) {
//       console.log(`題庫中 ${selectedMode.question_type} 題目數量不足，只有 ${questions.length} 題`);
//       throw new Error(
//          `題庫中 ${selectedMode.question_type} 題目數量不足`
//       );
//    }

//    const shuffledQuestions = shuffle(questions);
//    const selectedQuestions = shuffledQuestions.slice(0, questionCount);
//    const firstQuestion = selectedQuestions[0];

//    // 取得第一題的提示
//    const { data: firstHint, error: firstHintError} = await supabaseAdmin
//       .from('question_hints')
//       .select('id, hint_order, hint_text')
//       .eq('question_id', firstQuestion.id)
//       .order('hint_order', { ascending: true })
//       .limit(1)
//       .single();

//    if (firstHintError) {      
//       console.log(firstHintError);
//       throw firstHintError;
//    }
//    // 建立 session 的時間
//    const now = new Date().toISOString();
//    const {data: session, error: sessionError} = await supabaseAdmin
//       .from('quiz_sessions')
//       .insert({
//          question_type: selectedMode.question_type,
//          answer_type: selectedMode.answer_type,
//          question_count: questionCount,
//          status: 'in_progress',
//          start: now,
//          last_activity: now,
//          ended: null,
//          // status 有 in_progress, completed, abandoned
//       })
//       .select('id')
//       .single();

//    if (sessionError) {
//       console.log(sessionError);
//       throw sessionError;
//    }


//    // 建立題目紀錄，用 map 會建立所有的 rows，只是因為我們會傳第一題回去的時候，他的狀態是 active
//    const quizSessionRows = selectedQuestions.map((question, index) => {
//       const isFirstQuestion = (index === 0);
//       return {
//          session_id: session.id,
//          question_id: question.id,
//          question_order: index + 1,
//          status: isFirstQuestion ? 'active' : 'pending',
//          hints_revealed: isFirstQuestion ? 1 : 0,
//          score: 500,
//          is_correct: null,
//          user_answer: null,
//       };
//    });

//    const { error: quizSessionError } = await supabaseAdmin
//       .from('quiz_session_questions')
//       .insert(quizSessionRows); 
//    if (quizSessionError) {
//       console.log('建立題目紀錄失敗：', quizSessionError);
//       throw quizSessionError;
//    }   
      
//    return {
//       session_id: session.id,
//       question_count: questionCount,
//       // 給前端用的
//       current_question: {
//          question_id: firstQuestion.id,
//          question_order: 1,
//          hint: {
//             hint_order: firstHint.hint_order,
//             hint_text: firstHint.hint_text,
//          },
//          hints_revealed: 1,
//          available_score: 500,
//       }
//    }
// }

export async function revealNextHint(sessionId) {
   const {data: sessionQuestions, error: sessionQuestionsError} = await supabaseAdmin
      .from('quiz_session_questions')
      .select(`
         session_id,
         question_id,
         question_order,
         hints_revealed,
         status,
         score,
         is_correct
      `)
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

export async function checkQuizAnswer(sessionId, userAnswer) {
   const {data: sessionQuestions, error: sessionQuestionsError} = await supabaseAdmin
      .from('quiz_session_questions')
      .select(`
         session_id,
         question_id,
         question_order,
         hints_revealed,
         status,
         score,
         is_correct
      `)
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
   
   // 好像不用 update score，因為在揭露提示的時候就已經更新 score 了
   const {data: updatedQuestion, error: updateQuestionError} = await supabaseAdmin
      .from('quiz_session_questions')
      .update({
         user_answer: userAnswer.trim(),
         is_correct: isCorrect,
      })
      .eq('session_id', sessionQuestions.session_id)
      .eq('question_id', sessionQuestions.question_id)
      .eq('status', 'active')      
      .select('score, is_correct')
      .single();

   if (updateQuestionError) {
      throw updateQuestionError;
   }

   const {error: updateActivityError} = await supabaseAdmin
      .from('quiz_sessions')
      .update({last_activity: new Date().toISOString()})
      .eq('id', sessionId);

   if (updateActivityError) {
      throw updateActivityError;
   }

   const currentTotalScore = await getCurrentTotalScore(sessionId);

   return {
      current_total_score: currentTotalScore,
      question_order: sessionQuestions.question_order,
      is_correct: updatedQuestion.is_correct,
      score: updatedQuestion.is_correct
         ? updatedQuestion.score
         : 0,
      available_score: updatedQuestion.score,
      already_answered: false,
      is_last_question: sessionQuestions.question_order === sessionQuestions.question_count,
   };
}

// async function getSessionQuestion(sessionId, questionOrder, status, mustExist=true) {
//    if (!sessionId) {
//       throw new Error('Session ID is required');
//    }
   
//    if (questionOrder === null && status === null) {
//       console.log('Either question order or status must be provided');
//       throw new Error('Either question order or status must be provided');
//    }

//    let query = supabaseAdmin
//       .from('quiz_session_questions')
//       .select('*')
//       .eq('session_id', sessionId)
   
//    if (questionOrder !== null) {
//       query = query.eq('question_order', questionOrder);
//    }

//    if (status !== null) {
//       query = query.eq('status', status);
//    }   

//    const {data: question, error: questionError} = mustExist ? await query.single() : await query.maybeSingle();   
//    if (questionError) {
//       console.error('取得進行中的題目失敗：', questionError);
//       throw questionError;
//    }

//    if (mustExist && !question) {
//       console.error('找不到進行中的題目');
//       throw new Error('找不到進行中的題目');
//    }

//    return question;
// }

// async function updateSessionQuestion(sessionId, questionOrder, expectedStatus, updates) {
//    const {data: updatedQuestion, error: updateQuestionError} = await supabaseAdmin
//       .from('quiz_session_questions')
//       .update(updates)
//       .eq('session_id', sessionId)
//       .eq('question_order', questionOrder)
//       .eq('status', expectedStatus)
//       .select()
//       .single();

//    if (updateQuestionError) {
//       console.error(`更新題目狀態失敗：`, updateQuestionError);
//       throw updateQuestionError;
//    }

//    return updatedQuestion;
// }

// async function updateSessionStatus(sessionId, newStatus) {
//    const {data: updatedSession, error: updateSessionError} = await supabaseAdmin
//       .from('quiz_sessions')
//       .update({status: newStatus, last_activity: new Date().toISOString()})
//       .eq('id', sessionId)
//       .select()
//       .single();

//    if (updateSessionError) {
//       console.error(`更新測驗狀態為 ${newStatus} 失敗：`, updateSessionError);
//       throw updateSessionError;
//    }

//    return updatedSession;
// }

// export async function nextQuestion(sessionId) {
//    const currentQuestion = await getSessionQuestion(sessionId, null, 'active', true);

//    // 更新目前題目的狀態為 answered
//    const updatedQuestion = await updateSessionQuestion(sessionId, currentQuestion.question_order, 'active', { status: 'answered' });   

//    const nextQuestionOrder = currentQuestion.question_order + 1;
//    const nextQuestion = await getSessionQuestion(sessionId, nextQuestionOrder, 'pending', false);

//    if (!nextQuestion) {
//       // 如果是最後一題，直接回傳 game_over = true，交給前端跳轉畫面
//       // 並且更新此次 session 的狀態為 completed
//       const updatedSession = await updateSessionStatus(sessionId, 'completed');

//       return {
//          // current_total_score: currentTotalScore,
//          message: '已經是最後一題',
//          game_over: true,
//       };
//    }

//    // 有下一題 => 先拿下一題的第一個提示
//    const {data: firstHint, error: firstHintError} = await supabaseAdmin
//       .from('question_hints')
//       .select('id, hint_order, hint_text')
//       .eq('question_id', nextQuestion.question_id)
//       .order('hint_order', { ascending: true })
//       .limit(1)
//       .single();

//    if (firstHintError) {
//       console.error('取得下一題的第一個提示失敗：', firstHintError);
//       throw firstHintError;
//    }

//    // 更新下一題的狀態為 active
//    const updatedNextQuestion = await updateSessionQuestion(sessionId, nextQuestion.question_order, 'pending', { status: 'active', hints_revealed: 1 });

//    const {error: updateActivityError} = await supabaseAdmin
//       .from('quiz_sessions')
//       .update({last_activity: new Date().toISOString()})
//       .eq('id', sessionId);
      
//    if (updateActivityError) {
//       console.error('更新最後互動時間失敗：', updateActivityError);
//       throw updateActivityError;
//    }

//    return {
//       // current_total_score: currentTotalScore,
//       next_question: {
//          question_id: nextQuestion.question_id,
//          question_order: nextQuestion.question_order,
//          hint: {
//             hint_order: firstHint.hint_order,
//             hint_text: firstHint.hint_text,
//          },
//          hints_revealed: 1,
//          available_score: nextQuestion.score,
//       }
//    };
// }

// export async function skipQuestion(sessionId) {
//    const currentQuestion = await getSessionQuestion(sessionId, null, 'active', true);
//    const {data: totalScore, error: currentScoreError} = await supabaseAdmin
//       .from('quiz_session_questions')
//       .select('score')
//       .eq('session_id', sessionId)      
//       .eq('status', 'answered')
//       .eq('is_correct', true);

//    if (currentScoreError) {
//       console.error('取得目前總分失敗：', currentScoreError);
//       throw currentScoreError;
//    }

//    const currentTotalScore = totalScore.reduce((sum, item) => sum + item.score, 0);

//    // 更新目前題目的狀態為 skipped
//    const updatedCurrentQuestion = await updateSessionQuestion(sessionId, currentQuestion.question_order, 'active', { status: 'skipped' });
   
   
//    // 帶出下一題
//    const nextQuestionOrder = currentQuestion.question_order + 1;
//    const nextQuestion = await getSessionQuestion(sessionId, nextQuestionOrder, 'pending', false);
//    if (!nextQuestion) {
//       // 如果是最後一題，直接回傳 game_over = true，交給前端跳轉畫面
//       // 並且更新此次 session 的狀態為 completed
//       const updatedSession = await updateSessionStatus(sessionId, 'completed');

//       return {
//          current_total_score: currentTotalScore,
//          message: '已經是最後一題',
//          game_over: true,
//       };
//    }

//    const {data: firstHint, error: firstHintError} = await supabaseAdmin
//       .from('question_hints')
//       .select('id, hint_order, hint_text')
//       .eq('question_id', nextQuestion.question_id)
//       .order('hint_order', { ascending: true })
//       .limit(1)
//       .single();

//    if (firstHintError) {
//       console.error('取得下一題的第一個提示失敗：', firstHintError);
//       throw firstHintError;
//    }

//    // 更新下一題的狀態為 active
//    const updatedNextQuestion = await updateSessionQuestion(sessionId, nextQuestion.question_order, 'pending', { status: 'active', hints_revealed: 1 });

//    const {error: updateActivityError} = await supabaseAdmin
//       .from('quiz_sessions')
//       .update({last_activity: new Date().toISOString()})
//       .eq('id', sessionId);
      
//    if (updateActivityError) {
//       console.error('更新最後互動時間失敗：', updateActivityError);
//       throw updateActivityError;
//    }
   
//    return {
//       current_total_score: currentTotalScore,
//       message: '已跳過目前題目',
//       next_question: {
//          question_id: nextQuestion.question_id,
//          question_order: nextQuestion.question_order,
//          hint: {
//             hint_order: firstHint.hint_order,
//             hint_text: firstHint.hint_text,
//          },
//          hints_revealed: 1,
//          available_score: nextQuestion.score,
//       },
//       game_over: false,
//    };
// }

export async function userSubmitAnswer(session_id, user_id, question_id, answer, answer_round) {
   // 檢查 session 是否存在且進行中
   const {data: session, error: sessionError} = await supabaseAdmin
      .from('quiz_sessions')
      .select('id, status')
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

   return insertAttempt;
}

export async function advance_to_next_question(session_id, user_id, expected_current_question_order, action) {
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

   // const state = await getQuizSessionState(session_id); 



   return data;
}

export async function getQuizResult(session_id) {
   // 這裡不用 .single 因為就是要取得一個 session 裡面的多筆資料
   const {data: sessionQuestions, error: sessionQuestionsError} = await supabaseAdmin
      .from('quiz_session_questions')
      .select(`
         question_id,
         question_order,
         hints_revealed,
         status,
         score,
         is_correct
      `)
      .eq('session_id', session_id)
      // 每個 row 是會被覆寫的，所以不用確定狀態已經是 answered 才計算分數

   if (sessionQuestionsError) {
      console.error('取得題目紀錄失敗：', sessionQuestionsError);
      throw sessionQuestionsError;
   }

   const totalScore = sessionQuestions.reduce((sum, item) => sum + (item.is_correct ? item.score : 0), 0);

   return {
      current_total_score: totalScore,
   };
}

// 測試用，給房主判斷答案為錯誤
export async function markAsIncorrect(session_id, question_id, attempt_id) {
   const fail = (message, status = 409) =>
      Object.assign(new Error(message), { status });

   // 1. 確認房間仍在進行中
   const { data: session, error: sessionError } = await supabaseAdmin
      .from('quiz_sessions')
      .select('id, status')
      .eq('id', session_id)
      .maybeSingle();

   if (sessionError) throw sessionError;
   if (!session) throw fail('找不到房間', 404);
   if (session.status !== 'in_progress') {
      throw fail('遊戲目前不在進行中');
   }

   // 2. 查詢題目目前的狀態
   const { data: question, error: questionError } = await supabaseAdmin
      .from('quiz_session_questions')
      .select(`
         question_id,
         status,
         phase,
         start_player_id,
         current_player_id,
         answer_round,
         hints_revealed
      `)
      .eq('session_id', session_id)
      .eq('question_id', question_id)
      .maybeSingle();

   if (questionError) throw questionError;
   if (!question) throw fail('找不到題目', 404);
   if (question.status !== 'active') {
      throw fail('這不是目前進行中的題目');
   }
   if (question.phase !== 'awaiting_judgement') {
      throw fail('目前沒有等待裁定的答案');
   }

   // 3. 取得固定玩家順序
   const players = await getRoomPlayers(session_id);

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
      .select('id, user_id, status')
      .eq('session_id', session_id)
      .eq('question_id', question_id)
      .eq('answer_round', question.answer_round);

   if (attemptsError) throw attemptsError;

   // attemptId 必須屬於這個房間、題目與輪次
   const attempt = attempts.find(
      item => String(item.id) === String(attempt_id)
   );

   if (!attempt) {
      throw fail('找不到這個回合的作答紀錄', 404);
   }
   if (attempt.status !== 'pending') {
      throw fail('這筆答案已經裁定過了');
   }
   if (attempt.user_id !== question.current_player_id) {
      throw fail('這筆答案不屬於目前回答者');
   }

   const pendingAttempts = attempts.filter(
      item => item.status === 'pending'
   );

   if (pendingAttempts.length !== 1) {
      throw fail('本輪有多筆待裁定答案，請先檢查資料');
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
         : 'awaiting_next_hint';
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

   if (updateAttemptError) throw updateAttemptError;
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

   if (updateQuestionError) throw updateQuestionError;
   if (!updatedQuestion) {
      throw fail('題目狀態已更新，無法移交回答權');
   }

   return {
      attempt: updatedAttempt,
      all_incorrect: allIncorrect,
      current_player_id: updatedQuestion.current_player_id,
      phase: updatedQuestion.phase,
      answer_round: updatedQuestion.answer_round,
   };
}

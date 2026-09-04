import {supabaseAdmin} from './databaseAdmin.js';
import {checkAnswer} from './quizAnswer.js';

function shuffle(array) {
   const result = [...array];

   for (let i = result.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));
      [result[i], result[randomIndex]] = [result[randomIndex], result[i]];
   }

   return result;
}

export async function createQuizSession(questionType, questionCount) {
   const { data: questions, error } = await supabaseAdmin
      .from('questions')
      .select('id')
      .eq('question_type', questionType);
   if (error) {
      throw error;
   }

   if (questions.length < questionCount) {
      throw new Error(
         `題庫中 ${questionType} 題目數量不足`
      );
   }

   const shuffledQuestions = shuffle(questions);
   const selectedQuestions = shuffledQuestions.slice(0, questionCount);
   const firstQuestion = selectedQuestions[0];

   // 取得第一題的提示
   const { data: firstHint, error: firstHintError} = await supabaseAdmin
      .from('question_hints')
      .select('id, hint_order, hint_text')
      .eq('question_id', firstQuestion.id)
      .order('hint_order', { ascending: true })
      .limit(1)
      .single();

   if (firstHintError) {
      throw firstHintError;
   }
   // 建立 session 的時間
   const now = new Date().toISOString();
   const {data: session, error: sessionError} = await supabaseAdmin
      .from('quiz_sessions')
      .insert({
         question_type: questionType,
         question_count: questionCount,
         status: 'in_progress',
         start: now,
         last_activity: now,
         ended: null,
         // status 有 in_progress, completed, abandoned
      })
      .select('id')
      .single();

   if (sessionError) {
      throw sessionError;
   }


   // 建立題目紀錄，用 map 會建立所有的 rows，只是因為我們會傳第一題回去的時候，他的狀態是 active
   const quizSessionRows = selectedQuestions.map((question, index) => {
      const isFirstQuestion = (index === 0);
      return {
         session_id: session.id,
         question_id: question.id,
         question_order: index + 1,
         status: isFirstQuestion ? 'active' : 'pending',
         hints_revealed: isFirstQuestion ? 1 : 0,
         score: 500,
         is_correct: null,
         user_answer: null,
      };
   });

   const { error: quizSessionError } = await supabaseAdmin
      .from('quiz_session_questions')
      .insert(quizSessionRows); 
   if (quizSessionError) {
      throw quizSessionError;
   }   
      
   return {
      session_id: session.id,
      question_count: questionCount,
      // 給前端用的
      current_question: {
         question_id: firstQuestion.id,
         question_order: 1,
         hint: {
            hint_order: firstHint.hint_order,
            hint_text: firstHint.hint_text,
         },
         hints_revealed: 1,
         available_score: 500,
      }
   }
}

export async function revealNextHint(sessionId) {
   const {data: sessionQuestions, error: sessionQuestionsError} = await supabaseAdmin
      .from('quiz_session_questions')
      .select(`
         session_id,
         question_id,
         question_order,
         hints_revealed,
         status,
         score
      `)
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .single();
      
   if (sessionQuestionsError) {
      throw sessionQuestionsError;
   }

   if (!sessionQuestions) {
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
   
   if (!sessionQuestions.is_correct === true) {
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
      console.error('取得目前總分失敗：', currentScoreError);
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
         is_correct: true,
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

async function getSessionQuestion(sessionId, questionOrder, status, mustExist=true) {
   if (!sessionId) {
      throw new Error('Session ID is required');
   }
   
   if (questionOrder === null && status === null) {
      console.log('Either question order or status must be provided');
      throw new Error('Either question order or status must be provided');
   }

   let query = supabaseAdmin
      .from('quiz_session_questions')
      .select(`
         session_id,
         question_id,
         question_order,
         hints_revealed,
         status,
         score
      `)
      .eq('session_id', sessionId)
   
   if (questionOrder !== null) {
      query = query.eq('question_order', questionOrder);
   }

   if (status !== null) {
      query = query.eq('status', status);
   }   

   const {data: question, error: questionError} = mustExist ? await query.single() : await query.maybeSingle();   
   if (questionError) {
      console.error('取得進行中的題目失敗：', questionError);
      throw questionError;
   }

   if (mustExist && !question) {
      console.error('找不到進行中的題目');
      throw new Error('找不到進行中的題目');
   }

   return question;
}

async function updateSessionQuestion(sessionId, questionOrder, expectedStatus, updates) {
   const {data: updatedQuestion, error: updateQuestionError} = await supabaseAdmin
      .from('quiz_session_questions')
      .update(updates)
      .eq('session_id', sessionId)
      .eq('question_order', questionOrder)
      .eq('status', expectedStatus)
      .select()
      .single();

   if (updateQuestionError) {
      console.error(`更新題目狀態為 ${newStatus} 失敗：`, updateQuestionError);
      throw updateQuestionError;
   }

   return updatedQuestion;
}

async function updateSessionStatus(sessionId, newStatus) {
   const {data: updatedSession, error: updateSessionError} = await supabaseAdmin
      .from('quiz_sessions')
      .update({status: newStatus, last_activity: new Date().toISOString()})
      .eq('id', sessionId)
      .select()
      .single();

   if (updateSessionError) {
      console.error(`更新測驗狀態為 ${newStatus} 失敗：`, updateSessionError);
      throw updateSessionError;
   }

   return updatedSession;
}

export async function nextQuestion(sessionId) {
   const currentQuestion = await getSessionQuestion(sessionId, null, 'active', true);

   // 更新目前題目的狀態為 answered
   const updatedQuestion = await updateSessionQuestion(sessionId, currentQuestion.question_order, 'active', { status: 'answered' });   

   const nextQuestionOrder = currentQuestion.question_order + 1;
   const nextQuestion = await getSessionQuestion(sessionId, nextQuestionOrder, 'pending', false);

   if (!nextQuestion) {
      // 如果是最後一題，直接回傳 game_over = true，交給前端跳轉畫面
      // 並且更新此次 session 的狀態為 completed
      const updatedSession = await updateSessionStatus(sessionId, 'completed');

      return {
         // current_total_score: currentTotalScore,
         message: '已經是最後一題',
         game_over: true,
      };
   }

   // 有下一題 => 先拿下一題的第一個提示
   const {data: firstHint, error: firstHintError} = await supabaseAdmin
      .from('question_hints')
      .select('id, hint_order, hint_text')
      .eq('question_id', nextQuestion.question_id)
      .order('hint_order', { ascending: true })
      .limit(1)
      .single();

   if (firstHintError) {
      console.error('取得下一題的第一個提示失敗：', firstHintError);
      throw firstHintError;
   }

   // 更新下一題的狀態為 active
   const updatedNextQuestion = await updateSessionQuestion(sessionId, nextQuestion.question_order, 'pending', { status: 'active', hints_revealed: 1 });

   const {error: updateActivityError} = await supabaseAdmin
      .from('quiz_sessions')
      .update({last_activity: new Date().toISOString()})
      .eq('id', sessionId);
      
   if (updateActivityError) {
      console.error('更新最後互動時間失敗：', updateActivityError);
      throw updateActivityError;
   }

   return {
      // current_total_score: currentTotalScore,
      next_question: {
         question_id: nextQuestion.question_id,
         question_order: nextQuestion.question_order,
         hint: {
            hint_order: firstHint.hint_order,
            hint_text: firstHint.hint_text,
         },
         hints_revealed: 1,
         available_score: nextQuestion.score,
      }
   };
}

export async function skipQuestion(sessionId) {
   const currentQuestion = await getSessionQuestion(sessionId, null, 'active', true);
   const {data: totalScore, error: currentScoreError} = await supabaseAdmin
      .from('quiz_session_questions')
      .select('score')
      .eq('session_id', sessionId)      
      .eq('status', 'answered')
      .eq('is_correct', true);

   if (currentScoreError) {
      console.error('取得目前總分失敗：', currentScoreError);
      throw currentScoreError;
   }

   const currentTotalScore = totalScore.reduce((sum, item) => sum + item.score, 0);

   // 更新目前題目的狀態為 skipped
   const updatedCurrentQuestion = await updateSessionQuestion(sessionId, currentQuestion.question_order, 'active', { status: 'skipped' });
   
   
   // 帶出下一題
   const nextQuestionOrder = currentQuestion.question_order + 1;
   const nextQuestion = await getSessionQuestion(sessionId, nextQuestionOrder, 'pending', false);
   if (!nextQuestion) {
      // 如果是最後一題，直接回傳 game_over = true，交給前端跳轉畫面
      // 並且更新此次 session 的狀態為 completed
      const updatedSession = await updateSessionStatus(sessionId, 'completed');

      return {
         current_total_score: currentTotalScore,
         message: '已經是最後一題',
         game_over: true,
      };
   }

   const {data: firstHint, error: firstHintError} = await supabaseAdmin
      .from('question_hints')
      .select('id, hint_order, hint_text')
      .eq('question_id', nextQuestion.question_id)
      .order('hint_order', { ascending: true })
      .limit(1)
      .single();

   if (firstHintError) {
      console.error('取得下一題的第一個提示失敗：', firstHintError);
      throw firstHintError;
   }

   // 更新下一題的狀態為 active
   const updatedNextQuestion = await updateSessionQuestion(sessionId, nextQuestion.question_order, 'pending', { status: 'active', hints_revealed: 1 });

   const {error: updateActivityError} = await supabaseAdmin
      .from('quiz_sessions')
      .update({last_activity: new Date().toISOString()})
      .eq('id', sessionId);
      
   if (updateActivityError) {
      console.error('更新最後互動時間失敗：', updateActivityError);
      throw updateActivityError;
   }
   
   return {
      current_total_score: currentTotalScore,
      message: '已跳過目前題目',
      next_question: {
         question_id: nextQuestion.question_id,
         question_order: nextQuestion.question_order,
         hint: {
            hint_order: firstHint.hint_order,
            hint_text: firstHint.hint_text,
         },
         hints_revealed: 1,
         available_score: nextQuestion.score,
      },
      game_over: false,
   };
}

export async function getQuizResult(sessionId) {
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
      .eq('session_id', sessionId)
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

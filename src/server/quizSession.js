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
      sessionId: session.id,
      questionCount: questionCount,
      // 給前端用的
      currentQuestion: {
         questionId: firstQuestion.id,
         questionOrder: 1,
         hint: {
            order: firstHint.hint_order,
            text: firstHint.hint_text,
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
   const next_hint_order = sessionQuestions.hints_revealed + 1;
   const {data: nextHint, error: nextHintError} = await supabaseAdmin
   .from('question_hints')
   .select('id, hint_order, hint_text')
   .eq('question_id', sessionQuestions.question_id)
   .eq('hint_order', next_hint_order)
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
   const new_score = Math.max(100, 600 - next_hint_order * 100);

   // 更新資料庫裡面關於 question 的紀錄
   const {data: updatedQuestion, error: updateQuestionError} = await supabaseAdmin
      .from('quiz_session_questions')
      .update({ hints_revealed: next_hint_order, score: new_score })
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
         order: nextHint.hint_order,
         text: nextHint.hint_text,
      },
      hints_revealed: next_hint_order,
      available_score: new_score,
      has_next_hint: next_hint_order < 5,
   }   
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
         is_correct: true,
         score: sessionQuestions.score,
         available_score: sessionQuestions.score,
         already_answered: true,
      };
   }

   // quizAnswer.js 只負責依 question_id 比對角色名稱與 aliases。
   const is_correct = await checkAnswer(sessionQuestions.question_id, userAnswer);

   // 好像不用 update score，因為在揭露提示的時候就已經更新 score 了
   const {data: updatedQuestion, error: updateQuestionError} = await supabaseAdmin
      .from('quiz_session_questions')
      .update({
         user_answer: userAnswer.trim(),
         is_correct: is_correct,
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

   return {
      is_correct: updatedQuestion.is_correct,
      score: updatedQuestion.is_correct
         ? updatedQuestion.score
         : 0,
      available_score: updatedQuestion.score,
      already_answered: false,
   };
}

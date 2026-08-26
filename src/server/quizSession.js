import {supabaseAdmin} from './databaseAdmin.js';

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
         availableScore: 500,
      }
   }
}
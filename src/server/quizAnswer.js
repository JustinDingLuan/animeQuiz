import {supabaseAdmin} from './databaseAdmin.js';

function normalizeAnswer(answer) {
   // 也可以用 .replace(/\s+/g, '') 來移除所有空白字元
   // \s 表示任何空白字元，+ 表示 compiler regular expression 裡面學過的 1 or 多次，g 表示 global flag => 全句搜尋
   return answer.trim().toLowerCase();
}

async function checkCharacterAnswer(questionId, userAnswer) {
   // .single() 會資料變成物件，這樣才可以直接使用 .display_name 取得資料
   // 如果 data 有不等於一筆的資料 => data = null
   const {data: groundTruth, error:relationError} = await supabaseAdmin.from('character_question_answers')
   .select('character_id')
   .eq('question_id', questionId)
   .single();

   if (relationError) {
      throw relationError;
   }

   const {data: character, error: characterError} = await supabaseAdmin.from('characters')
   .select('display_name, aliases')
   .eq('id', groundTruth.character_id)
   .single();

   if (characterError) {
      throw characterError;
   }

   const normalizedUserAnswer = normalizeAnswer(userAnswer);
   const acceptedAnswers = [character.display_name, ...(character.aliases ?? [])];
   console.log(`acceptedAnswers: ${acceptedAnswers}, normalizedUserAnswer: ${normalizedUserAnswer}`);

   return acceptedAnswers.some(
      (answer) => {return normalizeAnswer(answer) === normalizedUserAnswer;}
   );
}

async function checkAnimeAnswer(questionId, userAnswer) {
   const {data: groundTruth, error:relationError} = await supabaseAdmin.from('anime_question_answers')
   .select('anime_id')
   .eq('question_id', questionId)
   .single();

   if (relationError) {
      console.log(`relationError: ${relationError}`);
      throw relationError;
   }

   const {data: anime, error: animeError} = await supabaseAdmin.from('animes')
   .select('title, aliases')
   .eq('id', groundTruth.anime_id)
   .single();

   if (animeError) {
      console.log(`animeError: ${animeError}`);
      throw animeError;
   }
   
   const normalizedUserAnswer = normalizeAnswer(userAnswer);
   const acceptedAnswers = [anime.title, ...(anime.aliases ?? [])];
   console.log(`acceptedAnswers: ${acceptedAnswers}, normalizedUserAnswer: ${normalizedUserAnswer}`);

   return acceptedAnswers.some(
      (answer) => {return normalizeAnswer(answer) === normalizedUserAnswer;}
   );
}

export async function checkAnswer(questionId, userAnswer) {
   const {data: question, error: questionError} = await supabaseAdmin.from('questions')
   .select('answer_type')
   .eq('id', questionId)
   .single();

   if (questionError) {
      throw questionError;
   }

   // console.log(`questionId: ${questionId}, userAnswer: ${userAnswer}, answer_type: ${question.answer_type}`);

   if (question.answer_type === 'character') {
      return await checkCharacterAnswer(questionId, userAnswer);
   } 
   else if (question.answer_type === 'anime') {
      return await checkAnimeAnswer(questionId, userAnswer);
   }
   else {
      throw new Error(`不支援的 answer_type: ${question.answer_type}`);
   }
}

export async function getAnswer(sessionId) {   
   const {data: session, error: sessionError} = await supabaseAdmin.from('quiz_sessions')
      .select('answer_type')
      .eq('id', sessionId)      
      .maybeSingle();

   if (!session) {
      throw new Error('找不到遊戲');
   }
   
   if (sessionError) {
      throw sessionError;
   }
   
   const answerType = session?.answer_type;
   if (!answerType) {
      throw new Error('找不到遊戲的 answer_type');
   }

   const {data: question, error: questionError} = await supabaseAdmin.from('quiz_session_questions')
      .select('question_id')
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .maybeSingle();

   if (questionError) {
      throw questionError;
   }

   const questionId = question?.question_id;   
   if (!questionId) {
      throw new Error('找不到正在進行的題目');
   }
   
   if (answerType === 'character') {
      const {data: groundTruth, error:relationError} = await supabaseAdmin.from('character_question_answers')
      .select('character_id')
      .eq('question_id', questionId)
      .single();

      if (relationError) {
         console.error("查詢答案失敗");
         throw relationError;
      }
      
      const {data: character, error: characterError} = await supabaseAdmin.from('characters')
      .select('display_name, aliases')
      .eq('id', groundTruth.character_id)
      .single();

      if (characterError) {
         console.error("查詢角色失敗");
         throw characterError;
      }

      return {
         questionId: questionId,
         answer: [character.display_name, ...(character.aliases ?? [])]
      }
   }
   else if (answerType === 'anime') {
      const {data: groundTruth, error:relationError} = await supabaseAdmin.from('anime_question_answers')
      .select('anime_id')
      .eq('question_id', questionId)
      .single();

      if (relationError) {
         console.error("查詢答案失敗");
         throw relationError;
      }
      
      const {data: anime, error: animeError} = await supabaseAdmin.from('animes')
      .select('title, aliases')
      .eq('id', groundTruth.anime_id)
      .single();

      if (animeError) {
         console.error("查詢動畫失敗");
         throw animeError;
      }
      return {
         questionId: questionId,
         answer: [anime.title, ...(anime.aliases ?? [])]
      }
   }
   else {
      throw new Error(`不支援的 answer_type: ${answerType}`);
   }
}
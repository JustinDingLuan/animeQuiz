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

   const {data: character, error:error} = await supabaseAdmin.from('characters')
   .select('display_name, aliases')
   .eq('id', groundTruth.character_id)
   .single();

   if (error) {
      throw error;
   }

   const normalizedUserAnswer = normalizeAnswer(userAnswer);
   const acceptedAnswers = [character.display_name, ...(character.aliases ?? [])];
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
   else {
      throw new Error(`不支援的 answer_type: ${question.answer_type}`);
   }
   
   return false;
}

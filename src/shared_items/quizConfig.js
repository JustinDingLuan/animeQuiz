export const QUIZ_MODES = Object.freeze({
   five_hints_guess_character: Object.freeze({
      question_type: 'five_hints',
      answer_type: 'character',
      label: '五提示猜角色',
   }),

   five_hints_guess_anime: Object.freeze({
      question_type: 'five_hints',
      answer_type: 'anime',
      label: '五提示猜動畫',
   }),
});

export function getQuizMode(quizMode) {
   return QUIZ_MODES[quizMode] ?? null;
}

import express from 'express';
import { checkAnswer } from './quizAnswer.js';

const app = express();

app.use(express.json());

app.post(
  '/api/check-answer',
  async (request, response) => {
    const {
      questionId,
      userAnswer,
    } = request.body;

    if (
      !Number.isInteger(questionId) ||
      typeof userAnswer !== 'string' ||
      !userAnswer.trim()
    ) {
      return response.status(400).json({
        message: '題目 ID 或答案格式錯誤',
      });
    }

    try {
      const isCorrect = await checkAnswer(
        questionId,
        userAnswer
      );

      return response.status(200).json({
        isCorrect,
      });
    } catch (error) {
      console.error(
        '答案判斷失敗：',
        error
      );

      return response.status(500).json({
        message: '答案判斷失敗',
      });
    }
  }
);

app.listen(3000, '0.0.0.0', () => {
   console.log(
      'Backend running at http://localhost:3000'
   );
});
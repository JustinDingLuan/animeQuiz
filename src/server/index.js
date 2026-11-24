import express from 'express';
import path from 'node:path';
import 'dotenv/config';

import roomRoutes from './routes/room.routes.js';
import quizRoutes from './routes/quiz.routes.js';

// 透過 express 建立一個 HTTP server，並且設定好各種 API endpoint，讓前端可以透過 HTTP request 來跟後端互動。
const app = express();
// 確定每個 api 到底花了多長時間
app.use('/api', (request, response, next) => {
  const startedAt = performance.now();

  response.once('finish', () => {
    const elapsed = performance.now() - startedAt;

    console.log(
      `[API] ${request.method} ${request.originalUrl} ` +
      `${response.statusCode} ${elapsed.toFixed(2)} ms`
    );
  });

  next();
});

app.use(express.json());

app.use('/api', roomRoutes);
app.use('/api', quizRoutes);

const frontEndPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(frontEndPath));

const port =
  Number(process.env.PORT) || 3000;

app.listen(port, '0.0.0.0', () => {
  console.log(
    `Backend running at http://localhost:${port}`
  );
});
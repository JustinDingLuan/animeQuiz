import {Routes, Route} from 'react-router-dom';
import RoomSetupPage from './client/pages/roomSetupPage.jsx';
import QuizPage from './client/pages/quizPage.jsx';
import GameResultPage from './client/pages/gameResult.jsx';

export default function App() {
   return (
      <Routes>
         <Route path="/" element={<RoomSetupPage />} />
         <Route path="/game/:sessionId" element={<QuizPage />} />
         <Route path="/game/:sessionId/result" element={<GameResultPage />} />
      </Routes>
   );
}

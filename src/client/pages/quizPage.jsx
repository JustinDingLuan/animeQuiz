import { useParams, useLocation } from 'react-router-dom';
import { Quiz } from './quiz.jsx';

// const params = new URLSearchParams(window.location.search);
// // 看 html 的選單 value
// const quizMode = params.get('quiz-mode');
// const questionCount = Number(params.get('question-count'));
// const roomSessionId = params.get('sessionId');
// const rootElement = document.querySelector('#root');

export default function QuizPage() {
  // const [params] = useSearchParams();
  // 放在參數裡
  const {sessionId} = useParams();
  // lobby 給過來的資料
  const { state } = useLocation();

  return (
    <Quiz
      quizMode={state?.quizMode}
      questionCount={Number(state?.questionCount)}
      roomSessionId={sessionId}
      session={state?.session}
    />
  );
}

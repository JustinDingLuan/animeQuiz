import './styles.css';
import { createRoot } from 'react-dom/client';
import { Quiz } from './quiz.jsx';

const params = new URLSearchParams(window.location.search);
// 看 html 的選單 value
const quizMode = params.get('quiz-mode');
const questionCount = Number(params.get('question-count'));
const rootElement = document.querySelector('#root');

createRoot(rootElement).render(
  <Quiz 
    quizMode={quizMode} 
    questionCount={questionCount}
  />
);
import './styles.css';
// import {initQuiz} from './quiz.jsx';
import { createRoot } from 'react-dom/client';
import { Quiz } from './quiz.jsx';

const params = new URLSearchParams(window.location.search);
// 看 html 的 id
const questionType = params.get('question-type');
const questionCount = Number(params.get('question-count'));
const rootElement = document.querySelector('#root');

createRoot(rootElement).render(
  <Quiz 
    questionType={questionType} 
    questionCount={questionCount}
  />
);
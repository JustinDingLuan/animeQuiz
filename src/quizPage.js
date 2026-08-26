import './styles.css';
import {initQuiz} from './quiz.jsx';

const params = new URLSearchParams(window.location.search);
// 看 html 的 id
const questionType = params.get('question-type');
const questionCount = Number(params.get('question-count'));

initQuiz(questionType, questionCount);
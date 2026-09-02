import { createRoot } from 'react-dom/client';
import App from './app.jsx';
import './styles.css';

const rootElement = document.querySelector('#root');

if (!rootElement) {
  throw new Error('找不到 React 根元素 #root');
}

createRoot(rootElement).render(<App />);

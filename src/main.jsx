import { createRoot } from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './app.jsx';


const rootElement = document.querySelector('#root');

if (!rootElement) {
  throw new Error('找不到 React 根元素 #root');
}

createRoot(rootElement).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

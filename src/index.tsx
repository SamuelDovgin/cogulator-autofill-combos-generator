import './index.css';

import { createRoot } from 'react-dom/client';

import App from './App';

const rootNode = document.querySelector('#root');
if (rootNode) {
  const root = createRoot(rootNode);
  root.render(<App />);
}

import './index.css';

import { createRoot } from 'react-dom/client';

import App from './App';
import squareFavicon from '../assets/logo/finalCogIcon-square.png';

function ensureDocumentIcons() {
  if (typeof document === 'undefined') return;

  const iconLinks = [
    { rel: 'icon', sizes: '512x512' },
    { rel: 'shortcut icon' },
    { rel: 'apple-touch-icon', sizes: '512x512' },
  ];

  for (const { rel, sizes } of iconLinks) {
    let link = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;

    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      document.head.appendChild(link);
    }

    link.href = squareFavicon;
    link.type = 'image/png';
    if (sizes) link.sizes = sizes;
  }
}

ensureDocumentIcons();

const rootNode = document.querySelector('#root');
if (rootNode) {
  const root = createRoot(rootNode);
  root.render(<App />);
}

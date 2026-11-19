import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tokens.css';
import './styles/book.css';
import './styles/polaroid.css';
import './styles/map.css';
import './styles/pencil.css';
import { App } from './App';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // ignore SW registration failure in restricted contexts
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

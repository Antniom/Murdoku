import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tokens.css';
import './styles/book.css';
import './styles/polaroid.css';
import './styles/map.css';
import './styles/pencil.css';
import './styles/rules.css';
import './styles/cover.css';
import { App } from './App';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        reg.update().catch(() => {});
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            reg.update().catch(() => {});
          }
        });
      })
      .catch(() => {
        // ignore SW registration failure in restricted contexts
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

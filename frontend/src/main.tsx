import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service Worker registrieren. Auch im Entwicklungsmodus: localhost gilt als
// sicherer Kontext, sodass sich Installation und Push-Benachrichtigungen dort
// testen lassen. Der Worker cacht /api und /auth bewusst nie.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('Service Worker konnte nicht registriert werden:', err);
    });
  });
}

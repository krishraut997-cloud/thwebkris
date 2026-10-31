import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ProgressProvider } from './context/ProgressContext.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ProgressProvider><App /></ProgressProvider>
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}python-course/sw.js`).catch((error) => {
      console.warn('Offline support could not be enabled.', error);
    });
  });
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

// Suppress benign Vite HMR WebSocket errors/rejections that are expected when HMR is disabled in AI Studio
if (typeof window !== 'undefined') {
  const isBenignViteError = (errorObj: any): boolean => {
    if (!errorObj) return false;
    const msg = (
      String(errorObj.message || '') + ' ' +
      String(errorObj.reason || '') + ' ' +
      String(errorObj.type || '') + ' ' +
      String(errorObj.stack || '') + ' ' +
      String(errorObj)
    ).toLowerCase();

    return (
      msg.includes('websocket') ||
      msg.includes('vite') ||
      msg.includes('hmr') ||
      msg.includes('ws://') ||
      msg.includes('wss://') ||
      msg.includes('closed without opened') ||
      msg.includes('closeevent') ||
      msg.includes('connection failed')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isBenignViteError(event.reason) || isBenignViteError(event)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      console.info('⚡ Suppressed benign Vite HMR WebSocket rejection:', event.reason);
    }
  });

  window.addEventListener('error', (event) => {
    if (isBenignViteError(event.error) || isBenignViteError(event.message) || isBenignViteError(event)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      console.info('⚡ Suppressed benign Vite HMR WebSocket error:', event.message || event.error);
    }
  }, true);
}

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

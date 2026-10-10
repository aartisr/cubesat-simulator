import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress errors and unhandled rejections from injected browser extensions (e.g. MetaMask inpage.js)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const filename = event.filename || '';
    const message = event.message || '';
    if (
      filename.includes('chrome-extension://') ||
      message.includes('MetaMask') ||
      message.includes('Failed to connect to MetaMask') ||
      message.includes('inpage.js')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = typeof reason === 'string' ? reason : (reason?.message || '');
    const stack = reason?.stack || '';
    if (
      msg.includes('MetaMask') ||
      msg.includes('Failed to connect to MetaMask') ||
      stack.includes('chrome-extension://') ||
      stack.includes('inpage.js')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);

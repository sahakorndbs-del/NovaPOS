import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global Error Handler to catch boot errors
window.onerror = function(message, source, lineno, colno, error) {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; margin: 20px; font-family: sans-serif;">
        <h2 style="margin-top: 0;">App Boot Error</h2>
        <p><strong>Message:</strong> ${message}</p>
        <p><strong>Source:</strong> ${source}:${lineno}:${colno}</p>
        <pre style="white-space: pre-wrap; font-size: 12px; margin-top: 10px;">${error?.stack || ''}</pre>
        <p style="font-size: 12px; margin-top: 10px; color: #666;">This usually happens due to missing configuration or network issues on GitHub Pages.</p>
      </div>
    `;
  }
  return false;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

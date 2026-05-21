import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Add fade-in animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(style);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found. Ensure index.html contains <div id="root"></div>.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

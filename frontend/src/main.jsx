import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Configure global API URL dynamically for Local Dev vs Hostinger Production
window.API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'api/'
  : 'https://sahasrabharat.com/farm/api/';

// Global fetch interceptor to dynamically route API requests
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  if (typeof url === 'string' && url.startsWith('api/')) {
    url = window.API_BASE + url.substring(4);
  }
  return originalFetch(url, options);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

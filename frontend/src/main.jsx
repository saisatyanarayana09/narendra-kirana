import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Automatically reload when dynamic imports fail due to fresh deployments
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    const lastReload = Number(sessionStorage.getItem('last_preload_reload') || 0);
    const now = Date.now();
    if (now - lastReload > 8000) {
      sessionStorage.setItem('last_preload_reload', String(now));
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')).render(
 <StrictMode>
 <App />
 </StrictMode>,
)

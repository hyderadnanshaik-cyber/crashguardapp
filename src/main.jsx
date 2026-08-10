import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Register service worker via vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    // Show update prompt to user
    if (confirm('New version of Crash Guard available. Update now?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.info('[PWA] Crash Guard is ready for offline use.');
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

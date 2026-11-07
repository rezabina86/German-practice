import '@fontsource-variable/nunito'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Ask the browser to keep our data even when storage is tight (progress lives in localStorage).
// Installed home-screen apps are usually granted this; in a browser tab it may be denied.
void navigator.storage?.persist?.().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

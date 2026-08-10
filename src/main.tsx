import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CapacitorUpdater } from '@capgo/capacitor-updater'

// MUST be called as early as possible — tells the OTA system
// the app launched successfully (prevents rollback to previous version)
CapacitorUpdater.notifyAppReady()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

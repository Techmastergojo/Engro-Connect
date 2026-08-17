import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    // Injected by GitHub Actions before build — lets the app know its own version
    __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION || '0.0.0'),
  },
})

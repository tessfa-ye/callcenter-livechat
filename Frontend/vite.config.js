import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl()
  ],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://172.20.47.19:5000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://172.20.47.19:5000',
        changeOrigin: true,
        ws: true,
        secure: false,
      }
    }
  }
})

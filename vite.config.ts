import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const ngrokHost = env.VITE_NGROK_HOST

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: [
        'subthoracic-zahra-brachydactylous.ngrok-free.dev',
        '.ngrok-free.dev',
        '.ngrok-free.app',
      ],
      hmr: ngrokHost
        ? {
            clientPort: 443,
            protocol: 'wss',
            host: ngrokHost,
          }
        : undefined,
    },
  }
})
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { handleApi } from './server/kakao.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const configure = server => {
    server.middlewares.use((req, res, next) => {
      const path = new URL(req.url, 'http://localhost').pathname
      const kind = path === '/api/places' ? 'places' : path === '/api/directions' ? 'directions' : null
      if (!kind) return next()
      return handleApi(req, res, kind, process.env.KAKAO_REST_API_KEY || env.KAKAO_REST_API_KEY)
    })
  }
  return { plugins: [react(), {
    name: 'safe-route-local-api',
    configureServer: configure,
    configurePreviewServer: configure,
  }] }
})

import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { handleApi } from './server/kakao.js'
import { handleAccidents } from './server/accidents.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const configure = server => {
    server.middlewares.use((req, res, next) => {
      const path = new URL(req.url, 'http://localhost').pathname
      if (path === '/api/accidents') return handleAccidents(req, res, process.env.DATA_GO_KR_SERVICE_KEY || env.DATA_GO_KR_SERVICE_KEY, {
        url: process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL,
        key: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY,
      })
      const kind = path === '/api/places' ? 'places' : path === '/api/directions' ? 'directions' : path === '/api/regions' ? 'regions' : null
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

import { handleAccidents } from '../server/accidents.js'
export default function handler(req, res) {
  return handleAccidents(req, res, process.env.DATA_GO_KR_SERVICE_KEY, {
    url: process.env.VITE_SUPABASE_URL,
    key: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  })
}

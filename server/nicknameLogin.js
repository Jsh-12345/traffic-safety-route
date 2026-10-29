import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'

export async function handleNicknameLogin(req, res, env, factory = createClient) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  const send = (status, body) => { res.statusCode = status; res.end(JSON.stringify(body)) }
  if (req.method !== 'POST') return send(405, { error: 'POST 요청만 가능합니다.' })
  try {
    let body = req.body
    if (!body) {
      let raw = ''
      for await (const chunk of req) {
        raw += chunk
        if (raw.length > 4096) return send(413, { error: '요청이 너무 큽니다.' })
      }
      body = JSON.parse(raw)
    } else if (typeof body === 'string') body = JSON.parse(body)
    const nickname = String(body.nickname || '').trim().toLowerCase()
    const password = body.password
    if (!/^[a-z0-9가-힣_]{2,20}$/.test(nickname) || typeof password !== 'string' || !password || password.length > 1024)
      return send(400, { error: '닉네임과 비밀번호를 확인해 주세요.' })
    const url = env.VITE_SUPABASE_URL
    const secret = env.SUPABASE_SERVICE_ROLE_KEY
    const publishable = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY
    if (!url || !secret || !publishable) return send(503, { error: '닉네임 로그인 서버 설정이 필요합니다. 이메일로 로그인해 주세요.' })
    const options = { auth: { persistSession: false, autoRefreshToken: false } }
    const admin = factory(url, secret, options)
    const key = createHash('sha256').update(nickname).digest('hex')
    const limit = await admin.rpc('consume_nickname_attempt', { attempt_key: key })
    if (limit.error) return send(503, { error: '닉네임 로그인 설정을 확인해 주세요. 이메일 로그인은 계속 사용할 수 있습니다.' })
    if (!limit.data) return send(429, { error: '시도 횟수를 초과했습니다. 10분 뒤 다시 시도하거나 이메일로 로그인해 주세요.' })
    const profile = await admin.from('login_profiles').select('user_id').eq('nickname', nickname).maybeSingle()
    if (profile.error) return send(503, { error: '닉네임 로그인 서비스를 사용할 수 없습니다.' })
    const user = profile.data ? await admin.auth.admin.getUserById(profile.data.user_id) : null
    // 없는 닉네임도 같은 로그인 실패 메시지를 사용하며 이메일은 응답에 넣지 않습니다.
    const email = user?.data?.user?.email || 'unknown-nickname@invalid.example'
    const client = factory(url, publishable, options)
    const result = await client.auth.signInWithPassword({ email, password })
    if (!profile.data || result.error || !result.data.session) return send(401, { error: '닉네임 또는 비밀번호를 확인해 주세요. 이메일 인증도 완료해야 합니다.' })
    const { access_token, refresh_token } = result.data.session
    return send(200, { access_token, refresh_token })
  } catch {
    return send(400, { error: '로그인 요청을 처리하지 못했습니다.' })
  }
}

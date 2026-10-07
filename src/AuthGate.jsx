import { useEffect, useState } from 'react'
import { authConfigured, supabase } from './supabaseClient'
import './AuthGate.css'

function AuthGate({ children }) {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(authConfigured)
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!supabase) return undefined
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') setMode('update')
      setChecking(false)
    })
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setNotice('로그인 상태를 확인하지 못했습니다. 새로고침해 주세요.')
      setSession(data.session)
      setChecking(false)
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setNotice('')
    setPassword('')
  }

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    try {
      let result
      if (mode === 'signup') {
        result = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
      } else if (mode === 'reset') {
        result = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
      } else if (mode === 'update') {
        result = await supabase.auth.updateUser({ password })
      } else {
        result = await supabase.auth.signInWithPassword({ email, password })
      }
      if (result.error) throw result.error
      if (mode === 'signup') setNotice(result.data.session ? '회원가입과 로그인이 완료됐습니다.' : '확인 메일을 보냈습니다. 메일의 링크를 눌러 가입을 완료하세요.')
      if (mode === 'reset') setNotice('비밀번호 재설정 메일을 보냈습니다. 메일함을 확인하세요.')
      if (mode === 'update') { setMode('login'); setNotice('비밀번호를 변경했습니다.') }
      setPassword('')
    } catch (error) {
      setNotice(error.message || '요청을 처리하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  if (!authConfigured) return children
  if (checking) return <div className="auth-page"><p role="status">로그인 상태 확인 중…</p></div>

  if (session && mode !== 'update') {
    return <>
      <div className="auth-toolbar">
        <span>{session.user.email}</span>
        <button type="button" onClick={async () => {
          const { error } = await supabase.auth.signOut()
          if (error) setNotice(error.message)
        }}>로그아웃</button>
      </div>
      {notice && <p className="auth-toolbar-notice" role="status">{notice}</p>}
      {children}
    </>
  }

  return <main className="auth-page">
    <section className="auth-card">
      <p className="auth-brand">SAFE ROUTE</p>
      <h1>{mode === 'signup' ? '회원가입' : mode === 'reset' ? '비밀번호 재설정' : mode === 'update' ? '새 비밀번호 설정' : '로그인'}</h1>
      <p className="auth-description">교통사고 위험지역 분석 서비스를 이용하세요.</p>
      <form onSubmit={submit}>
        {mode !== 'update' && <label>이메일
          <input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />
        </label>}
        {mode !== 'reset' && <label>{mode === 'update' ? '새 비밀번호' : '비밀번호'}
          <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} required value={password} onChange={event => setPassword(event.target.value)} />
        </label>}
        <button className="auth-submit" disabled={busy} type="submit">{busy ? '처리 중…' : mode === 'signup' ? '가입하기' : mode === 'reset' ? '재설정 메일 보내기' : mode === 'update' ? '비밀번호 변경' : '로그인'}</button>
      </form>
      {notice && <p className="auth-notice" role="status">{notice}</p>}
      {mode !== 'update' && <div className="auth-actions">
        {mode !== 'login' && <button type="button" onClick={() => switchMode('login')}>로그인으로 돌아가기</button>}
        {mode === 'login' && <>
          <button type="button" onClick={() => switchMode('signup')}>회원가입</button>
          <button type="button" onClick={() => switchMode('reset')}>비밀번호를 잊었나요?</button>
        </>}
      </div>}
    </section>
  </main>
}

export default AuthGate

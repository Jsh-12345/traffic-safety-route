import { accountError, koreanError } from './koreanErrors.js'
import { useEffect, useState } from 'react'
import { authConfigured, supabase } from './supabaseClient'
import './AuthGate.css'
import { AccessContext } from './AccessContext.js'
import NicknameSettings from './NicknameSettings.jsx'

function PasswordField({ id, label, value, onChange, autoComplete, minLength, visible, onToggle, describedBy }) {
  return <div className="auth-password-field">
    <label htmlFor={id}>{label}</label>
    <div className="auth-password-input">
      <input id={id} name={id} type={visible ? 'text' : 'password'} autoComplete={autoComplete}
        minLength={minLength} required value={value} onChange={onChange} aria-describedby={describedBy}
        autoCapitalize="none" spellCheck={false} />
      <button type="button" aria-label={label + (visible ? ' 숨기기' : ' 보기')}
        aria-controls={id} onClick={onToggle}>{visible ? '숨기기' : '보기'}</button>
    </div>
  </div>
}


function AuthGate({ children }) {
  const [session, setSession] = useState(null)
  const [guest, setGuest] = useState(false)
  const [checking, setChecking] = useState(authConfigured)
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const signupMismatch = mode === 'signup' && confirmation !== '' && password !== confirmation
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!supabase) return undefined
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      if (nextSession) setGuest(false)
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

  const clearPasswords = () => {
    setPassword('')
    setConfirmation('')
    setShowPassword(false)
    setShowConfirmation(false)
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setNotice('')
    setNickname('')
    clearPasswords()
  }

  const submit = async (event) => {
    event.preventDefault()
    const loginNickname = nickname.trim().toLowerCase()
    if (mode === 'signup') {
      if (password !== confirmation) {
        setNotice('비밀번호와 비밀번호 확인이 일치하지 않습니다.')
        return
      }
      if (!/^[a-z0-9가-힣_]{2,20}$/.test(loginNickname)) {
        setNotice('닉네임은 한글·영문·숫자·밑줄로 2~20자를 입력해 주세요.')
        return
      }
    }
    setBusy(true)
    setNotice('')
    setShowPassword(false)
    setShowConfirmation(false)
    try {
      let result
      if (mode === 'signup') {
        result = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin, data: { signup_nickname: loginNickname } },
        })
      } else if (mode === 'reset') {
        result = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
      } else if (mode === 'update') {
        result = await supabase.auth.updateUser({ password })
      } else {
        if (email.includes('@')) result = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        else {
          const response = await fetch('/api/nickname-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname: email, password }) })
          const body = await response.json()
          if (!response.ok) throw Error(body.error || '로그인하지 못했습니다.')
          result = await supabase.auth.setSession(body)
        }
      }
      if (result.error) throw result.error
      if (mode === 'signup') setNotice(result.data.session ? '회원가입과 로그인이 완료됐습니다.' : '확인 메일을 보냈습니다. 메일의 링크를 눌러 가입을 완료하세요.')
      if (mode === 'reset') setNotice('비밀번호 재설정 메일을 보냈습니다. 메일함을 확인하세요.')
      if (mode === 'update') { setMode('login'); setNotice('비밀번호를 변경했습니다.') }
      clearPasswords()
      if (mode === 'signup') setNickname('')
    } catch (error) {
      setNotice(accountError(error, mode))
    } finally {
      setBusy(false)
    }
  }

  if (!authConfigured) return children
  if (checking) return <div className="auth-page"><p role="status">로그인 상태 확인 중…</p></div>

  if (session && mode !== 'update') {
    return <AccessContext.Provider value={{ isGuest: false }}>
      <div className="auth-toolbar">
        <NicknameSettings key={session.user.id} user={session.user} />
        <button type="button" onClick={async () => {
          const { error } = await supabase.auth.signOut()
          if (error) setNotice(koreanError(error, '로그아웃하지 못했습니다. 다시 시도해 주세요.', { keepKorean: false }))
          else switchMode('login')
        }}>로그아웃</button>
      </div>
      {notice && <p className="auth-toolbar-notice" role="status">{notice}</p>}
      <div key={session.user.id}>{children}</div>
    </AccessContext.Provider>
  }

  if (guest && mode !== 'update') return <AccessContext.Provider value={{ isGuest: true }}>
    <div className="auth-toolbar"><span>비회원 이용 중 · 분석 기록은 저장되지 않습니다.</span>
      <button type="button" onClick={() => { setGuest(false); switchMode('login') }}>로그인 / 회원가입</button></div>
    <div key="guest">{children}</div>
  </AccessContext.Provider>

  return <main className="auth-page">
    <section className="auth-card">
      <p className="auth-brand">SAFE ROUTE</p>
      <h1>{mode === 'signup' ? '회원가입' : mode === 'reset' ? '비밀번호 재설정' : mode === 'update' ? '새 비밀번호 설정' : '로그인'}</h1>
      <p className="auth-description">교통사고 위험지역 분석 서비스를 이용하세요.</p>
      <form onSubmit={submit}>
        {mode !== 'update' && <label>{mode === 'login' ? '이메일 또는 닉네임' : '이메일'}
          <input type={mode === 'login' ? 'text' : 'email'} autoComplete={mode === 'login' ? 'username' : 'email'} required value={email} onChange={event => setEmail(event.target.value)} />
        </label>}
        {mode === 'signup' && <label>로그인 닉네임
          <input name="nickname" required maxLength={20} autoComplete="nickname" autoCapitalize="none"
            spellCheck={false} aria-describedby="signup-nickname-help" value={nickname} onChange={event => setNickname(event.target.value)} />
          <small id="signup-nickname-help" className="auth-field-help">한글·영문·숫자·밑줄 2~20자. 이메일 인증 후 이 닉네임으로 로그인할 수 있어요.</small>
        </label>}
        {mode !== 'reset' && <PasswordField id="password" label={mode === 'update' ? '새 비밀번호' : '비밀번호'}
          value={password} onChange={event => setPassword(event.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'login' ? undefined : 6}
          visible={showPassword} onToggle={() => setShowPassword(!showPassword)} />}
        {mode === 'signup' && <>
          <PasswordField id="password-confirmation" label="비밀번호 확인" value={confirmation}
            onChange={event => setConfirmation(event.target.value)} autoComplete="new-password"
            describedBy={signupMismatch ? 'signup-password-mismatch' : undefined}
            visible={showConfirmation} onToggle={() => setShowConfirmation(!showConfirmation)} />
          {signupMismatch && <p id="signup-password-mismatch" className="auth-field-error" role="status">비밀번호가 일치하지 않습니다.</p>}
        </>}
        <button className="auth-submit" disabled={busy || signupMismatch} type="submit">{busy ? '처리 중…' : mode === 'signup' ? '가입하기' : mode === 'reset' ? '재설정 메일 보내기' : mode === 'update' ? '비밀번호 변경' : '로그인'}</button>
      </form>
      {notice && <p className="auth-notice" role="status">{notice}</p>}
      {mode !== 'update' && <div className="auth-actions">
        {mode !== 'login' && <button type="button" disabled={busy} onClick={() => switchMode('login')}>로그인으로 돌아가기</button>}
        {mode === 'login' && <>
          <button type="button" disabled={busy} onClick={() => switchMode('signup')}>회원가입</button>
          <button type="button" disabled={busy} onClick={() => switchMode('reset')}>비밀번호를 잊었나요?</button>
        </>}
      </div>}
      {mode !== 'update' && <div className="guest-entry">
        <button type="button" className="guest-start" disabled={busy} onClick={() => { clearPasswords(); setNickname(''); setNotice(''); setGuest(true) }}>비회원으로 시작하기</button>
        <small>로그인 없이 경로를 비교할 수 있습니다. 기록 저장은 로그인 후 이용하세요.</small>
      </div>}
    </section>
  </main>
}

export default AuthGate

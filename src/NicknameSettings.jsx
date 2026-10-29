import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient.js'
export default function NicknameSettings({ user }) {
  const [nickname, setNickname] = useState('')
  const [saved, setSaved] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    supabase.from('login_profiles').select('nickname').eq('user_id', user.id).maybeSingle().then(({ data, error }) => {
      if (!active) return
      if (error) setMessage('닉네임 기능을 사용하려면 DB 설정을 먼저 적용해 주세요.')
      if (data) { setNickname(data.nickname); setSaved(data.nickname) }
    })
    return () => { active = false }
  }, [user.id])
  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const value = nickname.trim().toLowerCase()
      if (!/^[a-z0-9가-힣_]{2,20}$/.test(value)) throw Error('한글·영문 소문자·숫자·밑줄로 2~20자를 입력하세요.')
      const { error } = await supabase.from('login_profiles').upsert({ user_id: user.id, nickname: value }, { onConflict: 'user_id' })
      if (error) throw Error(error.code === '23505' ? '이미 사용 중인 닉네임입니다.' : '저장하지 못했습니다. DB 설정을 확인해 주세요.')
      setSaved(value); setNickname(value); setMessage('저장했습니다. 다음부터 닉네임과 기존 비밀번호로 로그인할 수 있습니다.')
    } catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }
  return <details className="nickname-settings"><summary>{saved ? `${saved} · 닉네임 변경` : '닉네임 설정하기'}</summary>
    <form onSubmit={save}><label>로그인 닉네임 <input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={20} required autoComplete="username" /></label>
      <small>한글·영문·숫자·밑줄 2~20자. 영문 대소문자는 구분하지 않습니다.</small>
      <button disabled={busy}>{busy ? '저장 중…' : '닉네임 저장'}</button></form>{message && <p role="status">{message}</p>}</details>
}

import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient.js'
import LiveComparison from './LiveComparison.jsx'
export default function HistorySnapshot({ recordId }) {
  const [snapshot, setSnapshot] = useState(null)
  const [message, setMessage] = useState('당시 경로를 불러오는 중…')
  useEffect(() => {
    let active = true
    supabase.from('route_analyses').select('snapshot').eq('id', recordId).single().then(({ data, error }) => {
      if (!active) return
      if (error) { setMessage('당시 경로를 읽지 못했습니다. DB 설정과 연결을 확인해 주세요.'); return }
      if (data.snapshot?.version === 1 && data.snapshot.route && data.snapshot.ranked?.length) {
        setSnapshot(data.snapshot); setMessage('')
      } else setMessage('이 기록에는 경로선이 저장되지 않아 요약만 표시됩니다. 업데이트 이후 상세 위치 저장을 선택한 새 기록부터 당시 지도를 볼 수 있습니다.')
    })
    return () => { active = false }
  }, [recordId])
  return <div>{message && <p role="status">{message}</p>}{snapshot && <><p>저장 당시의 경로·사고 자료·점수입니다. 현재 교통정보를 다시 조회하지 않습니다.</p>
    <LiveComparison route={snapshot.route} safetyLevel={snapshot.safetyLevel} archived={snapshot} /></>}</div>
}

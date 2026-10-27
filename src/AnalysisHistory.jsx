import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient.js'

export default function AnalysisHistory({ refreshKey }) {
  const [records, setRecords] = useState([])
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data, error } = await supabase.from('route_analyses')
      .select('id,created_at,start_region,destination_region,data_year,route_type,safety_level,accident_data_available,recommended_route,candidates')
      .order('created_at', { ascending: false }).limit(20)
    setLoading(false)
    if (error) { setNotice(`기록을 읽지 못했습니다: ${error.message}`); return }
    setRecords(data)
    setNotice('')
  }, [])
  useEffect(() => {
    const timer = setTimeout(load, 0)
    return () => clearTimeout(timer)
  }, [load, refreshKey])

  const remove = async (id) => {
    const { error } = await supabase.from('route_analyses').delete().eq('id', id)
    if (error) { setNotice(`삭제하지 못했습니다: ${error.message}`); return }
    setSelected(null)
    await load()
  }
  return <section className="search-card history-panel" aria-label="이전 분석 기록">
    <div className="history-heading"><div><p className="eyebrow">Supabase 기록</p><h2>이전 분석 결과</h2></div>
      <button type="button" onClick={load} disabled={loading}>{loading ? '불러오는 중…' : '새로고침'}</button></div>
    <p className="history-note">정확한 출발지·목적지와 좌표는 저장하지 않습니다. 최근 20건의 지역 단위 결과 수치만 다시 볼 수 있습니다.</p>
    {notice && <p role="status">{notice}</p>}
    {!loading && !records.length && !notice && <p>저장된 분석 기록이 없습니다.</p>}
    <ul className="history-list">{records.map(record => <li key={record.id}>
      <div className="history-item"><div><strong>{record.start_region} → {record.destination_region}</strong>
        <small>{new Date(record.created_at).toLocaleString('ko-KR')} · {record.data_year}년 자료 · 안전 우선 {record.safety_level}%</small></div>
        <div className="history-actions"><button type="button" onClick={() => setSelected(selected === record.id ? null : record.id)} aria-expanded={selected === record.id}>결과 {selected === record.id ? '접기' : '보기'}</button>
          <button type="button" onClick={() => remove(record.id)} aria-label="이 기록 삭제">삭제</button></div></div>
      {selected === record.id && <div className="history-detail"><p>추천 경로: {record.recommended_route} · {record.accident_data_available ? '사고 자료 반영' : '사고 자료 없음'}</p>
        <ul>{record.candidates.map((candidate, index) => <li key={`${candidate.id}-${index}`}><strong>{candidate.id === record.recommended_route ? '추천 · ' : ''}후보 {index + 1}</strong>
          {' '}약 {Math.ceil(candidate.duration / 60)}분 · {(candidate.distance / 1000).toFixed(1)}km · 위험점수 {candidate.risk ?? '자료 없음'}</li>)}</ul>
        <p>저장 당시의 결과 요약입니다. 현재 교통상황으로 다시 분석하려면 새 경로를 검색하세요.</p></div>}
    </li>)}</ul>
  </section>
}

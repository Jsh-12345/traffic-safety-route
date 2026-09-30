import { useEffect, useState } from 'react'

export default function PlaceInput({ id, label, value, selected, onChange, onSelect }) {
  const [result, setResult] = useState({ query: '', places: [], message: '' })
  useEffect(() => {
    const query = value.trim()
    if (selected || query.length < 2) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setResult({ query: value, places: [], message: '검색 중…' })
      try {
        const response = await fetch(`/api/places?query=${encodeURIComponent(query)}`, { signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || '검색에 실패했습니다.')
        if (!controller.signal.aborted) setResult({ query: value, places: data.places, message: data.places.length ? '검색 결과에서 장소를 선택하세요.' : '검색 결과가 없습니다. 주소를 입력하거나 지도에서 선택하세요.' })
      } catch (error) {
        if (!controller.signal.aborted) setResult({ query: value, places: [], message: error.message })
      }
    }, 600)
    return () => { clearTimeout(timer); controller.abort() }
  }, [value, selected])
  const showResults = !selected && value.trim().length >= 2 && result.query === value
  return (
    <div className="input-group place-input">
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} autoComplete="off" placeholder="장소명 또는 주소를 입력하세요"
        aria-describedby={`${id}-status`} onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }} />
      <p className="place-status" id={`${id}-status`} role="status">
        {selected ? `선택 완료 · ${selected.address || selected.label}` : showResults ? result.message : '2글자 이상 입력 후 검색 결과를 선택하세요.'}
      </p>
      {showResults && result.places.length > 0 && (
        <ul className="place-results" aria-label={`${label} 검색 결과`}>
          {result.places.map(place => (
            <li key={place.id}><button type="button" onClick={() => onSelect(place)}>
              <strong>{place.label}</strong><span>{place.address}</span>
            </button></li>
          ))}
        </ul>
      )}
    </div>
  )
}

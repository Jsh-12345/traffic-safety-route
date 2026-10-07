import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { rankRoutes, scoreRoute } from './routeSafety.js'
import { calculateHazardScore, RISK_WEIGHTS } from './riskScore.js'
import { getCurrentLocation } from './currentLocation.js'

export default function LiveComparison({ route, safetyLevel }) {
  const container = useRef(null)
  const mapRef = useRef(null)
  const routeBoundsRef = useRef(null)
  const currentPositionRef = useRef(null)
  const currentLocationLayerRef = useRef(null)
  const [highlightedId, setHighlightedId] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const ready = !!route.accidentData?.hazards.length
  const scored = useMemo(() => {
    const candidates = route.routes || [route]
    return ready ? candidates.map(r => scoreRoute(r, route.accidentData.hazards)) : candidates
  }, [route, ready])
  const ranked = useMemo(() => ready ? rankRoutes(scored, safetyLevel) : scored, [scored, safetyLevel, ready])
  const recommended = ranked[0]
  const fastest = useMemo(() => [...ranked].sort((a, b) => a.duration - b.duration || a.distance - b.distance)[0], [ranked])
  const hazards = useMemo(() => ready ? [...new Map(ranked.flatMap(r => r.hazards).map(h => [h.id, h])).values()] : [], [ranked, ready])
  useEffect(() => {
    const map = L.map(container.current)
    mapRef.current = map
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    const bounds = L.latLngBounds([])
    const draw = (candidate, options) => {
      for (const road of candidate.segments || [candidate.points]) L.polyline(road, options).addTo(map)
      candidate.points.forEach(p => bounds.extend(p))
    }
    // 다른 후보를 먼저 그려 공유 구간에서는 대표 경로가 위에 오게 합니다.
    ranked.filter(r => r.id !== fastest.id && r.id !== recommended.id)
      .forEach(r => draw(r, { color: '#d97706', dashArray: '10 7', weight: 7, opacity: .9 }))
    draw(fastest, { color: '#2563eb', weight: 5, opacity: .95 })
    if (recommended.id !== fastest.id) draw(recommended, { color: '#087f5b', dashArray: '10 7', weight: 6, opacity: .95 })
    const highlighted = ranked.find(r => r.id === highlightedId)
    if (highlighted) {
      draw(highlighted, { color: '#fff', weight: 11, opacity: .95 })
      draw(highlighted, { color: '#7c3aed', weight: 7, opacity: 1 })
    }
    for (const h of hazards) {
      const text = document.createElement('span')
      text.textContent = `${h.label} · ${h.typeLabel} · ${calculateHazardScore(h)}점 (${h.year}년)`
      L.circle([h.lat, h.lng], { radius: h.radius, color: '#c2413b', weight: 1, fillOpacity: .18 }).bindTooltip(text).addTo(map)
    }
    for (const [point, label, color] of [[route.start, '출발지', '#087f5b'], [route.destination, '목적지', '#2563eb']]) {
      L.circleMarker([point.lat, point.lng], { color, fillOpacity: 1, radius: 8 }).bindTooltip(label, { permanent: true }).addTo(map)
    }
    map.fitBounds(bounds, { padding: [35, 35] })
    routeBoundsRef.current = bounds
    currentLocationLayerRef.current = L.layerGroup().addTo(map)
    if (currentPositionRef.current) {
      const { lat, lng, accuracy } = currentPositionRef.current
      if (Number.isFinite(accuracy)) L.circle([lat, lng], { radius: accuracy, color: '#7c3aed', weight: 1, fillOpacity: .08, interactive: false }).addTo(currentLocationLayerRef.current)
      L.circleMarker([lat, lng], { radius: 9, color: '#fff', weight: 3, fillColor: '#7c3aed', fillOpacity: 1, bubblingMouseEvents: false })
        .bindTooltip('내 현재 위치', { permanent: true, direction: 'top' }).addTo(currentLocationLayerRef.current)
    }
    return () => {
      map.remove()
      mapRef.current = null
      routeBoundsRef.current = null
      currentLocationLayerRef.current = null
    }
  }, [route, recommended, fastest, hazards, ranked, highlightedId])

  const showCurrentLocation = async () => {
    setLocating(true)
    setLocationMessage('현재 위치를 확인하는 중입니다…')
    try {
      const position = await getCurrentLocation()
      currentPositionRef.current = position
      const map = mapRef.current
      const layer = currentLocationLayerRef.current
      if (!map || !layer) return
      const { lat, lng, accuracy } = position
      layer.clearLayers()
      if (Number.isFinite(accuracy)) L.circle([lat, lng], { radius: accuracy, color: '#7c3aed', weight: 1, fillOpacity: .08, interactive: false }).addTo(layer)
      L.circleMarker([lat, lng], { radius: 9, color: '#fff', weight: 3, fillColor: '#7c3aed', fillOpacity: 1, bubblingMouseEvents: false })
        .bindTooltip('내 현재 위치', { permanent: true, direction: 'top' }).addTo(layer)
      map.setView([lat, lng], 15)
      setLocationMessage(`현재 위치를 표시했습니다 (오차 약 ${Math.round(accuracy)}m).`)
    } catch (error) {
      setLocationMessage(error.message)
    } finally {
      setLocating(false)
    }
  }

  return (
    <section className="search-card actual-route" aria-label="실제 후보 경로 비교 결과">
      <p className="eyebrow">실제 자동차 경로 · 후보 {ranked.length}개</p>
      {route.routeSearch && <p className="api-note">탐색: 시간 우선·카카오 추천·거리 우선 / 받은 경로 {route.routeSearch.rawCount}개 → 중복 제거 후 {route.routeSearch.uniqueCount}개</p>}
      {route.routeSearch?.failedPriorities.length > 0 && <p role="status" className="analysis-warning">일부 경로 조회 실패: {route.routeSearch.failedPriorities.join(', ')}. 표시된 후보만 비교합니다.</p>}
      <h2>{route.start.label} → {route.destination.label}</h2>
      <p className="actual-summary">{ready ? '추천 경로' : '빠른 경로'} · 약 {Math.max(1, Math.ceil(recommended.duration / 60))}분 · {(recommended.distance / 1000).toFixed(1)}km</p>
      <p>파란 실선: 빠른 경로 · 초록 점선: 다른 추천 경로 · 주황 점선: 나머지 후보 · 보라 실선: 표에서 강조한 경로 · 붉은 원: 관련 사고 다발지역</p>
      {ranked.length > 1 && <p className="api-note">후보들이 같은 도로를 지나는 구간은 선이 겹칩니다. 아래 표에서 ‘지도에서 강조’를 누르면 선택한 후보의 전체 경로가 보라색으로 나타납니다.</p>}
      <div className="map-toolbar">
        <button type="button" className="current-location-button" onClick={showCurrentLocation} disabled={locating}>{locating ? '위치 확인 중…' : '◎ 내 현재 위치 보기'}</button>
        <button type="button" onClick={() => mapRef.current?.fitBounds(routeBoundsRef.current, { padding: [35, 35] })}>경로 전체 보기</button>
      </div>
      {locationMessage && <p role="status" className="location-feedback">{locationMessage}</p>}
      <div ref={container} className="location-map" aria-label="실제 후보 경로와 사고 다발지역 지도" />
      {route.accidentError && <p role="alert" className="analysis-warning">사고 데이터 분석 불가: {route.accidentError} 빠른 경로만 제공합니다.</p>}
      {route.accidentData && !ready && <p role="status">{route.accidentData.year}년 대전 조회 결과가 0건입니다. 안전점수를 판단하지 않고 빠른 경로만 표시합니다.</p>}
      {ready && <>
        <p>{route.accidentData.year}년 · {route.accidentData.region} · 수집된 사고 다발지역 {route.accidentData.hazards.length}개</p>
        <p className="analysis-warning">대전의 신호위반·중앙선침범 사고 다발지역만 비교합니다. 시외 구간과 다른 사고 유형은 점수에 포함되지 않습니다. 0점은 안전 보장이 아닌, 해당 데이터에서 겹치는 지역이 없다는 뜻입니다.</p>
        {ranked.length === 1 && <p>서로 다른 도로 경로가 1개라 다른 경로와 비교할 수 없습니다. 위의 받은 경로 수와 중복 제거 수를 확인하세요.</p>}
        {ranked.length > 1 && new Set(ranked.map(r => r.risk)).size === 1 && <p>후보들의 위험점수가 같아 이동시간이 가장 짧은 경로를 추천합니다.</p>}
        {ranked.length > 1 && new Set(ranked.map(r => r.risk)).size > 1 && recommended.id === fastest.id && <p>현재 가중치에서는 빠른 경로와 추천 경로가 같습니다.</p>}
        <div className="candidate-table-wrap"><table className="candidate-table">
          <caption>후보별 비교 · 안전 우선 {safetyLevel}%</caption>
          <thead><tr><th>경로</th><th>예상 시간</th><th>거리</th><th>관련 지역</th><th>위험점수</th><th>종합점수</th></tr></thead>
          <tbody>{ranked.map(r => <tr key={r.id} className={r.id === recommended.id ? 'recommended-row' : ''}>
            <th>{r.id === recommended.id ? '추천 · ' : ''}{r.id === fastest.id ? '빠른 경로' : `후보 ${r.id.replace('route-', '')}`}
              <button type="button" className="route-highlight-button" aria-pressed={highlightedId === r.id} onClick={() => setHighlightedId(highlightedId === r.id ? null : r.id)}>
                {highlightedId === r.id ? '강조 해제' : '지도에서 강조'}
              </button>
            </th>
            <td>{(r.duration / 60).toFixed(1)}분</td><td>{(r.distance / 1000).toFixed(1)}km</td>
            <td>{r.hazards.length}개</td><td>{r.risk}점</td><td>{r.combined.toFixed(3)}</td>
          </tr>)}</tbody>
        </table></div>
        <p className="api-note">위험점수 = 사고×{RISK_WEIGHTS.accidents} + 부상×{RISK_WEIGHTS.injuries} + 사망×{RISK_WEIGHTS.fatalities}. 같은 지역은 경로당 한 번만 합산합니다. 종합점수 = 정규화 시간×(1−안전 가중치) + 정규화 위험점수×안전 가중치. 낮을수록 우선하며 동점이면 짧은 시간을 선택합니다. 가중치는 프로젝트용 임시 기준입니다.</p>
        {hazards.length > 0 && <details><summary>관련 사고 다발지역 상세정보 ({hazards.length}개)</summary>
          <ul className="hazard-list">{hazards.map(h => <li key={h.id}>
            <strong>{h.label} · {h.typeLabel}</strong>
            <p>사고 {h.accidents}건 · 부상 {h.injuries}명 · 사망 {h.fatalities}명 · {calculateHazardScore(h)}점 · 반경 {h.radius}m · {h.year}년</p>
          </li>)}</ul>
        </details>}
        <p>자료: <a href={route.accidentData.sourceUrl} target="_blank" rel="noreferrer">{route.accidentData.source}</a></p>
        <p className="api-note">제공된 후보 중 점수가 낮은 경로를 고릅니다. 전체 도로에서 최적의 안전경로를 찾거나 실제 사고 확률을 계산하는 것은 아닙니다. 지역 중심점의 반경과 경로 선분 간 거리로 판정하므로 입체교차로에서는 실제 도로와 차이가 있을 수 있습니다.</p>
      </>}
      <p>경로 제공: 카카오모빌리티 · 조회 시점의 예상 소요시간입니다.</p>
    </section>
  )
}

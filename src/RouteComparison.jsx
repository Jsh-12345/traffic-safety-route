import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { demoHazards, demoRoutes } from './demoRoutes'
import { RISK_WEIGHTS, describeRiskChange } from './riskScore'
import './RouteComparison.css'

export default function RouteComparison() {
  const mapElement = useRef(null)
  const mapRef = useRef(null)
  const linesRef = useRef({})
  const [selectedRoute, setSelectedRoute] = useState('fast')
  const [selectedHazardId, setSelectedHazardId] = useState(null)
  const selectedHazard = demoHazards.find((hazard) => hazard.id === selectedHazardId)
  const [tileError, setTileError] = useState(false)
  const [fast, safe] = demoRoutes
  const riskChange = describeRiskChange(fast.risk, safe.risk)

  useEffect(() => {
    const map = L.map(mapElement.current, { scrollWheelZoom: false })
    mapRef.current = map
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    tiles.on('tileerror', () => setTileError(true))

    demoRoutes.forEach((route) => {
      linesRef.current[route.id] = L.polyline(route.points, {
        color: route.color, weight: 5,
        dashArray: route.id === 'safe' ? '10 7' : undefined,
      }).addTo(map).bindTooltip(`${route.name} · 가상 경로`)
        .on('click', () => setSelectedRoute(route.id))
    })

    demoHazards.forEach((hazard) => {
      L.circle(hazard.position, {
        radius: 110, color: hazard.color, fillOpacity: 0.22, weight: 2,
      }).addTo(map)
        .bindTooltip(`${hazard.name} · ${hazard.grade}`)
        .on('click', () => setSelectedHazardId(hazard.id))
    })

    const endpoints = [fast.points[0], fast.points[fast.points.length - 1]]
    endpoints.forEach((point, index) => {
      L.circleMarker(point, {
        radius: 7, color: '#172033', fillColor: 'white', fillOpacity: 1, weight: 3,
      }).addTo(map).bindTooltip(index === 0 ? '예시 출발지' : '예시 목적지', {
        permanent: true, direction: 'bottom',
      })
    })
    map.fitBounds(L.latLngBounds(demoRoutes.flatMap((route) => route.points)), { padding: [35, 40] })

    return () => {
      map.remove()
      mapRef.current = null
      linesRef.current = {}
    }
  }, [fast])

  useEffect(() => {
    demoRoutes.forEach((route) => {
      const line = linesRef.current[route.id]
      line.setStyle({ weight: route.id === selectedRoute ? 8 : 4, opacity: route.id === selectedRoute ? 1 : 0.5 })
      if (route.id === selectedRoute) line.bringToFront()
    })
  }, [selectedRoute])

  const resetView = () => {
    mapRef.current.fitBounds(L.latLngBounds(demoRoutes.flatMap((route) => route.points)), { padding: [35, 40] })
  }

  return (
    <section className="comparison" aria-labelledby="comparison-title">
      <div className="comparison-heading">
        <div><p className="demo-label">4차시 · 예시 사고 데이터로 점수 계산</p><h2 id="comparison-title">두 경로를 비교해 보세요</h2></div>
        <span className="comparison-step">지도 · 경로 비교</span>
      </div>
      <p className="demo-notice">
        아래는 대전 일대 지도 위에 그린 고정된 가상 구간입니다. 입력한 장소의 실제 경로가 아니며,
        경로선은 도로망을 따르지 않습니다. 거리·시간은 예시값이며, 위험점수는 가상 사고 데이터와 임시 가중치로 계산합니다.
      </p>
      <div className="hazard-content">
        <strong>지역별 위험점수 계산 기준</strong>
        <p>사고 건수 × {RISK_WEIGHTS.accidents} + 부상자 수 × {RISK_WEIGHTS.injuries} + 사망자 수 × {RISK_WEIGHTS.fatalities}</p>
        <p>부상자 수에는 사망자를 포함하지 않습니다. 경로 점수는 연결된 위험지역 점수의 합입니다.</p>
        <p>임시 등급: 10점 미만 낮음 · 10점 이상 20점 미만 보통 · 20점 이상 높음. 공식 안전 기준이 아닙니다.</p>
      </div>
      <div className="comparison-map-bar">
        <span>예시 출발지 → 예시 목적지</span>
        <button type="button" onClick={resetView}>전체 경로 보기</button>
      </div>
      {tileError && <p role="alert" className="demo-notice">배경 지도를 불러오지 못했습니다. 인터넷 연결을 확인하세요. 경로와 비교 카드는 계속 확인할 수 있습니다.</p>}
      <div ref={mapElement} className="comparison-map" aria-label="가상 경로와 위험지역 비교 지도" />
      <div className="comparison-legend" aria-label="지도 범례">
        <span><i className="legend-fast" />빠른 경로 · 실선</span>
        <span><i className="legend-safe" />안전 우선 · 점선</span>
        <span><i className="legend-high" />위험 높음</span>
        <span><i className="legend-medium" />위험 보통</span>
        <span><i className="legend-low" />위험 낮음</span>
      </div>
      <p className="comparison-help">경로 카드로 강조할 선을 선택하세요. 위험지역은 지도 또는 아래 버튼으로 확인할 수 있습니다.</p>

      <div className="comparison-cards">
        {demoRoutes.map((route) => (
          <article key={route.id} className={`comparison-card ${route.id} ${selectedRoute === route.id ? 'active' : ''}`}>
            <h3>{route.name}<span>예시</span></h3>
            <dl>
              <div><dt>소요시간</dt><dd>{route.minutes}<small>분</small></dd></div>
              <div><dt>이동거리</dt><dd>{route.km.toFixed(1)}<small>km</small></dd></div>
              <div><dt>위험지역 수</dt><dd>{new Set(route.hazardIds).size}<small>곳</small></dd></div>
              <div><dt>위험점수</dt><dd>{route.risk}<small>점</small></dd></div>
            </dl>
            <p className="comparison-help">
              지역별 합산: {[...new Set(route.hazardIds)].map((id) => {
                const hazard = demoHazards.find((item) => item.id === id)
                return `${id}(${hazard.score}점)`
              }).join(' + ') || '연결된 지역 없음'} = {route.risk}점
            </p>
            <button type="button" aria-pressed={selectedRoute === route.id} onClick={() => setSelectedRoute(route.id)}>
              {selectedRoute === route.id ? '지도에서 강조 중' : `${route.name} 강조하기`}
            </button>
          </article>
        ))}
      </div>
      <div className="comparison-summary">
        <strong>예시 비교: {safe.minutes - fast.minutes}분 더 소요 · {riskChange}</strong>
        <p>위험점수 {fast.risk}점 → {safe.risk}점, 거리 {(safe.km - fast.km).toFixed(1)}km 증가.</p>
        <p>감소율 = (빠른 경로 점수 − 안전 우선 경로 점수) ÷ 빠른 경로 점수 × 100. 실제 사고 확률의 감소를 뜻하지 않습니다.</p>
        {safe.risk > fast.risk && <p>현재 데이터에서는 ‘안전 우선 경로’라는 이름의 예시 경로가 더 높은 점수입니다. 경로명은 고정 예시이며 자동 추천 기능은 아직 연결되지 않았습니다.</p>}
      </div>

      <section className="hazard-detail" aria-labelledby="hazard-heading">
        <h3 id="hazard-heading">가상 위험지역 상세</h3>
        <div className="hazard-buttons">
          {demoHazards.map((hazard) => (
            <button key={hazard.id} type="button" aria-pressed={selectedHazardId === hazard.id} onClick={() => setSelectedHazardId(hazard.id)}>
              {hazard.name} · {hazard.grade}
            </button>
          ))}
        </div>
        <div role="status" className="hazard-content">
          {selectedHazard ? (
            <><strong>{selectedHazard.name}</strong><p>예시 등급: {selectedHazard.grade} · 예시 점수: {selectedHazard.score}점</p>
              <p>예시 사고 {selectedHazard.accidents}건 · 부상자 {selectedHazard.injuries}명 · 사망자 {selectedHazard.fatalities}명</p>
              <p>계산: {selectedHazard.accidents} × {RISK_WEIGHTS.accidents} + {selectedHazard.injuries} × {RISK_WEIGHTS.injuries} + {selectedHazard.fatalities} × {RISK_WEIGHTS.fatalities} = {selectedHazard.score}점</p>
              <p>연결된 예시 경로: {demoRoutes.filter((route) => route.hazardIds.includes(selectedHazard.id)).map((route) => route.name).join(', ')}</p>
              <p>실제 사고 통계와 기준 연도는 공공데이터 연결 후 제공합니다.</p></>
          ) : <p>위험지역을 선택하면 예시 등급과 점수가 나타납니다.</p>}
        </div>
      </section>
    </section>
  )
}

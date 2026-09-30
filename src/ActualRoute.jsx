import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function ActualRoute({ route }) {
  const container = useRef(null)
  useEffect(() => {
    const map = L.map(container.current)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    const line = L.polyline(route.points, { color: '#2563eb', weight: 6 }).addTo(map)
    for (const [point, label, color] of [[route.start, '출발지', '#087f5b'], [route.destination, '목적지', '#2563eb']]) {
      L.circleMarker([point.lat, point.lng], { color, fillOpacity: 1, radius: 8 })
        .bindTooltip(label, { permanent: true }).addTo(map)
    }
    map.fitBounds(line.getBounds(), { padding: [35, 35] })
    return () => map.remove()
  }, [route])
  return (
    <section className="search-card actual-route" aria-label="실제 빠른 경로 조회 결과">
      <p className="eyebrow">실제 자동차 경로 · 시간 우선</p>
      <h2>{route.start.label} → {route.destination.label}</h2>
      <p className="actual-summary">약 {Math.max(1, Math.ceil(route.duration / 60))}분 · {(route.distance / 1000).toFixed(1)}km</p>
      <div ref={container} className="location-map" aria-label="실제 자동차 경로 지도" />
      <p>경로 제공: 카카오모빌리티 · 조회 시점의 예상 소요시간입니다.</p>
      <p>사고 데이터 분석은 아직 연결되지 않았습니다. 이 경로의 위험점수는 계산하지 않습니다.</p>
    </section>
  )
}

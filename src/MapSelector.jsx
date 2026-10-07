import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getCurrentLocation } from './currentLocation.js'

function readCoordinates(text) {
  const match = text.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/)
  if (!match) return null

  const lat = Number(match[1])
  const lng = Number(match[2])

  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return [lat, lng]
}

export default function MapSelector({ start, destination, onSelect }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef(null)
  const currentLocationRef = useRef(null)
  const [target, setTarget] = useState('start')
  const [tileError, setTileError] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')

  // 지도를 만들고, 화면에서 제거될 때 정리합니다.
  useEffect(() => {
    const map = L.map(containerRef.current).setView(
      [36.3504, 127.3845],
      13,
    )

    const tiles = L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    ).addTo(map)

    tiles.on('tileerror', () => setTileError(true))

    mapRef.current = map
    markersRef.current = L.layerGroup().addTo(map)
    currentLocationRef.current = L.layerGroup().addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current = null
      currentLocationRef.current = null
    }
  }, [])

  // 클릭한 지점의 좌표를 부모 화면의 입력창에 전달합니다.
  useEffect(() => {
    const map = mapRef.current

    const handleClick = (event) => {
      const { lat, lng } = event.latlng
      onSelect(target, `${lat.toFixed(6)}, ${lng.toFixed(6)}`)

      if (target === 'start') setTarget('destination')
    }

    map.on('click', handleClick)
    return () => map.off('click', handleClick)
  }, [target, onSelect])

  // 입력값이 바뀌거나 두 장소를 교환하면 표식도 갱신합니다.
  useEffect(() => {
    const layer = markersRef.current
    layer.clearLayers()

    const locations = [
      { text: start, label: '출발지', color: '#087f5b' },
      { text: destination, label: '목적지', color: '#1d4ed8' },
    ]

    const bounds = []
    locations.forEach(({ text, label, color }) => {
      const coordinates = readCoordinates(text)
      if (!coordinates) return

      bounds.push(coordinates)
      L.circleMarker(coordinates, {
        radius: 9,
        color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: 3,
        bubblingMouseEvents: false,
      })
        .bindTooltip(label, { permanent: true, direction: 'top' })
        .addTo(layer)
    })
    if (bounds.length === 1) mapRef.current.setView(bounds[0], 15)
    if (bounds.length === 2) mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
  }, [start, destination])

  const showCurrentLocation = async () => {
    setLocating(true)
    setLocationMessage('현재 위치를 확인하는 중입니다…')
    try {
      const { lat, lng, accuracy } = await getCurrentLocation()
      if (!mapRef.current || !currentLocationRef.current) return
      const layer = currentLocationRef.current
      layer.clearLayers()
      if (Number.isFinite(accuracy)) {
        L.circle([lat, lng], { radius: accuracy, color: '#7c3aed', weight: 1, fillOpacity: .08, interactive: false }).addTo(layer)
      }
      L.circleMarker([lat, lng], { radius: 9, color: '#fff', weight: 3, fillColor: '#7c3aed', fillOpacity: 1, bubblingMouseEvents: false })
        .bindTooltip('내 현재 위치', { permanent: true, direction: 'top' }).addTo(layer)
      mapRef.current.setView([lat, lng], 15)
      setLocationMessage(`현재 위치를 표시했습니다 (오차 약 ${Math.round(accuracy)}m).`)
    } catch (error) {
      setLocationMessage(error.message)
    } finally {
      setLocating(false)
    }
  }

  return (
    <section className="map-selector" aria-label="지도에서 위치 선택">
      <div className="map-target-buttons">
        <button
          type="button"
          aria-pressed={target === 'start'}
          onClick={() => setTarget('start')}
        >
          출발지 선택
        </button>
        <button
          type="button"
          aria-pressed={target === 'destination'}
          onClick={() => setTarget('destination')}
        >
          목적지 선택
        </button>
        <button type="button" className="current-location-button" onClick={showCurrentLocation} disabled={locating}>
          {locating ? '위치 확인 중…' : '◎ 내 현재 위치 보기'}
        </button>
      </div>

      {locationMessage && <p role="status" className="location-feedback">{locationMessage}</p>}

      <p role="status">
        지도에서 {target === 'start' ? '출발지' : '목적지'}를 클릭하세요.
        출발지는 초록색, 목적지는 파란색으로 표시됩니다.
      </p>

      {tileError && (
        <p role="alert">
          지도 일부를 불러오지 못했습니다. 인터넷 연결을 확인하고
          지도를 닫았다 다시 열어 주세요.
        </p>
      )}

      <div
        ref={containerRef}
        className="location-map"
        aria-label="출발지와 목적지를 선택하는 지도"
      />
    </section>
  )
}

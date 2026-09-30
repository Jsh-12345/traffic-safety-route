import { useEffect, useRef, useState } from 'react'
import './App.css'
import MapSelector from './MapSelector'
import RouteComparison from './RouteComparison'
import PlaceInput from './PlaceInput'
import ActualRoute from './ActualRoute'

const routeOptions = [
  {
    value: 'fast',
    title: '빠른 경로',
    description: '이동시간을 우선합니다.',
  },
  {
    value: 'balanced',
    title: '균형 경로',
    description: '시간과 안전을 함께 고려합니다.',
  },
  {
    value: 'safe',
    title: '안전 우선',
    description: '사고 위험이 낮은 길을 우선합니다.',
  },
]

function App() {
  const [start, setStart] = useState('')
  const [destination, setDestination] = useState('')
  const [routeType, setRouteType] = useState('balanced')
  const [safetyLevel, setSafetyLevel] = useState(60)
  const [message, setMessage] = useState('')
  const [showMap, setShowMap] = useState(false)
  const [showComparison, setShowComparison] = useState(false)

  const [startPoint, setStartPoint] = useState(null)
  const [endPoint, setEndPoint] = useState(null)
  const [actualRoute, setActualRoute] = useState(null)
  const [loading, setLoading] = useState(false)
  const requestRef = useRef(null)
  useEffect(() => () => requestRef.current?.abort(), [])

  const invalidate = () => {
    requestRef.current?.abort()
    setActualRoute(null)
    setLoading(false)
    setMessage('')
  }
  const changeText = (target, value) => {
    invalidate()
    if (target === 'start') { setStart(value); setStartPoint(null) }
    else { setDestination(value); setEndPoint(null) }
  }
  const selectPoint = (target, point) => {
    invalidate()
    if (target === 'start') { setStart(point.label); setStartPoint(point) }
    else { setDestination(point.label); setEndPoint(point) }
    setShowMap(true)
  }
  const handleMapSelect = (target, coordinates) => {
    const [lat, lng] = coordinates.split(',').map(Number)
    selectPoint(target, { label: coordinates, address: '지도에서 선택한 위치', lat, lng })
  }
  const swapLocations = () => {
    invalidate()
    setStart(destination)
    setDestination(start)
    setStartPoint(endPoint)
    setEndPoint(startPoint)
  }

  const handleRouteChange = (value) => {
    const defaultLevels = {
      fast: 20,
      balanced: 60,
      safe: 90,
  }

  setRouteType(value)
  setSafetyLevel(defaultLevels[value])
}

  const handleSafetyChange = (value) => {
    const level = Number(value)

    setSafetyLevel(level)

    if (level < 40) {
      setRouteType('fast')
    } else if (level < 70) {
      setRouteType('balanced')
    } else {
      setRouteType('safe')
    }
  }
  const handleSubmit = async (event) => {
    event.preventDefault()
    invalidate()
    if (!start.trim() || !destination.trim()) {
      setMessage('출발지와 목적지를 모두 입력해 주세요.')
      return
    }
    if (!startPoint || !endPoint) {
      setMessage('검색 결과에서 장소를 선택하거나 지도에서 위치를 선택해 주세요.')
      return
    }
    if (Math.abs(startPoint.lat - endPoint.lat) < 0.000001 && Math.abs(startPoint.lng - endPoint.lng) < 0.000001) {
      setMessage('출발지와 목적지는 서로 달라야 합니다.')
      return
    }
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    try {
      const params = new URLSearchParams({ startLat: startPoint.lat, startLng: startPoint.lng, endLat: endPoint.lat, endLng: endPoint.lng })
      const response = await fetch(`/api/directions?${params}`, { signal: controller.signal })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '경로 조회에 실패했습니다.')
      if (!controller.signal.aborted) {
        setActualRoute({ ...data, start: startPoint, destination: endPoint })
        setMessage('실제 자동차 경로를 조회했습니다. 아래 지도에서 확인하세요.')
      }
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error.message)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  return (
    <main className="app">
      <header className="service-header">
        <div className="logo">SR</div>
        <div>
          <p className="service-name">SAFE ROUTE</p>
          <p className="service-subtitle">교통사고 위험지역 분석 서비스</p>
        </div>
      </header>

      <section className="intro">
        <p className="eyebrow">초보 운전자를 위한 경로 추천</p>
        <h1>
          빠른 길뿐만 아니라
          <br />
          <span>더 안전한 길</span>을 찾아보세요.
        </h1>
        <p>
          장소를 검색하거나 지도에서 선택하여 실제 자동차 경로를 확인하세요.
        </p>
      </section>

      <section className="search-card">
        <h2>경로 검색</h2>

        <form onSubmit={handleSubmit}>
          <div className="location-area">
            <PlaceInput id="start" label="출발지" value={start} selected={startPoint}
              onChange={value => changeText('start', value)} onSelect={point => selectPoint('start', point)} />

            <button
              type="button"
              className="swap-button"
              onClick={swapLocations}
              aria-label="출발지와 목적지 바꾸기"
            >
              ⇅
            </button>

            <PlaceInput id="destination" label="목적지" value={destination} selected={endPoint}
              onChange={value => changeText('destination', value)} onSelect={point => selectPoint('destination', point)} />
          </div>
          
          <button
            type="button"
            className="map-toggle-button"
            aria-expanded={showMap}
            aria-controls="location-map-panel"
            onClick={() => setShowMap((previous) => !previous)}
          >
            {showMap ? '지도 닫기' : '지도에서 위치 선택'}
          </button>

          <div id="location-map-panel">
            {showMap && (
              <MapSelector
                start={startPoint ? `${startPoint.lat}, ${startPoint.lng}` : ''}
                destination={endPoint ? `${endPoint.lat}, ${endPoint.lng}` : ''}
                onSelect={handleMapSelect}
              />
            )}
          </div>
          
          <fieldset>
            <legend>경로 추천 방식 · 다음 단계에서 적용 예정</legend>

            <div className="route-options">
              {routeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`route-option ${
                    routeType === option.value ? 'selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="routeType"
                    value={option.value}
                    checked={routeType === option.value}
                    onChange={(event) => handleRouteChange(event.target.value)}
                  />
                  <strong>{option.title}</strong>
                  <span>{option.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="safety-area">
            <div className="safety-heading">
              <label htmlFor="safetyLevel">안전 우선 정도</label>
              <output>{safetyLevel}%</output>
            </div>

            <input
              id="safetyLevel"
              type="range"
              min="0"
              max="100"
              step="10"
              value={safetyLevel}
              onChange={(event) => handleSafetyChange(event.target.value)}
            />

            <div className="range-labels">
              <span>시간 우선</span>
              <span>안전 우선</span>
            </div>
          </div>

          <p className="api-note">현재 실제 조회는 시간 우선 경로만 제공합니다. 위 추천 방식과 슬라이더는 아직 실제 조회에 반영되지 않습니다.</p>
          <button className="analyze-button" type="submit" disabled={loading}>
            {loading ? '경로 조회 중…' : '실제 빠른 경로 조회'}
          </button>

          {message && (
            <p className="message" role="status">
              {message}
            </p>
          )}
        </form>
        <button
          type="button"
          className="map-toggle-button"
          aria-expanded={showComparison}
          aria-controls="route-comparison-panel"
          onClick={() => setShowComparison((previous) => !previous)}
        >
          {showComparison ? '예시 결과 닫기' : '입력 없이 예시 경로 비교 보기'}
        </button>
      </section>

      {actualRoute && <ActualRoute route={actualRoute} />}

      <div id="route-comparison-panel">
        {showComparison && <RouteComparison />}
      </div>

      <p className="development-note">
        장소 검색: 카카오 · 자동차 경로: 카카오모빌리티 · 배경 지도: OpenStreetMap.
        예시 비교 화면의 위험점수는 가상 데이터로 계산됩니다.
      </p>
    </main>
  )
}

export default App

import { useState } from 'react'
import './App.css'
import MapSelector from './MapSelector'

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

  const handleMapSelect = (target, coordinates) => {
    if (target === 'start') {
      setStart(coordinates)
    } else {
      setDestination(coordinates)
    }

  setMessage('')
  }

  const swapLocations = () => {
    setStart(destination)
    setDestination(start)
    setMessage('')
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
  const handleSubmit = (event) => {
    event.preventDefault()

    if (!start.trim() || !destination.trim()) {
      setMessage('출발지와 목적지를 모두 입력해 주세요.')
      return
    }

    if (start.trim() === destination.trim()) {
      setMessage('출발지와 목적지는 서로 달라야 합니다.')
      return
    }

    setMessage(
      `${start}에서 ${destination}까지의 경로 분석을 준비했습니다.`,
    )
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
          출발지와 목적지를 입력하면 빠른 경로와 안전 우선 경로를
          비교해 드립니다.
        </p>
      </section>

      <section className="search-card">
        <h2>경로 검색</h2>

        <form onSubmit={handleSubmit}>
          <div className="location-area">
            <div className="input-group">
              <label htmlFor="start">출발지</label>
              <input
                id="start"
                type="text"
                value={start}
                onChange={(event) => {
                  setStart(event.target.value)
                  setMessage('')
                }}
                placeholder="출발지를 입력하세요"
              />
            </div>

            <button
              type="button"
              className="swap-button"
              onClick={swapLocations}
              aria-label="출발지와 목적지 바꾸기"
            >
              ⇅
            </button>

            <div className="input-group">
              <label htmlFor="destination">목적지</label>
              <input
                id="destination"
                type="text"
                value={destination}
                onChange={(event) => {
                  setDestination(event.target.value)
                  setMessage('')
                }}
                placeholder="목적지를 입력하세요"
              />
            </div>
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
                start={start}
                destination={destination}
                onSelect={handleMapSelect}
              />
            )}
          </div>
          
          <fieldset>
            <legend>경로 추천 방식</legend>

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

          <button className="analyze-button" type="submit">
            경로 분석하기
          </button>

          {message && (
            <p className="message" role="status">
              {message}
            </p>
          )}
        </form>
      </section>

      <p className="development-note">
        출발지와 목적지를 입력하거나 지도에서 선택할 수 있습니다.
      실제 경로 분석 기능은 아직 연결되지 않았습니다.
      </p>
    </main>
  )
}

export default App
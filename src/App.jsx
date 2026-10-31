import { useContext, useEffect, useRef, useState } from 'react'
import './App.css'
import { AccessContext } from './AccessContext.js'
import MapSelector from './MapSelector'
import PlaceInput from './PlaceInput'
import LiveComparison from './LiveComparison'
import AnalysisHistory from './AnalysisHistory.jsx'
import { makeAnalysisRecord } from './analysisHistory.js'
import { restoreHistory } from './restoreHistory.js'
import { supabase } from './supabaseClient.js'
import { routeBounds } from './routeSafety.js'

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
  const { isGuest } = useContext(AccessContext)
  const [start, setStart] = useState('')
  const [destination, setDestination] = useState('')
  const [routeType, setRouteType] = useState('balanced')
  const [safetyLevel, setSafetyLevel] = useState(50)
  const [dataYear, setDataYear] = useState('2024')
  const [saveExactLocation, setSaveExactLocation] = useState(false)
  const [message, setMessage] = useState('')
  const [showMap, setShowMap] = useState(false)

  const [startPoint, setStartPoint] = useState(null)
  const [endPoint, setEndPoint] = useState(null)
  const [actualRoute, setActualRoute] = useState(null)
  const [archived, setArchived] = useState(null)
  const [historyRecord, setHistoryRecord] = useState(null)
  const [loading, setLoading] = useState(false)
  const [historyRefresh, setHistoryRefresh] = useState(0)
  const [saveNotice, setSaveNotice] = useState('')
  const requestRef = useRef(null)
  useEffect(() => () => requestRef.current?.abort(), [])
  useEffect(() => {
    if (actualRoute || historyRecord) document.getElementById('analysis-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [actualRoute, historyRecord])

  const invalidate = () => {
    requestRef.current?.abort()
    setActualRoute(null)
    setArchived(null)
    setHistoryRecord(null)
    setLoading(false)
    setMessage('')
    setSaveNotice('')
  }
  const openHistory = (record, snapshot) => {
    invalidate()
    const restored = restoreHistory(record, snapshot)
    setStart(restored.start); setDestination(restored.destination)
    setStartPoint(restored.startPoint); setEndPoint(restored.endPoint)
    setSafetyLevel(restored.safetyLevel); setRouteType(record.route_type)
    setDataYear(restored.dataYear); setShowMap(false)
    setArchived(restored.archived); setActualRoute(restored.route); setHistoryRecord(record)
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
    setShowMap(target === 'start' ? !endPoint : !startPoint)
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
    if (historyRecord) invalidate()
    const defaultLevels = {
      fast: 0,
      balanced: 50,
      safe: 100,
  }

  setRouteType(value)
  setSafetyLevel(defaultLevels[value])
}

  const handleSafetyChange = (value) => {
    if (historyRecord) invalidate()
    const level = Number(value)

    setSafetyLevel(level)

    if (level === 0) {
      setRouteType('fast')
    } else if (level < 100) {
      setRouteType('balanced')
    } else {
      setRouteType('safe')
    }
  }
  const handleSubmit = async (event) => {
    event.preventDefault()
    const includeExactLocation = saveExactLocation
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
      const fetchJson = async (url) => {
        const response = await fetch(url, { signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || '조회에 실패했습니다.')
        return data
      }
      const regionsRequest = fetchJson(`/api/regions?${params}`)
      regionsRequest.catch(() => {})
      const directions = await fetchJson(`/api/directions?${params}`)
      // 모든 후보 경로 주변의 사고 다발지역만 요청합니다.
      const bounds = new URLSearchParams({ year: dataYear, ...routeBounds(directions.routes || [directions]) })
      const [accidents, regions] = await Promise.allSettled([fetchJson(`/api/accidents?${bounds}`), regionsRequest])
      const data = { ...directions,
        accidentData: accidents.status === 'fulfilled' ? accidents.value : null,
        accidentError: accidents.status === 'rejected' ? accidents.reason.message : '',
      }
      if (!controller.signal.aborted) {
        setShowMap(false)
        const regionData = regions.status === 'fulfilled' ? regions.value : {}
        const result = { ...data,
          start: { ...startPoint, region: regionData.startRegion,
            label: startPoint.address === '지도에서 선택한 위치' && regionData.startAddress ? regionData.startAddress : startPoint.label,
            address: startPoint.address === '지도에서 선택한 위치' ? regionData.startAddress : startPoint.address },
          destination: { ...endPoint, region: regionData.destinationRegion,
            label: endPoint.address === '지도에서 선택한 위치' && regionData.destinationAddress ? regionData.destinationAddress : endPoint.label,
            address: endPoint.address === '지도에서 선택한 위치' ? regionData.destinationAddress : endPoint.address },
        }
        setActualRoute(result)
        setMessage(data.accidentError ? '빠른 경로는 조회됐지만 사고 데이터 연결을 확인해야 합니다.' : '')
        if (supabase && !isGuest) {
          const { data: auth, error: authError } = await supabase.auth.getUser()
          if (controller.signal.aborted) return
          if (authError || !auth.user) setSaveNotice('로그인 상태를 확인하지 못해 분석 기록을 저장하지 못했습니다.')
          else {
            const record = makeAnalysisRecord(result, routeType, safetyLevel, auth.user.id, dataYear, includeExactLocation)
            const { error: saveError } = await supabase.from('route_analyses').insert(record)
            if (!controller.signal.aborted) {
              setSaveNotice(saveError ? `기록 저장 실패: ${saveError.message}` : includeExactLocation ? '분석 결과와 정확한 위치를 내 계정에 저장했습니다.' : '분석 결과를 지역 단위로 저장했습니다.')
              if (!saveError) setHistoryRefresh(previous => previous + 1)
            }
          }
        }
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
              <output>{safetyLevel}% <span>{safetyLevel === 0 ? '시간 우선 모드' : safetyLevel === 100 ? '안전 우선 모드' : '균형 모드'}</span></output>
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

          <div className="year-picker">
            <label htmlFor="data-year">사고 데이터 기준 연도</label>
            <select id="data-year" value={dataYear} onChange={e => { invalidate(); setDataYear(e.target.value) }}>
              {['2024', '2023', '2022', '2021'].map(year => <option key={year} value={year}>{year}년</option>)}
            </select>
          </div>
          {!isGuest && <label className="exact-location-option" htmlFor="save-exact-location">
            <input id="save-exact-location" type="checkbox" checked={saveExactLocation}
              onChange={event => setSaveExactLocation(event.target.checked)} />
            <span><strong>장소·주소·좌표와 경로 지도를 내 분석 기록에 저장</strong>
              <small>선택하면 당시 후보 경로·사고 자료·점수도 함께 저장하며, 로그인한 본인만 조회하고 기록을 삭제할 수 있습니다. 지도에서 직접 찍은 점은 주소 대신 좌표가 저장될 수 있습니다.</small></span>
          </label>}
          {isGuest && <p className="api-note">비회원 분석 결과는 계정에 저장되지 않습니다. 로그인 전환이나 새로고침 시 현재 결과가 사라집니다.</p>}
          <p className="api-note">빠른 경로는 안전 가중치 0%, 안전 우선은 100%입니다. 조회 후 슬라이더를 바꾸면 받은 후보들의 추천 순위가 바로 갱신됩니다. 사고 데이터는 선택 연도의 전국 신호위반·중앙선침범 사고 다발지역을 사용합니다.</p>
          <button className="analyze-button" type="submit" disabled={loading}>
            {loading ? '경로 조회 중…' : '실제 경로 분석하기'}
          </button>

          {message && (
            <p className="message" role="status">
              {message}
            </p>
          )}
        </form>
      </section>

      {historyRecord && <div className="history-banner"><strong>{new Date(historyRecord.created_at).toLocaleString('ko-KR')} 저장 결과</strong><span>당시 출발지·목적지를 입력창에 불러왔습니다. 현재 교통정보는 조회하지 않았습니다.</span></div>}
      {actualRoute && <LiveComparison key={historyRecord?.id || 'live'} route={actualRoute} safetyLevel={safetyLevel} archived={archived} />}
      {historyRecord && !actualRoute && <section id="analysis-result" className="search-card legacy-result">
        <h2>{start} → {destination}</h2>
        <p>이전 기록에는 경로선이 저장되지 않아 당시 지도는 복원할 수 없습니다. 저장된 비교 결과를 표시합니다.</p>
        <ul>{historyRecord.candidates.map(c => <li key={c.id}>{c.id === historyRecord.recommended_route ? '추천 · ' : ''}{c.id} · {(c.duration / 60).toFixed(1)}분 · {(c.distance / 1000).toFixed(1)}km · 위험점수 {c.risk ?? '자료 없음'}</li>)}</ul>
      </section>}
      {actualRoute && saveNotice && <p className="save-notice" role="status">{saveNotice}</p>}
      {!isGuest && <AnalysisHistory refreshKey={historyRefresh} onOpen={openHistory} />}

      <p className="development-note">
        장소 검색: 카카오 · 자동차 경로: 카카오모빌리티 · 배경 지도: OpenStreetMap.
      </p>
    </main>
  )
}

export default App

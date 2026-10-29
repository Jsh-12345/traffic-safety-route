import { RISK_WEIGHTS } from './riskScore.js'
import { rankRoutes, scoreRoute } from './routeSafety.js'

export function broadRegion(point) {
  if (point?.region) return String(point.region).slice(0, 60)
  const address = String(point?.address || '')
  const parts = address.trim().split(/\s+/)
  const shortNames = {
    서울: '서울특별시', 부산: '부산광역시', 대구: '대구광역시', 인천: '인천광역시',
    광주: '광주광역시', 대전: '대전광역시', 울산: '울산광역시', 세종: '세종특별자치시',
    경기: '경기도', 강원: '강원특별자치도', 충북: '충청북도', 충남: '충청남도',
    전북: '전북특별자치도', 전남: '전라남도', 경북: '경상북도', 경남: '경상남도', 제주: '제주특별자치도',
  }
  const first = shortNames[parts[0]] || parts[0]
  if (parts.length >= 2 && /(?:시|도)$/.test(first) && /(?:시|군|구)$/.test(parts[1])) {
    return `${first} ${parts[1]}`.slice(0, 60)
  }
  return '지역 미상'
}

export function makeAnalysisRecord(route, routeType, safetyLevel, userId, dataYear, saveExactLocation = false) {
  const hasAccidents = !!route.accidentData?.hazards?.length
  const candidates = route.routes || [route]
  const scored = hasAccidents ? candidates.map(candidate => scoreRoute(candidate, route.accidentData.hazards)) : candidates
  const ranked = hasAccidents ? rankRoutes(scored, safetyLevel) : [...scored].sort((a, b) => a.duration - b.duration)
  return {
    user_id: userId,
    start_region: broadRegion(route.start),
    destination_region: broadRegion(route.destination),
    start_label: saveExactLocation ? String(route.start.label || '') : null,
    destination_label: saveExactLocation ? String(route.destination.label || '') : null,
    start_address: saveExactLocation && route.start.address !== '지도에서 선택한 위치' ? String(route.start.address || '') : null,
    destination_address: saveExactLocation && route.destination.address !== '지도에서 선택한 위치' ? String(route.destination.address || '') : null,
    start_lat: saveExactLocation ? route.start.lat : null,
    start_lng: saveExactLocation ? route.start.lng : null,
    destination_lat: saveExactLocation ? route.destination.lat : null,
    destination_lng: saveExactLocation ? route.destination.lng : null,
    data_year: route.accidentData?.year || Number(dataYear),
    route_type: routeType,
    safety_level: Number(safetyLevel),
    accident_data_available: hasAccidents,
    recommended_route: String(ranked[0].id),
    snapshot: saveExactLocation ? JSON.parse(JSON.stringify({ version: 1, route, ranked,
      safetyLevel: Number(safetyLevel), weights: { ...RISK_WEIGHTS } })) : null,
    // 경로선에도 상세 위치가 담기므로 위치 저장 동의가 있는 경우에만 저장합니다.
    candidates: ranked.map(candidate => ({
      id: String(candidate.id),
      duration: Math.round(candidate.duration),
      distance: Math.round(candidate.distance),
      risk: hasAccidents ? candidate.risk : null,
      combined: hasAccidents ? Number(candidate.combined.toFixed(4)) : null,
      hotspotCount: hasAccidents ? candidate.hazards.length : null,
    })),
  }
}

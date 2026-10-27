import { rankRoutes, scoreRoute } from './routeSafety.js'

export function broadRegion(point) {
  const address = String(point?.address || '')
  const parts = address.trim().split(/\s+/)
  if (parts.length >= 2 && /(?:시|도|군|구)$/.test(parts[0]) && /(?:시|군|구)$/.test(parts[1])) {
    return `${parts[0]} ${parts[1]}`.slice(0, 60)
  }
  return '지역 미상'
}

export function makeAnalysisRecord(route, routeType, safetyLevel, userId, dataYear) {
  const hasAccidents = !!route.accidentData?.hazards?.length
  const candidates = route.routes || [route]
  const scored = hasAccidents ? candidates.map(candidate => scoreRoute(candidate, route.accidentData.hazards)) : candidates
  const ranked = hasAccidents ? rankRoutes(scored, safetyLevel) : [...scored].sort((a, b) => a.duration - b.duration)
  return {
    user_id: userId,
    start_region: broadRegion(route.start),
    destination_region: broadRegion(route.destination),
    data_year: route.accidentData?.year || Number(dataYear),
    route_type: routeType,
    safety_level: Number(safetyLevel),
    accident_data_available: hasAccidents,
    recommended_route: String(ranked[0].id),
    // 주소·좌표·경로선은 저장하지 않고 결과 수치만 보관합니다.
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

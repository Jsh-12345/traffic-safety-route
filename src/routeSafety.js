import { calculateHazardScore } from './riskScore.js'

// 지역 중심점 주변에서 평면 근사로 경로 선분까지의 거리를 구합니다.
export function distanceToSegmentMeters(point, a, b) {
  const radians = Math.PI / 180
  const scaleX = 6371000 * radians * Math.cos(point[0] * radians)
  const scaleY = 6371000 * radians
  const ax = (a[1] - point[1]) * scaleX, ay = (a[0] - point[0]) * scaleY
  const bx = (b[1] - point[1]) * scaleX, by = (b[0] - point[0]) * scaleY
  const dx = bx - ax, dy = by - ay
  const length2 = dx * dx + dy * dy
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length2))
  return Math.hypot(ax + t * dx, ay + t * dy)
}

export function scoreRoute(route, hazards) {
  const segments = route.segments || [route.points]
  const matched = [...new Map(hazards.map(h => [h.id, h])).values()].filter(h => {
    for (const road of segments) {
      for (let i = 1; i < road.length; i++) {
        if (distanceToSegmentMeters([h.lat, h.lng], road[i - 1], road[i]) <= h.radius) return true
      }
    }
    return false
  })
  return { ...route, hazards: matched, risk: matched.reduce((sum, h) => sum + calculateHazardScore(h), 0) }
}

export function rankRoutes(routes, safetyLevel) {
  const weight = Number(safetyLevel) / 100
  if (!Number.isFinite(weight) || weight < 0 || weight > 1 || !routes.length) throw new Error('추천 조건을 확인하세요.')
  const times = routes.map(r => r.duration), risks = routes.map(r => r.risk)
  const minTime = Math.min(...times), maxTime = Math.max(...times)
  const minRisk = Math.min(...risks), maxRisk = Math.max(...risks)
  const normalized = (value, min, max) => min === max ? 0 : (value - min) / (max - min)
  return routes.map(r => {
    const timeNormalized = normalized(r.duration, minTime, maxTime)
    const riskNormalized = normalized(r.risk, minRisk, maxRisk)
    return { ...r, timeNormalized, riskNormalized, combined: (1 - weight) * timeNormalized + weight * riskNormalized }
  }).sort((a, b) => a.combined - b.combined || a.duration - b.duration || a.risk - b.risk || a.distance - b.distance)
}

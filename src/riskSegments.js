import { distanceToSegmentMeters } from './routeSafety.js'
// 긴 실제 도로 선분도 40m 이하로 나눠 근접 구간만 표시합니다. 경로 좌표를 제거하지 않습니다.
export function riskSegments(candidate, hazards) {
  const result = []
  for (const road of candidate.segments || [candidate.points]) {
    for (let i = 1; i < road.length; i++) {
      const a = road[i - 1], b = road[i]
      const meters = Math.hypot((b[0]-a[0])*111195, (b[1]-a[1])*111195*Math.cos(a[0]*Math.PI/180))
      const n = Math.max(1, Math.ceil(meters/40))
      for (let j = 0; j < n; j++) {
        const at = t => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t]
        const start = at(j/n), end = at((j+1)/n)
        const near = hazards.some(h => distanceToSegmentMeters([h.lat,h.lng], start, end) <= h.radius)
        const last = result.at(-1)
        if (last && last.near === near && last.points.at(-1)[0] === start[0] && last.points.at(-1)[1] === start[1]) last.points.push(end)
        else result.push({ points: [start,end], near })
      }
    }
  }
  return result
}

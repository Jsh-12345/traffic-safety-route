import { calculateHazardScore, calculateRouteRisk, getRiskGrade } from './riskScore.js'

// 4차시 시험용 가상 데이터. 실제 사고 통계나 도로 경로가 아닙니다.
// injuries는 사망자를 제외한 부상자 수입니다. 시간·거리는 고정 예시값입니다.
// 아래 사고 건수·부상자 수·사망자 수를 바꾸고 저장하면 점수가 다시 계산됩니다.
export const demoHazards = [
  { id: 'A', name: '가상 위험지역 A', position: [36.350, 127.377], accidents: 5, injuries: 5, fatalities: 1 },
  { id: 'B', name: '가상 위험지역 B', position: [36.350, 127.387], accidents: 2, injuries: 4, fatalities: 0 },
  { id: 'C', name: '가상 위험지역 C', position: [36.357, 127.389], accidents: 4, injuries: 6, fatalities: 0 },
].map((hazard) => {
  const score = calculateHazardScore(hazard)
  return { ...hazard, score, ...getRiskGrade(score) }
})

export const demoRoutes = [
  {
    id: 'fast', name: '빠른 경로', color: '#2563eb', minutes: 12, km: 2.4,
    hazardIds: ['A', 'B'],
    points: [[36.346, 127.373], [36.350, 127.373], [36.350, 127.392], [36.355, 127.392]],
  },
  {
    id: 'safe', name: '안전 우선 경로', color: '#087f5b', minutes: 16, km: 3.1,
    hazardIds: ['C'],
    points: [[36.346, 127.373], [36.346, 127.369], [36.357, 127.369], [36.357, 127.392], [36.355, 127.392]],
  },
].map((route) => ({
  ...route,
  // 공간 분석은 이후 구현합니다. 이번에는 미리 연결한 위험지역 점수만 합산합니다.
  risk: calculateRouteRisk(route.hazardIds, demoHazards),
}))

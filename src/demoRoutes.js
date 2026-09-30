// 3차시 화면 시험용 가상 데이터. 실제 사고 통계나 도로 경로가 아닙니다.
// 시간과 거리는 예시값이며, 위험점수·등급도 임시로 지정했습니다.
export const demoHazards = [
  { id: 'A', name: '가상 위험지역 A', position: [36.350, 127.377], grade: '높음', color: '#c2413b', score: 20 },
  { id: 'B', name: '가상 위험지역 B', position: [36.350, 127.387], grade: '보통', color: '#b75b08', score: 10 },
  { id: 'C', name: '가상 위험지역 C', position: [36.357, 127.389], grade: '보통', color: '#b75b08', score: 16 },
]

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
  risk: demoHazards.filter((hazard) => route.hazardIds.includes(hazard.id))
    .reduce((sum, hazard) => sum + hazard.score, 0),
}))

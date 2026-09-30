// 프로젝트에서 검증할 임시 가중치이며 실제 사고 확률을 나타내지 않습니다.
export const RISK_WEIGHTS = { accidents: 1, injuries: 3, fatalities: 15 }

export function calculateHazardScore({ accidents, injuries, fatalities }) {
  const counts = { accidents, injuries, fatalities }
  for (const [key, value] of Object.entries(counts)) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`${key}: 0 이상의 정수를 입력해야 합니다.`)
    }
  }
  const score = Object.entries(counts).reduce(
    (sum, [key, count]) => sum + count * RISK_WEIGHTS[key], 0,
  )
  if (!Number.isSafeInteger(score)) throw new Error('위험점수가 계산 가능한 정수 범위를 초과했습니다.')
  return score
}

export function getRiskGrade(score) {
  // 공식 기준이 아닌 화면 시험용 등급입니다.
  if (score >= 20) return { grade: '높음', color: '#c2413b' }
  if (score >= 10) return { grade: '보통', color: '#b75b08' }
  return { grade: '낮음', color: '#64748b' }
}

export function calculateRouteRisk(hazardIds, hazards) {
  // 같은 위험지역 ID가 중복되어도 한 번만 합산합니다.
  return [...new Set(hazardIds)].reduce((sum, id) => {
    const hazard = hazards.find((item) => item.id === id)
    if (!hazard) throw new Error(`경로에 연결된 위험지역 ${id}를 찾을 수 없습니다.`)
    return sum + calculateHazardScore(hazard)
  }, 0)
}

export function describeRiskChange(baseRisk, otherRisk) {
  if (baseRisk === otherRisk) return '위험점수 동일'
  if (baseRisk === 0) return `위험점수 ${otherRisk}점 증가 (기준이 0점이므로 변화율 계산 불가)`
  const percent = (Math.abs(baseRisk - otherRisk) / baseRisk * 100).toFixed(1)
  return `위험점수 ${percent}% ${otherRisk < baseRisk ? '감소' : '증가'}`
}

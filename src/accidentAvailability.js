// 신규 응답은 수집 완료 여부를 명시합니다. 기존 저장 기록은 당시의 처리 방식을 유지합니다.
export function canScoreAccidents(data) {
  if (!data || !Array.isArray(data.hazards)) return false
  if (typeof data.coverageComplete === 'boolean') return data.coverageComplete
  return data.hazards.length > 0
}

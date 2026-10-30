// 지도상의 점수 기호 크기(px). 경로와의 거리 판정에는 사용하지 않습니다.
// 면적은 36 + 4 × 점수에 비례합니다. 0점도 반경 6px로 표시합니다.
export function hazardMarkerRadius(score) {
  if (!Number.isFinite(score) || score < 0) throw new Error('위험점수는 0 이상의 수여야 합니다.')
  return Math.sqrt(36 + 4 * score)
}

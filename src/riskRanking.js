// 시간·종합점수와 별개로, 조회한 후보의 위험점수만 비교합니다.
export function rankRiskWithinCandidates(candidates) {
  const ranks = new Map()
  if (candidates.length < 2 || candidates.some(candidate => !Number.isFinite(candidate.risk))) return ranks

  const sorted = [...candidates].sort((a, b) => a.risk - b.risk)
  for (let i = 0; i < sorted.length;) {
    let end = i + 1
    while (end < sorted.length && sorted[end].risk === sorted[i].risk) end++
    const label = `후보 ${sorted.length}개 중 ${end - i > 1 ? '공동 ' : ''}${i + 1}위`
    for (let j = i; j < end; j++) ranks.set(sorted[j].id, label)
    i = end
  }
  return ranks
}

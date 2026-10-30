import { RISK_WEIGHTS } from './riskScore.js'

export function explainRisk(hazards, weights = RISK_WEIGHTS) {
  const unique = [...new Map(hazards.map(h => [h.id, h])).values()]
  const totals = unique.reduce((sum, h) => ({
    accidents: sum.accidents + h.accidents,
    injuries: sum.injuries + h.injuries,
    fatalities: sum.fatalities + h.fatalities,
  }), { accidents: 0, injuries: 0, fatalities: 0 })
  const score = totals.accidents * weights.accidents + totals.injuries * weights.injuries + totals.fatalities * weights.fatalities
  return `관련 지역 ${unique.length}곳 (같은 지역은 한 번만 합산)\n사고 ${totals.accidents}건 × ${weights.accidents} + 부상 ${totals.injuries}명 × ${weights.injuries} + 사망 ${totals.fatalities}명 × ${weights.fatalities} = ${score}점\n실제 사고 확률이 아닌 비교용 점수입니다.`
}

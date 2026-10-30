import { explainRisk } from './riskExplanation.js'

export default function RiskValue({ value, hazards, weights }) {
  const explanation = explainRisk(hazards, weights)
  return <span className="risk-value" tabIndex={0} title={explanation} aria-label={`위험점수 ${value}점. ${explanation}`}>{value}점</span>
}

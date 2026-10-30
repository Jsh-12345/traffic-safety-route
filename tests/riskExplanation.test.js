import test from 'node:test'
import assert from 'node:assert/strict'
import { explainRisk } from '../src/riskExplanation.js'

test('risk explanation sums distinct regions once and accounts for each weight', () => {
  const a = { id: 'a', accidents: 2, injuries: 3, fatalities: 1 }
  const b = { id: 'b', accidents: 4, injuries: 2, fatalities: 0 }
  const text = explainRisk([a, b, a])
  assert.match(text, /관련 지역 2곳/)
  assert.match(text, /사고 6건 × 1 \+ 부상 5명 × 3 \+ 사망 1명 × 15 = 36점/)
})
test('saved weights and empty matches produce accurate explanations', () => {
  assert.match(explainRisk([{ id: 'a', accidents: 2, injuries: 1, fatalities: 1 }], { accidents: 2, injuries: 4, fatalities: 20 }), /= 28점/)
  assert.match(explainRisk([]), /관련 지역 0곳/)
  assert.match(explainRisk([]), /= 0점/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { hazardMarkerRadius } from '../src/hazardMarker.js'

test('visual circle size increases with score across different accident types', () => {
  const signal = { risk: 100, radius: 100 }
  const centerline = { risk: 25, radius: 300 }
  assert.ok(hazardMarkerRadius(signal.risk) > hazardMarkerRadius(centerline.risk))
  assert.equal(signal.radius, 100)
  assert.equal(centerline.radius, 300)
  assert.equal(hazardMarkerRadius(0), 6)
  assert.ok(hazardMarkerRadius(101) > hazardMarkerRadius(100))
})
test('marker area grows linearly above its minimum size; invalid scores are rejected', () => {
  assert.ok(Math.abs(hazardMarkerRadius(100) ** 2 - 36 - 4 * (hazardMarkerRadius(25) ** 2 - 36)) < 1e-9)
  for (const score of [-1, NaN, Infinity]) assert.throws(() => hazardMarkerRadius(score))
})

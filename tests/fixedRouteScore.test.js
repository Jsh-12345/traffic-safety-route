import assert from 'node:assert/strict'
import test from 'node:test'
import { rankRoutes } from '../src/routeSafety.js'

const fast = { id: 'fast', duration: 19.1 * 60, risk: 77.5, distance: 4700 }
const other = { id: 'other', duration: 21.4 * 60, risk: 14.75, distance: 4600 }

test('two routes with opposite time and risk strengths no longer tie at 50%', () => {
  const result = rankRoutes([fast, other], 50)
  assert.deepEqual(result.map(r => [r.id, r.combined.toFixed(3)]), [['other', '0.430'], ['fast', '0.706']])
  assert.equal(rankRoutes([fast, { ...other, risk: 76 }], 50)[0].id, 'fast')
})

test('adding a candidate cannot affect the score of existing candidates', () => {
  const [first, second] = rankRoutes([fast, other], 50)
  const all = rankRoutes([fast, other, { id: 'third', duration: 3000, risk: 200 }], 50)
  for (const result of [first, second]) {
    assert.equal(all.find(r => r.id === result.id).combined, result.combined)
  }
  assert.ok(all.find(r => r.id === 'third').combined > 1)
})

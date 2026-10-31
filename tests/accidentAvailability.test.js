import test from 'node:test'
import assert from 'node:assert/strict'
import { canScoreAccidents } from '../src/accidentAvailability.js'
import { makeAnalysisRecord } from '../src/analysisHistory.js'
import { handleAccidents } from '../server/accidents.js'

test('complete empty query is scored as zero and saved as available; failures are unavailable', () => {
  assert.equal(canScoreAccidents(null), false)
  assert.equal(canScoreAccidents({ hazards: [], coverageComplete: false }), false)
  const accidentData = { year: 2024, hazards: [], coverageComplete: true }
  assert.equal(canScoreAccidents(accidentData), true)
  const route = { start: {}, destination: {}, accidentData, routes: [
    { id: 'slow', duration: 200, distance: 2000, points: [[36,127],[36.1,127.1]] },
    { id: 'fast', duration: 100, distance: 1000, points: [[36,127],[36.1,127.1]] },
  ] }
  const saved = makeAnalysisRecord(route, 'safe', 100, 'user', 2024)
  assert.equal(saved.accident_data_available, true)
  assert.equal(saved.recommended_route, 'fast')
  assert.ok(saved.candidates.every(r => r.risk === 0 && r.hotspotCount === 0 && Number.isFinite(r.combined)))
})

test('missing national DB never falls back to Daejeon API even within Daejeon', async () => {
  const res = { setHeader() {}, end(body) { this.body = JSON.parse(body) } }
  await handleAccidents({ method: 'GET', url: '/api/accidents?year=2024&minLat=36.3&maxLat=36.4&minLng=127.3&maxLng=127.4' }, res, 'unused', {})
  assert.equal(res.statusCode, 503)
  assert.match(res.body.error, /전국 사고 데이터/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { broadRegion, makeAnalysisRecord } from '../src/analysisHistory.js'

test('history stores regional summary and scores without exact addresses, coordinates or geometry', () => {
  const route = {
    start: { label: '우리집', address: '대전광역시 서구 둔산로 12', lat: 36.35, lng: 127.38 },
    destination: { label: '학교', address: '대전광역시 유성구 대학로 34', lat: 36.36, lng: 127.39 },
    routes: [{ id: 'route-1', duration: 600, distance: 5000, points: [[36.35, 127.38], [36.36, 127.39]] }],
    accidentData: { year: 2024, hazards: [{ id: '2024-01-1', lat: 36.35, lng: 127.38, radius: 100, accidents: 1, injuries: 2, fatalities: 0 }] },
  }
  const record = makeAnalysisRecord(route, 'safe', 100, 'user-1', '2024')
  assert.equal(record.start_region, '대전광역시 서구')
  assert.equal(record.destination_region, '대전광역시 유성구')
  assert.equal(record.candidates[0].risk, 7)
  const saved = JSON.stringify(record)
  for (const privateValue of ['둔산로', '대학로', '36.35', '127.38', '우리집', '학교', 'points']) assert.ok(!saved.includes(privateValue))
  assert.equal(record.start_lat, null)
  assert.equal(record.start_label, null)
})

test('exact locations are included only after explicit selection', () => {
  const route = {
    start: { label: '대전역', address: '대전 동구 중앙로 215', lat: 36.3326, lng: 127.4343 },
    destination: { label: '학교', address: '대전 유성구 대학로 99', lat: 36.3701, lng: 127.3618 },
    routes: [{ id: 'route-1', duration: 600, distance: 5000 }],
  }
  const record = makeAnalysisRecord(route, 'fast', 0, 'user-1', '2024', true)
  assert.equal(record.start_region, '대전광역시 동구')
  assert.equal(record.start_label, '대전역')
  assert.equal(record.start_address, '대전 동구 중앙로 215')
  assert.equal(record.start_lat, 36.3326)
  assert.equal(record.destination_lng, 127.3618)
  assert.ok(!JSON.stringify(record.candidates).includes('36.3326'))
})

test('short Kakao addresses and coordinate-derived regions retain only district-level data', () => {
  assert.equal(broadRegion({ address: '대전 서구 둔산로 12' }), '대전광역시 서구')
  assert.equal(broadRegion({ address: '지도에서 선택한 위치', region: '대전광역시 유성구', lat: 36.36 }), '대전광역시 유성구')
  assert.equal(broadRegion({ address: '지도에서 선택한 위치' }), '지역 미상')
})

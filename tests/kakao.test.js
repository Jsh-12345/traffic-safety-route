import test from 'node:test'
import assert from 'node:assert/strict'
import { getDirections, normalizeRoute, searchPlaces, handleApi } from '../server/kakao.js'
import { calculateHazardScore } from '../src/riskScore.js'

const data = { routes: [{ result_code: 0, summary: { distance: 1234, duration: 120 }, sections: [{ roads: [{ vertexes: [127.1, 36.1, 127.2, 36.2] }] }] }] }
test('longitude/latitude becomes Leaflet latitude/longitude; meters and seconds remain intact', () => {
  assert.deepEqual(normalizeRoute(data), { distance: 1234, duration: 120, points: [[36.1, 127.1], [36.2, 127.2]] })
  assert.throws(() => normalizeRoute({ routes: [{ result_code: 101 }] }), /경로를 찾지/)
  assert.throws(() => normalizeRoute({ routes: [{ result_code: 0 }] }), /상세 데이터/)
})
test('real request uses TIME priority and correct coordinate order', async () => {
  const params = new URLSearchParams({ startLat: '36.1', startLng: '127.1', endLat: '36.2', endLng: '127.2' })
  const result = await getDirections(params, 'test-only', async (url, options) => {
    assert.equal(url.searchParams.get('origin'), '127.1,36.1')
    assert.equal(url.searchParams.get('priority'), 'TIME')
    assert.equal(options.headers.Authorization, 'KakaoAK test-only')
    return { ok: true, json: async () => data }
  })
  assert.equal(result.distance, 1234)
  await assert.rejects(getDirections(new URLSearchParams(), 'test-only'), /좌표가 필요/)
})
test('empty keyword results fall back to address search', async () => {
  let calls = 0
  const results = await searchPlaces('대전 주소', 'test-only', async url => {
    calls++
    return { ok: true, json: async () => ({ documents: url.pathname.includes('keyword') ? [] : [{ address_name: '대전 주소', x: '127.1', y: '36.1' }] }) }
  })
  assert.equal(calls, 2)
  assert.equal(results[0].lat, 36.1)
})
test('missing key, unauthorized and quota errors explain recovery without disclosing credentials', async () => {
  await assert.rejects(searchPlaces('대전역', ''), /KAKAO_REST_API_KEY/)
  await assert.rejects(searchPlaces('대전역', 'secret', async () => ({ status: 401 })), /사용 권한/)
  await assert.rejects(searchPlaces('대전역', 'secret', async () => ({ status: 429 })), /한도/)
  const res = { setHeader() {}, end(body) { this.body = body } }
  await handleApi({ method: 'POST', url: '/api/places' }, res, 'places', 'secret')
  assert.equal(res.statusCode, 405)
  assert.ok(!res.body.includes('secret'))
})
test('previous 1/3/15 risk weights remain intact', () => {
  assert.equal(calculateHazardScore({ accidents: 5, injuries: 5, fatalities: 1 }), 35)
})

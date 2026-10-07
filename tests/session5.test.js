import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeHazard, parseAccidentResponse, getAccidents, DISTRICTS } from '../server/accidents.js'
import { scoreRoute, rankRoutes, distanceToSegmentMeters } from '../src/routeSafety.js'
import { getDirections } from '../server/kakao.js'

const item = { afos_fid: 12, afos_id: '01', spot_nm: '시험용 지점', la_crd: '36.35', lo_crd: '127.38', occrrnc_cnt: 6, caslt_cnt: 9, dth_dnv_cnt: 1, se_dnv_cnt: 2, sl_dnv_cnt: 5, wnd_dnv_cnt: 1 }
const response = items => ({ resultCode: '00', totalCount: items.length, items: { item: items } })

test('injured excludes fatalities; classification determines radius', () => {
  const h = normalizeHazard(item, 2024)
  assert.equal(h.injuries, 8)
  assert.equal(h.fatalities, 1)
  assert.equal(h.radius, 100)
  assert.equal(normalizeHazard({ ...item, afos_id: '02' }, 2024).radius, 300)
  assert.throws(() => normalizeHazard({ ...item, se_dnv_cnt: '' }, 2024), /누락/)
})
test('empty data is distinct from errors or malformed response', () => {
  assert.deepEqual(parseAccidentResponse({ resultCode: '03' }), { items: [], total: 0 })
  assert.throws(() => parseAccidentResponse({ resultCode: '30' }), /인증키/)
  assert.throws(() => parseAccidentResponse({ totalCount: 0 }), /결과 코드/)
  assert.equal(parseAccidentResponse({ response: { header: { resultCode: '00' }, body: { totalCount: 1, items: { item } } } }).items.length, 1)
})
test('all five districts are loaded and encoded key is not double encoded', async () => {
  const districts = []
  const data = await getAccidents(new URLSearchParams({ year: '2024' }), 'a%2Bb%3D', async url => {
    assert.equal(url.searchParams.get('ServiceKey'), 'a+b=')
    assert.equal(url.searchParams.get('siDo'), '30')
    const district = url.searchParams.get('guGun'); districts.push(district)
    return { ok: true, json: async () => response([{ ...item, afos_fid: district }]) }
  })
  assert.deepEqual(districts.sort(), DISTRICTS)
  assert.equal(data.hazards.length, 5)
  assert.ok(!JSON.stringify(data).includes('a+b='))
  await assert.rejects(getAccidents(new URLSearchParams(), ''), /DATA_GO_KR_SERVICE_KEY/)
})
test('page two is requested; a failed district cannot look like zero risk', async () => {
  let secondPage = false
  const data = await getAccidents(new URLSearchParams(), 'test', async url => {
    const page = url.searchParams.get('pageNo'), district = url.searchParams.get('guGun')
    secondPage ||= page === '2'
    return { ok: true, json: async () => ({ ...response([{ ...item, afos_fid: district + page }]), totalCount: 2 }) }
  })
  assert.ok(secondPage)
  assert.equal(data.hazards.length, 10)
  await assert.rejects(getAccidents(new URLSearchParams(), 'test', async url => ({ ok: true, json: async () => url.searchParams.get('guGun') === '200' ? { resultCode: '30' } : response([]) })), /인증키/)
})
test('hazard near segment midpoint is counted once, distant hazard ignored', () => {
  const h = normalizeHazard(item, 2024)
  const route = { points: [[36.35, 127.37], [36.35, 127.39]] }
  assert.ok(distanceToSegmentMeters([36.35, 127.38], ...route.points) < 1)
  const result = scoreRoute(route, [h, h, { ...h, id: 'far', lat: 37 }])
  assert.equal(result.hazards.length, 1)
  assert.equal(result.risk, 45)
  // Two disjoint road pieces must not create an artificial hazard crossing.
  const disconnected = { ...route, segments: [[[36.35, 127.37], [36.35, 127.371]], [[36.35, 127.389], [36.35, 127.39]]] }
  assert.equal(scoreRoute(disconnected, [h]).risk, 0)
})
test('0% picks fastest, 100% picks lowest risk, identical risk avoids divide-by-zero', () => {
  const routes = [{ id: 'fast', duration: 600, risk: 40, distance: 2000 }, { id: 'safe', duration: 900, risk: 10, distance: 3000 }]
  assert.equal(rankRoutes(routes, 0)[0].id, 'fast')
  assert.equal(rankRoutes(routes, 100)[0].id, 'safe')
  assert.equal(rankRoutes(routes, 50)[0].id, 'fast')
  assert.equal(rankRoutes(routes.map(r => ({ ...r, risk: 0 })), 100)[0].id, 'fast')
  assert.equal(rankRoutes([routes[0]], 100)[0].combined, 0)
})
test('alternatives are requested, duplicate geometry is removed and fastest is first', async () => {
  const a = { result_code: 0, summary: { distance: 1200, duration: 900 }, sections: [{ roads: [{ vertexes: [127.1, 36.1, 127.2, 36.2] }] }] }
  const b = { ...a, summary: { distance: 1300, duration: 600 }, sections: [{ roads: [{ vertexes: [127.1, 36.1, 127.3, 36.2] }] }] }
  const routes = await getDirections(new URLSearchParams({ startLat: '36.1', startLng: '127.1', endLat: '36.2', endLng: '127.2' }), 'test', async url => {
    assert.equal(url.searchParams.get('alternatives'), 'true')
    return { ok: true, json: async () => ({ routes: [a, b, a] }) }
  })
  assert.equal(routes.routes.length, 2)
  assert.equal(routes.duration, 600)
  assert.deepEqual(routes.routeSearch.sources.map(s => s.priority), ['TIME', 'RECOMMEND', 'DISTANCE'])
  assert.equal(routes.routeSearch.rawCount, 9)
  assert.equal(routes.routeSearch.uniqueCount, 2)
})

test('other priorities can add distinct roads when alternatives returns only one', async () => {
  const routeFor = (lon, duration) => ({ result_code: 0, summary: { distance: 1000, duration }, sections: [{ roads: [{ vertexes: [127.1, 36.1, lon, 36.2] }] }] })
  const params = new URLSearchParams({ startLat: '36.1', startLng: '127.1', endLat: '36.2', endLng: '127.2' })
  const r = await getDirections(params, 'test', async url => ({ ok: true, json: async () => ({ routes: [routeFor(url.searchParams.get('priority') === 'DISTANCE' ? 127.3 : 127.2, url.searchParams.get('priority') === 'TIME' ? 100 : 110)] }) }))
  assert.equal(r.routeSearch.rawCount, 3)
  assert.equal(r.routeSearch.uniqueCount, 2)
  assert.deepEqual(r.routes.map(x => x.duration), [100, 110])
})

test('failed alternative priority preserves the fastest road and reports missing comparison', async () => {
  const params = new URLSearchParams({ startLat: '36.1', startLng: '127.1', endLat: '36.2', endLng: '127.2' })
  const route = { result_code: 0, summary: { distance: 1000, duration: 100 }, sections: [{ roads: [{ vertexes: [127.1, 36.1, 127.2, 36.2] }] }] }
  const r = await getDirections(params, 'test', async url => {
    if (url.searchParams.get('priority') !== 'TIME') throw new Error('mock outage')
    return { ok: true, json: async () => ({ routes: [route] }) }
  })
  assert.equal(r.routes.length, 1)
  assert.deepEqual(r.routeSearch.failedPriorities, ['RECOMMEND', 'DISTANCE'])
})

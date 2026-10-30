import test from 'node:test'
import assert from 'node:assert/strict'
import { ACCIDENT_REGIONS } from '../server/accidentRegions.js'
import { loadRegion, parseBounds, handleAccidents } from '../server/accidents.js'
import { routeBounds } from '../src/routeSafety.js'

const item = { afos_fid: 7, afos_id: '01', spot_nm: '시험', la_crd: '37.8', lo_crd: '127.7', occrrnc_cnt: 3, dth_dnv_cnt: 0, se_dnv_cnt: 1, sl_dnv_cnt: 1, wnd_dnv_cnt: 0 }

test('national region list has unique 5-digit codes for every province', () => {
  const codes = ACCIDENT_REGIONS.map(r => r.code)
  assert.equal(new Set(codes).size, codes.length)
  assert.ok(codes.every(c => /^\d{5}$/.test(c)))
  assert.equal(new Set(codes.map(c => c.slice(0, 2))).size, 17)
  assert.deepEqual(ACCIDENT_REGIONS.find(r => r.code === '51110').codes, ['51110', '42110'])
})

test('region loads current and legacy codes and tags rows with the region', async () => {
  const region = ACCIDENT_REGIONS.find(r => r.code === '51110')
  const asked = []
  const rows = await loadRegion(2024, region, 'k', async url => {
    const code = url.searchParams.get('siDo') + url.searchParams.get('guGun'); asked.push(code)
    return { ok: true, json: async () => code === '51110' ? { resultCode: '00', totalCount: 1, items: { item } } : { resultCode: '03' } }
  })
  assert.deepEqual(asked, ['51110', '42110'])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].regionCode, '51110')
  await assert.rejects(loadRegion(2024, region, 'k', async () => ({ ok: true, json: async () => ({ resultCode: '30' }) })), /인증키/)
})

test('route bounds cover all candidates with padding and are validated', () => {
  const b = routeBounds([{ points: [[36.3, 127.3], [36.4, 127.4]] }, { points: [[36.35, 127.5]] }])
  assert.ok(b.minLat < 36.3 && b.maxLat > 36.4 && b.minLng < 127.3 && b.maxLng > 127.5)
  assert.deepEqual(parseBounds(new URLSearchParams(b)), b)
  assert.equal(parseBounds(new URLSearchParams()), null)
  assert.throws(() => parseBounds(new URLSearchParams({ minLat: 37, maxLat: 36, minLng: 127, maxLng: 128 })), /범위/)
})

test('routes outside Daejeon are not scored with Daejeon-only fallback data', async () => {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v }, end(body) { this.body = JSON.parse(body) } }
  await handleAccidents({ method: 'GET', url: '/api/accidents?year=2024&minLat=37.4&minLng=126.9&maxLat=37.6&maxLng=127.1' }, res, 'k', {})
  assert.equal(res.statusCode, 503)
  assert.match(res.body.error, /전국 사고 데이터/)
})

test('gateway rate-limit errors are reported as limits, not key problems', async () => {
  const region = ACCIDENT_REGIONS.find(r => r.code === '30110')
  const gateway = code => async () => ({ ok: false, status: 429, json: async () => ({ OpenAPI_ServiceResponse: { cmmMsgHeader: { returnReasonCode: code } } }) })
  await assert.rejects(loadRegion(2024, region, 'k', gateway('23')), /초당 호출 한도/)
  await assert.rejects(loadRegion(2024, region, 'k', gateway('22')), /하루 호출 한도/)
  await assert.rejects(loadRegion(2024, region, 'k', gateway('30')), /인증키/)
})

import { ApiError } from './kakao.js'

export const DISTRICTS = ['110', '140', '170', '200', '230'] // 대전 동구·중구·서구·유성구·대덕구
const cache = new Map()
const pending = new Map()

function count(value) {
  if (value == null || String(value).trim() === '') throw new ApiError(502, '사고 데이터에 집계값이 누락되어 있습니다.')
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n < 0) throw new ApiError(502, '사고 데이터의 집계값을 확인할 수 없습니다.')
  return n
}

export function normalizeHazard(item, year) {
  const type = String(item.afos_id).padStart(2, '0')
  if (!['01', '02'].includes(type)) throw new ApiError(502, '사고 유형을 확인할 수 없습니다.')
  const lat = Number(item.la_crd), lng = Number(item.lo_crd)
  if (item.la_crd == null || item.lo_crd == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || item.afos_fid == null) {
    throw new ApiError(502, '사고 데이터의 위치 또는 식별자가 누락되었습니다.')
  }
  const fatalities = count(item.dth_dnv_cnt)
  // 사상자 수에는 사망자가 포함되므로 부상 항목만 합산합니다.
  const injuries = count(item.se_dnv_cnt) + count(item.sl_dnv_cnt) + count(item.wnd_dnv_cnt)
  return {
    id: `${year}-${type}-${item.afos_fid}`, label: String(item.spot_nm || '사고 다발지역'),
    district: String(item.sido_sgg_nm || ''), lat, lng, year,
    type, typeLabel: type === '01' ? '신호위반' : '중앙선침범',
    radius: type === '01' ? 100 : 300,
    accidents: count(item.occrrnc_cnt), injuries, fatalities,
  }
}

export function parseAccidentResponse(data) {
  const body = data.response?.body || data.body || data
  const header = data.response?.header || data.header || body
  const rawCode = header.resultCode ?? body.resultCode
  if (rawCode == null || String(rawCode).trim() === '') throw new ApiError(502, '사고 데이터 응답의 결과 코드를 확인하지 못했습니다.')
  const code = String(rawCode).padStart(2, '0')
  if (code === '03') return { items: [], total: 0 }
  if (code !== '00') {
    if (['20', '30', '31'].includes(code)) throw new ApiError(502, '공공데이터 인증키와 법규위반별 사고 API 활용승인 상태를 확인하세요.')
    if (['22', '23'].includes(code)) throw new ApiError(429, '공공데이터 API 호출 한도를 초과했습니다. 잠시 후 시도하세요.')
    throw new ApiError(502, `사고 데이터 조회 오류(코드 ${code}). 조회 연도와 서비스 상태를 확인하세요.`)
  }
  const raw = body.items?.item
  const total = Number(body.totalCount)
  if (!Number.isSafeInteger(total) || total < 0) throw new ApiError(502, '사고 데이터 총건수를 확인하지 못했습니다.')
  const items = raw ? Array.isArray(raw) ? raw : [raw] : []
  if (total > 0 && !items.length) throw new ApiError(502, '사고 데이터 응답에 항목이 누락되었습니다.')
  return { items, total }
}

async function loadDistrict(year, district, key, fetcher) {
  const items = []
  for (let page = 1; page <= 20; page++) {
    const url = new URL('https://apis.data.go.kr/B552061/frequentzoneLgrViolt/getRestFrequentzoneLgrViolt')
    // 디코딩 키를 URLSearchParams가 한 번만 인코딩합니다.
    url.search = new URLSearchParams({ ServiceKey: key, searchYearCd: String(year), siDo: '30', guGun: district, type: 'json', numOfRows: '100', pageNo: String(page) }).toString()
    let response
    try { response = await fetcher(url, { signal: AbortSignal.timeout(12000) }) }
    catch { throw new ApiError(502, '사고 데이터 서버 연결에 실패했습니다. 잠시 후 다시 시도하세요.') }
    if (!response.ok) throw new ApiError(502, '공공데이터 요청에 실패했습니다. 인증키와 활용승인 상태를 확인하세요.')
    let data
    try { data = await response.json() }
    catch { throw new ApiError(502, '사고 데이터 서버가 JSON 대신 다른 응답을 보냈습니다. 인증키와 서비스 상태를 확인하세요.') }
    const parsed = parseAccidentResponse(data)
    items.push(...parsed.items)
    if (items.length >= parsed.total) return items.map(item => normalizeHazard(item, year))
  }
  throw new ApiError(502, '사고 데이터 전체 페이지를 받지 못했습니다. 다시 시도하세요.')
}

export async function getAccidents(params, rawKey, fetcher = fetch) {
  const year = Number(params.get('year') || '2024')
  if (!Number.isInteger(year) || year < 2017 || year > 2024) throw new ApiError(400, '조회 연도는 2017~2024년으로 선택하세요.')
  if (!rawKey) throw new ApiError(503, '.env.local에 DATA_GO_KR_SERVICE_KEY를 추가하고 서버를 다시 시작하세요.')
  let key = rawKey.trim()
  if (/%[0-9a-f]{2}/i.test(key)) { try { key = decodeURIComponent(key) } catch { throw new ApiError(400, '공공데이터 인증키의 형식을 확인하세요.') } }
  const cacheKey = `${year}:${key}`
  const cached = cache.get(cacheKey)
  if (fetcher === fetch && cached && Date.now() - cached.time < 3600000) return cached.data
  if (fetcher === fetch && pending.has(cacheKey)) return pending.get(cacheKey)
  const load = async () => {
    const results = await Promise.all(DISTRICTS.map(d => loadDistrict(year, d, key, fetcher)))
    const hazards = [...new Map(results.flat().map(h => [h.id, h])).values()]
    const data = { hazards, year, region: '대전광역시 5개 구', source: '한국도로교통공단 법규위반별 교통사고 다발지역', sourceUrl: 'https://www.data.go.kr/data/15058087/openapi.do', loadedAt: new Date().toISOString() }
    if (fetcher === fetch) { cache.clear(); cache.set(cacheKey, { time: Date.now(), data }) }
    return data
  }
  const promise = load()
  if (fetcher === fetch) pending.set(cacheKey, promise)
  try { return await promise } finally { pending.delete(cacheKey) }
}

export async function handleAccidents(req, res, key) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  try {
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); throw new ApiError(405, 'GET 요청만 지원합니다.') }
    const data = await getAccidents(new URL(req.url, 'http://localhost').searchParams, key)
    res.statusCode = 200
    res.end(JSON.stringify(data))
  } catch (error) {
    res.statusCode = error instanceof ApiError ? error.status : 502
    res.end(JSON.stringify({ error: error instanceof ApiError ? error.message : '사고 데이터를 처리하지 못했습니다.' }))
  }
}

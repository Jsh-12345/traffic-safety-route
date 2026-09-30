// 이 모듈은 서버에서만 사용합니다. REST API 키를 React 코드로 보내지 않습니다.
export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

async function kakaoJson(url, key, fetcher) {
  if (!key) throw new ApiError(503, '.env.local에 KAKAO_REST_API_KEY를 설정하고 개발 서버를 다시 시작해 주세요.')
  let response
  try {
    response = await fetcher(url, {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    throw new ApiError(502, '카카오 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  }
  if ([401, 403].includes(response.status)) throw new ApiError(502, '카카오 인증 또는 사용 권한을 확인해 주세요. REST API 키와 해당 API의 사용 설정을 확인하세요.')
  if (response.status === 429) throw new ApiError(429, 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.')
  if (!response.ok) throw new ApiError(502, '카카오 API 요청에 실패했습니다. 입력 위치와 API 사용 설정을 확인해 주세요.')
  return response.json()
}

export async function searchPlaces(query, key, fetcher = fetch) {
  query = (query || '').trim()
  if (query.length < 2 || query.length > 100) throw new ApiError(400, '검색어는 2~100자로 입력해 주세요.')
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.search = new URLSearchParams({ query, size: '5' }).toString()
  const data = await kakaoJson(url, key, fetcher)
  let places = (data.documents || []).map(p => ({
    id: p.id, label: p.place_name, address: p.road_address_name || p.address_name,
    lat: Number(p.y), lng: Number(p.x),
  }))
  if (!places.length) {
    url.pathname = '/v2/local/search/address.json'
    const addresses = await kakaoJson(url, key, fetcher)
    places = (addresses.documents || []).map((p, i) => ({
      id: `address-${i}`, label: p.address_name,
      address: p.road_address?.address_name || p.address_name,
      lat: Number(p.y), lng: Number(p.x),
    }))
  }
  return places.filter(p => validPoint(p))
}

export function validPoint(p) {
  return p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180
}

export function normalizeRoute(data) {
  const route = data.routes?.[0]
  if (!route || route.result_code !== 0) throw new ApiError(422, '이 두 위치를 잇는 자동차 경로를 찾지 못했습니다. 도로 가까운 위치를 다시 선택해 주세요.')
  const points = []
  for (const section of route.sections || []) {
    for (const road of section.roads || []) {
      const v = road.vertexes || []
      for (let i = 0; i + 1 < v.length; i += 2) {
        if (validPoint({ lat: v[i + 1], lng: v[i] })) points.push([v[i + 1], v[i]])
      }
    }
  }
  const { distance, duration } = route.summary || {}
  if (points.length < 2 || !Number.isFinite(distance) || !Number.isFinite(duration) || distance < 0 || duration < 0) {
    throw new ApiError(502, '경로 상세 데이터를 받지 못했습니다. 다시 조회해 주세요.')
  }
  return { points, distance, duration }
}

export async function getDirections(params, key, fetcher = fetch) {
  const values = ['startLat', 'startLng', 'endLat', 'endLng'].map(k => params.get(k))
  if (values.some(v => v === null || v.trim() === '')) throw new ApiError(400, '출발지와 목적지의 좌표가 필요합니다.')
  const [startLat, startLng, endLat, endLng] = values.map(Number)
  if (!validPoint({ lat: startLat, lng: startLng }) || !validPoint({ lat: endLat, lng: endLng })) throw new ApiError(400, '유효하지 않은 좌표입니다.')
  if (startLat === endLat && startLng === endLng) throw new ApiError(400, '출발지와 목적지는 서로 달라야 합니다.')
  const url = new URL('https://apis-navi.kakaomobility.com/v1/directions')
  url.search = new URLSearchParams({ origin: `${startLng},${startLat}`, destination: `${endLng},${endLat}`, priority: 'TIME', summary: 'false' }).toString()
  return normalizeRoute(await kakaoJson(url, key, fetcher))
}

export async function handleApi(req, res, kind, key) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      throw new ApiError(405, 'GET 요청만 지원합니다.')
    }
    const params = new URL(req.url, 'http://localhost').searchParams
    const data = kind === 'places' ? { places: await searchPlaces(params.get('query'), key) } : await getDirections(params, key)
    res.statusCode = 200
    res.end(JSON.stringify(data))
  } catch (error) {
    res.statusCode = error instanceof ApiError ? error.status : 502
    res.end(JSON.stringify({ error: error instanceof ApiError ? error.message : 'API 응답을 처리하지 못했습니다. 다시 시도해 주세요.' }))
  }
}

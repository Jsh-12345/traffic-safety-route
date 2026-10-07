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

export function normalizeRoute(data, index = 0) {
  const route = data.routes?.[index]
  if (!route || route.result_code !== 0) throw new ApiError(422, '이 두 위치를 잇는 자동차 경로를 찾지 못했습니다. 도로 가까운 위치를 다시 선택해 주세요.')
  const points = []
  const segments = []
  for (const section of route.sections || []) {
    for (const road of section.roads || []) {
      const v = road.vertexes || []
      const roadPoints = []
      for (let i = 0; i + 1 < v.length; i += 2) {
        if (validPoint({ lat: v[i + 1], lng: v[i] })) {
          const point = [v[i + 1], v[i]]
          points.push(point)
          roadPoints.push(point)
        }
      }
      if (roadPoints.length > 1) segments.push(roadPoints)
    }
  }
  const { distance, duration } = route.summary || {}
  if (points.length < 2 || !Number.isFinite(distance) || !Number.isFinite(duration) || distance < 0 || duration < 0) {
    throw new ApiError(502, '경로 상세 데이터를 받지 못했습니다. 다시 조회해 주세요.')
  }
  return { points, segments, distance, duration }
}

export async function getDirections(params, key, fetcher = fetch) {
  const values = ['startLat', 'startLng', 'endLat', 'endLng'].map(k => params.get(k))
  if (values.some(v => v === null || v.trim() === '')) throw new ApiError(400, '출발지와 목적지의 좌표가 필요합니다.')
  const [startLat, startLng, endLat, endLng] = values.map(Number)
  if (!validPoint({ lat: startLat, lng: startLng }) || !validPoint({ lat: endLat, lng: endLng })) throw new ApiError(400, '유효하지 않은 좌표입니다.')
  if (startLat === endLat && startLng === endLng) throw new ApiError(400, '출발지와 목적지는 서로 달라야 합니다.')
  const priorities = ['TIME', 'RECOMMEND', 'DISTANCE']
  const request = async priority => {
    const url = new URL('https://apis-navi.kakaomobility.com/v1/directions')
    url.search = new URLSearchParams({ origin: `${startLng},${startLat}`, destination: `${endLng},${endLat}`, priority, summary: 'false', alternatives: 'true' }).toString()
    return kakaoJson(url, key, fetcher)
  }
  const outcomes = await Promise.allSettled(priorities.map(request))
  const primary = outcomes[0]
  if (primary.status === 'rejected') throw primary.reason // 빠른 경로 조회가 실패한 경우 추천 결과를 표시하지 않습니다.
  const routes = []
  const sources = []
  let rawCount = 0
  outcomes.forEach((outcome, priorityIndex) => {
    if (outcome.status === 'rejected') return
    const data = outcome.value
    const successful = (data.routes || []).map((r, i) => ({ r, i })).filter(({ r }) => r.result_code === 0)
    rawCount += successful.length
    sources.push({ priority: priorities[priorityIndex], count: successful.length })
    for (const { i } of successful) routes.push({ ...normalizeRoute(data, i), sourcePriority: priorities[priorityIndex] })
  })
  if (!routes.length) return normalizeRoute(primary.value) // 기존의 상세 오류 메시지를 사용합니다.
  // 완전히 같은 도로 좌표가 여러 우선순위에 나타나면 가장 빠른 요약을 남깁니다.
  routes.sort((a, b) => a.duration - b.duration || a.distance - b.distance)
  const byShape = new Map()
  for (const route of routes) {
    const shape = JSON.stringify(route.points)
    if (!byShape.has(shape)) byShape.set(shape, route)
  }
  const unique = [...byShape.values()]
  unique.sort((a, b) => a.duration - b.duration || a.distance - b.distance)
  const numbered = unique.map((route, i) => ({ ...route, id: `route-${i + 1}` }))
  const failedPriorities = priorities.filter((_, i) => outcomes[i].status === 'rejected')
  return {
    ...numbered[0], routes: numbered,
    routeSearch: { sources, rawCount, uniqueCount: numbered.length, failedPriorities },
  }
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

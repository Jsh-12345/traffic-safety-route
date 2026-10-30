import { createClient } from '@supabase/supabase-js'
import { ACCIDENT_REGIONS } from './accidentRegions.js'

// 전국 모든 시군구 수집이 끝난 연도만 사용하고, 경로 범위 안의 사고 다발지역만 불러옵니다.
export async function getStoredAccidents(year, bounds, url, key) {
  if (!url || !key) return null
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: complete, error: completeError } = await db.from('accident_imports').select('row_count,region_count,imported_at').eq('year', year).maybeSingle()
  // 대전만 수집하던 이전 완료 표시(region_count 없음)는 전국 자료로 쓰지 않습니다.
  if (completeError || !complete || complete.region_count !== ACCIDENT_REGIONS.length) return null
  const rows = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from('accident_hotspots')
      .select('id,year,label,district,lat,lng,type,type_label,radius,accidents,injuries,fatalities,updated_at')
      .eq('year', year).not('region_code', 'is', null)
      .gte('lat', bounds.minLat).lte('lat', bounds.maxLat).gte('lng', bounds.minLng).lte('lng', bounds.maxLng)
      .order('id').range(offset, offset + 499)
    if (error) return null // 초기 DB 설정 전에는 기존 공공데이터 API를 계속 사용합니다.
    rows.push(...data)
    if (data.length < 500) break
  }
  return {
    hazards: rows.map(row => ({
      id: row.id, year: row.year, label: row.label, district: row.district,
      lat: row.lat, lng: row.lng, type: row.type, typeLabel: row.type_label,
      radius: row.radius, accidents: row.accidents, injuries: row.injuries,
      fatalities: row.fatalities,
    })),
    year, region: '전국 (경로 주변)', bounds,
    source: '한국도로교통공단 법규위반별 교통사고 다발지역',
    sourceUrl: 'https://www.data.go.kr/data/15058087/openapi.do',
    loadedAt: complete.imported_at,
  }
}

import { createClient } from '@supabase/supabase-js'

export async function getStoredAccidents(year, url, key) {
  if (!url || !key) return null
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: complete, error: completeError } = await db.from('accident_imports').select('row_count,imported_at').eq('year', year).maybeSingle()
  if (completeError || !complete) return null
  const rows = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from('accident_hotspots')
      .select('id,year,label,district,lat,lng,type,type_label,radius,accidents,injuries,fatalities,updated_at')
      .eq('year', year).order('id').range(offset, offset + 499)
    if (error) return null // 초기 DB 설정 전에는 기존 공공데이터 API를 계속 사용합니다.
    rows.push(...data)
    if (data.length < 500) break
  }
  if (rows.length !== complete.row_count) return null
  return {
    hazards: rows.map(row => ({
      id: row.id, year: row.year, label: row.label, district: row.district,
      lat: row.lat, lng: row.lng, type: row.type, typeLabel: row.type_label,
      radius: row.radius, accidents: row.accidents, injuries: row.injuries,
      fatalities: row.fatalities,
    })),
    year, region: '대전광역시 5개 구',
    source: '한국도로교통공단 법규위반별 교통사고 다발지역',
    sourceUrl: 'https://www.data.go.kr/data/15058087/openapi.do',
    loadedAt: complete.imported_at,
  }
}

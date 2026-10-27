import { createClient } from '@supabase/supabase-js'
import process from 'node:process'
import { getAccidents } from '../server/accidents.js'

const years = process.argv.slice(2).map(Number)
const targetYears = years.length ? years : [2021, 2022, 2023, 2024]
const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const dataKey = process.env.DATA_GO_KR_SERVICE_KEY
if (!url || !serviceKey || !dataKey) {
  console.error('VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATA_GO_KR_SERVICE_KEY가 필요합니다.')
  process.exit(1)
}
if (targetYears.some(year => !Number.isInteger(year) || year < 2017 || year > 2024)) {
  console.error('연도는 2017~2024 중에서 선택하세요.')
  process.exit(1)
}

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
for (const year of targetYears) {
  const { hazards } = await getAccidents(new URLSearchParams({ year: String(year) }), dataKey)
  // API 결과가 비어 있거나 일부 구에서 오류가 난 경우 기존 데이터를 삭제하지 않습니다.
  if (!hazards.length) {
    console.log(`${year}년: 0건, 저장 생략`)
    continue
  }
  const { error: markerError } = await db.from('accident_imports').delete().eq('year', year)
  if (markerError) throw new Error(`${year}년 완료 표시 갱신 실패: ${markerError.message}`)
  const { error: deleteError } = await db.from('accident_hotspots').delete().eq('year', year)
  if (deleteError) throw new Error(`${year}년 이전 자료 정리 실패: ${deleteError.message}`)
  for (let offset = 0; offset < hazards.length; offset += 200) {
    const rows = hazards.slice(offset, offset + 200).map(({ typeLabel, ...hazard }) => ({ ...hazard, type_label: typeLabel, updated_at: new Date().toISOString() }))
    const { error } = await db.from('accident_hotspots').upsert(rows, { onConflict: 'id' })
    if (error) throw new Error(`${year}년 DB 저장 실패: ${error.message}`)
  }
  const { error: completeError } = await db.from('accident_imports').upsert({ year, row_count: hazards.length, imported_at: new Date().toISOString() })
  if (completeError) throw new Error(`${year}년 완료 표시 실패: ${completeError.message}`)
  console.log(`${year}년: ${hazards.length}건 저장 완료`)
}

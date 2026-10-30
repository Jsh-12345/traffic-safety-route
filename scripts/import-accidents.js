import { createClient } from '@supabase/supabase-js'
import process from 'node:process'
import { ApiError } from '../server/kakao.js'
import { decodeServiceKey, loadRegion, RATE_MESSAGES } from '../server/accidents.js'
import { ACCIDENT_REGIONS } from '../server/accidentRegions.js'

// 사용법: npm.cmd run import:accidents -- 2024 [--force] [--only=30110,30140]
// 이미 성공한 지역은 건너뛰므로, 실패한 지역은 같은 명령을 다시 실행하면 재시도합니다.
const args = process.argv.slice(2)
const force = args.includes('--force')
const only = args.find(a => a.startsWith('--only='))?.slice(7).split(',').filter(Boolean)
const years = args.filter(a => !a.startsWith('--')).map(Number)
const targetYears = years.length ? years : [2024]
const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey || !process.env.DATA_GO_KR_SERVICE_KEY) {
  console.error('VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATA_GO_KR_SERVICE_KEY가 필요합니다.')
  process.exit(1)
}
if (targetYears.some(year => !Number.isInteger(year) || year < 2017 || year > 2024)) {
  console.error('연도는 2017~2024 중에서 선택하세요.')
  process.exit(1)
}
const unknown = only?.filter(code => !ACCIDENT_REGIONS.some(r => r.code === code))
if (unknown?.length) {
  console.error(`알 수 없는 지역 코드: ${unknown.join(', ')}`)
  process.exit(1)
}
const dataKey = decodeServiceKey(process.env.DATA_GO_KR_SERVICE_KEY)
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
// 공공데이터 API는 초당 호출 수를 제한하므로 모든 요청 사이에 간격을 둡니다.
let nextRequest = 0
const throttledFetch = async (...request) => {
  const now = Date.now()
  nextRequest = Math.max(now, nextRequest) + 400
  await wait(nextRequest - 400 - now)
  return fetch(...request)
}

async function check(promise, message) {
  const { data, error, count } = await promise
  if (error) throw new Error(`${message}: ${error.message}`)
  return count ?? data
}

async function setStatus(year, region, status, fields = {}) {
  await check(db.from('accident_import_regions').upsert({
    year, region_code: region.code, region_name: region.name, status,
    row_count: null, error: null, attempted_at: new Date().toISOString(), completed_at: null, ...fields,
  }), `${region.name} 상태 저장 실패`)
}

async function fetchWithRetry(year, region) {
  for (let attempt = 1; ; attempt++) {
    try { return await loadRegion(year, region, dataKey, throttledFetch) }
    catch (error) {
      const perSecond = error.message === RATE_MESSAGES['23']
      // 하루 한도 초과나 인증 오류는 재시도해도 같은 결과이므로 바로 중단합니다.
      if (attempt >= (perSecond ? 5 : 3) || (!perSecond && error instanceof ApiError && [400, 429].includes(error.status)) || /인증키/.test(error.message)) throw error
      await wait(perSecond ? attempt * 10000 : attempt * 3000)
    }
  }
}

async function importRegion(year, region) {
  await setStatus(year, region, 'importing')
  let hazards
  try { hazards = await fetchWithRetry(year, region) }
  catch (error) {
    await setStatus(year, region, 'failed', { error: error.message })
    throw error
  }
  // 조회가 성공한 뒤에만 해당 지역의 이전 자료를 교체합니다.
  await check(db.from('accident_hotspots').delete().eq('year', year).eq('region_code', region.code), `${region.name} 이전 자료 정리 실패`)
  const now = new Date().toISOString()
  for (let offset = 0; offset < hazards.length; offset += 200) {
    const rows = hazards.slice(offset, offset + 200).map(({ typeLabel, regionCode, ...hazard }) => ({ ...hazard, type_label: typeLabel, region_code: regionCode, updated_at: now }))
    await check(db.from('accident_hotspots').upsert(rows, { onConflict: 'id' }), `${region.name} DB 저장 실패`)
  }
  await setStatus(year, region, 'success', { row_count: hazards.length, completed_at: now })
  return hazards.length
}

for (const year of targetYears) {
  const statuses = await check(db.from('accident_import_regions').select('region_code,status').eq('year', year), `${year}년 수집 상태 조회 실패`)
  const done = new Set(statuses.filter(s => s.status === 'success').map(s => s.region_code))
  const queue = ACCIDENT_REGIONS.filter(r => (only ? only.includes(r.code) : true) && (force || !done.has(r.code)))
  console.log(`${year}년: 전체 ${ACCIDENT_REGIONS.length}개 지역 중 ${queue.length}개 수집 (이미 완료 ${done.size}개)`)

  if (queue.length) {
    // 수집 중에는 전국 완료 표시를 내려 일부 지역만 있는 자료가 사용되지 않게 합니다.
    await check(db.from('accident_imports').delete().eq('year', year), `${year}년 완료 표시 갱신 실패`)
    // 대전만 수집하던 이전 방식의 자료(region_code 없음)를 정리합니다.
    await check(db.from('accident_hotspots').delete().eq('year', year).is('region_code', null), `${year}년 이전 방식 자료 정리 실패`)
  }

  const failed = [], zero = []
  let stopped = null, finished = 0
  const worker = async () => {
    while (queue.length && !stopped) {
      const region = queue.shift()
      try {
        const n = await importRegion(year, region)
        if (!n) zero.push(region.name)
      } catch (error) {
        failed.push(`${region.name}(${region.code}): ${error.message}`)
        if (error instanceof ApiError && error.status === 429) stopped = error.message
      }
      finished++
      if (finished % 20 === 0) console.log(`  ${finished}개 지역 처리...`)
    }
  }
  await Promise.all(Array.from({ length: 1 }, worker))

  const final = await check(db.from('accident_import_regions').select('region_code,status,row_count').eq('year', year), `${year}년 수집 상태 조회 실패`)
  const success = final.filter(s => s.status === 'success' && ACCIDENT_REGIONS.some(r => r.code === s.region_code))
  const expected = success.reduce((sum, s) => sum + s.row_count, 0)
  if (zero.length) console.log(`  정상 조회 0건 지역 ${zero.length}개: ${zero.join(', ')}`)
  if (failed.length) console.log(`  실패 지역 ${failed.length}개:\n    ${failed.join('\n    ')}`)
  if (stopped) console.log(`  ${stopped} 미처리 ${queue.length}개 지역은 나중에 같은 명령으로 이어서 수집하세요.`)

  if (success.length !== ACCIDENT_REGIONS.length) {
    console.log(`${year}년: ${success.length}/${ACCIDENT_REGIONS.length}개 지역 완료. 같은 명령을 다시 실행하면 남은 지역만 재시도합니다.`)
    process.exitCode = 1
    continue
  }
  const stored = await check(db.from('accident_hotspots').select('id', { count: 'exact', head: true }).eq('year', year).not('region_code', 'is', null), `${year}년 저장 건수 확인 실패`)
  if (stored !== expected || !expected) {
    console.log(`${year}년: 저장 건수(${stored})가 지역별 합계(${expected})와 달라 완료 표시를 하지 않았습니다. --force로 다시 수집하세요.`)
    process.exitCode = 1
    continue
  }
  await check(db.from('accident_imports').upsert({ year, row_count: expected, region_count: ACCIDENT_REGIONS.length, imported_at: new Date().toISOString() }), `${year}년 완료 표시 실패`)
  console.log(`${year}년: 전국 ${ACCIDENT_REGIONS.length}개 지역, ${expected}건 저장 완료`)
}

import { scoreRoute } from './routeSafety.js'

export const ACCIDENT_YEARS = [2021, 2022, 2023, 2024]

export function selectedYears(start, end) {
  const first = Number(start), last = Number(end)
  if (!ACCIDENT_YEARS.includes(first) || !ACCIDENT_YEARS.includes(last) || first > last) {
    throw new Error('시작 연도는 종료 연도보다 늦을 수 없습니다.')
  }
  return ACCIDENT_YEARS.filter(year => year >= first && year <= last)
}

export function formatPeriod(start, end = start) {
  return Number(start) === Number(end) ? `${start}년` : `${start}~${end}년`
}

export function formatRisk(value) {
  return value == null ? '자료 없음' : Number(value.toFixed(2)).toString()
}

export async function loadAccidentPeriod(years, fetchYear) {
  const responses = await Promise.allSettled(years.map(async year => fetchYear(year)))
  const missing = years.filter((year, i) => {
    const result = responses[i]
    return result.status !== 'fulfilled' || result.value?.coverageComplete !== true ||
      result.value.year !== year || !Array.isArray(result.value.hazards) ||
      result.value.hazards.some(h => h?.year !== year)
  })
  if (missing.length) throw new Error(`${missing.map(year => year + '년').join(', ')} 사고 자료가 준비되지 않았거나 조회하지 못했습니다. 선택한 전체 기간의 위험점수를 계산할 수 없습니다.`)
  const data = responses.map(response => response.value)
  return { ...data[0], years, hazards: data.flatMap(item => item.hazards) }
}

export function scoreRouteForPeriod(route, data) {
  if (!data.years?.length) return scoreRoute(route, data.hazards)
  const results = data.years.map(year => ({ year, ...scoreRoute(route, data.hazards.filter(h => h.year === year)) }))
  const annualScores = results.map(({ year, risk }) => ({ year, risk }))
  return {
    ...route,
    hazards: results.flatMap(result => result.hazards),
    annualScores,
    risk: annualScores.reduce((sum, item) => sum + item.risk, 0) / annualScores.length,
  }
}

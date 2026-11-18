import test from 'node:test'
import assert from 'node:assert/strict'
import { loadAccidentPeriod, scoreRouteForPeriod, selectedYears } from '../src/accidentPeriod.js'
import { scoreRoute } from '../src/routeSafety.js'
import { makeAnalysisRecord } from '../src/analysisHistory.js'
import { restoreHistory } from '../src/restoreHistory.js'

const points = [[36, 127], [36, 127.01]]
const route = { id: 'route-1', points, duration: 100, distance: 1000, start: {}, destination: {} }
const hazard = (year, accidents) => ({ id: 'same-location', year, lat: 36, lng: 127.005, radius: 100, accidents, injuries: 0, fatalities: 0 })
const complete = (year, hazards) => ({ year, hazards, coverageComplete: true })

test('all four years are averaged, including a valid zero; deduplication is within a year', async () => {
  const years = selectedYears('2021', '2024')
  assert.deepEqual(years, [2021, 2022, 2023, 2024])
  assert.throws(() => selectedYears('2024', '2021'))
  const data = await loadAccidentPeriod(years, year => complete(year, year === 2022 ? [] : [hazard(year, year - 2019), hazard(year, year - 2019)]))
  const scored = scoreRouteForPeriod(route, data)
  assert.deepEqual(scored.annualScores.map(s => s.risk), [2, 0, 4, 5])
  assert.equal(scored.risk, 2.75)
  const single = await loadAccidentPeriod([2024], year => complete(year, [hazard(year, 5)]))
  assert.equal(scoreRouteForPeriod(route, single).risk, scoreRoute(route, single.hazards).risk)
})

test('unready and failed years are named instead of averaged as zero', async () => {
  await assert.rejects(loadAccidentPeriod([2021, 2022, 2023], year => {
    if (year === 2023) throw new Error('DB unavailable')
    return { ...complete(year, []), coverageComplete: year === 2021 }
  }), /^Error: 2022년, 2023년/)
})

test('period and mean are saved and restored even for the summary-only record', async () => {
  const years = [2023, 2024]
  const data = await loadAccidentPeriod(years, year => complete(year, [hazard(year, year === 2023 ? 1 : 2)]))
  const record = makeAnalysisRecord({ ...route, requestedYears: years, accidentData: data }, 'fast', 0, 'test', 2023)
  assert.equal(record.candidates[0].risk, 1.5)
  assert.equal(record.data_year, 2023)
  assert.equal(record.data_year_end, 2024)
  assert.equal(record.snapshot, null)
  assert.equal(restoreHistory(record).endYear, '2024')
  assert.equal(restoreHistory({ data_year: 2022 }).endYear, '2022')
  const unavailable = makeAnalysisRecord({ ...route, requestedYears: years }, 'fast', 0, 'test', 2023)
  assert.equal(unavailable.candidates[0].risk, null)
  assert.equal(unavailable.data_year_end, 2024)
})

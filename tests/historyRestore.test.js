import test from 'node:test'
import assert from 'node:assert/strict'
import { restoreHistory } from '../src/restoreHistory.js'
test('stored routes restore endpoints and frozen settings without recomputation', () => {
 const record={data_year:2024,safety_level:50}
 const snapshot={version:1,route:{start:{label:'학교',lat:36,lng:127},destination:{label:'역',lat:36.1,lng:127.1}},ranked:[{id:'route-1',risk:19}],safetyLevel:100}
 const value=restoreHistory(record,snapshot)
 assert.equal(value.start,'학교');assert.equal(value.destination,'역');assert.equal(value.safetyLevel,100)
 assert.equal(value.archived,snapshot);assert.equal(value.route,snapshot.route)
})
test('legacy summaries never invent exact positions or past geometry', () => {
 const value=restoreHistory({start_region:'대전 서구',destination_region:'대전 동구',data_year:2024,safety_level:50},null)
 assert.equal(value.start,'대전 서구');assert.equal(value.startPoint,null);assert.equal(value.route,null)
})

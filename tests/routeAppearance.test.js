import test from 'node:test'
import assert from 'node:assert/strict'
import { routeAppearance, routeDrawOrder } from '../src/routeAppearance.js'
import { rankRoutes } from '../src/routeSafety.js'

test('changing safety weight moves blue emphasis to the new recommendation', () => {
  const candidates = [{ id: 'fast', duration: 100, distance: 1000, risk: 50 }, { id: 'safe', duration: 150, distance: 1300, risk: 10 }]
  for (const weight of [0, 50, 100]) {
    const ranked = rankRoutes(candidates, weight)
    const recommended = ranked[0].id
    const blue = routeAppearance(recommended, recommended)
    assert.equal(blue.color, '#2563eb')
    const other = routeAppearance(ranked[1].id, recommended)
    assert.equal(other.color, '#087f5b')
    assert.ok(blue.weight > other.weight)
    assert.ok(other.dashArray)
    assert.equal(routeDrawOrder(ranked, recommended).at(-1).id, recommended)
  }
  assert.equal(rankRoutes(candidates, 0)[0].id, 'fast')
  assert.equal(rankRoutes(candidates, 100)[0].id, 'safe')
})
test('single route is blue; drawing order does not change recommendation data', () => {
  const routes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  assert.deepEqual(routeDrawOrder(routes, 'a').map(r => r.id), ['b', 'c', 'a'])
  assert.deepEqual(routes.map(r => r.id), ['a', 'b', 'c'])
  assert.equal(routeAppearance('a', 'a').color, '#2563eb')
  assert.equal(routeDrawOrder([routes[0]], 'a').length, 1)
})

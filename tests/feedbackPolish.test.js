import assert from 'node:assert/strict'
import test from 'node:test'
import { rankRiskWithinCandidates } from '../src/riskRanking.js'
import { accountError, koreanError } from '../src/koreanErrors.js'

test('risk rank ignores overall order, compares annual averages, and shares equal ranks', () => {
  const routes = [{ id: 'fast', risk: 7.5 }, { id: 'a', risk: 2.25 }, { id: 'b', risk: 2.25 }]
  const result = rankRiskWithinCandidates(routes)
  assert.equal(result.get('fast'), '후보 3개 중 3위')
  assert.equal(result.get('a'), '후보 3개 중 공동 1위')
  assert.equal(result.get('b'), '후보 3개 중 공동 1위')
  assert.equal(routes[0].id, 'fast')
  assert.equal(rankRiskWithinCandidates([routes[0]]).size, 0)
  assert.equal(rankRiskWithinCandidates([routes[0], { id: 'missing', risk: null }]).size, 0)
})

test('auth errors explain the next step and unfamiliar English errors use a Korean fallback', () => {
  assert.match(accountError({ code: 'invalid_credentials' }, 'login'), /비밀번호/)
  assert.match(accountError({ code: 'email_not_confirmed' }, 'login'), /이메일을 인증/)
  assert.match(accountError(new Error('Failed to fetch'), 'login'), /인터넷 연결/)
  assert.match(accountError(new Error('No upstream diagnostics'), 'reset'), /^재설정 메일/)
  const known = '2022년 사고 자료가 준비되지 않았습니다.'
  assert.equal(koreanError(new Error(known), '조회 실패'), known)
  assert.equal(koreanError(new Error('관계 internal_table 없음'), '조회 실패', { keepKorean: false }), '조회 실패')
  assert.equal(koreanError(new SyntaxError('Unexpected token'), '조회 실패'), '조회 실패')
})

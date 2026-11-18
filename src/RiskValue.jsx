import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatRisk } from './accidentPeriod.js'
import { explainRisk } from './riskExplanation.js'

export default function RiskValue({ value, hazards, weights, annualScores }) {
  const multipleYears = annualScores?.length > 1
  const label = multipleYears ? '연평균 위험점수' : '위험점수'
  const displayedValue = formatRisk(value)
  const explanation = multipleYears
    ? [
      ...annualScores.map(({ year, risk }) => `${year}년: ${risk}점`),
      `합계 ${annualScores.reduce((sum, item) => sum + item.risk, 0)}점 ÷ ${annualScores.length}년 = ${displayedValue}점 (소수 둘째 자리까지 표시)`,
      '실제 사고 확률이 아닌 비교용 점수입니다.',
    ].join('\n')
    : explainRisk(hazards, weights)
  const id = useId()
  const anchor = useRef(null)
  const popup = useRef(null)
  const timer = useRef(null)
  const [position, setPosition] = useState(null)
  const keepOpen = () => clearTimeout(timer.current)
  const open = () => {
    keepOpen()
    const box = anchor.current.getBoundingClientRect()
    const width = Math.min(340, window.innerWidth - 24)
    const above = window.innerHeight - box.bottom < 190 && box.top > 190
    setPosition({ left: Math.max(12, Math.min(box.left, window.innerWidth - width - 12)),
      top: above ? box.top - 8 : box.bottom + 8, width,
      transform: above ? 'translateY(-100%)' : undefined,
      maxHeight: Math.max(80, above ? box.top - 20 : window.innerHeight - box.bottom - 20) })
  }
  const closeSoon = () => { keepOpen(); timer.current = setTimeout(() => setPosition(null), 150) }
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    if (!position) return undefined
    const close = () => setPosition(null)
    const escape = event => { if (event.key === 'Escape') close() }
    const outside = event => {
      if (!anchor.current?.contains(event.target) && !popup.current?.contains(event.target)) close()
    }
    const scroll = event => { if (!popup.current?.contains(event.target)) close() }
    window.addEventListener('resize', close)
    window.addEventListener('scroll', scroll, true)
    document.addEventListener('keydown', escape)
    document.addEventListener('pointerdown', outside)
    return () => {
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', scroll, true)
      document.removeEventListener('keydown', escape)
      document.removeEventListener('pointerdown', outside)
    }
  }, [position])
  return <>
    <button ref={anchor} type="button" className="risk-value" aria-label={`${label} ${displayedValue}점, 계산 내역 보기`}
      aria-describedby={position ? id : undefined} aria-expanded={!!position}
      onMouseEnter={open} onMouseLeave={closeSoon} onFocus={open} onBlur={closeSoon} onClick={open}>{displayedValue}점</button>
    {position && createPortal(<div ref={popup} id={id} role="tooltip" className="risk-explanation-popup" style={position}
      onMouseEnter={keepOpen} onMouseLeave={closeSoon}>
      <strong>{label} 계산 내역</strong><div>{explanation}</div>
    </div>, document.body)}
  </>
}

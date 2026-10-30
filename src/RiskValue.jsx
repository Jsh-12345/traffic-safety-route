import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { explainRisk } from './riskExplanation.js'

export default function RiskValue({ value, hazards, weights }) {
  const explanation = explainRisk(hazards, weights)
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
    <button ref={anchor} type="button" className="risk-value" aria-label={`위험점수 ${value}점, 계산 내역 보기`}
      aria-describedby={position ? id : undefined} aria-expanded={!!position}
      onMouseEnter={open} onMouseLeave={closeSoon} onFocus={open} onBlur={closeSoon} onClick={open}>{value}점</button>
    {position && createPortal(<div ref={popup} id={id} role="tooltip" className="risk-explanation-popup" style={position}
      onMouseEnter={keepOpen} onMouseLeave={closeSoon}>
      <strong>위험점수 계산 내역</strong><div>{explanation}</div>
    </div>, document.body)}
  </>
}

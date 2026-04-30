import { useEffect, useRef, useState } from 'react'

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const numberFormatter = new Intl.NumberFormat('en-IN')

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function CountUpNumber({
  value = 0,
  className = '',
  duration = 1200,
  format = 'currency',
}) {
  const numericValue = Number(value) || 0
  const [displayValue, setDisplayValue] = useState(numericValue)
  const previousValue = useRef(numericValue)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplayValue(numericValue)
      previousValue.current = numericValue
      return undefined
    }

    const startValue = previousValue.current
    const startedAt = performance.now()
    let frameId = 0

    const step = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1)
      const eased = 1 - (1 - progress) ** 3
      const nextValue = startValue + (numericValue - startValue) * eased
      setDisplayValue(nextValue)

      if (progress < 1) {
        frameId = window.requestAnimationFrame(step)
        return
      }

      previousValue.current = numericValue
    }

    frameId = window.requestAnimationFrame(step)

    return () => window.cancelAnimationFrame(frameId)
  }, [duration, numericValue])

  const formattedValue =
    format === 'number'
      ? numberFormatter.format(Math.round(displayValue))
      : currencyFormatter.format(displayValue)

  return (
    <span aria-live="polite" className={className}>
      {formattedValue}
    </span>
  )
}

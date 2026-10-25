import { useRef, type TouchEvent } from 'react'

export interface SwipeHandlers {
  onTouchStart: (e: TouchEvent) => void
  onTouchMove: (e: TouchEvent) => void
  onTouchEnd: () => void
}

export function useTouchSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 45,
}: {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number
}): SwipeHandlers {
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const touchDelta = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
    touchDelta.current = { x: 0, y: 0 }
  }

  const onTouchMove = (e: TouchEvent) => {
    if (!touchStart.current || e.touches.length !== 1) return
    const touch = e.touches[0]
    touchDelta.current = {
      x: touch.clientX - touchStart.current.x,
      y: touch.clientY - touchStart.current.y,
    }
  }

  const onTouchEnd = () => {
    if (!touchStart.current) return
    const { x, y } = touchDelta.current
    // Only trigger if horizontal movement is significantly greater than vertical movement
    if (Math.abs(x) > threshold && Math.abs(x) > Math.abs(y) * 1.4) {
      if (x < 0) {
        onSwipeLeft?.()
      } else {
        onSwipeRight?.()
      }
    }
    touchStart.current = null
    touchDelta.current = { x: 0, y: 0 }
  }

  return { onTouchStart, onTouchMove, onTouchEnd }
}

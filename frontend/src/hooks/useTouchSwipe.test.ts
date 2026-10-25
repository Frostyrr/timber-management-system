// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTouchSwipe } from './useTouchSwipe'

describe('useTouchSwipe hook', () => {
  it('triggers onSwipeLeft when swiped horizontally to the left', () => {
    const onSwipeLeft = vi.fn()
    const onSwipeRight = vi.fn()

    const { result } = renderHook(() =>
      useTouchSwipe({ onSwipeLeft, onSwipeRight, threshold: 40 }),
    )

    act(() => {
      result.current.onTouchStart({
        touches: [{ clientX: 200, clientY: 100 }],
      } as any)
      result.current.onTouchMove({
        touches: [{ clientX: 120, clientY: 105 }],
      } as any)
      result.current.onTouchEnd()
    })

    expect(onSwipeLeft).toHaveBeenCalledTimes(1)
    expect(onSwipeRight).not.toHaveBeenCalled()
  })

  it('triggers onSwipeRight when swiped horizontally to the right', () => {
    const onSwipeLeft = vi.fn()
    const onSwipeRight = vi.fn()

    const { result } = renderHook(() =>
      useTouchSwipe({ onSwipeLeft, onSwipeRight, threshold: 40 }),
    )

    act(() => {
      result.current.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as any)
      result.current.onTouchMove({
        touches: [{ clientX: 180, clientY: 105 }],
      } as any)
      result.current.onTouchEnd()
    })

    expect(onSwipeRight).toHaveBeenCalledTimes(1)
    expect(onSwipeLeft).not.toHaveBeenCalled()
  })

  it('ignores vertical scrolling and does not trigger horizontal swipe', () => {
    const onSwipeLeft = vi.fn()
    const onSwipeRight = vi.fn()

    const { result } = renderHook(() =>
      useTouchSwipe({ onSwipeLeft, onSwipeRight, threshold: 40 }),
    )

    act(() => {
      result.current.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as any)
      // Moving mainly vertically (e.g. scrolling page down)
      result.current.onTouchMove({
        touches: [{ clientX: 110, clientY: 250 }],
      } as any)
      result.current.onTouchEnd()
    })

    expect(onSwipeLeft).not.toHaveBeenCalled()
    expect(onSwipeRight).not.toHaveBeenCalled()
  })
})

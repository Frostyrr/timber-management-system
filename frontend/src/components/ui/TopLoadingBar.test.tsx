// @vitest-environment jsdom
import { afterEach, it, expect, vi } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'
import { TopLoadingBar } from './TopLoadingBar'
afterEach(() => { cleanup(); vi.useRealTimers() })
it('delays feedback, clears on completion, and restarts the delay for new requests', () => {
 vi.useFakeTimers()
 const view=render(<TopLoadingBar active />)
 expect(screen.queryByRole('progressbar')).toBeNull()
 act(()=>vi.advanceTimersByTime(249))
 expect(screen.queryByRole('progressbar')).toBeNull()
 act(()=>vi.advanceTimersByTime(1))
 expect(screen.getByRole('progressbar')).toBeTruthy()
 view.rerender(<TopLoadingBar active={false}/>)
 expect(screen.queryByRole('progressbar')).toBeNull()
 view.rerender(<TopLoadingBar active />)
 expect(screen.queryByRole('progressbar')).toBeNull()
 view.rerender(<TopLoadingBar active={false}/>)
 act(()=>vi.advanceTimersByTime(500))
 expect(screen.queryByRole('progressbar')).toBeNull()
})

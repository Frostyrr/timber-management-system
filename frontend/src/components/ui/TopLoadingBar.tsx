import { useEffect, useState } from 'react'

export function TopLoadingBar({ active }: { active: boolean }) {
  return active ? <DelayedLoadingBar /> : null
}
function DelayedLoadingBar() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 250)
    return () => clearTimeout(timer)
  }, [])
  if (!visible) return null
  return <div className="top-loading-track" role="progressbar" aria-label="Updating data"><span className="top-loading-line" /></div>
}

import { type ReactNode } from 'react'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field relative flex flex-col gap-1.5 text-[12.5px] font-[450] text-ink">
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

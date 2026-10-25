import { type ReactNode } from 'react'

export function Badge({ children }: { children: ReactNode }) {
  const raw = String(children)
  const slug = raw
    .toLowerCase()
    .replace(/^\+/, 'points-')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return (
    <span
      className={`badge ${slug} inline-flex items-center gap-1.5 rounded-full border border-[#dfe5de] bg-workspace px-[9.5px] py-[3.5px] text-[11.5px] leading-[1.35] font-[450] whitespace-nowrap text-[#36453c]`}
    >
      <span className="badge-dot h-[5.5px] w-[5.5px] rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  )
}

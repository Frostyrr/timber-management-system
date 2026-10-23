import type { ReactNode } from 'react'

export function Heading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="page-heading hero-banner-card mb-4 flex flex-col items-start justify-between gap-3 sm:mb-5 sm:gap-4 md:flex-row md:items-end md:gap-5">
      <div className="page-heading-text min-w-0 flex-1">
        {eyebrow && <p className="hero-eyebrow">{eyebrow}</p>}
        <h1 className="hero-title">{title}</h1>
        <p className="hero-subtitle">{description}</p>
      </div>
      {children && (
        <div className="page-actions flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-2.5">{children}</div>
      )}
    </div>
  )
}

export function Avatar({ name }: { name: string }) {
  return (
    <span
      className="avatar inline-flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full border border-white/80 bg-primary text-[11px] font-medium tracking-[-0.01em] text-white shadow-[0_2px_6px_rgba(21,63,50,0.18)]"
      aria-hidden="true"
    >
      {name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')}
    </span>
  )
}

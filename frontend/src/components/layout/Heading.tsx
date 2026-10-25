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

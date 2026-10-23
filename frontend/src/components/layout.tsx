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
    <div className="page-heading mb-6 flex flex-col items-start justify-between gap-3 md:flex-row md:items-end md:gap-5">
      <div className="page-heading-text">
        {eyebrow && (
          <p className="eyebrow mb-[5px] text-[10.5px] font-medium tracking-[0.08em] text-supporting uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[25px] leading-[1.22] font-medium tracking-[-0.03em] text-ink">
          {title}
        </h1>
        <p className="page-subtitle mt-[5px] text-[13.5px] font-normal text-muted-ink">
          {description}
        </p>
      </div>
      {children && <div className="page-actions flex flex-wrap items-center gap-2.5">{children}</div>}
    </div>
  )
}

export function Avatar({ name }: { name: string }) {
  return (
    <span
      className="avatar inline-flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full border border-[#d2e1d6] bg-pale text-[11px] font-medium tracking-[-0.01em] text-primary"
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

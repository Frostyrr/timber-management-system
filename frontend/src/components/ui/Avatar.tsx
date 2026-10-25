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

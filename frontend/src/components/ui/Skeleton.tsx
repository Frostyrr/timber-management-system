

export function Skeleton({
  className = '',
  dark = false,
}: {
  className?: string
  dark?: boolean
}) {
  return (
    <div
      className={`${dark ? 'skeleton-shimmer-dark' : 'skeleton-shimmer'} rounded-lg ${className}`}
      aria-hidden="true"
    />
  )
}

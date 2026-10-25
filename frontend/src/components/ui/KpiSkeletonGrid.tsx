import { Skeleton } from './Skeleton'

export function KpiSkeletonGrid() {
  return (
    <div className="hero-kpi-grid" aria-busy="true" aria-label="Loading summary metrics">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="stagger-item flex flex-col justify-between rounded-[20px] border border-white/16 bg-white/[0.09] p-4 backdrop-blur-md"
          style={{ '--stagger-i': i } as React.CSSProperties}
        >
          <div className="flex items-center gap-2.5">
            <Skeleton dark className="h-7 w-7 rounded-full" />
            <Skeleton dark className="h-3.5 flex-1" />
          </div>
          <div className="my-3">
            <Skeleton dark className="h-7 w-14" />
          </div>
          <Skeleton dark className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  )
}

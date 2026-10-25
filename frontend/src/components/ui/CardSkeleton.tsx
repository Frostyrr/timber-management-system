import { Skeleton } from './Skeleton'

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="Loading list records">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="stagger-item flex items-center gap-3.5 rounded-[18px] border border-white/95 bg-white/95 p-4"
          style={{ '--stagger-i': i } as React.CSSProperties}
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
      ))}
    </div>
  )
}

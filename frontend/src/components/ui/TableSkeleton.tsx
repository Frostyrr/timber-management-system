import { Skeleton } from './Skeleton'

export function TableSkeleton({
  rows = 5,
  cols = 5,
}: {
  rows?: number
  cols?: number
}) {
  return (
    <div className="table-wrap p-5" aria-busy="true" aria-label="Loading table records">
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center gap-4 border-b border-line-subtle pb-3">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="stagger-item flex items-center gap-4 py-2.5"
            style={{ '--stagger-i': r } as React.CSSProperties}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={`h-4.5 ${c === 0 ? 'w-1/4' : c === cols - 1 ? 'w-24' : 'flex-1'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

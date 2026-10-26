import { Skeleton } from '../ui/Skeleton'
import { TableSkeleton } from '../ui/TableSkeleton'
export function WorkspaceSkeleton() {
  return <div className="app-backdrop min-h-screen bg-workspace p-4 sm:p-8" aria-busy="true" aria-label="Loading">
    <div className="mx-auto max-w-[1440px] space-y-6" aria-hidden="true">
      <div className="flex h-16 items-center justify-between rounded-full bg-white/80 px-6"><Skeleton className="h-8 w-32"/><Skeleton className="h-9 w-9 rounded-full"/></div>
      <Skeleton className="h-28 w-full rounded-2xl"/>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{[0,1,2,3].map(i=><Skeleton key={i} className="h-24"/>)}</div>
      <div className="overflow-hidden rounded-2xl bg-white/80"><TableSkeleton rows={5} cols={4}/></div>
    </div>
  </div>
}

import { Skeleton } from '../ui/Skeleton'
import { KpiSkeletonGrid } from '../ui/KpiSkeletonGrid'
import { CardSkeleton } from '../ui/CardSkeleton'

export function WorkspaceSkeleton() {
  return (
    <div
      className="app-backdrop min-h-screen bg-workspace"
      aria-busy="true"
      aria-label="Loading workspace"
    >
      <div className="app-canvas mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-3 sm:px-6 lg:px-10">
        {/* Floating Glassmorphic Top Navbar Skeleton */}
        <header className="topbar sticky top-3.5 mb-6 flex items-center justify-between gap-2.5 rounded-full border border-white/85 bg-white/80 px-4 py-2.5 shadow-[0_4px_16px_rgba(21,63,50,0.06)] backdrop-blur-xl sm:top-4 sm:mb-8 sm:px-5 sm:py-3 lg:top-5 lg:mb-9">
          {/* Logo Brand Skeleton */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <Skeleton className="h-5 w-32 rounded-lg" />
          </div>

          {/* Right Header Controls (Notification + Profile Skeleton) */}
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex items-center gap-2 rounded-full border border-white/90 bg-white/85 py-1.5 pr-3.5 pl-1.5 shadow-xs">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <Skeleton className="hidden sm:block h-3.5 w-16 rounded-md" />
            </div>
          </div>
        </header>

        {/* Main Workspace Body with Sidebar Dock placeholder & Bento Grid */}
        <div className="workspace-body flex min-w-0 flex-1 items-start md:pl-[84px] lg:pl-[96px]">
          {/* Floating Pill Sidebar Dock Placeholder (Desktop only) */}
          <aside className="floating-pill-rail hidden md:flex" aria-hidden="true">
            <div className="pill-rail-inner flex flex-col items-center gap-3 py-3">
              <Skeleton className="h-10 w-10 rounded-2xl" />
              <Skeleton className="h-10 w-10 rounded-2xl" />
              <div className="my-1 h-px w-6 bg-line-subtle" />
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
          </aside>

          {/* Page Main Content Area */}
          <main className="workspace-main flex min-w-0 flex-1 flex-col pb-24 md:pb-12">
            <div className="page-content mx-auto w-full max-w-[1400px] flex-1 flex flex-col gap-5">
              {/* Top Hero Banner with Embedded Glass KPI Cards (Dark Forest Theme) */}
              <section className="hero-banner-card w-full space-y-6" aria-label="Loading overview">
                <div className="hero-header-row flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="space-y-2">
                    <Skeleton dark className="h-3 w-36 rounded-md" />
                    <Skeleton dark className="h-7 sm:h-8 w-56 sm:w-64 rounded-xl" />
                    <Skeleton dark className="h-4 w-72 sm:w-96 rounded-md" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton dark className="h-9 w-28 rounded-xl" />
                    <Skeleton dark className="h-9 w-36 rounded-xl" />
                  </div>
                </div>

                {/* 5 Real KPI Metric Cards */}
                <KpiSkeletonGrid />
              </section>

              {/* 2-Column Bento Dashboard Grid */}
              <div className="bento-dashboard-grid">
                {/* Left Column: Equipment Usage & Returns */}
                <div className="bento-main-col flex flex-col gap-5">
                  <section className="panel">
                    <div className="panel-heading mb-4 flex items-center justify-between">
                      <div className="space-y-1.5">
                        <Skeleton className="h-5 w-48 rounded-lg" />
                        <Skeleton className="h-3 w-32 rounded-md" />
                      </div>
                      <Skeleton className="h-4 w-16 rounded-md" />
                    </div>
                    {/* Usage Card Rows */}
                    <CardSkeleton count={4} />
                  </section>

                  {/* Inventory Activity Panel */}
                  <section className="panel">
                    <div className="panel-heading mb-4 flex items-center justify-between">
                      <div className="space-y-1.5">
                        <Skeleton className="h-5 w-40 rounded-lg" />
                        <Skeleton className="h-3 w-48 rounded-md" />
                      </div>
                      <Skeleton className="h-4 w-20 rounded-md" />
                    </div>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="rounded-2xl border border-white/90 bg-white/80 p-3.5 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <Skeleton className="h-3 w-20 rounded-md" />
                            <Skeleton className="h-3 w-3 rounded-full" />
                          </div>
                          <Skeleton className="h-4 w-full rounded-md" />
                          <Skeleton className="h-3 w-24 rounded-md" />
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Right Column: Priority Follow-Ups */}
                <aside className="bento-side-col flex flex-col gap-5">
                  {/* Equipment Needing Attention */}
                  <section className="panel">
                    <div className="panel-heading mb-4 flex items-center justify-between">
                      <div className="space-y-1.5">
                        <Skeleton className="h-5 w-44 rounded-lg" />
                        <Skeleton className="h-3 w-36 rounded-md" />
                      </div>
                      <Skeleton className="h-4 w-20 rounded-md" />
                    </div>
                    <div className="space-y-3">
                      {[0, 1].map((i) => (
                        <div
                          key={i}
                          className="rounded-[20px] border border-amber-200/60 bg-amber-50/40 p-4 space-y-3"
                        >
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                            <div className="flex-1 space-y-1.5">
                              <Skeleton className="h-4 w-32 rounded-md" />
                              <Skeleton className="h-3 w-20 rounded-md" />
                            </div>
                            <Skeleton className="h-6 w-16 rounded-full" />
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <Skeleton className="h-3 w-16 rounded-md" />
                            <Skeleton className="h-7 w-24 rounded-xl" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Forest Callout Card */}
                  <div className="forest-callout-card space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
                      <Skeleton className="h-4 w-40 rounded-md" />
                    </div>
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-9 w-full rounded-xl" />
                  </div>
                </aside>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

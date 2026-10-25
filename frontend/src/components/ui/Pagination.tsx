import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({
  page,
  total,
  pageSize = 10,
  onPageChange,
  label = 'records',
}: {
  page: number
  total: number
  pageSize?: number
  onPageChange: (newPage: number) => void
  label?: string
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(total, page * pageSize)

  if (total <= 0) return null

  const getPages = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    if (page <= 3) {
      return [1, 2, 3, '...', totalPages]
    }
    if (page >= totalPages - 2) {
      return [1, '...', totalPages - 2, totalPages - 1, totalPages]
    }
    return [1, '...', page, '...', totalPages]
  }

  return (
    <nav
      className="pagination-bar mt-4 flex flex-col items-center justify-between gap-3 border-t border-line-subtle px-1 pt-3.5 sm:flex-row"
      aria-label="Table pagination"
    >
      <span className="text-xs text-muted-ink">
        Showing <strong className="font-medium text-ink">{start}–{end}</strong> of{' '}
        <strong className="font-medium text-ink">{total}</strong> {label}
      </span>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/85 bg-white/80 px-2.5 py-1 text-xs font-medium text-ink shadow-xs backdrop-blur-md transition-all duration-150 hover:bg-white hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <div className="flex items-center gap-1">
            {getPages().map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-ink">
                  …
                </span>
              ) : (
                <button
                  type="button"
                  key={p}
                  onClick={() => onPageChange(Number(p))}
                  className={`inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-full px-2 text-xs font-medium transition-all duration-150 ${
                    page === p
                      ? 'border border-primary bg-primary text-white shadow-xs'
                      : 'border border-white/80 bg-white/70 text-ink backdrop-blur-md hover:bg-white hover:text-primary'
                  }`}
                  aria-current={page === p ? 'page' : undefined}
                >
                  {p}
                </button>
              ),
            )}
          </div>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/85 bg-white/80 px-2.5 py-1 text-xs font-medium text-ink shadow-xs backdrop-blur-md transition-all duration-150 hover:bg-white hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </nav>
  )
}

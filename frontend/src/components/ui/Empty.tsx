import { Inbox } from 'lucide-react'

export function Empty({ text = 'No records match this view.' }: { text?: string }) {
  return (
    <div className="empty px-5 py-9 text-center text-muted-ink">
      <span
        className="empty-icon mb-2.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-pale text-primary"
        aria-hidden="true"
      >
        <Inbox size={18} />
      </span>
      <strong className="block text-[13.5px] font-medium text-ink">Nothing to show right now</strong>
      <p className="mx-auto mt-1 max-w-[420px] text-[12.5px] leading-[1.6]">{text}</p>
    </div>
  )
}

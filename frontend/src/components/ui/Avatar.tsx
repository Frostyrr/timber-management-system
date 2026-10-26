import { useState, useEffect } from 'react'

export interface AvatarProps {
  name?: string | null
  url?: string | null
  className?: string
  alt?: string
}

export function Avatar({ name, url, className, alt }: AvatarProps) {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [url])

  const safeName = (name ?? '').trim()
  const initials = safeName
    ? safeName
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?'

  const hasValidImage = Boolean(url && url.trim().length > 0 && !hasError)

  return (
    <span
      className={`avatar relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/80 bg-primary text-[11px] font-medium tracking-[-0.01em] text-white shadow-[0_2px_6px_rgba(21,63,50,0.18)] select-none ${className || 'h-[32px] w-[32px]'}`}
    >
      {hasValidImage ? (
        <img
          src={url!}
          alt={alt || safeName || 'User profile picture'}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </span>
  )
}

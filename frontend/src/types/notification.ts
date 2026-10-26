export type ToastType = 'success' | 'info' | 'warning' | 'error'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  message: string
  timestamp: number
  actionLabel?: string
  actionUrl?: string
  onAction?: () => void
  read?: boolean
}

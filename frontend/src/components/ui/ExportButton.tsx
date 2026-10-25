import { useRef, useState } from 'react'
import { Download } from 'lucide-react'
import type { Sheet } from '../../exports/excel'
export function ExportButton({ filename, sheets, label = 'Export Excel' }: { filename: string; sheets: () => Sheet[]; label?: string }) {
  const busy = useRef(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  return <div><button type="button" className="secondary" disabled={loading} onClick={async () => {
    if (busy.current) return
    busy.current = true; setLoading(true); setMessage(''); setFailed(false)
    try {
      const { downloadExcel } = await import('../../exports/excel')
      await downloadExcel(filename, sheets())
      setMessage('Excel download started.')
    } catch { setFailed(true); setMessage('Export failed. Please try again.') }
    finally { busy.current = false; setLoading(false) }
  }}><Download size={16}/>{loading ? 'Exporting…' : label}</button>{message && <p className="text-sm" role={failed ? 'alert' : 'status'}>{message}</p>}</div>
}

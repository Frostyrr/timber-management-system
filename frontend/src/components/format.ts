export const value = (f: FormData, key: string) => String(f.get(key) ?? '').trim()
export const dateText = (date: string) =>
  new Date(date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
export const tomorrow = () => {
  const d = new Date(Date.now() + 86400000)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

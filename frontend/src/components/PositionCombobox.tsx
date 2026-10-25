import { useId, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export function PositionCombobox({ options, defaultValue = '' }: {
  options: string[]
  defaultValue?: string
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [filtering, setFiltering] = useState(false)
  const [active, setActive] = useState(-1)
  const matches = options.filter(option => !filtering || option.toLowerCase().includes(text.trim().toLowerCase()))
  const selected = options.find(option => option.toLowerCase() === text.trim().toLowerCase()) ?? ''
  const choose = (option: string) => {
    setText(option); setOpen(false); setFiltering(false); setActive(-1)
    input.current?.setCustomValidity('')
  }
  return <div className="relative w-full" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setActive(-1) }
  }}>
    <input type="hidden" name="title" value={selected} />
    <div className="relative">
      <input ref={input} role="combobox" aria-label="Position / category"
        aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-options`}
        aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
        autoComplete="off" required value={text} placeholder="Type or select a position…"
        className="w-full pr-10"
        onFocus={() => { setOpen(true); setFiltering(false) }}
        onClick={() => setOpen(true)}
        onChange={event => {
          const next = event.target.value
          setText(next); setFiltering(true); setOpen(true); setActive(-1)
          event.target.setCustomValidity(options.some(option => option.toLowerCase() === next.trim().toLowerCase()) ? '' : 'Choose a position from the list.')
        }}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setOpen(true)
            const next = matches.length ? (event.key === 'ArrowDown' ? (active + 1) % matches.length : (active <= 0 ? matches.length - 1 : active - 1)) : -1
            setActive(next)
            document.getElementById(`${id}-option-${next}`)?.scrollIntoView?.({ block: 'nearest' })
          } else if (event.key === 'Enter' && open) {
            event.preventDefault()
            if (active >= 0 && matches[active]) choose(matches[active])
            else if (selected) choose(selected)
          } else if (event.key === 'Escape' && open) {
            event.preventDefault(); event.stopPropagation(); setOpen(false); setActive(-1)
          }
        }} />
      <button type="button" aria-label="Show position options" tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-1 text-primary"
        onMouseDown={event=>event.preventDefault()}
        onClick={()=>{ input.current?.focus(); setFiltering(false); setOpen(true) }}><ChevronDown size={16}/></button>
    </div>
    {open && <div className="mt-1 rounded-xl border border-line bg-white p-1 shadow-sm">
      <ul id={`${id}-options`} role="listbox" aria-label="Positions and categories" className="slick-scroll-dark-green max-h-[200px] overflow-y-auto">
        {matches.map((option,index)=><li key={option} id={`${id}-option-${index}`} role="option"
          aria-selected={selected===option} onMouseDown={event=>event.preventDefault()}
          onClick={()=>choose(option)} onMouseMove={()=>setActive(index)}
          className={`flex min-h-10 cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ${active===index?'bg-pale text-primary':'text-ink hover:bg-surface'}`}>
          {option}{selected===option&&<Check size={14} aria-hidden="true"/>}
        </li>)}
      </ul>
      {!matches.length && <p role="status" className="p-3 text-sm text-muted-ink">No matching positions. Try another search.</p>}
    </div>}
  </div>
}

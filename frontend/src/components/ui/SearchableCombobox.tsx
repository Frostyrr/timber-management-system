import { dropdownMenuClass, dropdownOptionClass, dropdownSelectedClass, dropdownIdleClass } from './dropdownStyles'
import { useId, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'

type Option = { value: string; label: string }
export function SearchableCombobox({ options, defaultValue = '', name, label, placeholder = 'Type to search…', onChange }: {
  onChange?: (value: string) => void
  options: Option[]
  defaultValue?: string
  name: string
  label: string
  placeholder?: string
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(options.find(option => option.value === defaultValue)?.label ?? '')
  const [selectedValue, setSelectedValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [filtering, setFiltering] = useState(false)
  const [active, setActive] = useState(-1)
  const matches = options.filter(option => !filtering || option.label.toLowerCase().includes(text.trim().toLowerCase()))
  const selected = options.find(option => option.value === selectedValue)
  const exactMatch = (value: string) => {
    const exact = options.filter(option => option.label.toLowerCase() === value.trim().toLowerCase())
    return exact.length === 1 ? exact[0] : undefined
  }
  const choose = (option: Option) => {
    setSelectedValue(option.value); setText(option.label); setOpen(false); setFiltering(false); setActive(-1)
    input.current?.setCustomValidity('')
    onChange?.(option.value)
  }
  return <div className="relative w-full" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setActive(-1) }
  }}>
    <input type="hidden" name={name} value={selected ? selected.value : ''} />
    <div className="relative">
      <input ref={input} role="combobox" aria-label={label}
        aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-options`}
        aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
        autoComplete="off" required value={text} placeholder={placeholder}
        className="w-full pr-10"
        onFocus={() => { setOpen(true); setFiltering(false) }}
        onClick={() => setOpen(true)}
        onChange={event => {
          const next = event.target.value
          const match = exactMatch(next)
          setSelectedValue(match?.value ?? ''); setText(next); setFiltering(true); setOpen(true); setActive(-1)
          event.target.setCustomValidity(match ? '' : 'Choose an option from the list.')
          if (match) onChange?.(match.value)
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
      <button type="button" aria-label={`Show ${label.toLowerCase()} options`} tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-1 text-primary"
        onMouseDown={event=>event.preventDefault()}
        onClick={()=>{ input.current?.focus(); setFiltering(false); setOpen(true) }}><ChevronDown size={16}/></button>
    </div>
    {open && <div className={`mt-1 ${dropdownMenuClass}`}>
      <ul id={`${id}-options`} role="listbox" aria-label={`${label} options`} className="slick-scroll-dark-green max-h-[200px] overflow-y-auto">
        {matches.map((option,index)=><li key={option.value} id={`${id}-option-${index}`} role="option"
          aria-selected={selected===option} onMouseDown={event=>event.preventDefault()}
          onClick={()=>choose(option)} onMouseMove={()=>setActive(index)}
          className={`${dropdownOptionClass} ${active===index || selected===option ? dropdownSelectedClass : dropdownIdleClass}`}>
          {option.label}{selected===option&&<Check size={14} aria-hidden="true"/>}
        </li>)}
      </ul>
      {!matches.length && <p role="status" className="p-3 text-sm text-muted-ink">No matching options. Try another search.</p>}
    </div>}
  </div>
}

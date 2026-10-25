import { SearchableCombobox } from './SearchableCombobox'

export function PositionCombobox({
  options,
  defaultValue = '',
  onChange,
}: {
  options: string[]
  defaultValue?: string
  onChange?: (value: string) => void
}) {
  return (
    <SearchableCombobox
      name="title"
      label="Position / category"
      placeholder="Type or select a position…"
      options={options.map((value) => ({ value, label: value }))}
      defaultValue={defaultValue}
      onChange={onChange}
    />
  )
}

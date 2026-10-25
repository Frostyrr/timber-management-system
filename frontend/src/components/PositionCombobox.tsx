import { SearchableCombobox } from './SearchableCombobox'
export function PositionCombobox({ options, defaultValue = '' }: { options: string[]; defaultValue?: string }) {
  return <SearchableCombobox name="title" label="Position / category" placeholder="Type or select a position…" options={options.map(value => ({ value, label: value }))} defaultValue={defaultValue} />
}

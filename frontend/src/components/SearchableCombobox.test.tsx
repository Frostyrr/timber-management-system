// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SearchableCombobox } from './SearchableCombobox'
afterEach(cleanup)
it('submits the record ID rather than its searchable label', () => {
  const { container } = render(<SearchableCombobox name="borrower" label="Borrower" options={[{value:'person-123',label:'Alex — Adviser'}, {value:'person-456',label:'Alex — Video Editor'}]} />)
  const input = screen.getByRole('combobox') as HTMLInputElement
  expect(input.checkValidity()).toBe(false)
  fireEvent.change(input, {target:{value:'video'}})
  fireEvent.keyDown(input, {key:'ArrowDown'})
  fireEvent.keyDown(input, {key:'Enter'})
  expect((container.querySelector('[name="borrower"]') as HTMLInputElement).value).toBe('person-456')
  expect(input.checkValidity()).toBe(true)
  fireEvent.change(input, {target:{value:'unknown'}})
  expect((container.querySelector('[name="borrower"]') as HTMLInputElement).value).toBe('')
  expect(input.checkValidity()).toBe(false)
})

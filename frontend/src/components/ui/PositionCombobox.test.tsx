// @vitest-environment jsdom
import { afterEach,it,expect } from 'vitest'
import { cleanup,fireEvent,render,screen } from '@testing-library/react'
import { PositionCombobox } from './PositionCombobox'
afterEach(cleanup)
it('filters directly and selects using the keyboard',()=>{
 const {container}=render(<PositionCombobox options={['Adviser','Video Editor','Head Video Editor']}/>)
 const input=screen.getByRole('combobox')
 fireEvent.change(input,{target:{value:'video'}})
 expect(screen.queryByRole('option',{name:'Adviser'})).toBeNull()
 expect(screen.getAllByRole('option')).toHaveLength(2)
 fireEvent.keyDown(input,{key:'ArrowDown'})
 fireEvent.keyDown(input,{key:'Enter'})
 expect((container.querySelector('[name="title"]') as HTMLInputElement).value).toBe('Video Editor')
 expect(screen.queryByRole('listbox')).toBeNull()
})
it('clears the previous selection while typing and rejects unmatched values',()=>{
 const {container}=render(<PositionCombobox options={['Adviser','Video Editor']} defaultValue="Adviser"/>)
 const input=screen.getByRole('combobox') as HTMLInputElement
 fireEvent.change(input,{target:{value:'unlisted'}})
 expect((container.querySelector('[name="title"]') as HTMLInputElement).value).toBe('')
 expect(input.checkValidity()).toBe(false)
 expect(screen.getByRole('status').textContent).toContain('No matching')
 fireEvent.change(input,{target:{value:'video'}})
 fireEvent.click(screen.getByRole('option',{name:'Video Editor'}))
 expect(input.checkValidity()).toBe(true)
 fireEvent.focus(input)
 fireEvent.keyDown(input,{key:'Escape'})
 expect(screen.queryByRole('listbox')).toBeNull()
})

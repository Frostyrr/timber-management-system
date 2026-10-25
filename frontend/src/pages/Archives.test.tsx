// @vitest-environment jsdom
import { it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Archives } from './Archives'
import { InventoryContext } from '../backend/context'
import { seed } from '../demo/model'
afterEach(() => { cleanup(); vi.restoreAllMocks() })
it('shows only archived records, searches, and switches tabs with the keyboard', () => {
 Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {configurable:true, value:vi.fn(function(this: HTMLDialogElement) { this.setAttribute('open','') })})
 Object.defineProperty(HTMLDialogElement.prototype, 'close', {configurable:true, value:vi.fn(function(this: HTMLDialogElement) { this.removeAttribute('open') })})
 const initial = seed()
 const state = {...initial,items:[{...initial.items[0],name:'Retired camera',archived:true},{...initial.items[1],name:'Current camera',archived:false}], people:[{id:'former',name:'Former member',title:'Adviser',department:'',archived:true},{id:'current',name:'Current member',title:'Adviser',department:'',archived:false}]}
 render(<MemoryRouter><InventoryContext.Provider value={{state,person:state.profiles[0],act:()=>{},warning:'',notice:''}}><Archives/></InventoryContext.Provider></MemoryRouter>)
 expect(screen.getByText('Retired camera')).toBeTruthy()
 expect(screen.queryByText('Current camera')).toBeNull()
 fireEvent.change(screen.getByLabelText('Search archives'),{target:{value:'no match'}})
 expect(screen.queryByText('Retired camera')).toBeNull()
 fireEvent.keyDown(screen.getByRole('tab',{name:'Equipment'}),{key:'ArrowRight'})
 expect(screen.getByRole('tab',{name:'Staff'}).getAttribute('aria-selected')).toBe('true')
 expect(screen.getByText('Former member')).toBeTruthy()
 expect(screen.queryByText('Current member')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'View history for Former member'}))
 expect(screen.getByRole('dialog')).toBeTruthy()
 expect(screen.getByText('No equipment use recorded.')).toBeTruthy()
})

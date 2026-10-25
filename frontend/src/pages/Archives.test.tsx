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

it('allows restoring an archived record and clean up purging mock archives', async () => {
 Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {configurable:true, value:vi.fn(function(this: HTMLDialogElement) { this.setAttribute('open','') })})
 Object.defineProperty(HTMLDialogElement.prototype, 'close', {configurable:true, value:vi.fn(function(this: HTMLDialogElement) { this.removeAttribute('open') })})
 const initial = seed()
 const act = vi.fn().mockResolvedValue(undefined)
 const state = {
   ...initial,
   items: [{...initial.items[0], name: 'Retired camera', archived: true}],
   people: [{id: 'former', name: 'Former member', title: 'Adviser', department: '', archived: true}],
 }

 render(
   <MemoryRouter>
     <InventoryContext.Provider value={{state, person: state.profiles[0], act, warning: '', notice: ''}}>
       <Archives />
     </InventoryContext.Provider>
   </MemoryRouter>
 )

 // 1. Restore record
 const restoreBtn = screen.getByRole('button', { name: 'Restore Retired camera' })
 fireEvent.click(restoreBtn)
 expect(screen.getByRole('heading', { name: 'Restore Retired camera?' })).toBeTruthy()

 const confirmRestoreBtn = screen.getByRole('button', { name: 'Restore record' })
 fireEvent.submit(confirmRestoreBtn.closest('form')!)
 expect(act).toHaveBeenCalledWith({ type: 'unarchive', itemId: 'i0' })

 // 2. Purge single record
 const purgeBtn = screen.getByRole('button', { name: 'Purge Retired camera' })
 fireEvent.click(purgeBtn)
 expect(screen.getByRole('heading', { name: 'Purge Retired camera?' })).toBeTruthy()

 const confirmPurgeBtn = screen.getByRole('button', { name: 'Purge record' })
 fireEvent.submit(confirmPurgeBtn.closest('form')!)
 expect(act).toHaveBeenCalledWith({ type: 'purge-archive', targetType: 'equipment', id: 'i0' })

 // 3. Clean up all archives
 const cleanAllBtn = screen.getByRole('button', { name: 'Clean up equipment archives' })
 fireEvent.click(cleanAllBtn)
 expect(screen.getByRole('heading', { name: 'Clean up all equipment archives?' })).toBeTruthy()

 const confirmCleanAllBtn = screen.getByRole('button', { name: 'Purge all archives' })
 fireEvent.submit(confirmCleanAllBtn.closest('form')!)
 expect(act).toHaveBeenCalledWith({ type: 'purge-all-archives', targetType: 'equipment' })
})

it('allows editing the archival disposition memo/note for preserved records', async () => {
 Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {configurable:true, value:vi.fn(function(this: HTMLDialogElement) { this.setAttribute('open','') })})
 Object.defineProperty(HTMLDialogElement.prototype, 'close', {configurable:true, value:vi.fn(function(this: HTMLDialogElement) { this.removeAttribute('open') })})
 const initial = seed()
 const act = vi.fn().mockResolvedValue(undefined)
 const state = {
   ...initial,
   items: [{...initial.items[0], name: 'Retired camera', archived: true, archiveReason: 'Original decommissioning note'}],
   people: [{id: 'former', name: 'Former member', title: 'Adviser', department: '', archived: true}],
 }

 render(
   <MemoryRouter>
     <InventoryContext.Provider value={{state, person: state.profiles[0], act, warning: '', notice: ''}}>
       <Archives />
     </InventoryContext.Provider>
   </MemoryRouter>
 )

 const editNoteBtn = screen.getByRole('button', { name: 'Edit note for Retired camera' })
 fireEvent.click(editNoteBtn)

 expect(screen.getByRole('heading', { name: 'Edit Archive Note · Retired camera' })).toBeTruthy()
 const textarea = screen.getByLabelText('Archive Reason / Disposition Memo') as HTMLTextAreaElement
 expect(textarea.value).toBe('Original decommissioning note')

 fireEvent.change(textarea, { target: { value: 'Surplus auction disposition approved by dean' } })
 const saveBtn = screen.getByRole('button', { name: 'Save note' })
 fireEvent.submit(saveBtn.closest('form')!)

 expect(act).toHaveBeenCalledWith({
   type: 'archive-note',
   targetType: 'equipment',
   id: 'i0',
   reason: 'Surplus auction disposition approved by dean',
 })
})

// @vitest-environment jsdom
import { it,expect,vi } from 'vitest'
import { render,screen,fireEvent,cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Staff } from './Staff'
import { InventoryContext } from '../backend/context'
import { seed } from '../demo/model'
it('paginates directory entries and resets pagination when searching',()=>{
 const initial=seed()
 const state={...initial,people:Array.from({length:23},(_,i)=>({id:`p-${i}`,name:`Person ${String(i+1).padStart(2,'0')}`,title:'Adviser',department:'',archived:false}))}
 const view=render(<MemoryRouter><InventoryContext.Provider value={{state,person:state.profiles[0],act:()=>{},warning:'',notice:''}}><Staff/></InventoryContext.Provider></MemoryRouter>)
 expect(screen.getByText('Person 01')).toBeTruthy()
 expect(screen.queryByText('Person 11')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'Next page'}))
 expect(screen.getByText('Person 11')).toBeTruthy()
 expect(screen.queryByText('Person 01')).toBeNull()
 fireEvent.change(screen.getByLabelText('Search staff'),{target:{value:'Person 23'}})
 expect(screen.getByText('Person 23')).toBeTruthy()
 fireEvent.change(screen.getByLabelText('Search staff'),{target:{value:'no matches'}})
 expect(screen.queryByRole('navigation',{name:'Table pagination'})).toBeNull()
 view.unmount();cleanup()
})

it('combines category and status filters and sorts usage counts in both directions',()=>{
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({width:200,height:40,top:0,bottom:40,left:0,right:200,x:0,y:0,toJSON:()=>({})})
 const initial=seed()
 const state={...initial, people:[
  {id:'a',name:'Alice',title:'Adviser',department:'',archived:false},
  {id:'b',name:'Bea',title:'News Writer',department:'',archived:false},
  {id:'c',name:'Chris',title:'Adviser',department:'',archived:true},
 ],loans:[
  {...initial.loans[0],id:'l1',borrowerId:'b',useType:'publication_use' as const,returned:undefined},
  {...initial.loans[0],id:'l2',borrowerId:'a',useType:'member_borrowing' as const,returned:'2026-01-01'},
 ]}
 render(<MemoryRouter><InventoryContext.Provider value={{state,person:state.profiles[0],act:()=>{},warning:'',notice:''}}><Staff/></InventoryContext.Provider></MemoryRouter>)
 const firstName=()=>screen.getAllByRole('row')[1].querySelector('td')?.textContent
 for(const [sort,expected] of [['publication-most','Bea'],['publication-least','Alice'],['borrowing-most','Alice'],['borrowing-least','Bea'],['active-most','Bea'],['active-least','Alice']]){
  fireEvent.click(screen.getByRole('combobox',{name:'Sort by'}))
  const labels: Record<string,string> = {'publication-most':'Most publication uses','publication-least':'Least publication uses','borrowing-most':'Most member borrowings','borrowing-least':'Least member borrowings','active-most':'Most active uses','active-least':'Least active uses'}
  fireEvent.click(screen.getByRole('option',{name:labels[sort]}))
  expect(firstName()).toBe(expected)
 }
 fireEvent.click(screen.getByRole('combobox',{name:'Staff category'}))
 fireEvent.click(screen.getByRole('option',{name:'Executives Department'}))
 fireEvent.click(screen.getByRole('combobox',{name:'Staff status'}))
 fireEvent.click(screen.getByRole('option',{name:'Archived'}))
 expect(firstName()).toBe('Chris')
 expect(screen.queryByText('Alice')).toBeNull()
 expect(screen.queryByText('Bea')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'Reset filters'}))
 expect(firstName()).toBe('Alice')
 expect(screen.getAllByRole('row')).toHaveLength(4)
 cleanup();vi.restoreAllMocks()
})

it('detects duplicate staff names case-insensitively and blocks submission until confirmed', async () => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {configurable:true, value:vi.fn(function(this: HTMLDialogElement) { this.setAttribute('open','') })})
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {configurable:true, value:vi.fn(function(this: HTMLDialogElement) { this.removeAttribute('open') })})
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({width:200,height:40,top:0,bottom:40,left:0,right:200,x:0,y:0,toJSON:()=>({})})

  const initial = seed()
  const act = vi.fn().mockResolvedValue(undefined)
  const state = {
    ...initial,
    people: [
      { id: 'p1', name: 'Marc Elson Rebato', title: 'Editor-in-Chief', department: 'Executives Department', archived: false },
    ],
  }

  render(
    <MemoryRouter>
      <InventoryContext.Provider value={{ state, person: state.profiles[0], act, warning: '', notice: '' }}>
        <Staff />
      </InventoryContext.Provider>
    </MemoryRouter>
  )

  fireEvent.click(screen.getAllByRole('button', { name: 'Add staff member' })[0])
  expect(screen.getByRole('heading', { name: 'Add staff member' })).toBeTruthy()

  const nameInput = screen.getByPlaceholderText('e.g. Juan Dela Cruz')
  fireEvent.change(nameInput, { target: { value: '  marc elson REBATO  ' } })

  expect(screen.getByRole('alert')).toBeTruthy()
  expect(screen.getByText(/Existing staff member detected:/)).toBeTruthy()
  expect(screen.getByText(/"Marc Elson Rebato"/)).toBeTruthy()

  const positionInput = screen.getByRole('combobox', { name: 'Position / category' })
  fireEvent.focus(positionInput)
  fireEvent.change(positionInput, { target: { value: 'Associate Editor' } })

  const submitBtn = screen.getByRole('button', { name: 'Save changes' })
  fireEvent.submit(submitBtn.closest('form')!)

  expect(act).not.toHaveBeenCalled()
  expect(await screen.findByText(/Confirm the duplicate checkbox to proceed/)).toBeTruthy()

  const confirmCheckbox = screen.getByRole('checkbox', {
    name: /Confirm: I understand this name already exists/i,
  })
  fireEvent.click(confirmCheckbox)

  fireEvent.submit(submitBtn.closest('form')!)
  expect(act).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'person-save',
      name: 'marc elson REBATO',
      title: 'Associate Editor',
      department: 'Executives Department',
    })
  )

  cleanup(); vi.restoreAllMocks()
})

it('filters positions when category is selected and infers category from position', () => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {configurable:true, value:vi.fn(function(this: HTMLDialogElement) { this.setAttribute('open','') })})
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {configurable:true, value:vi.fn(function(this: HTMLDialogElement) { this.removeAttribute('open') })})
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({width:200,height:40,top:0,bottom:40,left:0,right:200,x:0,y:0,toJSON:()=>({})})

  const initial = seed()
  const state = { ...initial, people: [] }

  render(
    <MemoryRouter>
      <InventoryContext.Provider value={{ state, person: state.profiles[0], act: vi.fn(), warning: '', notice: '' }}>
        <Staff />
      </InventoryContext.Provider>
    </MemoryRouter>
  )

  fireEvent.click(screen.getAllByRole('button', { name: 'Add staff member' })[0])

  const categorySelect = screen.getByRole('combobox', { name: 'Department / Category' })
  fireEvent.click(categorySelect)
  fireEvent.click(screen.getByRole('option', { name: 'Writers Department' }))

  const positionInput = screen.getByRole('combobox', { name: 'Position / category' })
  fireEvent.focus(positionInput)

  expect(screen.getByRole('option', { name: 'News Writer' })).toBeTruthy()
  expect(screen.queryByRole('option', { name: 'Editor-in-Chief' })).toBeNull()

  cleanup(); vi.restoreAllMocks()
})

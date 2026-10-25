// @vitest-environment jsdom
import { it,expect } from 'vitest'
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

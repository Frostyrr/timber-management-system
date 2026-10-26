// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useState } from 'react'
import { seed } from '../demo/model'
import { DataProvider } from './Provider'
import { useInventory } from './context'
const api = vi.hoisted(()=>({identity:vi.fn(),snapshot:vi.fn(),mutate:vi.fn(),subscribe:vi.fn(),signOut:vi.fn(),access:vi.fn()}))
vi.mock('../components/layout/WorkspaceGuard',()=>({WorkspaceGuard:({children}:{children:import('react').ReactNode})=>children}))
vi.mock('./client',()=>({workspaceAccess:api.access,client:{auth:{onAuthStateChange:api.subscribe,signOut:api.signOut}},identity:api.identity,snapshot:api.snapshot,mutate:api.mutate}))
let notify: (event:string,session:{user:{id:string}}|null)=>void
const state=seed()
function Workspace(){
 const {person,notice,warning,refresh,act:save}=useInventory()
 const [draft,setDraft]=useState('')
 return <><p>{person.name}</p><input aria-label="Draft" value={draft} onChange={e=>setDraft(e.target.value)}/><button onClick={()=>void refresh?.()}>Refresh</button><button onClick={()=>void save({type:'return',loanId:'l0',condition:'Good'})}>Save</button><p>{notice}</p><p>{warning}</p></>
}
async function auth(id:string|null,event='SIGNED_IN'){await act(async()=>{notify(event,id?{user:{id}}:null)})}
beforeEach(()=>{
 vi.clearAllMocks()
 api.subscribe.mockImplementation(cb=>{notify=cb;return {data:{subscription:{unsubscribe:vi.fn()}}}})
 api.identity.mockResolvedValue({...state.profiles[0],status:'active'})
 api.access.mockResolvedValue(true)
 api.snapshot.mockResolvedValue(state)
 api.mutate.mockResolvedValue(undefined)
 api.signOut.mockResolvedValue({error:null})
 render(<MemoryRouter><DataProvider><Workspace/></DataProvider></MemoryRouter>)
})
afterEach(cleanup)
describe('live session and loading behavior',()=>{
 it('does not fetch inventory until the server grants MFA access',async()=>{
  api.access.mockResolvedValue(false)
  await auth('admin')
  expect(api.snapshot).not.toHaveBeenCalled()
  expect(screen.queryByLabelText('Draft')).toBeNull()
 })
 it('preserves unsaved input on token refresh and repeated sign-in events',async()=>{
  await auth('admin'); await screen.findByLabelText('Draft')
  fireEvent.change(screen.getByLabelText('Draft'),{target:{value:'Unfinished release'}})
  await auth('admin','TOKEN_REFRESHED'); await auth('admin')
  expect((screen.getByLabelText('Draft') as HTMLInputElement).value).toBe('Unfinished release')
 })
 it('clears the workspace on sign-out',async()=>{
  await auth('admin'); await screen.findByLabelText('Draft');await auth(null,'SIGNED_OUT')
  expect(screen.queryByLabelText('Draft')).toBeNull()
  expect(screen.getByRole('button',{name:/Continue with Google/i})).toBeTruthy()
 })
 it('clears drafts on account change and ignores old outstanding requests',async()=>{
  await auth('admin'); await screen.findByLabelText('Draft')
  fireEvent.change(screen.getByLabelText('Draft'),{target:{value:'Private draft'}})
  let resolveOld:(value:typeof state)=>void=()=>{}
  api.snapshot.mockImplementationOnce(()=>new Promise(resolve=>{resolveOld=resolve}))
  fireEvent.click(screen.getByText('Refresh'))
  await waitFor(()=>expect(api.snapshot).toHaveBeenCalledTimes(2))
  api.identity.mockResolvedValue({...state.profiles[2],status:'active'})
  await auth('custodian'); await screen.findByText(state.profiles[2].name)
  await act(async()=>{resolveOld(state)})
  expect((screen.getByLabelText('Draft') as HTMLInputElement).value).toBe('')
  expect(screen.queryByText(state.profiles[0].name)).toBeNull()
 })
 it.each([['pending','Staff','Membership approval required'],['suspended','Administrator','Access suspended'],['active','Staff','Operator access required']])('shows %s / %s accurately',async(status,role,title)=>{
  api.identity.mockResolvedValue({...state.profiles[0],status,role});await auth('admin')
  expect(await screen.findByRole('heading',{name:title})).toBeTruthy()
 })
 it.each([['Network offline','Unable to load inventory'],['Apply migration: database upgrade required','Database upgrade required']])('separates %s from approval',async(message,title)=>{
  api.snapshot.mockRejectedValue(Error(message));await auth('admin')
  expect(await screen.findByRole('heading',{name:title})).toBeTruthy()
  api.access.mockResolvedValue(true)
 api.snapshot.mockResolvedValue(state);fireEvent.click(screen.getByText('Retry loading'))
  expect(await screen.findByLabelText('Draft')).toBeTruthy()
 })
 it('reports a committed save followed by refresh failure without resubmitting',async()=>{
  await auth('admin');await screen.findByLabelText('Draft')
  api.snapshot.mockRejectedValue(Error('Network offline'))
  fireEvent.click(screen.getByText('Save'))
  expect(await screen.findByText(/Saved, but the latest data could not be loaded/)).toBeTruthy()
  expect(screen.queryByRole('heading',{name:'Membership approval required'})).toBeNull()
  api.access.mockResolvedValue(true)
 api.snapshot.mockResolvedValue(state);fireEvent.click(screen.getByText('Refresh'))
  await waitFor(()=>expect(screen.queryByText(/Could not refresh inventory/)).toBeNull())
  expect(api.mutate).toHaveBeenCalledTimes(1)
 })

 it('never renders the workspace skeleton or protected content on /auth/callback while awaiting MFA', async () => {
  cleanup()
  api.access.mockResolvedValue(false)
  render(
   <MemoryRouter initialEntries={['/auth/callback']}>
    <DataProvider>
     <Workspace />
    </DataProvider>
   </MemoryRouter>
  )
  expect(screen.queryByLabelText('Loading workspace')).toBeNull()
  expect(screen.queryByLabelText('Draft')).toBeNull()

  await auth('admin')
  expect(api.snapshot).not.toHaveBeenCalled()
  expect(screen.queryByLabelText('Loading workspace')).toBeNull()
  expect(screen.queryByLabelText('Draft')).toBeNull()
 })

 it('does not render workspace skeleton on initial navigation to / before session and MFA are verified', async () => {
  cleanup()
  api.access.mockResolvedValue(false)
  render(
   <MemoryRouter initialEntries={['/']}>
    <DataProvider>
     <Workspace />
    </DataProvider>
   </MemoryRouter>
  )
  expect(screen.queryByLabelText('Loading workspace')).toBeNull()
  expect(screen.queryByLabelText('Draft')).toBeNull()

  await auth('admin')
  expect(api.snapshot).not.toHaveBeenCalled()
  expect(screen.queryByLabelText('Draft')).toBeNull()
 })

 it('keeps workspace inaccessible when MFA verification fails or remains incomplete', async () => {
  api.access.mockResolvedValue(false)
  await auth('admin')
  expect(api.snapshot).not.toHaveBeenCalled()
  expect(screen.queryByLabelText('Draft')).toBeNull()
 })
})

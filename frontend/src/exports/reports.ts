import { type State, type DirectoryPerson, equipmentStatus, borrowerName, auditActorName, formatEventDetails } from '../backend/model'
import { staffCategory } from '../backend/staffCategories'
import type { Sheet } from './excel'
// Excel dates have no timezone. Store Philippine wall-clock time explicitly.
export function excelDate(value?: string): Date | string {
  if (!value) return ''
  const instant = new Date(value)
  if (!Number.isFinite(instant.getTime())) return value
  return new Date(instant.getTime() + 8 * 60 * 60 * 1000)
}
export const equipmentSheet = (s: State, items = s.items): Sheet => ({name:'Equipment',headers:['Asset tag','Equipment','Category','Location','Condition','Status'],rows:items.map(i=>[i.tag,i.name,i.category,i.location,i.condition,equipmentStatus(s,i)])})
export const releaseSheet = (s: State, loans = s.loans): Sheet => ({name:'Releases',headers:['Asset tag','Equipment','Responsible person','Release type','Purpose','Released (PHT)','Due (PHT)','Returned (PHT)','Checkout condition','Return condition','Days overdue'],rows:loans.map(l=>{
 const i=s.items.find(i=>i.id===l.itemId)
 return [i?.tag??'',i?.name??'',borrowerName(s,l),l.useType ? ({publication_use:'Publication use',member_borrowing:'Member borrowing',external_borrowing:'External borrowing'})[l.useType] : 'Unspecified use',l.purpose||l.event||'',excelDate(l.out),excelDate(l.due),excelDate(l.returned),l.before,l.after??'',!l.returned?Math.max(0,Math.ceil((Date.now()-new Date(l.due).getTime())/86400000)):0]
})})
export const staffSheet = (s: State, people: DirectoryPerson[] = s.people??[]): Sheet => ({name:'Staff',headers:['Name','Position','Category','Publication uses','Member borrowings','Active uses','Status'],rows:people.map(p=>{
 const uses=s.loans.filter(l=>l.borrowerId===p.id)
 return [p.name,p.title,staffCategory(p.title),uses.filter(l=>l.useType==='publication_use').length,uses.filter(l=>l.useType==='member_borrowing').length,uses.filter(l=>!l.returned).length,p.archived?'Archived':'Active']
})})
export const incidentSheet = (s: State, incidents = s.incidents): Sheet => ({name:'Incidents',headers:['Asset tag','Equipment','Type','Reported (PHT)','Notes','Status','Resolved (PHT)','Outcome'],rows:incidents.map(n=>{
 const i=s.items.find(i=>i.id===n.itemId)
 return [i?.tag??'',i?.name??'',n.kind,excelDate(n.at),n.notes,n.resolved?'Resolved':'Unresolved',excelDate(n.resolved),n.outcome??'']
})})
export const activitySheet = (s: State, events = s.events): Sheet => ({name:'Activity logs',headers:['Time (PHT)','Actor','Action','Record ID','Details','Reason'],rows:events.map(e=>[excelDate(e.at),auditActorName(e,s),e.action??'',e.entityId,formatEventDetails(e,s),e.reason??''])})

import { describe,it,expect } from 'vitest'
import { seed } from '../demo/model'
import { formatEventDetails,auditActorName,equipmentStatus,type State } from './model'
describe('audit display and equipment status',()=>{
 it('resolves a directory-only borrower and names the issuing operator',()=>{
  const s:State={...seed(),people:[{id:'directory-only',name:'Directory member',department:'',title:'Video Editor',archived:false}]}
  const e={id:'event',actor:'other-operator',actorName:'Issuing custodian',at:'2026-10-24',text:'releases.insert',action:'releases.insert',entityId:'i0',subjectId:'directory-only'}
  expect(formatEventDetails(e,s)).toContain('Directory member')
  expect(auditActorName(e,s)).toBe('Issuing custodian')
  expect(auditActorName({...e,actorName:undefined},s)).toBe('Unknown operator')
  expect(auditActorName({...e,actor:'system',actorName:undefined},s)).toBe('System')
 })
 it('labels directory actions separately',()=>{
  expect(formatEventDetails({id:'e',actor:'admin',at:'',text:'people.update',action:'people.update',entityId:'directory',after:{name:'Member',archived:true}},seed())).toBe('Archived directory member: Member')
 })
 it('distinguishes archive, incident review and unavailable equipment',()=>{
  const s=seed()
  expect(equipmentStatus(s,{...s.items[1],archived:true})).toBe('Archived')
  expect(equipmentStatus(s,s.items[6])).toBe('Under review')
  s.items[1].condition='Missing'
  expect(equipmentStatus(s,s.items[1])).toBe('Unavailable')
 })
})

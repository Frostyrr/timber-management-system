import { expect, it } from 'vitest'
import { summarizeMfaAction } from './mfaSummary'
import { seed } from '../demo/model'
it('shows equipment names and asset tags instead of raw action JSON',()=>{
 const state=seed()
 const item=state.items[0]
 const summary=summarizeMfaAction({type:'purge-archive',id:item.id},state)
 expect(summary.records[0]).toContain(item.name)
 expect(summary.records[0]).toContain(item.tag)
 expect(summary.destructive).toBe(true)
 expect(summary.consequence).toContain('cannot be undone')
})
it('shows exact bulk counts and email targets',()=>{
 expect(summarizeMfaAction({type:'purge-all-archives',targets:['a','b']}).title).toContain('2 archived records')
 expect(summarizeMfaAction({type:'add-authorized-email',email:'person@example.com'}).records).toEqual(['person@example.com'])
 expect(summarizeMfaAction(null).title).toBe('Confirm security change')
})

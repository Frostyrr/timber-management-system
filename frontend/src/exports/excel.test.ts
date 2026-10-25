import { it, expect } from 'vitest'
import { buildWorkbook } from './excel'
import { excelDate, releaseSheet, staffSheet } from './reports'
import { seed } from '../demo/model'
it('round-trips text safely, numbers and Excel dates with headers and filters', async () => {
 const book = await buildWorkbook([{name:'Records',headers:['Text','Count','Time'],rows:[['=HYPERLINK("https://example.com")',12,excelDate('2026-10-25T00:00:00Z')]]}])
 const bytes = await book.xlsx.writeBuffer()
 const { Workbook } = await import('exceljs')
 const loaded = new Workbook()
 await loaded.xlsx.load(bytes)
 const sheet = loaded.getWorksheet('Records')!
 expect(sheet.getCell('A2').type).toBe(3)
 expect(sheet.getCell('B2').value).toBe(12)
 expect((sheet.getCell('C2').value as Date).toISOString()).toBe('2026-10-25T08:00:00.000Z')
 expect(sheet.views[0].state).toBe('frozen')
 expect(sheet.autoFilter).toBeTruthy()
})
it('exports all supplied staff and excludes external contact fields', () => {
 const state=seed()
 const people=Array.from({length:23},(_,i)=>({id:String(i),name:'Person '+i,title:'Adviser',department:'',archived:false}))
 expect(staffSheet(state,people).rows).toHaveLength(23)
 const sheet=releaseSheet(state)
 expect(sheet.headers.join(' ')).not.toMatch(/contact|email|phone/i)
 expect(sheet.rows).toHaveLength(state.loans.length)
})

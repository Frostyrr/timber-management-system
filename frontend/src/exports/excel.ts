export type Cell = string | number | Date
export type Sheet = { name: string; headers: string[]; rows: Cell[][] }
export async function buildWorkbook(sheets: Sheet[]) {
  const { Workbook } = await import('exceljs')
  const book = new Workbook()
  book.creator = 'Timber Management System'
  book.created = new Date()
  for (const sheet of sheets) {
    const ws = book.addWorksheet(sheet.name, { views: [{ state: 'frozen', ySplit: 1 }] })
    ws.addRow(sheet.headers)
    for (const row of sheet.rows) ws.addRow(row)
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF153F32' } }
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, ws.rowCount), column: sheet.headers.length } }
    ws.columns.forEach(column => { column.width = 24 })
    ws.eachRow((row, index) => {
      if (index === 1) return
      row.eachCell(cell => {
        if (cell.value instanceof Date) cell.numFmt = 'yyyy-mm-dd hh:mm'
        cell.alignment = { vertical: 'top', wrapText: true }
      })
    })
  }
  return book
}
export async function downloadExcel(name: string, sheets: Sheet[]) {
  const book = await buildWorkbook(sheets)
  const bytes = await book.xlsx.writeBuffer()
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `timber-${name.replace(/[^a-z0-9-]/gi, '-')}-${new Date().toISOString().slice(0,10)}.xlsx`
  document.body.appendChild(link)
  link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

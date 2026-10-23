import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { InventoryContext } from './backend/context'
import { seed } from './demo/model'
const state = seed()
function render(path: string, persona = 'admin') {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <InventoryContext.Provider
        value={{
          state,
          person: state.profiles.find((p) => p.id === persona)!,
          act: () => {},


          warning: '',
          notice: '',
        }}
      >
        <App />
      </InventoryContext.Provider>
    </MemoryRouter>,
  )
}
describe('inventory-only workspace', () => {
  for (const route of ['/', '/inventory', '/incidents']) {
    it(`renders ${route} without removed module links`, () => {
      const html = render(route)
      expect(html).toContain('Timber')
      expect(html).toContain('Skip to content')
      for (const retired of ['/assignments', '/reviews', '/contributions'])
        expect(html).not.toContain(`href="${retired}`)
      expect(html).not.toContain('Department Editor')
    })
  }
  it('shows inventory metrics and direct return/register actions', () => {
    const html = render('/')
    for (const label of [
      'Inventory overview',
      'Available equipment',
      'Equipment in use',
      'Overdue returns',
      'Open incident reviews',
      'Inventory activity',
    ])
      expect(html).toContain(label)
    expect(html).toContain('/inventory?action=register')
    expect(html).toContain('/inventory?action=return&amp;loan=l0')
    expect(html).not.toContain('assignments')
    expect(html).not.toContain('merit')
  })
  it('keeps borrower views scoped and hides management actions', () => {
    const html = render('/', 'staff')
    expect(html).toContain('Canon EOS 80D')
    expect(html).not.toContain('Zoom H1n recorder')
    expect(html).not.toContain('Light flickers')
    expect(html).not.toContain('Register equipment')
    expect(html).not.toContain('/inventory?action=return')
    expect(html).toContain('/inventory?action=history')
    const inventory = render('/inventory', 'staff')
    expect(inventory).toContain('Usage history')
    expect(inventory).not.toContain('Record equipment release')
  })
  it('filters available and overdue equipment', () => {
    const available = render('/inventory?status=available')
    expect(available).toContain('Sony a6400')
    expect(available).not.toContain('Canon EOS 80D')
    const overdue = render('/inventory?status=overdue')
    expect(overdue).toContain('Canon EOS 80D')
    expect(overdue).not.toContain('Sony a6400')
  })
  it('custodian retains equipment management and staff have useful empty views', () => {
    expect(render('/', 'custodian')).toContain('Register equipment')
    expect(render('/', 'p8')).toContain('No equipment currently in use in your view.')
    expect(render('/incidents', 'p8')).not.toContain('Light flickers')
  })
  it('direct links open the right inventory action only for authorized personas', () => {
    expect(render('/inventory?action=register')).toContain('Equipment name')
    expect(render('/inventory?action=return&loan=l0')).toContain('Record equipment return')
    expect(render('/inventory?action=return&loan=l0', 'staff')).not.toContain(
      'Record equipment return',
    )
    expect(render('/inventory?action=return&loan=unknown')).not.toContain('Record equipment return')
  })
  it('staff roster is accessible only to inventory custodians and administrators', () => {
    const adminHtml = render('/')
    expect(adminHtml).toContain('href="/staff"')
    const custodianHtml = render('/')
    expect(custodianHtml).toContain('href="/staff"')
    const staffHtml = render('/', 'staff')
    expect(staffHtml).not.toContain('href="/staff"')

    const adminRoster = render('/staff', 'admin')
    expect(adminRoster).toContain('Staff members &amp; accountability roster')
    expect(adminRoster).toContain('Add staff member')
    expect(adminRoster).toContain('Dana Paula Gales')
  })
})

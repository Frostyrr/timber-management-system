import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { DemoContext } from './demo/context'
import { seed } from './demo/model'
const state = seed()
function render(path: string, persona = 'admin') {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <DemoContext.Provider
        value={{
          state,
          person: state.profiles.find((p) => p.id === persona)!,
          act: () => {},
          switchPerson: () => {},
          reset: () => {},
          warning: '',
          notice: '',
        }}
      >
        <App />
      </DemoContext.Provider>
    </MemoryRouter>,
  )
}
describe('offline screen rendering', () => {
  for (const route of [
    '/',
    '/inventory',
    '/incidents',
    '/assignments',
    '/reviews',
    '/contributions',
    '/staff',
  ]) {
    it(`renders ${route} with application shell`, () => {
      const html = render(route)
      expect(html).toContain('Timber')
      expect(html).toContain('Skip to content')
      expect(html).not.toContain('Reset demo data')
    })
  }
  it('staff sees only own assignments and no management controls', () => {
    const html = render('/assignments', 'staff')
    expect(html).toContain('Campus voices')
    expect(html).not.toContain('Library hours fact-check')
    expect(html).not.toContain('Create assignment')
    expect(html).not.toContain('Contribution review')
  })
  it('filters available equipment and individual contribution views', () => {
    const inventory = render('/inventory?status=available')
    expect(inventory).toContain('Sony a6400')
    expect(inventory).not.toContain('Canon EOS 80D')
    const contributions = render('/contributions?person=p8')
    expect(contributions).toContain('No assignments recorded.')
    expect(contributions).not.toContain('Freshman welcome story')
  })
  it('keeps loan history management controls away from staff', () => {
    const html = render('/inventory', 'staff')
    expect(html).not.toContain('Register equipment')
    expect(html).not.toContain('Check out')
    expect(html).toContain('History')
  })
  it('renders dashboard summary cards, workload panels, and persona-scoped actions', () => {
    const adminHtml = render('/', 'admin')
    expect(adminHtml).toContain('Overview Dashboard')
    expect(adminHtml).toContain('Available equipment')
    expect(adminHtml).toContain('Active loans')
    expect(adminHtml).toContain('Overdue returns')
    expect(adminHtml).toContain('Open assignments')
    expect(adminHtml).toContain('Pending contribution approvals')
    expect(adminHtml).toContain('Assignment workload by department')
    expect(adminHtml).toContain('Assignment status')
    expect(adminHtml).toContain('Upcoming &amp; overdue assignments')
    expect(adminHtml).toContain('Equipment loans needing follow-up')
    expect(adminHtml).toContain('Register equipment')
    expect(adminHtml).toContain('Create assignment')

    const editorHtml = render('/', 'editor')
    expect(editorHtml).toContain('Create assignment')
    expect(editorHtml).not.toContain('Register equipment')

    const custodianHtml = render('/', 'custodian')
    expect(custodianHtml).toContain('Register equipment')
    expect(custodianHtml).not.toContain('Create assignment')

    const unassignedStaffHtml = render('/', 'p8')
    expect(unassignedStaffHtml).not.toContain('Register equipment')
    expect(unassignedStaffHtml).not.toContain('Create assignment')
    expect(unassignedStaffHtml).toContain('No assignments recorded.')
  })
})

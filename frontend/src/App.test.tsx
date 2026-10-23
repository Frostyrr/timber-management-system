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
    it(`renders ${route} with demo disclosure`, () => {
      const html = render(route)
      expect(html).toContain('Demo — sample data stored in this browser')
      expect(html).toContain('Skip to content')
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
})

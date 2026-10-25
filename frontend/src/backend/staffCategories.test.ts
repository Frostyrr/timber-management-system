import { expect, it } from 'vitest'
import { publicationPositions, staffCategory } from './staffCategories'
it('categorizes all positions and preserves legacy entries as uncategorized', () => {
  expect(publicationPositions).toHaveLength(22)
  expect(new Set(publicationPositions).size).toBe(22)
  expect(publicationPositions).not.toContain('Staff Member')
  expect(staffCategory('Adviser')).toBe('Executives Department')
  expect(staffCategory('Literary Writer')).toBe('Writers Department')
  expect(staffCategory('Head Video Editor')).toBe('Creatives Department')
  expect(staffCategory('PICO Staff')).toBe('External')
  expect(staffCategory('Staff Member')).toBe('Uncategorized')
})

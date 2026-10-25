export const staffCategories = {
  'Executives Department': ['Adviser', 'Editor-in-Chief', 'Associate Editor', 'Multimedia Director'],
  'Writers Department': ['News Writer', 'Column Writer', 'Editorial Writer', 'Feature Writer', 'Sports Writer', 'Literary Writer'],
  'Creatives Department': ['Head Photojournalist', 'Head Videojournalist', 'Head Video Editor', 'Head Cartoonist', 'Head Graphics Artist', 'Photojournalist', 'Videojournalist', 'Video Editor', 'Graphics Artist', 'Cartoonist'],
  External: ['PICO Staff', 'External Personnel'],
}
export const publicationPositions = Object.values(staffCategories).flat()
export function staffCategory(title: string): string {
  return Object.entries(staffCategories).find(([, positions]) => positions.includes(title))?.[0] ?? 'Uncategorized'
}

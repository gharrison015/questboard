/** Chore icons: inline SVG paths on a 24px grid, stroked with currentColor. Unknown names fall back to the chores icon. */
export const CHORE_ICONS: Record<string, string> = {
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9L12 3.5z"/>',
  bed: '<path d="M3.5 18.5v-10M3.5 15h17v3.5M20.5 15v-3a3 3 0 0 0-3-3H11v6"/><circle cx="7" cy="11.5" r="1.8"/>',
  dog: '<path d="M5 9l2-4 3 2h4l3-2 2 4v5a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5V9z"/><circle cx="9.5" cy="11.5" r=".9" fill="currentColor" stroke="none"/><circle cx="14.5" cy="11.5" r=".9" fill="currentColor" stroke="none"/><path d="M10.5 15h3"/>',
  cat: '<path d="M5 19V6l4 3h6l4-3v13H5z"/><circle cx="9.5" cy="13" r=".9" fill="currentColor" stroke="none"/><circle cx="14.5" cy="13" r=".9" fill="currentColor" stroke="none"/>',
  toys: '<rect x="4" y="11" width="7" height="8" rx="1.5"/><circle cx="16.5" cy="15" r="4"/><path d="M7.5 11V6.5l3-2"/>',
  book: '<path d="M12 6c-2-1.3-4.5-1.6-7-1v12c2.5-.6 5-.3 7 1 2-1.3 4.5-1.6 7-1V5c-2.5-.6-5-.3-7 1z"/><path d="M12 6v12"/>',
  plate: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10 11v5M14 11v5"/>',
  hamper: '<path d="M6 8h12l-1.2 11H7.2L6 8z"/><path d="M5 8h14M9 12v4M12 12v4M15 12v4"/>',
  shoes: '<path d="M3.5 16.5v-3.5l4 .5 2-3.5 2.5 2.5h5a3.5 3.5 0 0 1 3.5 3.5v.5h-17.5z"/>',
  table: '<path d="M4 9h16M6 9v10M18 9v10M9 5.5h6"/>',
  plant: '<path d="M12 20v-8"/><path d="M12 12c0-4 2.5-6 6-6 0 4-2 6-6 6zM12 15c0-3-2-5-5-5 0 3 2 5 5 5z"/><path d="M8 20h8"/>',
  broom: '<path d="M14 4l-4.5 8.5"/><path d="M6 13l6 3 2-3.5-5.5-2.5L6 13zM5 20l1-4M8.5 20l.5-3.5M12 20l-.5-3"/>',
  dishes: '<ellipse cx="12" cy="9" rx="7.5" ry="3"/><path d="M4.5 9v3.5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V9"/><path d="M8 19.5h8"/>',
  laundry: '<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><circle cx="12" cy="13" r="4"/><path d="M8 7h.01M11 7h.01"/>',
  teeth: '<path d="M7 5c-2 0-3 1.5-3 3.5 0 3 1.5 3.5 1.5 7 0 2 1 3.5 2 3.5 1.5 0 1.5-4 2.5-4s1 4 2.5 4c1 0 2-1.5 2-3.5 0-3.5 1.5-4 1.5-7C18 6.5 17 5 15 5c-1.5 0-2 .8-4 .8S8.5 5 7 5z"/>',
  clothes: '<path d="M8 4l-5 4 2.5 3L8 9.5V20h8V9.5l2.5 1.5L21 8l-5-4c-.5 1.5-2 2.5-4 2.5S8.5 5.5 8 4z"/>',
  backpack: '<rect x="6" y="7" width="12" height="13" rx="3.5"/><path d="M9 7V5.5a3 3 0 0 1 6 0V7M9 14h6"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M4 8l8 5.5L20 8"/>',
  water: '<path d="M12 3.5s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  car: '<path d="M4 15v-3l2-5h12l2 5v3H4zM4 15v3h3v-3M17 15v3h3v-3"/><circle cx="8" cy="12.5" r=".9" fill="currentColor" stroke="none"/><circle cx="16" cy="12.5" r=".9" fill="currentColor" stroke="none"/>',
  music: '<path d="M9 17V6l10-2v11"/><circle cx="7" cy="17" r="2.5"/><circle cx="17" cy="15" r="2.5"/>',
  homework: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/>',
  sparkle: '<path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8L12 3.5z"/><path d="M18.5 16v4M16.5 18h4"/>',
}

export const CHORE_ICON_NAMES = Object.keys(CHORE_ICONS)

/** SVG inner markup for a chore icon name, or null when the name is unknown. */
export function choreIconPath(name: string): string | null {
  return CHORE_ICONS[name] ?? null
}

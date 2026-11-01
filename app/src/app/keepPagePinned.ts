/**
 * The app never scrolls the page itself; panels scroll inside. iOS Safari still
 * shifts the whole page up to make room for the keyboard and can leave it there
 * after the keyboard closes, hiding the top of the screen and leaving a blank
 * band at the bottom. Put the page back once no text field has focus.
 */
const TYPING = 'input, textarea, select, [contenteditable="true"]'

function typing(): boolean {
  const el = document.activeElement
  return el instanceof HTMLElement && el.matches(TYPING)
}

function reset(): void {
  if (!typing() && (window.scrollX !== 0 || window.scrollY !== 0)) window.scrollTo(0, 0)
}

export function keepPagePinned(): void {
  // focusout fires before focus lands on the next field, so wait a beat.
  window.addEventListener('focusout', () => window.setTimeout(reset, 120))
  window.visualViewport?.addEventListener('resize', () => window.setTimeout(reset, 120))
}

/** Roles and inputs that `space` presses when they have the focus. */
const SPACE_CONTROLS =
  'button, a[href], summary, [role="button"], [role="radio"], [role="switch"], [role="checkbox"], [role="menuitem"], [role="tab"], [role="option"], input[type="checkbox"], input[type="radio"]'

/**
 * Whether the focused element takes `space` itself: a button presses, a radio picks. Its own
 * module, so the editor's debugger keys use it without the arena's keys (and the sound engine).
 */
export function spaceTaken(): boolean {
  const focused = document.activeElement
  return focused instanceof Element && focused.matches(SPACE_CONTROLS)
}

/**
 * Device Lab sandbox. When the app runs inside the Device Lab page (`/questboard/devlab/`), or with
 * `?lab=1`, it keeps its data in a separate database and talks on a separate tab channel, so testing
 * never touches the family's real data in the same browser. The lab can also say "this screen is
 * touch", because a desktop browser frame cannot report a coarse pointer on its own.
 */

function framedByLab(): boolean {
  try {
    return window.self !== window.top && window.top!.location.pathname.includes('/devlab')
  } catch {
    return false
  }
}

function params(): URLSearchParams {
  return new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
}

export function isLab(): boolean {
  if (typeof window === 'undefined') return false
  return params().get('lab') === '1' || framedByLab()
}

/** True when the lab says the simulated device has a touch screen. */
export function labTouch(): boolean {
  return isLab() && params().get('touch') === '1'
}

/** True when the lab simulates a dual-screen device spanned side by side. */
export function labFold(): boolean {
  return isLab() && params().get('fold') === '1'
}

export const LAB_DB = 'questboard-lab'
export const LAB_CHANNEL = 'qb-lab'

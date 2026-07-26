/**
 * Neutral, module-agnostic landing spot after login/accept-invite.
 * Deliberately has NO special-cased behavior in EmployeeRoute (unlike
 * /home, which only redirects away once a module is already entered) --
 * this always falls into the general decision branch: zero modules ->
 * /no-modules, exactly one -> auto-redirect through /entering/{key},
 * two or more -> /home for a real choice. Never hardcodes which module
 * or service to land in, so this works the same regardless of how many
 * modules exist (hr today, warehouse/pos later).
 */
export function LaunchPage() {
  return null;
}
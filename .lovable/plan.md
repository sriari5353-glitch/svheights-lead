# Seamless passwordless user switching

Goal: from any screen, pick a user and land in that account instantly — no password, no sign-out, and always able to hop back (including back to Admin).

## What's wrong today

- The one-click "Switch User" panel lives only on `/admin`. Once the admin switches into a regular user, that page is no longer reachable, so getting back means signing out and signing in again.
- The header profile menu hides the user list unless the current session is an admin, so while impersonating there is no switcher at all.
- Impersonation itself is fine: the `admin-users` function mints a magic-link token and the client verifies it, but only an admin-signed request is allowed to mint one.

## What changes

1. **Remember the admin session.** When an admin switches into another user, keep that admin's tokens in the existing session cache and record which account is the "home" admin for this browser session.
2. **Always-available switcher in the header.** The profile popover shows the full user list whenever a home-admin session exists in this browser session — even while the current session is a regular user. Each entry switches with one click.
   - Target already cached in this session -> instant `setSession`, no network.
   - Not cached -> temporarily restore the cached admin session, mint the impersonation token, then verify into the target and cache it.
3. **"Back to Admin" entry.** A distinct item at the top of the switcher returns to the home-admin account and, from there, `/admin` is reachable again.
4. **Admin View button visibility.** Stays admin-only for the *current* session, so an impersonated regular user still cannot open the admin dashboard, but the "Back to Admin" path is one click away.
5. **Sign out clears everything** — cached sessions plus the home-admin marker — so the next login starts clean and the first switch of a new browser session requires the admin login as expected.

## Technical notes

- `src/lib/userSwitch.ts`: add `setHomeAdmin`/`getHomeAdmin`/`clearHomeAdmin` (sessionStorage, alongside `cached_user_sessions`), and extend `switchToUser` to fall back to "restore home-admin session -> invoke `admin-users` impersonate -> `verifyOtp` into target" when no cached session exists.
- `src/components/RoleSwitch.tsx`: gate the user list on `isAdmin || getHomeAdmin()`; add the "Back to Admin" row; route all switching through `switchToUser`; clear the home-admin marker in sign-out.
- `src/components/AdminUserSwitcher.tsx`: reuse the same helper; set the home-admin marker before the first switch.
- `src/context/AuthContext.tsx`: on sign-in of an admin, record that account as home admin.
- Profile list for non-admin sessions comes from the cached list captured while the admin session was active (RLS restricts `profiles` reads for regular users), so no policy loosening is needed.
- No database or edge-function changes.

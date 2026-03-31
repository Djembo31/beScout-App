# BES-13: Add aria-labels to layout components

**Agent:** FrontendEngineer
**Date:** 2026-03-31
**Status:** ready-for-qa

## Changes

### i18n additions
- `messages/de.json` — added `nav.sideNavLabel`, `nav.mainNavLabel`, `nav.profileLink`, `nav.wishButton`, `common.clubSwitcherLabel`
- `messages/tr.json` — same keys in Turkish

### SideNav.tsx (also: quality gate fix)
- **Service layer**: replaced direct `supabase.auth.signOut()` call with `signOut()` from `@/lib/services/auth` (triggered by stop hook — pre-existing violation caught when file was touched)
- `<aside>` (desktop + mobile drawer): `aria-label={t('sideNavLabel')}`
- `<nav>`: `aria-label={t('mainNavLabel')}`
- Wish button: `aria-label={t('wishButton')}` (was icon-only when collapsed)
- Settings link: `aria-label={collapsed ? t('settings') : undefined}` (icon-only when collapsed)
- Logout button: `aria-label={collapsed ? t('logout') : undefined}` (icon-only when collapsed)
- Logout confirm / cancel buttons: `aria-label` for collapsed icon-only state
- Logout/Settings/X icons: `aria-hidden="true"` (decorative)
- Mobile backdrop: `aria-hidden="true"` (purely visual)

### TopBar.tsx
- Profile link: `aria-label={t('profileLink')}` — the link had no accessible name (Image has `alt=""`, icon has no label)

### BottomNav.tsx
- Added `useTranslations('nav')` hook
- `<nav>`: `aria-label={tn('mainNavLabel')}`
- Active tab indicator: `aria-hidden="true"` (decorative gold bar)

### ClubSwitcher.tsx
- Trigger button: `aria-expanded={open}`, `aria-haspopup="listbox"`, `aria-label={collapsed ? t('clubSwitcherLabel') : undefined}`
- `<ChevronDown>`: `aria-hidden="true"` (decorative)
- Dropdown: `role="listbox"`, `aria-label={t('clubSwitcherLabel')}`
- Club options: `role="option"`, `aria-selected={isActive}`

### NotificationDropdown.tsx
- Desktop panel: `role="dialog"`, `aria-modal="true"`, `aria-label={tn('title')}`
- Mobile bottom sheet: `role="dialog"`, `aria-modal="true"`, `aria-label={tn('title')}`

## Verification

- `npx tsc --noEmit` — clean (no errors, confirmed after service layer fix)
- `npx vitest run src/components/layout` — 3 files, 8 tests, all passed
- Stop hook (quality gate): resolved — `supabase` import removed from SideNav, service layer used

## Test Checklist

- [ ] Screen reader announces SideNav `<aside>` as "Sidebar-Navigation" landmark
- [ ] Screen reader announces `<nav>` as "Hauptnavigation" / "Ana navigasyon"
- [ ] Profile link announced as "Mein Profil" / "Profilim" link
- [ ] Collapsed SideNav: Settings, Logout, Wish buttons have readable labels
- [ ] BottomNav `<nav>` has label (multiple nav landmarks differentiated)
- [ ] ClubSwitcher trigger announces `aria-expanded` state
- [ ] Club options in dropdown have `aria-selected` state
- [ ] Notification panel announced as dialog with "Benachrichtigungen" label
- [ ] All tests pass on mobile (360px) and desktop (1280px)
- [ ] No visual regressions

## Risks

- `role="dialog"` on NotificationDropdown panels without focus trapping — screen readers using `aria-modal` should stay within the dialog, but focus is not explicitly moved on open. This is a known limitation and acceptable for the current scope.
- `aria-hidden="true"` on mobile notification backdrop is NOT applied (corrected during implementation — parent aria-hidden would suppress child dialog).

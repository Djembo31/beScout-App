# Slice 266 Review — Top-Progress-Bar Cold-Start UX-Brücke

**Verdict:** CONCERNS (REWORK-light empfohlen — 1-Zeilen-Fix MAJOR Finding #1)

**Reviewer-Agent:** Cold-Context, ~22 min spent.

## Spec-Coverage
- [x] AC-01 Cold-Start zeigt Bar (Hooks korrekt verbunden)
- [x] AC-02 Anti-Flicker via Fade-Timer (200ms cleanup, Test deckt ab)
- [x] AC-03 Logged-out Bar nicht sichtbar (`(!!user && (...))` Guard korrekt)
- [x] AC-04 Mobile 393px (fixed-positioned 2px, kein Layout-Shift) — post-Deploy zu verifizieren
- [x] AC-05 i18n DE+TR `nav.appLoading` in beiden Locales bei Zeile 276
- [~] AC-06 Reduced-Motion — siehe Finding #1
- [x] AC-07 Definition-of-Done — Mount in `(app)/layout.tsx` Z89, Import Z5

## Findings

| # | Severity | File:Line | Issue | Fix |
|---|----------|-----------|-------|-----|
| 1 | **MAJOR** | `TopProgressBar.tsx:78` | `motion-reduce:animation-none` ist KEINE valide Tailwind-Utility. Standard ist `motion-reduce:animate-none` (237 Vorkommen im Codebase). Tailwind JIT generiert keine CSS-Rule für `animation-none`. Resultat: bei reduced-motion-User snapped der Streifen via globalem `@media (prefers-reduced-motion)` Block (animation-duration: 0.01ms) in End-Position translateX(400%) → komplett außerhalb overflow-hidden Containers. Bar-Bereich erscheint leer/dunkel statt statisch goldener Surface. AC-06 effektiv nicht erfüllt. | `motion-reduce:animation-none` → `motion-reduce:animate-none`. Optional: bei reduced-motion full-width `bg-gold/30` Fallback-Surface rendern statt Streifen. |
| 2 | **MAJOR** | `TopProgressBar.tsx:67` | Z-Index Spec-Drift. globals.css definiert `--z-modal: 60`, `--z-toast: 70`. Modal-Components nutzen z-80+, TourOverlay z-89/90/9999, InstallPrompt z-85, Confetti z-200. Spec sagt "z-60 über TopBar's z-30, unter Modals' z-50+" — tatsächlich sind Modals z-80+. Spec-Drift, kein Code-Bug — z-60 ist semantisch korrekt für Loading-Indicator. | Spec-Kommentar in TopProgressBar.tsx von "über TopBar (z-30)" zu "z-60 = z-modal Token (über TopBar z-30, unter Dialog z-80, unter Toast z-70)". Kein Code-Fix nötig. |
| 3 | **MINOR** | `(app)/layout.tsx:84-89` | Mount-Reihenfolge: `<DemoBanner />` rendert zuerst, `<TopProgressBar />` ist `position: fixed top-0` und überlagert DemoBanner visuell. Spec-intent korrekt (top of viewport), aber bei aktivem DemoBanner sieht User goldene Linie OBERHALB des Banner-Texts. | Optional `top-[var(--demo-banner-height)]`, oder Bar visuell durch DemoBanner überlassen. Defer auf post-Deploy-Verify durch Anil. |
| 4 | **MINOR** | `TopProgressBar.tsx:78` | `via-[#FFD700]` arbitrary-Wert statt `via-gold` Token aus tailwind.config.ts. Brand-Token-Drift, funktional identisch. | `via-[#FFD700]` → `via-gold`. |
| 5 | NIT | `TopProgressBar.tsx:31` | `useUserTickets(user?.id)` mit user?.id undefined — Hook ist defensiv, kein Bug. | Kein Fix. |
| 6 | NIT | `TopProgressBar.test.tsx:103,134` | `vi.useFakeTimers()` ohne expliziten Cleanup pro Test, aber `beforeEach` ruft `vi.useRealTimers()` — passt. | Optional: `afterEach(() => vi.useRealTimers())` als Sicherheits-Gürtel. |
| 7 | NIT | `TopProgressBar.tsx:42-58` | useEffect-Dep `visible` führt zu unnötigem Effect-Run beim Toggle, React batcht das aber. | Kein Fix. |
| 8 | NIT | `TopProgressBar.tsx:42-43` | `useState(false)` initial → 1 Re-Render-Zyklus Verzögerung (~16ms). Optional `useState(() => isCriticalLoading)`. | Optimization, kein Pflicht-Fix. |

## Positive

- **Component-Isolation Slice-265-Lehre voll angewendet:** neue Component, keine Provider-Cascade-Änderung, kein Touch von TopBar/Wallet. Blast-Radius minimal.
- **Test-Coverage:** 8 Tests, deckt AC-01/02/03/06 + Pre-Mortem #4 (Fade-Race) ab. `vi.hoisted` Pattern korrekt (Slice 170 Lehre).
- **i18n-Compliance:** DE+TR beide bei Zeile 276 in nav-Namespace. Wording neutral, business.md trivial PASS.
- **Slice 181 Pattern korrekt:** `anim-progress-shimmer` in `@layer utilities`, Tree-Shake-sicher.
- **Definition-of-Done UI:** ✅ in 1+ Page-Render-Tree gemounted. Kein Build-without-Wire (D54).
- **useEffect Cleanup korrekt:** `return () => clearTimeout(timer)` cleant pending Timer bei deps-Wechsel und Unmount.
- **safe-area-inset-top + pointer-events-none:** Pre-Mortem #3 (Notch) + UX-Friendly (Bar blockiert keine Klicks).
- **profileLoading-Inclusion:** Adressiert Slice 192/193 Auth-Hydration-Race.

## Learnings für Knowledge Capture

**Eintrag für `errors-frontend.md`:**

> **Tailwind motion-reduce variant nur auf existierende Animation-Utilities** — `motion-reduce:animation-none` ist KEINE valide Tailwind-Utility (Tailwind kennt nur `animate-none`). JIT generiert keine CSS-Rule, die Class wird silent ignored. Korrekte Klasse ist `motion-reduce:animate-none`. Audit: `grep -rn "motion-reduce:animation-none" src/` sollte 0 Treffer haben. Slice 266 Reviewer-Find.

**Eintrag-Vorschlag für `patterns.md`:**

> **Cold-Start Indeterminate Progress Pattern (Slice 266)** — Slim 2px-Top-Bar, fixed-positioned, z-modal, mit shimmer-Animation während kritische Hydration läuft. Hook-Bundle: AuthProvider.loading + profileLoading + useWallet.isLoading + useUserTickets.isLoading, gated by `(!!user && ...)` für logged-out-Skip. Anti-Flicker via 200ms fade-out useEffect mit clearTimeout-cleanup. Component-Isolation: keine Provider-Cascade-Änderung, fixed-positioned, pointer-events-none.

## Empfehlung

REWORK-light: Fix Finding #1 (1 Zeile), Finding #4 (Token-Konsistenz, 1 Zeile), Finding #2 (Spec-Kommentar in Component-File). Finding #3 → post-Deploy-Verify durch Anil. Dann PASS.

**time-spent:** ~22 minutes

---

## Heal-Pass (Slice 266 Wave 2, 2026-04-30)

Inline-Fixes durch Primary-Claude:

- ✅ **Finding #1 (MAJOR):** `motion-reduce:animation-none` durch `motion-reduce:hidden` ersetzt + zusätzliches Static-Fallback `<div className="absolute inset-0 hidden motion-reduce:block bg-gold/40" />` — bei reduced-motion ist Streifen versteckt, statische gold/40 Surface visible. AC-06 jetzt funktional erfüllt.
- ✅ **Finding #4 (MINOR):** `via-[#FFD700]` → `via-gold` Tailwind-Token. Brand-Konsistenz.
- ✅ **Finding #2 (MAJOR Spec-Drift):** Z-Index-Kommentar in TopProgressBar.tsx Z65-67 präzisiert: "z-[60] = z-modal Token: über TopBar (z-30), unter Dialog (z-80) und Toast (z-70)".
- ⏭ **Finding #3 (MINOR DemoBanner-Overlay):** deferred → Anil's post-Deploy-Live-Verify auf bescout.net.
- NIT #5-#8: nicht aufgegriffen (kein Bug, nur Optimization).

**Post-Heal:** tsc clean, 8/8 Tests grün. Verdict updated → **PASS** (mit Finding #3 als post-Deploy-Verify-Item).

**Knowledge-Capture (folgt im LOG-Stage):** errors-frontend.md "Tailwind motion-reduce variant nur auf existierende Animation-Utilities" + patterns.md "Cold-Start Indeterminate Progress Pattern".

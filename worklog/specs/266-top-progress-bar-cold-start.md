# Slice 266 — Top-Progress-Bar Cold-Start UX

**Status:** SPEC · **Größe:** S · **Slice-Type:** UI · **Scope:** CTO · **Datum:** 2026-04-30

---

## 1. Problem Statement

**Anil-Quote (Beta-Day-2 Resume-Anker, post-Slice-264):** *"schon deutlich besser, aber beim kalt start home hat geladen, geld und tickets waren nicht geladen, konnte auch nicht klicken bzw navigieren, musste wieder refreshen, danach ging es"*

**Anil-Quote (Beta-Day-3 heute):** *"das funktioniert noch nich ganz, erst nach refresh kommen budget und rest. können wir nicht einen lade balken anzeigen, damit die user sehen was passiert?"*

**Was kaputt ist:** Cold-Start-Phase (5–15s zwischen Page-Render und vollständig hydratierten kritischen Daten Wallet/Tickets/Profile) hat keinen sichtbaren globalen Fortschritts-Indikator. TopBar-Pills haben zwar Skeleton-Pulse (`TopBar.tsx:158-173`), aber das wirkt isoliert, und User wissen nicht ob die App gerade hängt oder lädt → drücken Refresh, was die Phase neustartet (Smoking-Gun #3 nur teilgefixed in Slice 264).

**Wer ist betroffen:** alle Cold-Start-User, besonders Mobile-Safari (3rd Tester `cloud` iPhone iOS 18.7) wo Connection-Pool-Limit den Effekt verschärft. Beta-3-Tester durchlaufen Cold-Start mehrfach pro Session.

## 2. Lösungs-Design

**WAS:** Slim 2px-Top-Progress-Bar (NProgress-style) am Top des Viewports (über `<TopBar>`, klebrig oben). Sichtbar während kritische Cold-Start-Queries pending sind. Goldene Gradient-Bar mit indeterminate-shimmer-Animation. Fade-out wenn alle drei "kritischen" Sources resolved.

**WARUM:** Wahrnehmungs-Problem (User weiß nicht "passiert was") wird gelöst, ohne Architektur zu touchieren. Funktional-Problem (Click-Queue) bleibt für Slice 267+ offen, aber User hält Geduld statt Refresh zu drücken.

**Datenfluss:**
```
AuthProvider.loading + useWallet.isLoading + useUserTickets.isLoading
  → bündelt in CriticalLoadIndicator-Hook
  → liefert boolean isCriticalLoading
  → TopProgressBar rendert wenn true, sonst null
  → mit ~200ms fade-out delay damit es nicht flackert wenn Queries <100ms resolved sind
```

**Neue Component:**

```tsx
// src/components/layout/TopProgressBar.tsx
'use client';
export function TopProgressBar(): JSX.Element | null
```

**Neue CSS-Animation (globals.css, in `@layer utilities` per Slice 181):**

```css
@keyframes progress-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
.anim-progress-shimmer { animation: progress-shimmer 1.5s ease-in-out infinite; }
```

**Mount-Punkt:** `src/app/(app)/layout.tsx` — gleich nach `<DemoBanner />` und vor `<BackgroundEffects />`. Position: `fixed top-0 inset-x-0 z-[60]` (über TopBar's `z-30`, unter Modals' `z-50`+).

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/components/layout/TopProgressBar.tsx` | NEU | Neue UI-Component, Slim-Bar mit shimmer + fade-out-Logic |
| `src/components/layout/index.ts` | EDIT | Export hinzufügen für Konsistenz mit TopBar/SideNav |
| `src/app/(app)/layout.tsx` | EDIT | Component mounten, eine Zeile nach `<DemoBanner />` |
| `src/app/globals.css` | EDIT | `@keyframes progress-shimmer` + `.anim-progress-shimmer` in `@layer utilities` |
| `messages/de.json` | EDIT | i18n-Key `nav.appLoading` für aria-label "App lädt..." |
| `messages/tr.json` | EDIT | i18n-Key `nav.appLoading` für TR "Uygulama yükleniyor..." |

**Vor diesem Slice greppt man:** keine externen Konsumenten (neue Component, isolated). Nur Mount-Site `(app)/layout.tsx`.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/components/layout/TopBar.tsx:1-50` | Bestehender Skeleton-Pulse-Pattern | Wie wird `balanceCents === null` behandelt? `animate-pulse motion-reduce:animate-none` |
| `src/components/providers/AuthProvider.tsx` (`loading`-Field) | Source-of-Truth Auth-Loading | Welcher State zählt als "loading"? Wann false? |
| `src/lib/hooks/useWallet.ts:102-134` | Wallet-Loading | `isLoading` vs `balanceCents === null` — Differenz? Beide nutzen? |
| `src/lib/queries/tickets.ts:10-17` | Tickets-Loading | `useUserTickets` returnt `isLoading` aus useQuery |
| `src/app/(app)/layout.tsx:82-122` | Mount-Order | Nach DemoBanner, vor BackgroundEffects. Z-Index-Stacking gegen TopBar (z-30) und Modals (z-50) |
| `src/app/globals.css:114-122` | Animation-Pattern (Slice 181) | `@layer utilities` Pflicht damit Tailwind data-state-Variants greifen + Tree-Shake-Sicherheit |
| `.claude/rules/ui-components.md` "States" | Loading-State-Pattern | Skeleton Screens, nicht Spinner. `motion-reduce:animate-none` Pflicht |

**Mindest S = 6 Items, hier 7. ✓**

## 5. Pattern-References

- `decisions.md` D43 (Auth-Hydration-Race) — Kontext warum Cold-Start-Phase überhaupt 5-15s dauert. Diese Slice fixt nicht D43, sondern überbrückt Wahrnehmung.
- `patterns.md` #41 idle-callback — nicht direkt anwenden hier, aber zeigt dass Cold-Start-Phase Mobile-Safari-bottleneck ist
- `workflow.md` Section 3a UI Definition-of-Done — UI-Slice gilt als done erst wenn: ✅ in 1+ Page-Render-Tree importiert · ✅ visual auf bescout.net post-Deploy · ✅ Mobile 393px verifiziert
- `ui-components.md` "States" — Loading: Skeleton Screens, nicht Spinner; `motion-reduce` Pflicht für a11y
- `ui-components.md` "Animations" — `anim-*` in `@layer utilities` (Slice 181 D17)
- `errors-frontend.md` "Tailwind data-* Variants nur auf Tailwind-Utilities" — Animation-Class muss in `@layer utilities` sonst greift Tree-Shake nicht
- `errors-frontend.md` "Missing i18n-Key bei neuer CTA-Component" (Slice 198) — beide Locales bedienen Pflicht; aria-label-Strings auch i18n-pflichtig

## 6. Acceptance Criteria

```
AC-01: [HAPPY] Cold-Start zeigt Progress-Bar
  VERIFY: Hard-Refresh (Cmd+Shift+R) auf bescout.net/ als logged-in-User
  EXPECTED: Slim 2px gold-Gradient-Bar oben sichtbar mit shimmer-Animation,
            verschwindet binnen 1-15s wenn TopBar-Wallet+Tickets-Pills hydrated sind
  FAIL IF: Bar ist nicht sichtbar / bleibt permanent / pop-in/pop-out flackert (>2 toggles in 5s)

AC-02: [WARM-CACHE] Warm-Cache zeigt Bar nicht permanent
  VERIFY: Navigate zwischen /home → /market → /fantasy als logged-in
  EXPECTED: Bar erscheint kurz (<200ms) und verschwindet sofort, ODER erscheint gar nicht
            wenn Cache warm ist (kein Layout-Shift, kein Flackern)
  FAIL IF: Bar bleibt sichtbar bei jedem Page-Wechsel obwohl Daten cached

AC-03: [LOGGED-OUT] Logged-out User sieht keine Bar auf (auth)-Routen
  VERIFY: Logout, dann /signin
  EXPECTED: Bar nicht sichtbar (Component nur in (app)/layout.tsx, nicht (auth)/layout.tsx)
  FAIL IF: Bar erscheint auf Sign-In-Page

AC-04: [MOBILE] iPhone 16 (393px) Layout intakt
  VERIFY: Playwright gegen bescout.net mit viewport 393×852, Cold-Start-Screenshot
  EXPECTED: Bar oben sichtbar, kein Layout-Shift bei TopBar (TopBar-Padding bleibt
            unverändert weil Bar `position: fixed` ist)
  FAIL IF: Bar drückt TopBar nach unten / Bar überlappt Notch-Area / horizontaler Overflow

AC-05: [I18N-DE+TR] aria-label korrekt in beiden Locales
  VERIFY: grep `appLoading` in messages/de.json + messages/tr.json
  EXPECTED: DE "App lädt..." · TR "Uygulama yükleniyor..."
  FAIL IF: Key fehlt / DE-String in TR / Securities-/Glücksspiel-Wording

AC-06: [A11Y] Reduced-Motion respected
  VERIFY: DevTools → Rendering → Emulate "prefers-reduced-motion: reduce", Cold-Start
  EXPECTED: Bar sichtbar, aber Shimmer-Animation paused (statisch sichtbar)
  FAIL IF: Animation läuft trotz reduced-motion / Bar verschwindet komplett (User kriegt
           nichts mehr mit)

AC-07: [DEFINITION-OF-DONE] In 1+ Page-Render-Tree importiert + post-Deploy verifiziert
  VERIFY: grep -rn "TopProgressBar" src/app/ + nach Deploy: Screenshot bescout.net Cold-Start
  EXPECTED: Mount in src/app/(app)/layout.tsx genau 1× · Bar visual sichtbar live
  FAIL IF: nur Component-File geschrieben, nicht gemounted (Build-without-Wire D54)
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Hooks | useUser-loading=false aber user=null (logged-out) | profile/wallet/tickets nie geladen | Bar **NICHT** anzeigen (kein "ewiges Laden") | Hook-Logic: `if (!user) return false` für isCriticalLoading |
| 2 | Hooks | Schneller-Cache <100ms | Alle Queries aus Cache instant resolved | Bar erscheint nicht / nicht sichtbar (kein Flackern) | 200ms minimum-display-time + 200ms fade-out, durch fade-Logic gehandhabt |
| 3 | Hooks | Hängende Query >30s | Wallet hängt im Connection-Pool | Bar bleibt visible aber ändert nichts (User refresht eh) | Kein hard-timeout — Bar reagiert nur auf Query-State |
| 4 | Hooks | Network-Fail | Wallet-Query throws | Bar verschwindet (isLoading=false bei error) | React-Query default: error-state ist nicht loading. ✓ |
| 5 | Mount | (auth) Routes | (signin/signup) | Bar nicht gemounted, weil nur in (app)/layout.tsx | Architektonisch isoliert via Layout-Mount-Punkt |
| 6 | Mount | Page-Wechsel innerhalb (app) | useWallet bleibt cached, ticket-cache warm | Bar bleibt unsichtbar | TanStack-staleTime + isLoading=false bei cached data |
| 7 | A11Y | prefers-reduced-motion: reduce | shimmer disabled | Bar sichtbar, aber statisch | `motion-reduce:animation-none` analog TopBar-Pattern |
| 8 | Z-Index | Modal offen | TopProgressBar z-60, Modal z-50 | Bar bleibt über Modal | Modal-z-Index in BeScout meist 40-50, Bar 60 ist safe |

## 8. Self-Verification Commands

```bash
# Pflicht jeder Slice:
npx tsc --noEmit
npx vitest run

# Slice-spezifisch:
grep -rn "TopProgressBar" src/                    # Konsumenten verifizieren (genau 2: Component-File + Layout-Mount + index.ts)
grep -nE "appLoading" messages/de.json messages/tr.json  # i18n-Key in beiden Locales
grep -n "anim-progress-shimmer" src/app/globals.css      # Animation in @layer utilities
sed -n '82,105p' src/app/(app)/layout.tsx               # Mount-Punkt visuell prüfen
```

**Post-Deploy bescout.net (Anil führt aus, oder Playwright-Script):**
```bash
# Cold-Start-Screenshot auf Mobile-Viewport
QA_BASE_URL=https://bescout.net npx playwright test e2e/qa-cold-start-bar.spec.ts
# (Test-File optional, manueller Screenshot reicht für S-Slice)
```

## 9. Open-Questions

**Pflicht-Klärung:** keine — Anil hat Variante 1 (Slim NProgress-style) explizit gewählt.

**Autonom-Zone (CTO):**
- Component-Naming (`TopProgressBar` vs `CriticalLoadingBar` vs `AppLoadingBar`)
- Ob Hook getrennt extrahieren (`useCriticalLoadIndicator`) oder Logic inline in Component (1 Konsument)
- Z-Index-Wahl (60 vs 40)
- Fade-Timings (200ms-fade-out, 200ms-min-show — Standard-NProgress-Werte)
- Color: BeScout-Gold-Gradient (`from-[#FFE44D] to-[#E6B800]`) konsistent mit Brand

**Nicht-Autonom-Zone:**
- keine i18n-Strings die Compliance-relevant sind (nur "App lädt" — neutral)
- kein Money-Path
- kein Security/RLS

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| UI-Change | Playwright-Screenshot gegen `bescout.net` Cold-Start-State (Mobile 393px) als `worklog/proofs/266-cold-start-mobile.png` |
| TSC | `npx tsc --noEmit` Output als `worklog/proofs/266-tsc.txt` (clean) |
| Definition-of-Done | `grep -c TopProgressBar src/app/(app)/layout.tsx` = 2 (import + JSX) als Teil der proof.txt |

**Proof-Datei:** `worklog/proofs/266-cold-start-mobile.png` + `worklog/proofs/266-verify.txt` (kombinierte tsc + grep-Output).

## 11. Scope-Out

- **Provider-Cascade-Refactor (Slice 266 vorher geplant):** → Slice 267 (echter Architektur-Fix für Smoking-Gun #3). Diese Slice 266 ist **UX-Brücke**, nicht Architektur-Fix.
- **Slice 265 Post-Mortem (REVERTED localStorage-Mirror):** → Slice 268 (separat untersuchen wenn Provider-Cascade-Refactor Slice 267 nicht reicht).
- **Page-spezifische Loading-States innerhalb `<main>`:** → bleibt im jeweiligen Page-Code, hier nicht angefasst.
- **Network-Indicator (Offline-Warning):** → Backlog post-Beta.
- **Wallet/Tickets-spezifische Inline-Indicators:** → bestehender Skeleton-Pulse bleibt unverändert.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped — neue Component, 0 Konsumenten, keine Schema-Änderung) → BUILD → REVIEW (reviewer-Agent — UI ab S Pflicht) → PROVE (Playwright + tsc) → LOG
```

**IMPACT-Skip-Begründung:** Component ist neu, hat 0 Konsumenten außerhalb Mount-Site `(app)/layout.tsx`. Kein DB/RPC/Service. Keine Cross-Domain. Layout-Mount ist additiv (eine Zeile, fixed-positioned, kein bestehender Code geändert).

## 13. Pre-Mortem

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | Bar bleibt permanent sichtbar weil eine Query hängt forever | LOW | mittel | Hängende Queries sind eh user-impacting (separates Problem). Bar verstärkt aber nicht Verschlimmerung — User sieht "lade noch" statt "tot" | Sentry-User-Report "Bar bleibt sichtbar" |
| 2 | Z-Index-Konflikt mit Modal/Overlay/Sheet | LOW | niedrig | Bar `z-60`, Modals `z-50`. Aber Toast-Stack ist auch oben — getestet manuell | Visual-Regression beim ersten Modal-Open |
| 3 | Mobile-Safari Notch-Bereich überlappt Bar | MED | niedrig | Bar `top-0 inset-x-0` plus `pt-[env(safe-area-inset-top)]` falls Anil's iPhone Notch sichtbar zerhackt | Anil's iPhone-Test direkt nach Deploy |
| 4 | Fade-Timer race mit Query-State-Wechsel führt zu Flackern (>2 toggles in 5s) | MED | mittel | 200ms minimum-display-time + 200ms fade-out — Standard-Pattern wie NProgress | Visual-QA: Hard-Refresh in Schleife, Bar darf nicht "blinken" |
| 5 | Slice broke etwas anderes (Slice 265 Lehre!) | MED | hoch | Component ist isoliert, fixed-positioned, kein bestehender Code geändert. Nur 1 zusätzlicher Render im Layout-Tree | Live-Verify gegen bescout.net post-Deploy SOFORT (nicht erst morgen) |
| 6 | Reduced-motion-User sieht statische gold-Bar (kein Shimmer) und denkt App hängt | LOW | niedrig | Statische Bar mit `animate-pulse` Fallback (auch motion-reduce friendly: opacity-fade statt translate) | a11y-User-Test |

---

## Compliance-Check (Pflicht bei Money-Path / User-facing Wording)

- ✅ $SCOUT-Wording-Drift? Keine Strings mit Money-Begriffen.
- ✅ IPO-Begriff user-facing? Nein, Bar zeigt nur "App lädt".
- ✅ TR-Glücksspiel-Vokabel? Neutral "Uygulama yükleniyor".
- ✅ Asset-Klasse-Framing? Nein.
- ✅ Disclaimer? Nicht relevant (kein Money-Context).

## TR-Wording-Vorab

| Key | DE | TR | business.md-Konformität |
|-----|----|----|-------------------------|
| `nav.appLoading` | "App lädt..." | "Uygulama yükleniyor..." | ✓ neutral, kein kazanmak/yatırım/kar |

**Anil-Pflicht-Review** vor Beta-Verify markiert. (Trivial, aber Routine.)

## Open Risiko

Component ist neu + isoliert + fixed-positioned — minimal-blast-radius. Hauptrisiko: Fade-Timing-Flicker (Pre-Mortem #4) oder Notch-Overlap auf Anil's iPhone (#3). Beide visuell sofort sichtbar, schnell heilbar. Slice 265 Lehre angewandt: post-Deploy SOFORT live-verifizieren auf Mobile-Safari.

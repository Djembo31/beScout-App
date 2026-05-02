# Slice 262 Code-Review (post-BUILD)

**Verdict:** PASS (mit 2 P2-Cleanup-Empfehlungen — vor Commit gefixt, siehe unten)
**Time:** ~35 min Review + ~5 min Cleanup

---

## Pre-Review-Findings Resolution

| # | Status | Verifikation |
|---|--------|--------------|
| **F-01** (P0) `useLeagueScope`-Import in useHomeData | ✅ Resolved | `useHomeData.ts:6` Import + `:36` Hook-Call mit `{ leagueId: scopedLeagueId, hydrated: leagueScopeHydrated }` |
| **F-02** (P0) Persist-Cache reicht — kein placeholderData-Wiring | ✅ Resolved | `useEvents()` ohne `placeholderData`-Override, persist-cache (Slice 261) füllt aus localStorage |
| **F-03** (P0) Wrapper + Vignette + GW-Bar in beiden Modi persistent | ✅ Resolved | `HomeStoryHeader.tsx:55-93` — Outer-Div + `bg-hero-vignette` + `<GameweekStatusBar />` IMMER im Tree, Dispatcher nur für Body |
| **F-04** (P1) ManagerBlock adaptiv: Lineup-CTA prominent + Captain hidden bei !hasLineup | ✅ Resolved | `ManagerBlock.tsx:108-130` — Captain-Region in `{hasLineup && (...)}` gewrappt |
| **F-05** (P1) Kein neuer TR-Greeting-Key | ✅ Resolved | nur 5 Keys (gwLabel, lineupSet, lineupCta, captainSet, captainCta), kein greetingPrefix |
| **F-06** (P1) `pickScopedEvent` shared-helper | ✅ Resolved | `helpers.tsx:32-48` Export + `GameweekStatusBar.tsx:27` Import. `pickBarEvent` global = 0 Treffer |
| **F-07** (P1) `getLineupWithPlayers` returnt Object+Array | ✅ Resolved | `Promise<LineupWithPlayers \| null>` mit `{ lineup, players }` — Slice 267 Map-Risk N/A |
| **F-08** (P2) AC-12 als Anil-PROVE | ✅ Resolved | Spec §6 AC-12 explizit: Slow-Motion-Recording (nicht Vitest) |
| **F-09** (P2) Scout-Mode-Regression-Proof | ✅ Resolved | Spec §10 listet `262-scout-393.png` als 2. PROVE-Step |

**Alle 9 Pre-Review-Findings sauber adressiert.**

---

## Findings (post-BUILD)

### P0 — keine

### P1 — keine

### P2 — Code-Hygiene (vor Commit gefixt)

**P2-1 · `HomeStoryHeader.tsx:44-53` — Dead Code im Outer-Dispatcher** ✅ FIXED

Outer-`HomeStoryHeaderInner` hatte 8 ungenutzte Hook/Var-Deklarationen (Copy-Paste-Rückstand vom ScoutHero-Extract): `portfolioTick`, `t`, `tg`, `greetingKey`, `setGreetingKey`, `useEffect(setGreetingKey)`, `pnlPositive`, `PnlIcon`. Hooks liefen DOPPELT bei Scout-Mode-Render. Funktional kein Bug, aber wasted React-Reconcile.

**Fix:** Outer auf Dispatcher-only zurückgebaut, alle State+Hooks nur in `ScoutHero`.

**P2-2 · `ManagerBlock.tsx:34` — Prop `holdingsCount` orphan** ✅ FIXED

Interface deklarierte `holdingsCount: number` aber Body nutzt es nicht (Adaption rein über `!hasLineup`). Spec §2.5 sah es vor, aber implementation-Logik ist mit hasLineup ohnehin äquivalent.

**Fix:** Prop entfernt aus Interface + Page.tsx + HomeStoryHeader-Pass-Through. Slice 263 (kombinierter CTA-Layout) wird ggf. wieder ergänzen.

---

## Compliance (business.md) — OK, keine Issues

- ✅ Kein „investier", „rendite", „dividende", „asset", „profit", „invest" in `ManagerBlock.tsx` oder `messages/{de,tr}.json:442-448`
- ✅ Kein „gewinn*"/„kazan*"-Glücksspiel-Vokabel
- ✅ „Kapitän"/„Kaptan" als Football-Manager-Standard
- ✅ Asset-Klasse-Sprache vermieden — Manager-Hub bleibt im Football-Manager-Register
- ✅ DE+TR i18n-Keys deckungsgleich (5/5)
- ✅ Mobile-First (`min-h-[44px]`)
- ✅ A11y: `aria-hidden="true"` auf dekorative Icons, `prefetch={false}` auf Links

---

## Code-Quality / Patterns

| Check | Status |
|-------|--------|
| Stateless-Component-Pattern (Slice 254) | ✅ |
| Liga/Context-Switch State-Reset (errors-frontend.md) | ✅ |
| Map/Set-typed React-Query-Data (Slice 267) | ✅ N/A |
| `gold-pulse-bg` + `motion-safe:animate-pulse` Combo (Slice 261 Pattern) | ✅ |
| Hooks vor early-returns | ✅ |
| AC-08 / EC-11 defense (captainSlot set, player not resolved) | ✅ |
| Dispatcher-Branch Scout-Branch 0-Diff | ✅ |
| `useLineupWithPlayers` `enabled`-Gate + staleTime | ✅ |

---

## AC-Verification (Spec §6)

| AC | Status |
|----|--------|
| AC-01..09, 13, 14 | ✅ alle codeseitig verifiziert |
| AC-10 (TR-Wording) | ⏳ Anil-Review post-Deploy (E=a vorab approved) |
| AC-11 (Mobile 393px) | ⏳ qa-visual screenshot post-Deploy |
| AC-12 (Liga-Switch Flicker) | ⏳ Anil-Mobile-PROVE Slow-Motion-Recording |

---

## Test-Coverage

51/51 Tests grün:
- ManagerBlock isoliert: 11 Tests (Branches: Lineup±, Captain±, Streak±, Tier±)
- pickScopedEvent isoliert: 8 Tests (filter + sort + edge cases)
- useHomeData: 27 Tests (heroMode-Default-Mock = pickScopedEvent → null, Manager-Branch durch ManagerBlock-Tests substituiert)
- helpers: 5 bestehende + 8 neue
- tsc clean

---

## Pattern-Promotion-Kandidaten

**A. Shared-Helper-Extraction-Pattern (F-06)** — Pflicht-Eintrag in `errors-frontend.md` ODER `memory/patterns.md`:

> Bei 2+ Komponenten/Hooks mit identischer Filter-/Sort-Logic → Shared-Helper-Extract pflicht. Lokale Duplikate driften innerhalb 1-2 Slices auseinander. **Slice 262 case:** `pickBarEvent` (Slice 261, GameweekStatusBar) → `pickScopedEvent` in helpers.tsx, beide Konsumenten Single-Source.

**B. Dispatcher-Pattern für Hero-Mode-Switching (D63)** — Beispiel-Doku in `memory/patterns.md`. Wrapper persistent, nur Body-Inhalt gedispatched. Kein CLS, kein Mount-Flicker bei Mode-Switches.

→ Beide Patterns post-LOG promoten (Knowledge-Flywheel D45).

---

## Anil-PROVE-Vorbereitung (post-Deploy)

Nach Vercel-Deploy auf bescout.net (393px Mobile-Safari):

### 1. Manager-Mode (heroMode='manager')
- Account mit >0 Holdings + Liga mit ACTIVE GW
- Erwartet: GW-Bar oben + ManagerBlock („Spieltag {n}" + 2-Pill-Reihe), Streak-Pill bleibt
- Touch-Test: Lineup-CTA → /fantasy?tab=lineup

### 2. Scout-Mode-Regression (heroMode='scout')
- Liga ohne active GW + >0 Holdings
- Erwartet: IDENTISCH zu Slice 261-pre-Diff (Greeting + Portfolio + Pills + Story)

### 3. CTA-New-Mode (heroMode='cta-new')
- 0 Holdings + Liga ohne active GW
- Erwartet: Scout-Body + 0-Holdings-CTA prominent

### 4. Liga-Switch Flicker-Test (AC-12)
- Slow-Motion-Recording 60fps. Liga A (Manager) → Liga B (Scout). KEIN weißer Block, KEIN Layout-Shift.

### 5. TR-Locale (AC-10)
- Cookie `bescout-locale=tr`. Manager-Mode: „Hafta {n}", „Kadro hazır"/„Kadroyu seç", „Kaptan: {name}"/„Kaptan seç". Anil prüft Wording-Smell.

---

## Summary

Slice 262 = **PASS**. Alle 9 Pre-Review-Findings (3xP0, 4xP1, 2xP2) resolved. 11 ACs codeseitig verifiziert (3 Anil-PROVE-pflichtig post-Deploy). Compliance impeccabel. 51/51 Tests grün. tsc clean. 2 P2-Cleanups vor Commit gefixt.

**Nächster Schritt:** Commit + Deploy → Anil PROVE → LOG.

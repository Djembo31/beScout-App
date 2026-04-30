# Slice 261 Spec-Review (D62 Pre-BUILD)

**Verdict:** REWORK
**Time-spent:** 35 min
**Files-read:** 13
**Reviewer:** reviewer-Agent (Cold-Context)
**Datum:** 2026-05-01

---

## Findings

### P0 (Blocker, BUILD darf NICHT starten)

**P0-1: z-index-Konflikt mit existing TopBar — Spec ist faktisch falsch**
- **Location:** Spec § 2 „Visual" + § 4 Code-Reading + Pre-Mortem #2
- **Issue:** Spec sagt „Bar `sticky top-0 z-30`, unter dem Top-Nav" + „TopNav typisch z-40+". Verifiziert in `src/components/layout/TopBar.tsx:119`: TopBar ist `sticky top-0 z-30` (nicht z-40+). Bar mit `top-0 z-30` würde TopBar überlagern statt darunter sticken.
- **Recommended Fix:**
  - Bar muss entweder (a) **unter** TopBar im DOM gestackt mit `top-[56px] z-20` (Höhe TopBar messen), oder (b) **innerhalb** TopBar als 2. Reihe, oder (c) **non-sticky** mit Page scrollen.
  - `LeagueScopeHeader` ist auch `sticky top-0 z-30`. Spec muss klären wo Bar in Sticky-Hierarchie liegt wenn LeagueScopeHeader später hinzukommt (Phase 2+).

**P0-2: `event.league` Filter-Pattern existiert nicht in DbEvent**
- **Location:** Spec § 2 „Datenfluss (nach)" + § 4 Code-Reading-Item zu useEvents
- **Issue:** Spec sagt: „lokal filtern auf `event.league === leagueName && event.status ∈ states`". `DbEvent` hat KEIN `league`-Feld (verifiziert `src/types/index.ts:701-743`). Spalte ist `league_id?: string | null` (UUID, oft null). FantasyEvent-mapped-type hat `leagueName?` — aber `useEvents()` returnt `DbEvent[]` (nicht mapped). Filter wird zur Laufzeit immer leer → Bar erscheint nie.
- **Recommended Fix:**
  - Filter korrigieren: `events.filter(e => e.league_id === scopedLeagueId)` mit Fallback `if (!e.league_id && e.club_id) { return getClub(e.club_id)?.league_id === scopedLeagueId; }`.
  - **ODER:** `useFantasyEvents()` (mapped FantasyEvent[] mit `leagueName`) statt `useEvents()`.
  - Code-Reading erweitern: `src/features/fantasy/queries/events.ts` plus mapper, klären welcher Hook der richtige Layer ist.

**P0-3: `getTimeUntil()` ist NICHT locale-aware**
- **Location:** Spec § 2 + § 7 Edge-Case #7 + Pre-Mortem #4
- **Issue:** `src/components/home/helpers.tsx:57-64` zeigt: hardcoded `${hours}h ${mins}m`, `${days}d ${hours}h`. Kein `useTranslations`. AC-06 EXPECTED „in 2 Tagen 4 Stunden" + AC-07 „2 gün 4 saat içinde" — beides würde existing Helper NICHT liefern. Liefert „2d 4h" in beiden Locales.
- **Recommended Fix:**
  - (a) Neuer lokalisierter Formatter `formatTimeUntil(iso, locale, t)` mit `t('common.duration.dayShort')` etc.
  - **ODER (b):** ACs angleichen: User sieht „2d 4h" in beiden Locales, FM-Konventionsgemäß akzeptabel (FPL-mobile zeigt auch „2d 4h").
  - Spec-v2 muss explizit wählen + ACs konsistent setzen.

**P0-4: Negative Margins-Konflikt mit HomeStoryHeader**
- **Location:** Spec § 2 „Visual" + § 3 page.tsx-Edit
- **Issue:** `HomeStoryHeader` rendert `relative -mx-4 -mt-4 lg:-mx-6 lg:-mt-6` (HomeStoryHeader.tsx:45) — extends bis Container-Edge. Bar **oberhalb** HomeStoryHeader bricht das `-mt-4` (zieht Hero unter Bar). Plus Parent ist `space-y-8` (page.tsx:114) — Sticky-Element bekommt vorgefertigten Margin → Layout-Shift.
- **Recommended Fix:**
  - **Decision pflicht vor BUILD:** Bar **innerhalb** des HomeStoryHeader-Edge-zu-Edge-Wrappers (saubere Lösung) ODER **außerhalb** mit eigenem `-mx-4 lg:-mx-6` Wrapper + `space-y-*`-Override.

### P1 (Major, fix vor BUILD)

**P1-1: leagueScope.hydrated-Guard erzeugt Cold-Start-Layout-Flash**
- Spec sagt `if (!hydrated) return null`. `hydrated` flippt erst nach `hydrateFromCascade()` (mehrere 100ms). Bar mountet null, dann pop-in → Layout-Shift ohne CLS-Skeleton.
- **Fix:** `if (!hydrated) return <div className="h-[36px] lg:h-[40px] bg-bg-main" />` als Skeleton-Reserve.

**P1-2: AC-09 Liga-Switch-Test ist nicht executable von Home aus**
- Home-Page hat keinen sichtbaren Liga-Selector (LeagueScopeHeader nicht mounted). Tester kann Switch nicht von Home durchführen.
- **Fix:** AC-09 anpassen — Switch auf `/fantasy` ODER `/manager?tab=kader`, dann zurück zu `/`, Bar zeigt neue Liga.

**P1-3: Multi-tab/bfcache-Edge-Cases fehlen**
- Spec Edge-Cases-Liste behandelt nicht: 2-Tab-Drift bei Status-Change (`useEvents.staleTime: 1min`) + Safari pageshow/bfcache-Recovery wie `useGameweek.ts:38-48`.
- **Fix:** Edge-Case #11 multi-tab als bewussten Trade-Off + #12 bfcache-Strategy.

**P1-4: i18n-Pflicht-Audit-Command zu schwach**
- Self-Verification node-e-Snippet prüft 3 hardcoded Keys. TR-Wording-Tabelle § 12 hat 5 Keys → Drift.
- **Fix:** Slice 198+196 Pattern: `grep -oE` über ALL Component-Keys, gegen DE+TR validieren. Plus addToast-Hardcoded-DE-Audit (Slice 196 Track B).

**P1-5: Compliance-Block prüft TR-Wording oberflächlich**
- Spec § 12 Tabelle hat 5 Keys, Self-Verification Command nur 3. DE-Wording „Spieltag" ist eigentlich schon Codebase-Konvention (de.json:69, 252, 3833) — Open-Q #2 redundant.
- **Fix:** Open-Q #2 abhaken via Codebase-Verifikation. TR-Wording-Tabelle vollständig auditen.

**P1-6: Pre-Existing-Code-Drift-Audit fehlt (Slice 200a-Pattern)**
- Spec führt nicht durch: `grep -rn 'starts_at\|ends_at\|gold-pulse-bg' src/components/home/`. Risk: NextEvent-Card + HomeSpotlight rendern bereits GW-Awareness — Bar = 3. GW-Render-Layer auf Home → zu viel? Anil-Decision pflicht.
- **Fix:** Code-Reading erweitern + Anil-Frage „Behalten wir alle 3 Layer oder ersetzt Bar Spotlight-Event-Slot?".

### P2 (Minor, fix während BUILD acceptable)

**P2-1: Touch-Target 44px-Pflicht** — Bar-Höhe 36px Mobile, ui-components.md verlangt min 44x44px. Fix: Höhe auf 44px ODER `py-1.5` Tap-Padding.

**P2-2: Pre-Mortem #5 ist Edge-Case #5 Duplikat** — Echtes Risk wäre besser (z.B. Cache-Pollution durch frequente Liga-Switches).

**P2-3: Feature-Flag fehlt** — `posthog.getFeatureFlag('home-gw-bar')` als Notfall-Off ohne Re-Deploy. Optional.

**P2-4: AC-08 truncate-Verhalten nicht executable** — Pathological case wählen: „2. Bundesliga" + GW100 + „⏰ 5d 23h 59m". Spec definiert: Liga-Name truncated zuerst.

### P3 (Nice-to-have)

- **P3-1:** `<Link prefetch={false}>` für Sticky-Bar (verhindert konstantes Background-Prefetch von /fantasy)
- **P3-2:** `motion-reduce:animate-none` auf gold-pulse-bg
- **P3-3:** `aria-live=polite` für Countdown-Update
- **P3-4:** Spec-Größe S vs. tatsächliche Komplexität (5 Files + 3 Pflicht-Decisions = eher M-Slice)

---

## Strengths

- Slice-254-Pattern korrekt zitiert + verstanden — Stateless-Component-Decision korrekt + AC-09 testet die Klasse
- Cache-Invalidation-Pattern korrekt (root-prefix `['events']`)
- TR-Wording-Vorab-Tabelle (§ 12) Best-Practice
- Compliance-Block explizit MASAK-kazan*-fokussiert
- Pre-Mortem trotz S-Slice (Slice-265-266-Revert-Lehre internalisiert)
- Scope-Out klar + Phase-Plan-aware
- Open-Questions trennen Pflicht vs. Autonom — D62-konform

---

## Verdict-Begründung

**REWORK** weil 4 P0-Findings alle Spec-Faktenfehler sind die im BUILD zu Code-führen-aber-nicht-funktioniert führen würden. Alle 4 P0s sind in 30 min Spec-Update lösbar — D62 spart genau diese Iteration.

**Nicht FAIL** weil Architektur solide ist, Slice-254-Bug-Klasse erkannt+mitigated, Strengths überwiegen, 2-Iterationen-Lösbar.

**Nicht CONCERNS** weil 4 P0s BUILD-blocking sind (Code würde nicht funktionieren as-spec'd).

---

## Recommended Next Step

1. **Anil:** Open-Q #3 entscheiden (TR „Hafta X" approved oder anders). Open-Q #2 abhaken (Codebase-Konvention „Spieltag").
2. **Primary-Claude:** Spec-v2 mit 4 P0-Fixes:
   - P0-1: z-index-Decision (Bar `top-[56px] z-20` unter TopBar ODER innerhalb TopBar)
   - P0-2: Filter via `useFantasyEvents` mapped ODER `e.league_id`-Fallback-Pattern
   - P0-3: Locale-Decision (eigener formatter ODER „2d 4h" akzeptieren)
   - P0-4: Layout-Decision (innerhalb HomeStoryHeader ODER eigener Edge-zu-Edge-Wrapper)
3. **Primary-Claude:** P1-Findings adressieren
4. **Re-Review:** D62 zweiter kurzer Pass (~10 min) auf Spec-v2
5. **Erwartung:** 2 Spec-Iterationen sparen 1 BUILD-Revert + 1 Heal-Slice. D62-ROI bestätigt.

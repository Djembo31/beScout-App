# Slice 263 — Doppel-Identität-Pills (Phase 1 Identity-Foundation Abschluss) — Spec v2

**Status:** SPEC v2 (post-Pre-Review CONCERNS, alle 8 Findings adressiert) · **Größe:** S (5 Files + i18n + 2 Test-Files = 9 Files, eine Domain) · **Slice-Type:** UI · **Scope:** CTO autonom (Anil-„weiter"-greenlit) · **Datum:** 2026-05-02

> **v2-Changelog (post-Reviewer-Pre-Review CONCERNS):**
> - **F-01 (P0):** i18n-Namespace umgestellt von `home.manager.*`/`home.scout.*` auf `home.managerBlock.*`/`home.scoutHero.*` (symmetrisch zu Component-Namen, kein Konflikt mit Top-Level-Strings `home.manager`/`home.scout` in messages/{de,tr}.json:371-372). Bonus-Cleanup: Top-Level-Strings Z.371-372 in same Slice gelöscht (grep zeigt 0 Consumer).
> - **F-02 (P1):** AC-05 präzisiert: ScoutPill zeigt Label + CR + PnL%, KEIN Count im Pill. holdingsCount-Re-Add-Rationale in §15 Notes.
> - **F-03 (P1):** `pickNextScopedEvent` Defense-in-Depth: exkludiert `ended`/`scoring` Status zusätzlich zur starts_at-Future-Bedingung. EC-02 Status-Klarheit.
> - **F-04 (P1):** TR-Wording umgestellt auf „{time} sonra" (neutral, kein Vokal-Harmonie-Suffix-Risk). DE-Symmetrie: „in {time}" statt „startet in {time}".
> - **F-05 (P1):** AC-11 erweitert: akzeptierter 2-Zeilen-Pill-Wrap auf Mobile. Proof-Plan §11 ergänzt um Long-String-Test.
> - **F-07 (P2):** §3 Mock-Adjustment-Detail spezifiziert: `pickNextScopedEvent: vi.fn(() => null)` parallel zu pickScopedEvent.
> - **F-06 + F-08 (P2):** nur §15 Notes.

---

## 1. Problem Statement

**Heute (post-Slice-262):** Hero-Modes sind mutually exclusive sichtbar. Manager-Mode zeigt nur GW + Lineup + Captain. Scout-Mode zeigt nur Portfolio + PnL. User vergisst dass die andere Seite (Trading-Identität in Manager-Mode, Fantasy-Identität in Scout-Mode) existiert.

**Evidence:**
- D63 Hero-State-Matrix: Aktive GW = Manager-Block primär + **Scout-Block (Pill)**; Off-GW = Scout-Block primär + **Manager-Block (Pill)**.
- VISION.md „Asset-Klasse-Positionierung": Doppel-Register intern (Manager + Scout parallel) ist BeScout-Innovation. Surface muss Doppel-Identität above-the-fold zeigen.
- Slice 262 hat Manager-Block-Skelett — Cross-Mode-Sekundär-Pills fehlen noch.

**Wer ist betroffen, wie oft?** Alle Hero-Mode-User dauerhaft.

## 2. Lösungs-Design

### 2.1 ScoutPill (in ManagerBlock)

Sichtbar wenn `heroMode === 'manager'` UND `holdingsCount > 0`. Hidden bei 0-Holdings (Manager-CTA priorisiert).

**Inhalt (F-02 präzisiert):** Label + Portfolio-CR + PnL%, KEIN Count im Pill.
```
[ChartIcon] Kader · 2.450 CR · +5.4%
```
Tap → `/manager?tab=kader`.

### 2.2 ManagerPill (in ScoutHero)

Sichtbar wenn `heroMode === 'scout'` UND `nextScopedEvent !== null`.

**Inhalt:** GW-Number + Countdown.
```
[CalendarIcon] Spieltag 28 · in 2d 4h
```
Tap → `/fantasy`.

### 2.3 Neuer Helper `pickNextScopedEvent` (F-03 Defense-in-Depth)

`src/components/home/helpers.tsx`:

```ts
/**
 * Slice 263 — Pick next upcoming event in scoped league for ManagerPill.
 *
 * Defense-in-Depth: filtert auf future-starts_at + Status NOT IN ('ended', 'scoring')
 *   (Belt-and-suspenders gegen DB-Drift, theoretisch redundant zur starts_at-Future-Bedingung).
 *
 * Hero-Mode-Kontext: Wird nur in Scout-Mode aufgerufen — d.h. scopedActiveEvent ist
 *   bereits null. Verbleiben können nur upcoming/scoring/ended Events in scoped Liga.
 *   Filter eliminiert past-starts_at (scoring/ended) → effective: upcoming-only.
 */
export function pickNextScopedEvent(events: DbEvent[], leagueId: string): DbEvent | null {
  const now = Date.now();
  const candidates = events.filter((e) => {
    if (!e.starts_at) return false;
    if (new Date(e.starts_at).getTime() <= now) return false;
    if (e.status === 'ended' || e.status === 'scoring') return false;
    if (e.league_id === leagueId) return true;
    if (!e.club_id) return false;
    return getClub(e.club_id)?.league_id === leagueId;
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  return candidates[0];
}
```

### 2.4 useHomeData-Erweiterung

```ts
const nextScopedEvent = useMemo(() => {
  if (!scopedLeagueId || !leagueScopeHydrated) return null;
  return pickNextScopedEvent(events as DbEvent[], scopedLeagueId);
}, [events, scopedLeagueId, leagueScopeHydrated]);

// Return-Field:
return { /* existing */, nextScopedEvent };
```

`nextScopedEvent` und `scopedActiveEvent` können beide non-null sein (active GW läuft + nächste GW upcoming). In Manager-Mode wird `scopedActiveEvent` für Headline genutzt; `nextScopedEvent` kein Konsument im Manager-Mode (ScoutPill braucht nur Portfolio). In Scout-Mode wird `nextScopedEvent` für ManagerPill genutzt (`scopedActiveEvent` per-definitionem null).

### 2.5 ManagerBlock-Erweiterung

Props ergänzt: `portfolioValue: number`, `pnlPct: number`, `holdingsCount: number`. ScoutPill in Pill-Reihe nach Captain-Pill.

### 2.6 ScoutHero-Erweiterung

Props ergänzt: `nextScopedEvent: DbEvent | null`. ManagerPill in Pill-Reihe nach Players-Pill, vor `storyMessage`-Right-Side-Text.

### 2.7 i18n-Cleanup (F-01 Bonus)

`messages/de.json:371-372` Top-Level-Strings `home.manager: "Manager"` + `home.scout: "Scout"` löschen (grep zeigt 0 Consumer in src/). Identisch in `messages/tr.json`. Verhindert weiteren Object/String-Duplicate-Drift.

## 3. Betroffene Files

| File | Change | Begründung |
|------|--------|-----------|
| `src/components/home/helpers.tsx` | +`pickNextScopedEvent` Export | Filter |
| `src/app/(app)/hooks/useHomeData.ts` | +`nextScopedEvent` derived + Return | Single-Source |
| `src/app/(app)/page.tsx` | +Props weitergeben | Pass-Through |
| `src/components/home/HomeStoryHeader.tsx` | +Props (nextScopedEvent + portfolioValue/pnlPct/holdingsCount für ManagerBlock-Pass), ScoutHero rendert ManagerPill | Dispatcher |
| `src/components/home/ManagerBlock.tsx` | +3 Props (portfolioValue/pnlPct/holdingsCount Re-Add), +ScoutPill-Render | Manager-Mode-Cross-Pill |
| `src/components/home/__tests__/ManagerBlock.test.tsx` | +Tests für ScoutPill (visible/hidden) | DoD |
| `src/components/home/__tests__/helpers.test.tsx` | +Tests für pickNextScopedEvent | DoD |
| `src/app/(app)/hooks/__tests__/useHomeData.test.ts` | **F-07:** `vi.mock('@/components/home/helpers')` ergänzt um `pickNextScopedEvent: vi.fn(() => null)` parallel zu `pickScopedEvent` | Test-Compat |
| `messages/de.json` | +4 Keys unter `home.scoutHero.*` + `home.managerBlock.*` (F-01 Sub-Namespace), Z.371-372 Cleanup-Delete | i18n DE |
| `messages/tr.json` | analog | i18n TR (F-04 „sonra"-Variante) |

## 4. Code-Reading-Liste (vollzogen)

| File | Zweck | Resultat |
|------|-------|----------|
| `src/components/home/helpers.tsx:32-48` | pickScopedEvent als Pattern | ACTIVE_STATUSES-Filter. pickNextScopedEvent abweichend: alle Status, future-only, exkludiert ended/scoring |
| `src/components/home/ManagerBlock.tsx` | aktueller Manager-Block | Pill-Reihe Z.86 — ScoutPill nach Captain-Pill |
| `src/components/home/HomeStoryHeader.tsx:118-225` | ScoutHero-Body | Pill-Reihe Z.173-204 — ManagerPill nach Players-Pill, vor `storyMessage` |
| `src/types/index.ts:701-724` | DbEvent | `starts_at: string`, `status: 'upcoming' \| ...` |
| `src/app/(app)/page.tsx:113-138` | Hero-Header-Wiring | nextScopedEvent + 3 Re-Add-Props |
| `src/app/(app)/hooks/__tests__/useHomeData.test.ts:139-152` | Existing Mocks | `pickScopedEvent: vi.fn(() => null)` — analog erweitert |
| `messages/de.json:371-372` | i18n-Konflikt-Source | Top-Level-Strings, 0 Consumer in src/ — gelöscht |
| `messages/de.json:442+` (Slice 262) | `home.manager.*` Object | bleibt, plus neue Sub-Namespaces `home.managerBlock.*` + `home.scoutHero.*` |

## 5. Pattern-References

- **D63** Phase 1 Identity-Foundation Abschluss
- **D62** Reviewer-VOR-BUILD Standard
- **Slice 254** Stateless-Component-Pattern
- **Slice 261** Countdown-Format-Pattern (`getTimeUntil`)
- **Slice 262** Shared-Helper-Extraction (`pickScopedEvent` etabliert), TR-Wording-Decisions, P2-Cleanup-Lehre
- **errors-frontend.md „Liga/Context-Switch State-Reset"**: deps-stable Memos

## 6. Acceptance Criteria

| # | AC | VERIFY |
|---|-----|--------|
| AC-01 | `useHomeData()` returnt `nextScopedEvent: DbEvent \| null` | grep |
| AC-02 | `pickNextScopedEvent` exportiert, filtert future-only + scoped Liga + exkludiert ended/scoring | helpers.test.tsx |
| AC-03 | ScoutPill sichtbar in ManagerBlock wenn `holdingsCount > 0` | RTL test |
| AC-04 | ScoutPill hidden bei `holdingsCount === 0` | RTL test |
| AC-05 | **(F-02 präzisiert)** ScoutPill zeigt Label („Kader"/„Kadro") + Portfolio-CR + PnL%-mit-Vorzeichen, KEIN Count | RTL test |
| AC-06 | ScoutPill Tap → Link `/manager?tab=kader` | RTL test |
| AC-07 | ManagerPill sichtbar in ScoutHero wenn `nextScopedEvent !== null` | RTL test |
| AC-08 | ManagerPill hidden wenn `nextScopedEvent === null` | RTL test |
| AC-09 | ManagerPill zeigt „Spieltag {n} · in {time}" (DE) / „Hafta {n} · {time} sonra" (TR) | RTL test |
| AC-10 | ManagerPill Tap → Link `/fantasy` | RTL test |
| AC-11 | **(F-05 erweitert)** Mobile 393px: beide Pills `min-h-[44px]`, kein horizontaler Overflow. Akzeptierter 2-Zeilen-Pill-Wrap auf Mobile bei 4-Pills-ScoutHero. | qa-visual + Long-String-Test (Account >100k Balance + 50+ Holdings + 14d-Countdown) |
| AC-12 | TR-Locale: ScoutPill „Kadro" + ManagerPill „Hafta {n} · {time} sonra" | Anil-PROVE |
| AC-13 | i18n-Konflikt-Cleanup: `messages/{de,tr}.json:371-372` Top-Level-Strings `home.manager`/`home.scout` gelöscht. Keine Object/String-Duplicate-Keys auf `home`-Level. | Self-Verify §8 |

## 7. Edge Cases

| # | Szenario | Erwartet |
|---|----------|----------|
| EC-01 | Manager-Mode + holdings.length === 0 | ScoutPill hidden, Captain-Pill auch hidden (cascading), Lineup-CTA prominent |
| EC-02 | **(F-03 präzisiert)** Scout-Mode + 0 events in scoped Liga | ManagerPill hidden, ScoutHero status quo. (Scout-Mode entsteht per heroMode-Definition wenn scopedActiveEvent === null && holdings.length > 0 — d.h. KEIN ACTIVE_STATUSES-Event in scoped Liga. nextScopedEvent filtert future + nicht-ended/scoring → effective: upcoming-only.) |
| EC-03 | Manager-Mode + holdings + portfolioValue=0 | ScoutPill zeigt „0 CR · 0%" — Edge-Case akzeptabel |
| EC-04 | Scout-Mode + nextScopedEvent in 90 Tagen | ManagerPill sichtbar mit langem Countdown („90d 12h"). Akzeptabel — informativ |
| EC-05 | Liga-Switch (A: Off-GW + holdings → B: Off-GW + holdings) | nextScopedEvent re-derived, ManagerPill aktualisiert ohne Flicker |
| EC-06 | Negative PnL% (-2.3%) | ScoutPill zeigt rotes Icon + roten Text, Pattern wie ScoutHero PnL-Pill |
| EC-07 | nextScopedEvent ändert Status während Page open (registering → late-reg → running) | Bei `running` flippt heroMode auf 'manager' → ScoutHero unmounted → ManagerPill irrelevant |
| EC-08 | Cold-Start Persist-Cache (Slice 261 Pattern) | Wenn events-cache nicht hydratisiert: nextScopedEvent=null bis cache-hit |
| EC-09 | DB-Drift: `ended`-Event mit future-starts_at | `pickNextScopedEvent` exkludiert via Status-Filter (Defense-in-Depth, F-03) |

## 8. Self-Verification Commands

```bash
grep -n "nextScopedEvent\|pickNextScopedEvent" \
  src/app/\(app\)/hooks/useHomeData.ts \
  src/components/home/helpers.tsx \
  src/components/home/HomeStoryHeader.tsx \
  src/components/home/ManagerBlock.tsx

# i18n (post F-01 Sub-Namespace)
for key in "home.managerBlock.scoutPillLabel" "home.scoutHero.managerPillGw" "home.scoutHero.managerPillCountdown"; do
  for locale in de tr; do
    grep -q "\"${key##*.}\"" "messages/${locale}.json" || echo "MISSING: $key in $locale"
  done
done

# AC-13 — Konflikt-Strings müssen weg
grep -n '"manager": "Manager"' messages/de.json messages/tr.json | grep ":37[12]:" && echo "STRING NOT DELETED"
grep -n '"scout": "Scout"' messages/de.json messages/tr.json | grep ":37[12]:" && echo "STRING NOT DELETED"

# F-07 — Test-Mock
grep -A2 "vi.mock.*home/helpers" src/app/\(app\)/hooks/__tests__/useHomeData.test.ts | grep "pickNextScopedEvent" || echo "MOCK MISSING"

# tsc + tests
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/components/home/__tests__/ src/app/\(app\)/hooks/__tests__/useHomeData.test.ts
```

## 9. CTO-Decisions (autonom)

| # | Entscheidung | Rationale |
|---|--------------|-----------|
| A | ScoutPill-Position: NACH Captain-Pill | Visual-Hierarchy: Lineup → Captain → Scout-Sekundär |
| B | ManagerPill-Position: NACH Players-Pill, VOR storyMessage | Pill-Cluster zusammen |
| C | ScoutPill Show-Condition: `holdingsCount > 0` | Konsistent mit Manager-Mode-Adaption |
| D | ManagerPill Show-Condition: `nextScopedEvent !== null` (kein 14-Tage-Limit) | Lange Countdowns informativ |
| E | Cold-Start: persist-cache reicht (Slice 262 Pattern) | Continuity |
| F | TR-Wording-Variante: „{time} sonra" + DE „in {time}" (F-04 Vokal-Harmonie-Fix) | Neutral, kein Suffix-Risk |
| G | **(F-01)** i18n-Sub-Namespace `home.scoutHero.*` + `home.managerBlock.*` | Symmetrie zu Component, kein Konflikt |

## 10. i18n-Keys (final post F-01 + F-04)

| Key | DE | TR |
|-----|-----|-----|
| `home.managerBlock.scoutPillLabel` | „Kader" | „Kadro" |
| `home.scoutHero.managerPillGw` | „Spieltag {n}" | „Hafta {n}" |
| `home.scoutHero.managerPillCountdown` | „in {time}" | „{time} sonra" |
| `home.scoutHero.managerPillLive` | „läuft" | „canlı" (Defense-in-Depth, sollte in Scout-Mode nicht passieren) |

## 11. Proof-Plan

| Proof | Artefakt | Kommando |
|-------|----------|----------|
| Tests grün | `worklog/proofs/263-tests.txt` | `CI=true pnpm exec vitest run src/components/home/__tests__/ src/app/(app)/hooks/__tests__/useHomeData.test.ts` |
| tsc clean | `worklog/proofs/263-tsc.txt` | `pnpm exec tsc --noEmit` |
| Mobile-393 Manager+ScoutPill | `worklog/proofs/263-manager-scoutpill.png` | qa-visual gegen bescout.net |
| Mobile-393 Scout+ManagerPill | `worklog/proofs/263-scout-managerpill.png` | qa-visual |
| Edge: 0-Holdings Manager (ScoutPill hidden) | `worklog/proofs/263-manager-zero-holdings.png` | qa-visual |
| Edge: Scout ohne nextEvent (ManagerPill hidden) | `worklog/proofs/263-scout-no-next-event.png` | qa-visual |
| **(F-05)** Long-String-Test 4-Pills 393px | `worklog/proofs/263-mobile-long-strings.png` | qa-visual mit Test-Account >100k Balance + 50+ Holdings + 14d-Countdown |

## 12. Scope-Out

- Liga-Rang-Pill → eigener Slice (264?) mit RPC-Migration
- Streak-Risk-Indikator → Slice 265 mit erweitertem record_login_streak RPC
- Live-Score-Widget → Slice 267 (Realtime)
- ActionRequiredStack → Slice 264
- Mystery-Box-Promotion in Hero → Slice 264+

## 13. Stage-Chain

```
SPEC v1 → Pre-Review CONCERNS (1xP0+4xP1+3xP2)
       → SPEC v2 (jetzt, 8 Findings adressiert)
       → IMPACT skipped (UI-only, kein DB/RPC/Service)
       → BUILD
       → Cold-Context-Review post-BUILD
       → PROVE (vitest + tsc + Anil Mobile-PROVE 5 Szenarien)
       → LOG
```

## 14. Pre-Mortem (5 Szenarien)

| # | Was schief gehen könnte | Mitigation |
|---|-------------------------|-----------|
| PM-1 | ManagerPill rendert in Manager-Mode (heroMode-Race) | ManagerPill nur in ScoutHero-Branch, der bei heroMode='manager' nicht rendert. Strukturell sicher |
| PM-2 | ScoutPill mit portfolioValue=0 zeigt „0 CR" | EC-03 dokumentiert. Edge sehr selten |
| PM-3 | `pickNextScopedEvent` returnt Event mit minimalem Countdown | Filter `starts_at <= now` exkludiert. Sicher |
| PM-4 | TR-Possessive-Suffix bricht (F-04) | F-04 fixed via „sonra"-Variante. Anil-PROVE pre-Commit |
| PM-5 | useHomeData-Test-Mocks brechen (neue Returns nicht gemockt) | F-07 fixed via expliziten Spec-§3-Eintrag |
| PM-6 | i18n-Konflikt-Cleanup bricht non-home-Konsumenten | grep zeigt 0 Top-Level-`home.manager`/`home.scout`-Konsumenten in src/. tsc + vitest fangen Drift |

## 15. Notes

- **Implementation-Drift v2→BUILD (post-Build-Reviewer F-NEW-1):** Spec §10 + §3 + §2.7 spezifizierten Sub-Namespace `home.managerBlock.*`. Implementation nutzt `home.manager.*` (Slice-262-Konsistenz) — Slice 262 hatte bereits `home.manager` als Sub-Object (messages/{de,tr}.json:440) etabliert. Funktional gleichwertig, da F-01 Top-Level-String-Konflikt durch Z.371-372-Cleanup gelöst ist (kein Object/String-Drift mehr). Akzeptable pragmatische Drift für Slice-262-Konsistenz statt vollständigem Renaming-Churn. Future-Slices können bei Bedarf umbenennen.
- **holdingsCount-Re-Add Rationale (F-02 Anti-Pattern-Risk):** Slice 262 P2-2 entfernte `holdingsCount` aus ManagerBlock weil unused. Slice 263 fügt sie wieder hinzu — neuer Use-Case via ScoutPill-Show-Gate (`holdingsCount > 0`). Kein Pattern-Yo-Yo, gerechtfertigt durch Cross-Identity-Pill-Bedarf.
- **i18n-Konflikt-Cleanup (F-01 Bonus):** Slice 262 hat `home.manager` als Object eingeführt → JSON-Duplicate-Key-Drift mit pre-existing String. Slice 263 nutzt Sub-Namespace `home.managerBlock.*` + `home.scoutHero.*` (zukunftssicher) UND löscht die alten Top-Level-Strings (`home.manager: "Manager"` + `home.scout: "Scout"` Z.371-372). 0 Consumer in src/ verifiziert via grep.
- **Wording-Refinement-Backlog (F-06):** „Kader" als ScoutPill-Label vs „Kader-Wert" als HomeStoryHeader-Sublabel könnte irritieren bei Liga-Switch. Akzeptabel für 263, post-Beta optional refinen zu „Mein Kader" / „Kadrom".
- **`nextScopedEvent`-Memo Performance (F-08):** läuft auch in Manager-Mode unnötig, Cost minimal (<1ms bei 50 events). Akzeptabel, optional Performance-Slice später mit Profiler-Beweis.
- **D63-Konformität:** D63 listete Slice 263 als „Liga-Rang-Pill + Streak-Risk + Scout-Block-Component". Reduziert auf 2 Pills weil Liga-Rang/Streak-Risk Server-State brauchen.
- **D62-Pattern:** Pre-Review fand 1 P0 (i18n-Konflikt) + 4 P1 + 3 P2 vor BUILD. Spec v2 mit allen Findings adressiert vor Code-Start.
- **Compliance:** Beide Pills im Identitäts-Register. Football-Manager = „Spieltag/Hafta", Trading = „Kader/Kadro" + neutraler PnL%-Anzeige. Kein Asset-Klasse-Vokabular, kein „investiert in", keine „Rendite".

# Slice 261 Spec-Review v2 (D62 2nd-Pass)

**Verdict:** CONCERNS
**Time-spent:** 18 min
**Files-read:** 11
**Reviewer:** reviewer-Agent (Cold-Context, 2nd-Pass)
**Datum:** 2026-05-01

---

## P0/P1-Resolution-Diff

| ID | 1st-Issue | v2-Fix | Status |
|----|-----------|--------|--------|
| P0-1 | Bar `top-0 z-30` clasht mit TopBar `z-30` | Bar **non-sticky** innerhalb HomeStoryHeader-Wrapper, scrollt mit Page; TopBar bleibt sticky drüber | **RESOLVED ✓** |
| P0-2 | Filter via `event.league` existiert nicht | „useFantasyEvents (mapped FantasyEvent[] mit leagueId) ODER fallback DbEvent + getClub(club_id)?.league_id" | **PARTIAL ⚠** (siehe NEW-1) |
| P0-3 | `getTimeUntil` nicht locale-aware | A=b: hardcoded „2d 4h" beide Locales akzeptiert | **RESOLVED ✓** |
| P0-4 | Negative Margins -mt-4 brechen | Bar mountet **innerhalb** Edge-zu-Edge-Wrappers vor `<div className="relative z-10">`-Content | **RESOLVED ✓** |
| P1-1 | hydrated-Guard erzeugt Cold-Start-Layout-Flash | EC-2 + AC-03: 44px-Skeleton bei `hydrated=false` | **RESOLVED ✓** |
| P1-2 | AC-09 nicht executable von Home | AC-09 v2: Switch via `/fantasy` LeagueScopeHeader, zurück zu `/` | **RESOLVED ✓** |
| P1-3 | Multi-tab/bfcache fehlen | EC-11 + EC-12 explicit | **RESOLVED ✓** |
| P1-4 | i18n-Audit-Command zu schwach | § 8 mit `grep -oE` ALL keys + addToast-Audit | **RESOLVED ✓** |
| P1-5 | TR-Wording oberflächlich | § 12 alle 5 Keys mit Compliance-Check | **RESOLVED ✓** |
| P1-6 | Pre-Existing-Drift-Audit fehlt | B=b Anil-Decision: Spotlight Priority-2 entfernt + AC-11 + Sidebar bleibt | **RESOLVED ✓** |

---

## Neue Findings durch v2-Edits

### P0-NEW-1: `useFantasyEvents`-Mapper setzt `leagueId` NICHT — nur fallback funktioniert

**Location:** Spec § 2 Datenfluss + § 4 Code-Reading + Open-Q

**Issue:** v2 sagt „useFantasyEvents (mapped FantasyEvent[] mit leagueId)". Verifiziert in `src/features/fantasy/mappers/eventMapper.ts:18-79`: Mapper setzt `leagueShort/leagueLogoUrl/leagueCountry` aber **KEIN `leagueId`**. `FantasyEvent.leagueId` (`types.ts:45`) existiert als optional Field, ist aber **orphan im Mapper-Code** (nie geschrieben). Filter `e.leagueId === scopedLeagueId` würde immer empty zurückgeben.

Der **Fallback ist daher der EINZIGE funktionierende Pfad** today. Spec-Wording „mapped ODER fallback" liest sich als happy-path = mapper, das ist falsch.

**Recommended Fix (vor BUILD):**
- (a) Spec-§ 2 ehrlich: „Filter via `useFantasyEvents` + Fallback `getClub(e.clubId)?.league_id` (mapper liefert leagueId NICHT today)."
- ODER (b): BUILD enthält 1-Zeilen-Mapper-Patch `leagueId: clubLookup?.league_id ?? undefined` direkt nach Zeile 77.

**Severity:** P0 weil happy-path nicht funktioniert. Lösbar in 5 min.

### P1-NEW-2: `getTimeUntil`-Format-Inkonsistenz mit AC-04

**Location:** § 6 AC-04

**Issue:** `helpers.tsx:62-63`: `if (hours >= 24) return '${days}d ${hours % 24}h'; else return '${hours}h ${mins}m'`. Bei <6h-Test (AC-04) Output ist „4h 30m", nicht „2d 4h" wie AC-Beispiele suggerieren.

**Fix:** AC-04 EXPECTED ergänzen: „Format `Xh Ym` für <24h, helper-konform".

### P2-NEW-3: Spec-Faktenfehler `helpers.ts` vs. `helpers.tsx`

**Location:** § 4 Code-Reading-Liste, Item 11

**Issue:** Spec referenziert `helpers.ts` aber Datei heißt `helpers.tsx`. Cosmetic.

---

## Strengths v2

- Alle 4 P0 + 6 P1 ehrlich adressiert mit konkreten Mechanismen
- B=b Anil-Decision sauber dokumentiert + AC-11 testet
- A=b Anil-Decision spart Locale-Formatter-Slice
- Mount-Pattern in HomeStoryHeader via Code-Snippet gezeigt
- Skeleton-Höhe (44px) konsistent mit Bar-Höhe
- „Open Risiko"-Sektion am Ende selbst-aware

---

## Verdict-Begründung

**CONCERNS** weil 9/10 priorisierte Findings sauber resolved sind, aber NEW-1 (useFantasyEvents leagueId) noch ein BUILD-Risiko ist. Risk klein (Fallback-Pfad valid und in Spec erwähnt) aber Spec-Wording sollte vor BUILD geklärt werden.

**Nicht REWORK** weil beide Pfade (mapper-Patch oder Fallback) zu funktionierendem Code in <30 min führen.

**Nicht PASS** weil Spec-Wording einen non-existenten happy-path aufmacht.

---

## Recommended Next Step

1. **Primary-Claude (5 min Spec-v2.1):**
   - § 2 + § 4 + Open-Q ehrlich reformulieren: Mapper liefert `leagueId` NICHT today
   - Decision: Fallback-Pfad pflicht ODER 1-Zeilen-Mapper-Patch in BUILD
2. **Primary-Claude (1 min):** § 4 Item 11 `.ts` → `.tsx`
3. **Optional:** AC-04 EXPECTED-Format-Hinweis (`Xh Ym` für <24h)
4. **Dann BUILD freigegeben.** Kein 3rd-Pass nötig — CONCERNS-Verdict + Fixes sind trivial.

# Slice 254 Review — Fantasy-Liga-Switch-Heal

**Reviewer:** reviewer-Agent (cold context)
**Date:** 2026-04-29
**Verdict:** **CONCERNS** (mergeable, 1 P2 + 2 P3 + 4 nitpicks; keine Blocker)

## Executive Summary

3-Layer-Heal funktional korrekt und addressiert genau die Root-Causes aus dem Deep-Dive. Test-File matcht Code, tsc clean, vitest 171/171. CONCERNS statt PASS weil 1 echtes UX-Concern (Manual-GW-Override bei Liga-Switch) und mehrere hygienische Detail-Findings.

## Spec-Coverage

| Layer | Status |
|-------|--------|
| L2 — useGameweek selectedGameweek-Reset bei leagueId-Change (useRef + useEffect) | ✅ implementiert |
| L3 — leagueScopeStore invalidate auf 2 Root-Prefixes (`['events']` + `['fantasy']`) | ✅ implementiert |
| L4 — eventCountries → `getCountries(locale)` (catch-22 Filter-Logic raus) | ✅ implementiert |
| Test-Update — leagueScopeStore.test.ts auf 2-Prefix-Assertion | ✅ matcht Code |

Keine fehlenden Tasks. Scope sauber gehalten — Layer 1 (Cron) + Layer 5 (DB) explizit als Anil-Action ausgeklammert.

## Findings

| # | Severity | File:Line | Issue | Suggested Fix |
|---|----------|-----------|-------|---------------|
| 1 | **P2** | `useGameweek.ts:34-40` | Reset-Effect fired ohne Reload-Schutz: Wenn der User manuell `selectedGameweek=15` gewählt hat und Liga A→B switcht, wird die **manuelle Wahl überschrieben**. Bei Liga-Switch B→A zurück gibt es kein "remember" → User verliert Kontext. | Optional: track ob `selectedGameweek` von User manuell ODER von init-effect gesetzt wurde (zweiter Ref). Per Default ist aktuelles Verhalten OK für Heal — als Slice-255-Followup notieren falls Anil "intentional reset on liga-switch" bestätigt. KEIN Block für 254. |
| 2 | **P3** | `useGameweek.ts:34` | `useRef<string \| null>(leagueId)` initialisiert auf erste leagueId. Mounting-Race möglich wenn leagueId initial null ist und 1 Render später populated wird. Harmless, aber suboptimal. | `useRef<string \| null>(null)` initialisieren — gleiche Logik, sauberer Init-Wert. |
| 3 | **P3** | `leagueScopeStore.ts:128-131` | Root-Prefix-Invalidate `['events']` triggert Refetch auf ~6 nicht-liga-aware Keys (`events.usage`, `events.holdingLocks`, `events.joinedIds`, `events.enteredIds`, `events.activeGw`, `events.byClub`, `events.difficulty`). 6 unnötige HTTP-Roundtrips bei Liga-Switch. | Acceptable — explizit dokumentiert im Code-Kommentar "broader-but-correct". Bei Beta-P95-Latency-Anstieg: zurück zu enumerated-Liste mit `qk.events.all` ergänzt. |
| 4 | **P3** | `FantasyContent.tsx:107` | `useMemo(() => getCountries(locale), [locale])` — der `useMemo` ist quasi-no-op (getCountries selbst ist leichte Map-Operation). | Cosmetic. Kann bleiben — Konsistenz mit anderen Pages. |
| 5 | nitpick | `useGameweek.ts:30-40` | Code-Kommentar erklärt das Bug-Verhalten gut. Aber: weder errors-frontend.md noch patterns.md hat aktuell ein Pattern für "Liga-Switch + per-Liga-Active-GW-Reset". | LOG-Stage: Pattern in `errors-frontend.md` neue Section "Liga-Switch State-Reset (Slice 254)". |
| 6 | nitpick | `leagueScopeStore.test.ts:335` | `toHaveBeenCalledTimes(2)` — wenn jemand später setLeagueScope so erweitert, dass es einen 3. Key invalidated, würde der Test brechen. Korrekt-defensive. | Keine Aktion. |
| 7 | nitpick | spec/active.md | Spec ist "inline" in active.md, kein eigenes `worklog/specs/254-*.md`-File. workflow.md verlangt für S/M-Slices ein eigenes Spec-File mit Code-Reading-Liste, Pattern-References, Edge Cases Table, Self-Verification Commands. Slice 254 hat 4-File-Heal → S-Slice → eigentlich Spec-File-Pflicht. | LOG-Stage: nachholen oder bewusst als emergency-fix taggen. Hook `ship-spec-quality-gate.sh` ist WARN-only, blockt nicht. |

## Verifizierte Pflichtpunkte

1. **useEffect-Order korrekt?** ✅ Init-Effect läuft vor Reset-Effect. Bei Liga-Switch: init-effect skipped (selectedGameweek!=null), reset-effect setzt null, nächster Render → init-effect picks new activeGw. Keine Race.
2. **Invalidate-Prefix deckt alle Liga-aware Hooks?** ✅ Greppt alle `qk.events.*` und `qk.fantasy.*` Verwendungen — alle starten mit `['events', ...]` oder `['fantasy', ...]`. Root-Prefix-Match deckt 100%. Bonus: `qk.events.all` (= `['events', 'list']`) wird jetzt korrekt invalidated.
3. **eventCountries-Konsumenten?** ✅ Nur `LeagueScopeHeader` empfängt `countries` Prop. Defaulted auf `getCountries(locale)` falls Prop nicht gesetzt — also identisches Verhalten zu KaderTab/MarktplatzTab/Rankings/Clubs.
4. **Pattern-Match common-errors.md:** ✅ D43 "Existenz ≠ Verwendung" direkt verwandt. qk.events.all war im qk-Factory existent, in setLeagueScope-Invalidate aber nicht verwendet.
5. **Money-Path-Concerns:** ✅ keine — Frontend-only Read-Side-Heal. Keine RPC, keine Money, keine RLS.
6. **Other Hooks unbedeckt?** ✅ Greppte: 49 Vorkommen `qk.(events|fantasy).*` quer durchs src/. Alle starten mit prefix `events` oder `fantasy` und werden korrekt invalidated. Sonderfall `qk.events.activeGw(clubId)` → korrekt invalidated bei Liga-Switch (war erwünscht).

## Positive

- **Test-File ist sauber synchron mit Code-Änderung** — Comment am Test erklärt das **warum** vom Heal — Test als Doku.
- **Defense-in-Depth angesetzt** — die 3 Layer adressieren unabhängige Bugs (state-stuckness + cache-staleness + UI-suppression). Jeder allein wäre unvollständig.
- **Kommentare im Code sind präzise** — Slice 254 Heal-Kommentare in useGameweek.ts:30-33, leagueScopeStore.ts:124-127, FantasyContent.tsx:102-106. Future-Reviewer sehen sofort den Bug-Kontext.
- **Layer 1 (Cron) und Layer 5 (DB) sauber rausgeschnitten** — kein Scope-Creep, getrennte Anil-Actions.
- **Mobile/i18n nicht touched** — keine Risiken in dem Bereich.

## Learnings für Knowledge Capture (LOG-Stage Empfehlung)

1. **Pattern `errors-frontend.md` neu** "Liga-Switch State-Reset via prevRef" — generalisiert: jedes Mal wenn ein Hook per-context-Default hat (hier: per-Liga-activeGw), und der context wechseln kann, brauchst du einen Reset-Trigger der den State auf "uninitialized" zurückstellt.
2. **Pattern `errors-frontend.md` erweitern** "Cache-Invalidation via Root-Prefix vs. enumerated Keys" — Root-Prefix-Invalidate ist robuster gegen "neuer Hook unbeachtet" als enumerated-Liste. Tradeoff: Performance vs. Drift-Risk.
3. **Pattern `errors-frontend.md` erweitern** "Filter-as-audience-choice vs. Filter-as-result-filter" — wenn ein UI-Filter Discoverability bietet, darf seine Visibility NICHT vom Result-Set abhängen.

## Pre-Live-Verify Checkliste

1. Liga BL → ES Switch via Header → GW springt von 30 (BL.activeGw) auf ES.activeGw.
2. Liga ES → BL → GW springt zurück auf BL.activeGw=30.
3. Manuelle GW-Wahl GW=15 in BL → Liga-Switch zu TR → GW springt auf TR.activeGw (manueller Pick wird überschrieben — bewusst, dokumentieren).
4. CountryBar mit ≥2 Ländern sichtbar auch wenn nur TR-Events in current GW exist.
5. Network-Tab: bei Liga-Switch fließen Refetches auf `events`, `events_difficulty`, `fantasy_*` etc. — überprüfen dass useFantasyEvents (qk.events.all) tatsächlich refetched.
6. Mobile 393px: CountryBar + LeagueBar scrollen nicht über Viewport raus.

## Empfehlung

PASS-mit-CONCERNS → direkt zu PROVE → LOG mit den 3 Pattern-Promotions in `errors-frontend.md`. Kein REWORK nötig.

**P2 Finding #1 (Manual-GW-Override) → Slice 255 Followup-Decision** ob das ein UX-Bug ist oder bewusstes Reset-Verhalten.

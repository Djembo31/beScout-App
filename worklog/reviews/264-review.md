# Slice 264 Code-Review (post-BUILD)

**Verdict:** PASS
**Time:** ~30 min

---

## Pre-Review-Findings Resolution

| Finding | Status | Evidence |
|---------|--------|----------|
| **P0-1** useHomeData Return locksAtIso + scopedActiveEventStatus Primitives | ✅ | useHomeData.ts:309-311 |
| **P0-2** Mount DIREKT nach HomeStoryHeader, VOR ScoutCardStats | ✅ | page.tsx:147→150→164 |
| **P0-3** TR „içinde" + DE „in" | ✅ | tr.json:455 + de.json:455 |
| **P0-4** EC-09 gw-Default Defense | ✅ | Spec EC-09 |
| **P1-1** URGENT_THRESHOLD_MS shared + GameweekStatusBar refactored | ✅ | helpers:40 + 2 Imports |
| **P1-2** ManagerBlock Lineup-Pill ohne Pulse (Decision J) | ✅ | ManagerBlock:103-114 |
| **P1-3** Captain-Card UX-Compromise dokumentiert | ✅ | Spec §15 Backlog 264c |
| **P1-4** EC-08 status=running + locks_at past → hidden | ✅ | ActionRequiredStack:60 + Test L.111 |
| **P2-1** Card-Style Code-Pattern | ✅ | Component implementiert |
| **P2-2** AC-11 mt-6 entfernt | ✅ | space-y-3 ohne mt |
| **P2-3** TR „SADECE" + DE „NUR" | ✅ | tr.json:460 + de.json:460 |
| **P2-4** Long-String-Test in Proof-Plan | ✅ | Spec §11 |

**Alle 12 Pre-Review-Findings sauber adressiert.**

---

## Findings (post-BUILD)

### P0 / P1 — keine

### P2 (Notes-only, keine Action-Items)

#### P2-1 · Decision K Wording-Differentiator nicht in i18n umgesetzt

GameweekStatusBar zeigt bare Countdown ohne „startet in"-Prefix. Stack zeigt „Spieltag 28 · in {countdown}". Wenn `starts_at === locks_at` (typischer Fall) → User sieht 2 identische Zahlen ohne Wort-Differentiator. Akademisch-Issue, kein Bug.

**Empfehlung:** Anil-PROVE-Phase verifizieren ob `starts_at !== locks_at` auf bescout.net existiert. Wenn ja → Backlog 264d (i18n-Patch). Wenn nein → Decision K Future-Proof.

#### P2-2 · Test-Coverage AC-11/12/13 nicht im RTL-Suite (akzeptabel, etablierter Pattern)

Mobile-Visuals + Mount-Position + TR-Locale via Anil-PROVE. Kein Action-Item.

#### P2-3 · `useMemo` cached Date.now() bei Parent-Re-Render

Akzeptabler Trade-off — Real-time-Tick kommt in Slice 265+. URGENT-6h-Buffer macht stale-Countdown bis nächster useEvents-Refetch unkritisch.

#### P2-4 · `motion-safe:animate-pulse` animiert ganzes Card-Element

Konsistent mit Slice 261 GameweekStatusBar Pattern. Anil-PROVE entscheidet ob Pulse-Effekt OK oder zu flackrig.

---

## Compliance (business.md) — OK

- Asset-Klasse-Sprache vermieden ✅
- Football-Manager-Vokabular „Aufstellung/Kadro/Kapitän/Kaptan" ✅
- Glücksspiel-Vokabel: keine ✅
- i18n-Sub-Namespace home.actionStack.* ohne Konflikte ✅
- TR-Wording native-konform (parallel Slice 263 „içinde"-Pattern) ✅

---

## Code-Quality / Patterns

| Pattern | Status |
|---------|--------|
| Stateless-Component (Slice 254) | ✅ |
| Memo-Wrapping | ✅ |
| Props sind Primitives | ✅ |
| useMemo für countdownMs | ✅ |
| Mobile 393px Touch ≥44px | ✅ min-h-[64px] |
| `cn()`, `transition-colors`, `tabular-nums`, `aria-hidden`/`aria-label` | ✅ |
| `motion-safe:animate-pulse motion-reduce:animate-none` | ✅ |

---

## AC-Verification

15/15 ACs adressiert. 12 Code-verified, 3 Anil-PROVE-pflichtig (AC-11/13 visual + AC-13 TR-Locale).

---

## Was gut war

1. Pre-Review-Pattern 4. Mal in Folge bewährt (12 Findings VOR BUILD, 4 P2-Notes Post-BUILD)
2. Stateless-Component sauber, vi.useFakeTimers für deterministischen Date.now-Test
3. F-06 Shared-Helper-Pattern erweitert (URGENT_THRESHOLD_MS)
4. Decision-Tabelle §9 mit 12 Decisions A-L explizit
5. EC-08 Live-GW-Lock-Defense
6. Decision J ManagerBlock-Pill-Downgrade saubere Doppel-Pulse-Resolution
7. i18n-Sub-Namespace home.actionStack ohne Konflikte
8. Mount-Position exakt nach Spec §2.5

---

## Pattern-Promotion-Kandidaten

1. **D62 Pre-Review-VOR-BUILD bewährt** (4 Slices in Folge): in `memory/decisions.md` als „PROCESS-Pattern bewährt, Default für M+ Slices" markieren
2. **F-06 Shared-Helper-Extraction** (Slice 263 → 264 Decision I): patterns.md Eintrag „Konstanten/Helpers in 2+ Files → helpers.tsx Extract"
3. **Decision-Letter-Tabelle** als Spec-Template-Pflicht-Sektion (workflow.md SPEC-Stage)

---

## Anil-PROVE-Vorbereitung (post-Deploy)

8 Verifizierungen auf bescout.net:
1. AC-11 Mobile-393 URGENT (countdown <6h)
2. AC-11 Mobile-393 Default (countdown >6h)
3. AC-02 Stack hidden (beide Actions erfüllt)
4. AC-12 Position-Check Screenshot
5. AC-15 ManagerBlock Pill ohne Pulse
6. PM-4/P2-4 Long-TR-String
7. P2-1 Decision K Wording-Check (GwBar vs Stack Countdowns)
8. TR-Locale Anil+Deutsch-Türke-Review

---

## Summary

Slice 264 = **PASS**. Alle 12 Pre-Review-Findings adressiert. 76/76 Tests, tsc clean. 4 Post-BUILD-P2-Notes ohne Action-Items. D62-Pattern-Wert demonstriert (4. Slice in Folge).

**Nächster Schritt:** Commit + Deploy → Anil-PROVE → LOG.

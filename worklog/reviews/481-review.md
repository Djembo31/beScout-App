# Slice 481 Review — D-26c Teil 1 (self-review)

**Self-review** (Pattern-Wiederholung des reviewer-bestätigten 477/478-Musters, kein Money, kein DB — analog D-26b/478 self-review). Adversarielle Checks gefahren, nicht nur „sieht aus wie 478".

## Verdikt: PASS

## Geprüft
1. **Kanonisches Muster exakt gespiegelt:** `club_id ? (getClub(club_id)?.name ?? club) : club` = byte-Logik wie `players.ts:211` (dbToPlayer, 477, reviewer-PASS). Alle 3 Surfaces identisch (offers/lineups/compare). ✓
2. **§0 SSOT:** `getClub` (`@/lib/clubs`) ist die EINE Club-Namen-Resolution — kein zweiter Weg erzeugt. Additive Select-Spalte `club_id`, kein neuer Mapper. ✓
3. **Adversarieller Risiko-Check (server-side getClub null):** Das einzige reale Risiko wäre, dass eine Surface server-seitig rendert → getClub-Cache leer → stiller No-op (zeigt weiter Freitext). **Verifiziert: alle Consumer client-gerendert** — `grep src/app/api` für offers-Queries = 0 Treffer; `compare/page.tsx` = `'use client'`; `OffersTab.tsx` (player_club-Consumer) = `'use client'`; lineups via Fantasy-Client-Hooks. → getClub-Cache (ClubProvider) verfügbar, Fix greift. Freitext-Fallback nur Cold-Load vor Cache-ready (S286, akzeptiert wie 477/478). ✓
4. **Kein Backfill** von players.club (S303/Slice-114-Klasse verboten) — nur Render-Resolve. ✓
5. **Freitext-Fallback erhalten:** `?? club` + `club_id ?`-Guard → null-club_id ODER cache-miss = alter Freitext, kein Crash, kein leerer String wo vorher Freitext stand (außer player==null → '' wie bisher). ✓
6. **Tests:** 4 neue AC-Tests (offers + lineups, je FK-Resolve + Freitext-Fallback) decken Edge null/cache-miss. Falle gefangen: `vi.clearAllMocks()` resettet mockTable-Queues NICHT → `resetMocks()` (sonst zog Test 2 die Row von Test 1). ✓
7. **tsc-Falle gefixt:** `getClub` akzeptiert kein `null` → `club_id ?`-Guard (DbPlayer.club_id = string|null). Strikt-getypte Surfaces (lineups Pick, compare DbPlayer) fingen es; offers war loose-typed, trotzdem geguarded für Runtime-Konsistenz. ✓

## Findings
| Sev | Issue | Status |
|-----|-------|--------|
| — | Keine. Mechanische Pattern-Wiederholung, alle Edges getestet, Render-Kontext verifiziert. | — |

## DoD
tsc 0 · vitest 71/71 (4 neu) · grep: alle 3 Files guarded-getClub · DB-Divergenz 294/4556=6,45% bestätigt · Consumer client-verifiziert. Teil 2 (RPC-Surfaces) = Slice 482.

# Slice 309 — Kader L5-Pill aus FormBars ableiten (Player-#3, Option A)

**Slice-Type:** UI
**Größe:** XS (1 File, Pattern-bekannt)
**Datum:** 2026-06-14
**S7-Phase-2 Player-#3** · Anil-Decision: **Option A** (confirmed 2026-06-14, Handoff-Queue)

## 1. Problem-Statement (Evidence)

In `/manager` → „Mein Kader" (KaderTab) zeigt jede Spieler-Zeile gleichzeitig:
- **FormBars** (Z.268 `KaderPlayerRow.tsx`) — letzte 5 GW aus dem Kanon-RPC `rpc_get_recent_player_scores` (frisch, absolute Liga-Window, Slice 274).
- **L5-Circle** (Z.273-274) — `fmtPerfL5(p.perf.l5, …)`, der **gespeicherte Cron-Skalar** `players.perf_l5`.
- Im `performance`-Lens zusätzlich **PerfPills** (Z.79/91) — `L5 {p.perf.l5}` (farbcodiert) + `L15 {p.perf.l15}`.

`perf_l5` wird vom Daily-Cron `cron_recalc_perf` gesetzt und **laggt** gegenüber den Live-Bars (neue/korrigierte GW-Scores landen vor dem nächsten Cron-Lauf in `player_gameweek_scores`). → **Sichtbarer Widerspruch:** Pill sagt z.B. „54", Bars zeigen `[0,65,70,69,62]` (avg 53) — oder schlimmer P3 (UUID `4a52…`): gespeichert `perf_l5=34`, Live-Bars-avg `12.6`. Demo-relevant (P0).

**Live-verifizierte Formel** (`cron_recalc_perf`, gegen Prod gelesen — NICHT aus stale `fantasy.md`-Doc, das fälschlich `/1.5` behauptet; D77):
```
perf_l5 = LEAST(100, ROUND( AVG(score) OVER (last 5 player_gameweek_scores rows ORDER BY gameweek DESC) ))
```
→ **Kein `/1.5`.** Reguläre Starter (P1 54↔avg53.2, P2 66↔66.8, P4 68↔66.6, P6 71↔73.2, P8 63↔62.6) bestätigen `perf_l5 ≈ ROUND(avg(scores))`.

## 2. Lösungs-Design

`derivedL5` einmal in `KaderPlayerRowInner` aus dem `scores`-Prop ableiten (= dieselbe Quelle wie FormBars), auf gleicher Skala wie `perf_l5`:
```ts
const playedScores = (scores ?? []).filter((s): s is number => s != null);
const derivedL5 = playedScores.length > 0
  ? Math.min(100, Math.round(playedScores.reduce((sum, s) => sum + s, 0) / playedScores.length))
  : p.perf.l5; // Fallback: kein Live-Window → gespeicherter Skalar
```
- Spiegelt `LEAST(100, ROUND(AVG(...)))` der Cron-Formel exakt.
- `score=0` (Cameo, non-null) zählt in den Schnitt — konsistent mit Cron (inkludiert 0-Rows) und mit FormBars (rendert 0 als kleinen Balken).
- `null` (DNP) wird gefiltert — konsistent mit FormBars (dashed).

**Beide** L5-Displays auf `derivedL5` (sonst neuer Widerspruch zwischen Circle und PerfPills):
1. L5-Circle (Z.274) → `fmtPerfL5(derivedL5, p.stats.matches)`.
2. PerfPills `l5`-Prop (Z.79/91, beide via gemeinsamer Wert) → `derivedL5`. PerfPills färbt automatisch via `getL5Color(l5)` → Farbe folgt jetzt den Bars.

**Unverändert (bewusst):**
- `L15` (`p.perf.l15`) — 15er-Fenster, kein Widerspruch zu den 5 Bars.
- Circle-Farbe bleibt Position-Tint (`tint`) — nur die Zahl ändert sich.
- **Sort** `'l5'` (`sortItems` Z.66, `b.player.perf.l5 - a.player.perf.l5`) bleibt auf `perf.l5` (Anil tighter-scope) — Code-Kommentar dokumentiert die bewusste Divergenz (Sort = grobe Ordnung; sichtbare Zahlen = der gefixte Widerspruch).

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `src/features/manager/components/kader/KaderPlayerRow.tsx` | `derivedL5` berechnen; an Circle + `PerformanceCols`→`PerfPills` durchreichen. Einzige Datei. |

`kaderHelpers.tsx` (PerfPills) **unverändert** — nimmt `l5` bereits als Prop.

## 4. Code-Reading-Liste (erledigt)

| File | Frage | Befund |
|------|-------|--------|
| `KaderPlayerRow.tsx` | Wo L5 angezeigt? | Circle Z.274 + PerfPills Z.79/91 (nur performance-Lens) |
| `kaderHelpers.tsx` PerfPills | Zeigt L5/L15 + Farbe? | Ja, `L5 {l5}` via `getL5Color(l5)`, `matches===0 → —` |
| `index.tsx` `fmtPerfL5` | Skala/Guard? | `matches===0 → '—'`, sonst `Math.round(l5)` |
| `FormBars.tsx` | Bar-Score-Semantik? | `null`=DNP dashed, `score>=0` played; `score/100` Höhe |
| `fixtures.ts:461` Service | RPC-Window? | 5 absolute Liga-Window-Slots, `null`=DNP, oldest→newest (Slice 274) |
| `cron_recalc_perf` (live) | Exakte perf_l5-Formel? | `LEAST(100, ROUND(AVG(score) last-5-rows DESC))` — **kein /1.5** |

## 5. Pattern-References

- **D77** (Registry/Findings gegen Live-Code verifizieren) — `/1.5`-Annahme via SQL widerlegt.
- **Slice 307** (last-5-Scores Unifikation auf Kanon-RPC `useRecentScores`) — gleiche Daten-Quelle, dieser Slice schließt das Display-Skalar daran an.
- **errors-frontend.md** „Defensive null-strict-equality bei optional-resolved Hook-Daten" (Slice 265) — `scores` kann undefined sein (Loading) → Fallback statt Falsch-Anzeige.

## 6. Acceptance Criteria

1. **AC-1** Reguläre Starter (alle 5 Bars non-null): Pill-Zahl == `ROUND(avg(bars))`, ±0 zu den sichtbaren Balken. VERIFY: Playwright @ bescout.net `/manager` Kader, Circle-Zahl vs Bars manuell.
2. **AC-2** Spieler mit DNP-Lücken (`[0,73,0,73,63]`): derivedL5 = ROUND(avg der non-null) = ROUND((0+73+0+73+63)/5)=42 → **alle 5 zählen** (0 ist played-Cameo). VERIFY: unit-mathematisch im Kommentar belegt + Playwright-Spot-Check.
3. **AC-3** Spieler ohne Live-Window (alle Bars null, aber matches>0): Pill fällt auf `perf.l5` zurück (kein „—" wenn matches>0). VERIFY: Code-Pfad.
4. **AC-4** 0-Match-Junior (matches=0): Pill zeigt weiter „—" (fmtPerfL5-Guard unverändert). VERIFY: `scoreColor.test.ts` bleibt grün.
5. **AC-5** Circle-Zahl == PerfPills-L5-Zahl in derselben Zeile (kein interner Widerspruch). VERIFY: Code (beide aus `derivedL5`).
6. **AC-6** `tsc --noEmit` clean + bestehende KaderPlayerRow/scoreColor-Tests grün.

## 7. Edge Cases

| Case | Verhalten |
|------|-----------|
| `scores` undefined (Loading / Player nicht in Map) | `?? []` → derivedL5 = `perf.l5` Fallback (kein Flash) |
| Alle 5 null (DNP ganzes Window) | Fallback `perf.l5` |
| Cameo `score=0` | zählt in avg (konsistent Cron + Bars) |
| 1 non-null Score | = dieser Score |
| avg > 100 (theoretisch) | `Math.min(100, …)` cappt (wie Cron `LEAST(100,…)`) |
| matches=0 aber scores vorhanden (unmöglich-konsistent) | fmtPerfL5 zeigt „—"; akzeptabel, da widersprüchlicher DB-State |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
npx vitest run src/components/player/__tests__/scoreColor.test.ts
# Post-Deploy: Playwright @ bescout.net /manager Kader → Circle-Zahl vs Bars-Augenschein
grep -n "derivedL5\|perf.l5" src/features/manager/components/kader/KaderPlayerRow.tsx
```

## 10. Proof-Plan

- `tsc --noEmit` clean + scoreColor-Test grün (`.txt`).
- Mathematik-Tabelle (Bars → derivedL5) für 3 Sample-Player aus der Live-SQL.
- Post-Deploy Playwright-Screenshot `/manager` Kader (Circle-Zahl ≈ Bars) — optional, PROVE-Abschluss.

## 11. Scope-Out

- Sort-Reihenfolge (bleibt `perf.l5`, dokumentiert).
- L15-Display (separates Fenster).
- `/market` TransferList/ClubAccordion (nutzen `useRecentScores` ggf. anders — eigener Slice falls dort gleicher Widerspruch).
- DB-Cron-Frequenz / perf_l5-Recompute (Display-Fix, kein DB-Change).
- `fantasy.md` `/1.5`-Doc-Korrektur → separater Doc-Fix-Hinweis im LOG.

## 12. Stage-Chain (geplant)

SPEC → IMPACT (skipped: 1 File, kein Service/RPC/DB, reines Display-Derive) → BUILD → REVIEW (Pflicht: UI-Display-Logic + Money-adjacent Kontext) → PROVE → LOG.

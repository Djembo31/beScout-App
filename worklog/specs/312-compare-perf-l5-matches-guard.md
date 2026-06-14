# Slice 312 — /compare perf_l5/l15 matches-Guard (Player perf_l5=50-Default-Residuum)

**Slice-Type:** UI
**Größe:** XS (1 File)
**Datum:** 2026-06-14
**S7-Phase-2 Player perf_l5=50 (Registry §1.5/Top-#5)** · P2

## 1. Problem-Statement (Evidence)

`players.perf_l5`/`perf_l15` haben DB-Default `50.00 NOT NULL` (Lineup-Salary-Cap-Proxy, intentional). Slice 271 mitigierte das **display-seitig** via `fmtPerfL5`/`getL5ColorWithMatches` (matches=0 → „—"). Sweep (Slice 312) fand: **`/compare` wurde übersehen** — zeigt L5/L15 roh:
1. `compare/page.tsx:222` Such-Dropdown: `L5: {p.perf_l5}` → 0-Match-Junior zeigt „L5: 50".
2. statRows-Tabelle (`:106-107` perf_l5/perf_l15 + generic render `:267-289`): zeigt „50" UND färbt best/worst-Highlight gegen den Phantom-50-Wert.

→ User vergleicht 2 Spieler, einer mit 0 Spielen zeigt „L5 50" als wäre er mittelmäßig-gut (statt „keine Daten").

## 2. Lösungs-Design

`fmtPerfL5(l5, matches)` ist der Kanon-Display-Helper (`@/components/player`). `p.matches` ist auf der Page verfügbar (Z.90/102).
1. **Such-Dropdown Z.222:** `{p.perf_l5}` → `{fmtPerfL5(p.perf_l5, p.matches)}`.
2. **statRows-Tabelle:** perf_l5/perf_l15-Rows mit `guardByMatches: true` markieren. In der Render-Map: bei `guardByMatches && matches===0` → Wert als `null` behandeln (kein best/worst-Vergleich, Anzeige „—").

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `src/app/(app)/compare/page.tsx` | fmtPerfL5 im Dropdown + guardByMatches in statRows |

## 4. Code-Reading-Liste (erledigt)

| Stelle | Befund |
|--------|--------|
| `compare/page.tsx:222` | roh `L5: {p.perf_l5}` |
| `compare/page.tsx:106-107,267-289` | generic statRows render, kein matches-Guard |
| `compare/page.tsx:90,102` | `p.matches` verfügbar (raw DB-row) |
| `index.tsx:40` fmtPerfL5 | `matches===0 → '—'`, sonst `Math.round(l5)` |

## 5. Pattern-References

- **Slice 271** Track B1 (perf_l5=50-Display-Bug + fmtPerfL5/getL5ColorWithMatches). Dieser Slice schließt die übersehene `/compare`-Stelle.
- **errors-frontend.md** „Missing-Spot bei Polish-Sweep" (Audit-Stale-Klasse).

## 6. Acceptance Criteria

1. **AC-1** Such-Dropdown: 0-Match-Spieler zeigt „L5: —" (nicht „50"). VERIFY: grep fmtPerfL5.
2. **AC-2** statRows L5/L15-Row: 0-Match-Spieler zeigt „—", best/worst-Highlight ignoriert den Phantom-Wert. VERIFY: Code + tsc.
3. **AC-3** matches>0: unverändert (zeigt gerundeten Wert). VERIFY: fmtPerfL5-Semantik.
4. **AC-4** Andere statRows (goals/assists/floor/age) unverändert. VERIFY: nur perf_l5/l15 guarded.
5. **AC-5** tsc clean.

## 7. Edge Cases

| Case | Verhalten |
|------|-----------|
| matches=0, perf_l5=50 | „—" (Dropdown + Tabelle) |
| matches>0 | gerundeter Wert (unverändert) |
| beide verglichene Spieler matches=0 | beide „—", kein best/worst |
| ein Spieler matches=0, anderer >0 | nur der >0 bekommt Wert + ggf. best/worst |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
grep -n "fmtPerfL5\|guardByMatches\|perf_l5" src/app/\(app\)/compare/page.tsx
```

## 10. Proof-Plan

- tsc clean + grep zeigt fmtPerfL5 + guardByMatches.
- (Compare hat keinen dedizierten Test; tsc + Code-Review decken.)

## 11. Scope-Out

- DB-Default 50→NULL (riskant für 6 Salary-Cap-RPCs `COALESCE(perf_l5,50)`; bewusst nur Display-Mitigation, Registry-konform).
- Radar-Chart-Achsen (buildPlayerRadarAxes) — separater Konzern (Radar normalisiert ohnehin).

## 12. Stage-Chain (geplant)

SPEC → IMPACT (skipped, 1 File UI-Display) → BUILD → REVIEW (Pflicht, UI) → PROVE → LOG.

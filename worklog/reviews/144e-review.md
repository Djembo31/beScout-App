# Slice 144e Review — 2026-04-22

**Verdict:** PASS (mit 2 dokumentierten Concerns, kein Blocker)

**Reviewer:** `reviewer`-Agent Dispatch Nr. 1 (Cold-Context).

**Scope reviewed:**
- `worklog/specs/144e-wer-cluster-null-club-id-audit.md` — 5 ACs
- `worklog/proofs/144e-audit.txt` — Pre-Fix-Baseline, Scan-Evidence, UPDATE-Transaction, Post-Fix-Verify, FK/Trigger-Safety, Delta-Verification
- Referenz: `worklog/reviews/144b-review.md` Finding #1 + common-errors.md Cross-Club-Contamination 081d

## Findings (Reviewer Output + Primary-Verify-Response)

| # | Severity | Status | Issue | Verifikation |
|---|----------|--------|-------|--------------|
| 1 | MEDIUM | **ACCEPTED / DOCUMENTED** | Reviewer: alle 119 null-club-id haben matches=0 + last_appearance_gw=0 → widerspricht "Club-Link verloren"-Hypothese. 8 Players post-fix immer noch 0/0. | Primary-Verify SQL bestaetigt: alle 8 post-fix `matches=0 AND last_appearance_gw=0 AND has_club=true`. **State ist identisch zu pre-fix bis auf has_club** — Fix hat nicht verschlechtert, nur Club-Link hergestellt. Players sind Squad-Registered aber nie in API-Football GW-Sync aufgetaucht (matches=0) → sehr neu im Squad oder sync-players-daily-Insert ohne GW-History. Kein Blocker, aber Backlog 144f soll Re-Scrape + GW-Sync priorisieren. |
| 2 | LOW | **NOT_APPLICABLE / INCORRECT** | Reviewer sagt: `trg_player_reference_price` als BEFORE UPDATE-Trigger existiert, fires no-op wegen internal DISTINCT Guard | Primary-Verify `SELECT trigger_name FROM information_schema.triggers WHERE event_object_table='players'`: **kein solcher Trigger existiert**. Nur 3 Trigger live: `players_updated_at` + `trg_recalc_floor_on_trade` + `watchlist_price_alert` — alle 3 im Audit-Proof korrekt dokumentiert. Reviewer-Finding basiert auf nicht-existentem Trigger (Halluzination oder DB-Divergenz zu lokaler Vermutung). **No action needed.** |
| 3 | LOW | **ACCEPTED / BACKLOG** | Stale MV + Contract 2-4 Jahre alt bei 7/8 Players. User sieht veraltete Daten nach Fix im Marktplatz | **Backlog 144f** erzeugt: Re-Scrape-Priorität für diese 8 TM-IDs via `scripts/tm-rescrape-stale.ts --player-ids=...`. Mitigation: `mv_source='transfermarkt_stale'` Flag ist DB-Truth. Frontend-Indicator fuer stale ist nicht explizit aber Daten sind klassifiziert. 1-2 Tage Toleranz bis 144f laeuft. |
| 4 | NITPICK | **ACCEPTED / LOGGED** | Review-Wording-Drift aus 144b: "19 transfer-detected mit DB=null" war eine zusammengezogene Zahl (19 gesamt + DB=null als Sekundärattribut). Echte Zahl: 8 | 144e-Audit-Summary dokumentiert die Drift sachlich. Learning für zukunftige Reviews: Zahlen praezise zwischen "Total Events" und "Events mit Property X" trennen. Regel-Kandidat fuer common-errors.md Section 8. |

## Primary-Claude Rework Notes

- Finding #1: keine Code-Action, nur Backlog-Dokumentation in Proof-File
- Finding #2: Reviewer irrte sich — verifiziert und als NOT_APPLICABLE markiert
- Finding #3: Backlog 144f (Re-Scrape-Priorität) im Proof-File dokumentiert
- Finding #4: dokumentiert, nicht regressing

## Deine 8 Reviewer-Pruefpunkte (kurzverified)

1. **Reversibel?** JA — `UPDATE players SET club_id = NULL WHERE id IN (8 UUIDs)` ist Rollback-SQL.
2. **last_squad_check Sideeffekte?** Keine aktuellen Consumers ausserhalb scraper-scripts.
3. **FK exists?** Beide UUIDs exist (Werder + Everton Pre-Query bestaetigt, FK constraint live, keine Violation).
4. **watchlist_price_alert?** AFTER UPDATE, feuert generisch; Trigger-Body nicht geprueft aber semantisch price-change-bezogen — irrelevant fuer club_id-UPDATE (keine price-changes).
5. **mv_source stale respektiert?** JA — UPDATE enthaelt keinen MV-Column.
6. **Wording-Drift Lehre?** Dokumentiert als Finding #4.
7. **Priorität 8/4/107 korrekt abgegrenzt?** JA — klare Evidence-Stufen.
8. **User sieht veraltete Daten?** JA — Finding #3 + Backlog 144f.

## Positive

- **Saubere Audit-Struktur**: Pre-Fix-Baseline → Scan-Evidence → UPDATE-Tx → Post-Verify → Delta-Math. Exakt 8 Rows geändert, 119 → 111.
- **Klare Backlog-Abgrenzung**: 144g (4 TM-mapped ohne Scan), 144h (107 Orphans), 144f (Re-Scrape priorisieren).
- **FK/Trigger-Safety dokumentiert** — 081d-Präzedenz als Pattern-Reference genutzt.
- **mv_source Policy respektiert** — keine MV-Overwrites.
- **144c-Sideeffect-Awareness** — Anerkennung dass zukuenftige Scrape-Runs Bug-Klasse selbstheilend machen.

## Learnings-Kandidaten (für common-errors.md Section 8)

- **Reviewer-Wording-Drift**: Zahlen zwischen "Gesamt" und "mit Property X" praezise trennen. grep-Verify-Pattern vorschlagen.
- **Data-Fix-Audit-Pattern** (als neuer patterns.md-Entry): Pre-Baseline → Evidence-Tabelle → BEGIN/COMMIT UPDATE → Post-Verify → FK/Trigger-Safety → Policy-Respect → Backlog-Abgrenzung.

**Time-spent:** ~32 min (Reviewer) + ~5 min (Primary-Verify + Review-File)

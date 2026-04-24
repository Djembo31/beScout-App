# Slice 187 — DB-Invariant-Cleanup

**Datum:** 2026-04-24
**Scope:** Data-Integrity-State-Cleanup auf Live-Supabase DB (keine Code-Änderungen).
**Auslöser:** 5 pre-existing rote Tests aus Session-Handoff ("Bekannte vorher-bestehende Failures, NICHT Slice-181x-related").

## Baseline (vor Cleanup)

| Invariant | Count | Root-Cause |
|-----------|-------|------------|
| INV-35 Club-Logo Single-Source | 1 | Gençlerbirliği hatte Wikimedia-URL statt api-sports canonical (manuelle Legacy-Import) |
| INV-38 Orphan-Stale-Contracts | 37 | Players mit `contract_end < 12 months ago` aber `mv_source != 'transfermarkt_stale'` — Scraper-Data-Staleness ohne Flag |
| INV-39 Cross-Club-Contamination Ghost-Rows | 5 | Cross-Club-Sync (API-Football) hat Ghost-Rows angelegt (0 Apps) mit `club_id` assigned, obwohl echter Player bei anderem Club existiert |
| INV-40 Same-Club Player-Duplicates | 9 | Subset + superset von INV-39 — includiert Doppelgänger mit unterschiedlichem `contract_end` |
| SM-ORD-04 Expired-open Orders | 158 | Orders aus 2026-03-25 mit `expires_at = 2026-04-24`, Cron `expire_pending_orders` hatte nicht gelaufen |

## Cleanup Queries (via Supabase MCP)

### INV-35 (1 row)

```sql
UPDATE clubs SET logo_url = 'https://media.api-sports.io/football/teams/' || api_football_id || '.png',
  updated_at = now()
WHERE id = 'cb174221-b3da-46a8-98e4-6d448a0973ae' AND api_football_id IS NOT NULL;
```

Result: 1 row (Gençlerbirliği S.K. → `.../football/teams/997.png`).

### INV-38 (37 rows)

```sql
UPDATE players SET mv_source = 'transfermarkt_stale', updated_at = now()
WHERE contract_end < (CURRENT_DATE - INTERVAL '12 months')
  AND mv_source != 'transfermarkt_stale';
```

Result: 37 rows geflagged als `transfermarkt_stale` — diese Spieler haben vertragsende in der Vergangenheit und sind nicht mehr valid signiert. Flag verhindert Trading-UI-Anzeige als "aktiv".

### INV-39 + INV-40 (9 rows — superset fix)

```sql
UPDATE players p
SET club_id = NULL, updated_at = now()
WHERE p.club_id IS NOT NULL
  AND p.last_appearance_gw = 0
  AND EXISTS (
    SELECT 1 FROM players q
    WHERE q.id != p.id
      AND q.club_id = p.club_id
      AND lower(trim(q.first_name)) = lower(trim(p.first_name))
      AND lower(trim(q.last_name)) = lower(trim(p.last_name))
      AND q.last_appearance_gw > 0
  );
```

Result: 9 Ghosts orphaned (`club_id = NULL`). Keine DELETE — Reversibilität + FK-Integrität (holdings/orders könnten auf Ghost-Row verweisen).

Betroffene Players (Ghosts):
- Mio Backhaus (Bundesliga-Club)
- Yukinari Sugawara
- Jake O'Brien (Apostrophe-Name)
- Amos Pieper
- Niklas Stark
- Olivier Deman
- Mick Schmetgens
- Maximilian Wöber
- Tyrhys Dolan

### SM-ORD-04 (158 orders)

```sql
SELECT public.expire_pending_orders();
-- Returns: 158
```

Nicht raw UPDATE — sondern RPC-Call, damit:
- Sell-Orders: status='cancelled'
- Buy-Orders: status='cancelled' + `wallets.locked_balance` Release + `transactions`-Log (type='order_cancel') + `recalc_floor_price`-Call

**Money-Integrity:** Escrow-Funds wurden korrekt an User zurückgegeben. 158 orders cancelled, alle Locks released.

## Verification

### Post-Cleanup Counts (via Supabase MCP)

| Invariant | Violations |
|-----------|------------|
| INV-35 | 0 ✓ |
| INV-38 | 0 ✓ |
| INV-39 | 0 ✓ |
| INV-40 | 0 ✓ |
| SM-ORD-04 | 0 ✓ |

### Vitest

```
npx vitest run src/lib/__tests__/db-invariants.test.ts src/lib/__tests__/state-machines/order-lifecycle.test.ts

Test Files  2 passed (2)
Tests       44 passed (44)
Duration    24.01s
```

## Impact

### Code
Keine. 0 Files changed.

### DB-State
- 1 club logo_url updated
- 37 player rows mv_source='transfermarkt_stale'
- 9 player rows club_id=NULL
- 158 order rows status='cancelled' + related wallet/transaction rows

### Functional UX
- Gençlerbirliği Club-Logo: zeigt jetzt canonical api-sports Logo (statt Wikimedia-SVG)
- Stale Players: nicht mehr als "aktiv" in Marktplatz/Trading-UI sichtbar
- Ghost Players: kein falscher Cross-Club-Claim mehr (Players ohne aktiven Club bis re-assigned durch sync)
- Expired Orders: User haben locked_balance released → können wieder buyen
- Floor Prices: recalced für 158 betroffene Player-IDs

## Open Follow-Ups (non-blocker)

- **Cron `expire_pending_orders` Monitoring:** 158 stale open orders deuten auf verpassten Cron-Run (wahrscheinlich während Vercel-Hobby-Tier-Freeze zwischen 15:41 UTC und Deploy-Fix heute). Prüfen ob `vercel.json` `expire_pending_orders`-Cron konfiguriert ist.
- **INV-35 Regression-Guard:** Logo-Upload via Admin-UI sollte on-save gegen `media.api-sports.io` regex-validiert werden. Aktuell kann manueller URL-Upload das Invariant wieder brechen.
- **Sync-Players-Daily Ghost-Prevention:** Die 9 Ghost-Rows sind durch `sync-players-daily` Cross-Club-Contamination entstanden (siehe `errors-scraper.md` Slice 081d). Ghost-Prevention bereits als INV-39 live, aber neue Ghosts können bei jedem Sync wieder auftreten. Alerts-Pattern empfohlen.

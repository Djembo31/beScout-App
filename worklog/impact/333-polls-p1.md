# Impact — Slice 333 (Polls P1)

## Geänderte DB-Objekte → Consumer

### `community_polls` + `source`-Column (NEU)
- `src/types/index.ts` `DbCommunityPoll` → `source: 'club'|'user'` ergänzen. `getCommunityPolls`-Cast erbt.
- `src/lib/services/communityPolls.ts` `getCommunityPolls` (`select('*')` → bekommt source automatisch). `CommunityPollWithCreator` erbt.
- `src/components/community/CommunityPollCard.tsx` — kann `source` zum „Offiziell vom Verein"-Badge nutzen (optional, additive).
- DEFAULT 'user' NOT NULL → bestehende Rows (falls vorhanden) sauber. Kein Backfill nötig.

### `cast_community_poll_vote` (Geld-Branch)
- Consumer: `castCommunityPollVote` (`communityPolls.ts`) — **Signatur unverändert** (gleiche Params/Return), nur interne Routing-Logik. Kein Service-Edit nötig.
- Branch keyt auf `v_poll.source` (jetzt verfügbar via `SELECT *`). `source='club'` → `book_club_treasury(club_id,'credit','poll_revenue',share,...)`; sonst Wallet wie heute.
- Regression-Risiko: User-Poll-Pfad muss **byte-identisch** bleiben (AC-11).

### `club_treasury_ledger_type_check` + `poll_revenue` (additiv)
- `src/components/admin/AdminWithdrawalTab.tsx:13-15` `KNOWN_LEDGER_TYPES`-Set → `'poll_revenue'` ergänzen, sonst zeigt Kontoauszug rohen String (`ledgerTypeLabel` fällt auf raw `type` zurück).
- `messages/{de,tr}.json` `ledgerType.poll_revenue`-Key → sonst Missing-Key.
- Bestehende Rows bleiben gültig (rein additive CHECK-Erweiterung). Slice 330/332-Falle vermieden: CHECK-Sync IN derselben Migration VOR dem ersten Write.

### `get_club_balance` (Breakdown)
- Consumer: `getClubBalance` (`club.ts`) → `ClubBalance`-Type. `available` ist **bereits korrekt** (ledger_net summiert ALLE credits). Nur `total_earned`-Breakdown + neues `poll_revenue`-Feld ergänzen → `ClubBalance`-Type optionales Feld.
- `AdminWithdrawalTab` zeigt `trade_fees`/`csf_paid` — `poll_revenue` optional anzeigbar (nicht zwingend).

## NEU (keine Consumer)
- `create_community_poll`-RPC (neu) → `createCommunityPoll`-Service (neu) → `CreatePollModal` (neu) → 2 Einstiegspunkte (`CommunityFeedTab` User-Pfad + Club-Admin `votes`-Tab `source='club'`).

## Side-Effects
- **RLS:** `community_polls` Insert läuft über SECURITY-DEFINER-RPC (kein direkter Client-Insert) → keine neue INSERT-Policy nötig. SELECT-Policy existiert (Lesen geht heute).
- **Caching:** nach Create → `invalidateQueries` auf Poll-Liste (Feed). Kein staleTime:0.
- **Realtime:** nicht erforderlich (Create ist nicht live-kritisch).
- **Grants (AR-44):** beide RPCs (`create_community_poll` NEU, `cast_community_poll_vote` REPLACE) → REVOKE PUBLIC/anon + GRANT authenticated.

## Migration-Plan
Eine Migration `2026..._slice_333_polls_create_treasury.sql`:
1. `ALTER TABLE community_polls ADD COLUMN source ...`
2. `ALTER ... club_treasury_ledger_type_check` (+ poll_revenue) — **vor** cast-Branch
3. `CREATE OR REPLACE create_community_poll` (+ REVOKE/GRANT)
4. `CREATE OR REPLACE cast_community_poll_vote` (Branch, + REVOKE/GRANT)
5. `CREATE OR REPLACE get_club_balance` (+ poll_revenue, + REVOKE/GRANT)
Apply via `mcp__supabase__apply_migration` (NIE `db push`). Force-Rollback-Smoke club-Vote.

## Rückwärts-Kompatibilität
- `castCommunityPollVote`/`getCommunityPolls`/`getClubBalance` Service-Signaturen unverändert.
- `cast_community_poll_vote` Param-Signatur unverändert (kein DROP nötig, CREATE OR REPLACE).
- `create_community_poll` neu → keine Altlast.

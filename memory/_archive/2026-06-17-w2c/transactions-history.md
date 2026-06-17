# Transactions History — B3 E2E (2026-04-08)

> Verdichtet aus Session-Handoff + Lessons Learned B3. AutoDream Output.

## Was wurde gebaut

B3 Transactions History E2E — 6 Commits, QA live als jarvis-qa verifiziert.

| Commit | Inhalt |
|--------|--------|
| 9264bb2 | feat(db): transactions public RLS + type SSOT (B3 Wave 1) |
| 402324f | refactor(profile): wire transaction query hooks + prefix invalidation (B3 Wave 2) |
| 615ad30 | feat(timeline): fantasy ranking + SSOT types + deep link (B3 Wave 3) |
| e10e414 | feat(transactions): dedicated history page with csv export (B3 Wave 4) |
| c7af525 | feat(transactions): wildcards hook + consistency cleanup (B3 Wave 5) |
| d28f843 | fix(profile): deep link initial tab via lazy useState init |

## Key Files

```
src/lib/transactionTypes.ts                              ← SSOT fuer alle credit tx types
src/components/profile/TimelineTab.tsx                   ← Timeline mit fantasy ranking rows
src/components/profile/hooks/useProfileData.ts           ← React Query migration + lazy init
src/lib/queries/invalidation.ts                          ← Prefix invalidation (nicht byUser(uid,10))
src/app/(app)/transactions/page.tsx                      ← Dedizierte /transactions Route
src/components/transactions/TransactionsPageContent.tsx  ← Full history (~400 LoC)
src/lib/exportTransactions.ts                            ← Client-side CSV (UTF-8 BOM fuer Excel TR)
src/lib/nav.ts                                           ← SideNav "Transaktionen" Entry
supabase/migrations/20260408190000_transactions_public_rls.sql
messages/{de,tr}.json                                    ← 12 activity.* + 17 transactions.* keys
docs/plans/2026-04-08-transactions-history-spec.md       ← Full Spec mit 5 Waves
```

## Datenmodell — 4 Tx Tables

| Tabelle | Inhalt | RLS |
|---------|--------|-----|
| `transactions` | Credit-Transaktionen (trading, rewards, fantasy, research) | owner-all + public-whitelist |
| `ticket_transactions` | Ticket Kaeufe/-Ausgaben | owner-only |
| `wildcard_transactions` | Wildcard-Nutzung | owner-only |
| `pbt_transactions` | PBT-Bewegungen | owner-only |

Timeline in ProfileView kombiniert alle 4 via `useProfileData` + Query Hooks.

## SSOT Pattern (`src/lib/transactionTypes.ts`)

```typescript
ALL_CREDIT_TX_TYPES   // komplette Liste aller DB types (14+)
PUBLIC_TX_TYPES       // Whitelist fuer Cross-User-Read (RLS spiegelt diese Liste)
FILTER_TYPE_MAP       // Filter groups: trades | fantasy | research | rewards
```

RLS Policy `transactions_select_public_types` MUSS `PUBLIC_TX_TYPES` spiegeln.
DB comment in Migration linkt auf SSOT-Datei.

## RLS Policy Pattern (aus B2 wiederholt, jetzt etabliert)

Tabellen mit Cross-User-Read (Feed/Social/Profile-Timeline) brauchen Policy-Split:
```sql
-- Policy 1: Owner liest alles
CREATE POLICY "transactions_select_own" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Public liest nur whitelisted types
CREATE POLICY "transactions_select_public_types" ON transactions
  FOR SELECT USING (type = ANY(ARRAY['trade_buy','trade_sell',...]));
```

Exakt identisches Pattern wie `activity_log` aus B2. IMMER beide Policies erstellen.

## Fantasy Ranking Integration (TimelineTab)

Discriminated union `TimelineRow`:
```typescript
type TimelineRow =
  | { kind: 'credit'; data: CreditTransaction }
  | { kind: 'ticket'; data: TicketTransaction }
  | { kind: 'fantasy'; data: FantasyEntry }
```

Fantasy rows: rank badge (1.=gold/2.=silber/3.=bronze), gameweek, score, reward.
Dedup via `event_id` (ein Eintrag pro Event, nicht pro Scoring-Lauf).

## Dedizierte /transactions Page

`src/app/(app)/transactions/page.tsx` — auth-guarded, importiert `TransactionsPageContent`.

Features:
- Date Range Picker (7T / 30T / 90T / Custom)
- Filter Chips (All / Trades / Fantasy / Research / Rewards)
- Search (ueber type + description)
- Aggregations (Total In / Total Out / Net)
- Load More Pagination
- CSV Export (client-side, UTF-8 BOM fuer Excel-Kompatibilitaet TR)

SideNav Entry: "Transaktionen" mit Receipt icon in `NAV_MORE` (nav.ts).

## React Query Migration (useProfileData)

Transactions + TicketTransactions auf dedizierte Query Hooks migriert.
Rest bleibt `Promise.allSettled`. Hybrides Pattern.

Invalidation fix: war hardcoded `(uid, 10)`, jetzt prefix `['transactions', userId]` mit `exact: false`.

## Bugs gefunden + gefixt

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Public Timeline komplett leer | `transactions` RLS: `auth.uid() = user_id` only | Policy Split (9264bb2) |
| "Trades" Filter verpasst 90% der Trade-Rows | Code kannte nur `['buy','sell','ipo_buy']`, DB hat `trade_buy`/`trade_sell` | SSOT FILTER_TYPE_MAP (9264bb2) |
| Streak/Tier Types fehlten im Code | DB: `streak_reward`, Code: `streak_bonus` | Typ-Drift behoben via SSOT (9264bb2) |
| Deep Link `?tab=timeline` landete auf Default | useState init war `'manager'`, Effect-Setzung zu spaet | Lazy useState init (d28f843) |
| Profile zeigt stale Daten nach Trade | Invalidation `(uid, 10)` vs. `limit: 50` im Query | Prefix Invalidation (402324f) |

## Lessons Learned (promoted zu errors.md)

1. **SW Re-Registration waehrend QA** — Unregister allein reicht nicht, Caches muessen auch geleert werden. Wenn SW neu registriert nach navigate → Playbook wiederholen.
2. **Lazy useState Init fuer URL-derived State** — `useState(() => isValidTab(p) ? p : 'default')` statt Effect-Setzung. Effect = Flash + Race.
3. **DB/Code Type Drift** — Vor Feature-Bau: `SELECT DISTINCT type, COUNT(*) FROM transactions GROUP BY type`. Wenn DB-Types nicht im Code — Drift beheben vor Implementation.
4. **Feed/Social Tables MUSSEN Cross-User Read Policy haben** — Zweiter Fall (B2 activity_log, B3 transactions). Pattern etabliert.
5. **React Query Hybrid Pattern** — Wenn `Promise.allSettled` + Query Hooks gemischt: Test-Mocks mocken Query Hooks direkt, nicht Services darunter.

## Verwandtes Wissen

- B2 RLS Feed Pattern: `memory/semantisch/projekt/following-feed.md`
- Error Patterns: `memory/errors.md` (Service Worker, Lazy Init, Type Drift, Feed RLS Sektionen)
- Profile Architecture: `.claude/rules/profile.md`
- SSOT Datei: `src/lib/transactionTypes.ts`

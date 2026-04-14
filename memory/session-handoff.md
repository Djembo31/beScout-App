# Session Handoff (2026-04-14 — Mega-Session J3+J4 Schnellbahn + J5 Audit)

## Quick-Start für nächste Session

**SOFORT DRAN:** J5 Mystery Box hat **2 LIVE-BROKEN CRITICAL** Bugs aus Audit — Anil's erste Entscheidung.

### Must-Read (in Reihenfolge)
1. `memory/operation-beta-ready.md` — SSOT (schon aktuell)
2. `memory/journey-5-ceo-approvals-needed.md` — 8 pending Approvals (AR-42..49)
3. `memory/journey-5-findings-aggregate.md` — 35 Findings Detail

### AKUT in J5 (Live-Broken — Equipment seit 6 Tagen tot!)
- **AR-42** `open_mystery_box_v2` RPC INSERTet in `user_equipment (equipment_rank, ...)` aber DB-Column heisst `rank`. → Jeder Equipment-Drop crasht seit 2026-04-08. Live-Beweis: `newest_box_eq: 2026-04-08`, danach 0 Equipment-Drops.
- **AR-46** Legacy `rarity='uncommon'` live in 3 User-Inventory-Rows. `MysteryBoxRarity` Type hat 'uncommon' NICHT → `RARITY_CONFIG['uncommon']` = undefined → TypeError auf 3 User-Inventories.

---

## Was in dieser Session passiert ist

### Phase A: Cleanup + Git
- 8 Worktrees aus J3/J4 entfernt
- 7 Commits gepusht zu origin/main

### Phase B: AKUT P0 (2 Items)
- **AR-27+40 Security** (`55f908b`) — LIVE-Exploit geschlossen: earn_wildcards/spend/get_balance/refund/admin_grant alle mit auth.uid()-Guard + REVOKE anon + admin_grant mit top_role-Check auf auth.uid() statt p_admin_id
- **AR-26+34 Cron Multi-League** (`025205b`) — activeLeagues-Loop statt getLeagueId() single env, 114 Clubs in 6 Ligen werden jetzt gescored

### Phase C: J3 Schnellbahn (ALLE 15 AR-Items durch!)
- **AR-11+23** BuyOrder + LimitOrder aus Beta entfernt (`c4209ee`)
- **AR-12+18+19+21+28+29** RPC-Migrations Schnellbahn (`f6dca0e`): 12 RPC-Bodies snapshotted, Circular-Guard >=2, 1-SC-Limit weg, price-cap kein 100k-Fallback, pgs_count Guard
- **AR-13+14+20** Data+RLS (`7b34fb4`): 177 IPOs reconstructed (Supply-Invariant gruen!), transactions own-only, trades FK ON DELETE SET NULL
- **AR-24+30** Column-Level RLS Whitelist (`e068f98`): trades buy_order_id/sell_order_id hidden, lineups reward_amount/slot_*/equipment_map hidden
- **AR-15** rewardsIntro + introPortfolioDesc Investment-Signale raus (`1ed5527`)
- **AR-16+39** "Spieler kaufen" + "Manager:gewinne" Compliance-Wording (`6d7189e`)

### Phase D: J4 Schnellbahn (ALLE 16 AR-Items durch!)
- **AR-31+38** PAID_FANTASY_ENABLED Flag + Creator-Fee entfernt (`0222369`)
- **AR-32** Gluecksspiel-Vokabel-Sweep (`6822ec8`): 12 DE + 8 TR Keys
- **AR-33** FantasyDisclaimer Component + 7 Integrationen (`5b81764`)
- **AR-36** Post-Event CTA neutralisiert (`e996e3a`)
- **AR-17+41** business.md Kapitalmarkt-Glossar + Fantasy-Services Architektur-Note (`de44465`)

### Phase E: J5 Mystery Box Audit (35 Findings)
- 3 parallele Audits: FE 12 + BE 13 + Business 10
- 2 LIVE-BROKEN CRITICAL (AR-42, AR-46)
- 8 CEO-Approvals (AR-42..49) pending
- Files: `memory/journey-5-*.md`

---

## Migrations Live (11 via mcp__supabase__apply_migration)

| Migration | Purpose | Status |
|-----------|---------|--------|
| `ar27_security_wildcard_rpcs_guards` | Security Exploit fix | Live-verified |
| `ar18_circular_guard_threshold` | >=2 statt >0 | OK |
| `ar19_remove_1sc_limit` | Bulk-Buys 1..300 | OK |
| `ar21_price_cap_no_fallback` | Kein 100k Fallback | OK |
| `ar29_pgs_count_guard` | Phantom-scores fix | OK |
| `ar14_rls_transactions_lockdown` | Privacy | OK |
| `ar13_backfill_phantom_scs` | 177 IPOs reconstructed | Supply-Invariant grün |
| `ar20_trades_orphan_ipo_backfill` | ON DELETE SET NULL | OK |
| `ar24_trades_rls_column_whitelist` | Order-ID hide | OK |
| `ar30_lineups_rls_column_whitelist` | Reward+Lineup hide | OK |
| `ar12_28_backfill_offer_liquidation_fantasy_rpcs` | 12 RPCs snapshotted | DR-Table |

---

## Gesamt-Status Operation Beta Ready

| Phase | Status | Details |
|-------|--------|---------|
| 0 Inventory | done | feature-map.md + service-map.md |
| 1 Pre-Launch | done | 1.1+1.3+1.4+1.5 done, 1.2 deferred |
| 2 J1-J5 | in-progress | **J1-J4 ALLE AR-Items durch, J5 Audit done + 8 AR pending** |
| 2 J6-J12 | pending | 7 Journeys pending |
| 3 Cross-Cutting | pending | - |
| 4 Beta-Gate | pending | Definition pending |
| 5 Launch | blocked | durch 4 |

**J-Summary:**
| J# | Name | Findings | Autonom | CEO |
|----|------|----------|---------|-----|
| J1 | Onboarding | 23 | 19 | 4 durch |
| J2 | IPO-Kauf | 49 | 15 | 6 durch |
| J3 | Sekundaer | 62 | 12 | **15/15 durch** |
| J4 | Fantasy | 71 | 6 | **16/16 durch** |
| J5 | MysteryBox | 35 | 14 pending | 8 pending |
| **Total** | | **240** | **66 done** | **41 done + 8 pending** |

---

## Offene Items nach Prioritaet

### P0 AKUT (Beta-Blocker)
- **AR-42** Equipment-Column-Mismatch fix — 6d tot
- **AR-46** Rarity 'uncommon' RARITY_CONFIG Fix

### P1 CEO-Approvals J5 (6)
- AR-43 Migration-Drift 5. Journey Full-Sweep (weitere RPCs)
- AR-44 REVOKE/GRANT-Template-Regel
- AR-45 DROP v1 Legacy `open_mystery_box`
- AR-47 MysteryBoxDisclaimer-Component
- AR-48 Drop-Rate-Transparenz UI (App-Store 3.1.1)
- AR-49 PAID_MYSTERY_BOX_ENABLED Feature-Flag

### P1 Journeys (7 pending)
- **J6 Profile + Following** (High)
- **J7 Missions/Streak** (High)
- **J8 Verkaufen + Order-Buch** (Critical)
- **J9 Liga-Rang** (Medium)
- **J10 Watchlist + Notifications** (Medium)
- **J11 Equipment + Inventar** (High — abhaengig AR-42 Fix)
- **J12 Multi-League Discovery** (Medium)

### P2 Phase 3 Cross-Cutting
- 3.1 DB Audit, 3.2 i18n Audit, 3.3 Performance, 3.4 Compliance

### P3 Post-Beta
- AR-25 Notif-Dedup (J3)

---

## Neue common-errors.md Patterns (aus dieser Session)

1. **SECURITY DEFINER REVOKE+Guard Pflicht** — LIVE-Exploit-derived Regel (J4-AR-27)
2. **ConfirmDialog statt native alert/confirm** (J4-Healer-A)
3. **Multi-League Props-Propagation Gap** (J3+J4)
4. **Paid-Feature-Preview = MASAK-Alarm** (J4)
5. **Column-Level RLS Whitelist Pattern** (J3+J4 AR-24+30)
6. **Migration-Drift-Wiederholung** (5. Journey in Folge — Full-Sweep mandatory)

---

## business.md erweitert

`Kapitalmarkt-Glossar` Section neu (AR-17):
- Securities-Terminologie Tabelle (IPO/Orderbuch/Trader/Portfolio/Handle-clever/am-Erfolg-beteiligen/Marktwert-steigt)
- Gluecksspiel-Vokabel Tabelle (Prize/Preisgeld/gewinnen/Gewinner/kazan/Manager-Gewinne)
- Reinvestment-Anti-Pattern
- CI-Guard grep-Regex Pre-Commit
- FantasyDisclaimer-Pflicht neue Regel

---

## Naechste Session Empfohlene Reihenfolge

1. **AR-42 + AR-46 Fix SOFORT** (live-broken, ~30 Min)
2. **J5 restliche CEO-Approvals** Schnellbahn-Stil (AR-43..49, ~1-2h)
3. **J8 Audit** (Critical — Verkaufen + Order-Buch, abhaengig von J3-Trade-Fixes)
4. **J6-J7-J11 Audits** (High, parallelisierbar)
5. **J9+J10+J12** (Medium, koennen in 1 Session)
6. **Phase 3 Cross-Cutting** (parallel oder nach J-Phase)

## Tool-Hinweise (falls wieder API-Ausfall)

- Agents arbeiten direkt in main (nicht im Worktree) — ist etabliertes Muster, nicht reparieren
- Bei API-Ausfall: Worktrees checken via `git status`, File-Edits oft schon da, nur Commit fehlt
- `mcp__supabase__apply_migration` SUCCESS heisst Live-Applied (bei Abbruch: via `execute_sql` verify)
- tsc + vitest clean bei JEDEM Merge — Pflicht-Check

# Operation Beta Ready -- Phase 3-5 (Journey-Audits J1-J5 + XC + E2E, 2026-04-14/15)

> Verdichtetes Wissen aus den Journey-Audit-Sessions 2026-04-14/15.
> Quellen: journey-findings-aggregate, bug-tracker, audit-high-risk-rpcs-2026-04-15, retros 20260415.

## Status

DONE -- J1-J5 alle healed. XC-01..14 documented (8 CRITICAL gefixt). E2E Full-Cycle VERIFIED.
Commits: 63b4c82 -> 348af4d -> 891ce5c -> 979b52b.

## Journey-Audit-Methodik

Jede Journey: 3 parallele Agents (Frontend + Backend + Business-Compliance).
Erkenntnis: Parallel-Audit findet 2-3x mehr Findings. Cross-Overlaps = zuverlaessigste Bugs.

| Journey | Findings | CRIT | Status |
|---------|---------|------|--------|
| J1 Onboarding | 23 | 4 | HEALED |
| J2 IPO-Kauf | 49 | 8 | HEALED |
| J3 Sekundaer-Trade | 62 | 11 | HEALED |
| J4 Fantasy-Event | 71 | 19 | HEALED + EXPLOIT REVERTED |
| J5 Mystery Box | 35 | 8 | HEALED + AR-42/42b/46 gefixt |

## J4 -- SECURITY DEFINER Exploit (AR-27)

earn_wildcards war anon-callable ohne REVOKE + ohne auth.uid() Guard.
Anon mintete 99.999 Wildcards live, sofort reverted. Fix-Pattern (Pflicht fuer ALLE SECURITY DEFINER):
1. REVOKE EXECUTE ON FUNCTION X FROM anon, authenticated;
2. GRANT EXECUTE ON FUNCTION X TO authenticated;
3. IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE im Body
Wave 5 E2E: alle 5 Wildcard-RPCs VERIFIED anon=false + auth_guard=true.

## J5 -- AR-42/42b/46: RPC-INSERT Column-Mismatch

AR-42: open_mystery_box_v2 INSERT user_equipment(...equipment_rank...) -- Spalte heisst rank.
0 Equipment-Drops seit Fix-Migration 20260411 (6 Tage broken). LIVE-VERIFIED Fix 2026-04-15.

AR-42b: Gleicher RPC INSERT transactions(...amount_cents...) -- Spalten heissen amount + balance_after.
Credit-Drops NIE geloggt seit RPC-Existenz. Fix: Migration 20260415200100.

Regel: CREATE OR REPLACE FUNCTION validiert keine Column-Existence. PG 42703 erst beim RPC-CALL,
nicht beim apply_migration. Nach JEDER INSERT/UPDATE-Migration: Zieltabellen-Spalten pruefen.

AR-46: 3 Rows mit rarity=uncommon in DB, Union kennt es nicht -> TypeError auf /inventory.
Fix: Union erweitern + RARITY_CONFIG-Entry. TypeScript Record<Union, X> = fail-closed.

## XC-Series: E2E-Discovery Bugs (2026-04-15)

| ID | Root Cause | Fix |
|----|-----------|-----|
| XC-01/02 | get_club_balance + get_available_sc anon-callable | Migration 20260415150000 |
| XC-05 | 51 Image-Errors media-4.api-sports.io NXDOMAIN | CSP + next/image domains fix |
| XC-06 | get_auth_state kein auth.uid Guard | Migration 20260415180000 |
| XC-07 | Watchlist-Star: nur lokaler State -- DB nie updated | addToWatchlist verdrahtet |
| XC-08 | research_posts.author_id falsch (= user_id) | Migration 20260415200100 |
| XC-09 | transactions_type_check zu restriktiv -- 7 RPCs crashten | Migration 20260415190000 |
| XC-10 | notifications_reference_type_check zu restriktiv | Migration 20260415190100 |
| XC-14 | refresh_airdrop_score INSERT auf non-existing columns | Migration 20260415200100 |

CHECK Constraint Pflicht-Check: Nach JEDER neuen type-Variante in einer Tabelle pruefen ob
der CHECK Constraint den neuen Value kennt (pg_get_constraintdef). XC-09 + XC-10 = gleiche Root Cause.

Silent-UI-State-Divergence (XC-07-Typ): Handler setzt nur lokalen State ohne Service-Call.
UI sieht korrekt aus, DB nie touched. Audit: on[Toggle/Click] ohne Service-Call = Bug-Vector.

## J1 Beta-Blocker Fixes

J1-03 Wallet-Init-Trigger (FIXED commit 0190959): trg_init_user_wallet auf auth.users INSERT.
LIVE-VERIFIED Wave 2: Profile INSERT -> Wallet auto-created, Cross-User-Trade Zero-Sum korrekt.

J1-09 TIER_RESTRICTED Geofencing (FIXED commit 30cc654): TR-User sahen Trading-CTAs.
Fix: Geofencing auf Welcome/Onboarding/WelcomeBonus ausgedehnt.

## Multi-League Props-Propagation-Gap (J2/J3)

Problem: leagueShort? auf Player-Type, aber nur 2 von 8 Render-Call-Sites hatten es.
TSC: kein Fehler (optional Prop). Visual-QA mit 1 Liga ubersieht es immer.
Betroffene: TradingCardFrame Front+Back, PlayerHero, TransferListSection, PlayerIPOCard.
J4-Erweiterung: FantasyEvent + UserDpcHolding hatten club* aber kein league*.
Regel: Jedes Type mit club* Field MUSS spiegelbildlich league* Fields haben.
Fix: Client-side Cache-Lookup getClub() -> getLeague() (Zero-RPC-Change).

## High-Risk RPC Audit Verdict (2026-04-15)

BETA-SAFE -- kein Money-Exploit gefunden. 29 Money-RPCs geprueft.
adjust_user_wallet fully hardened (auth.uid Guard + platform_admins + negative-balance + audit-log).
Escrow (wallet.locked_balance) atomic via PL/pgSQL.
Zero-Sum Trade VERIFIED: -20000 + 18800 + 1200 fees = 0, Fee-Split 3.5/1.5/1% korrekt.

## Architektur-Entscheidungen (konsolidiert aus J1-J5 + XC)

- resolveX(def, locale) Helper: SSOT fuer DB-lokalisierte Felder (equipment/rarity/achievement/mission).
- Service wirft I18N-KEY, Consumer resolved via t(). mapErrorToKey in errorMessages.ts. Dynamic Values VERBOTEN.
- preventClose auf ALLEN Money/Transaction Modals (J2/J3/J4/J5/J11 bestaetigt).
- CHECK Constraint vor neuer type-Variante pruefen (XC-09/XC-10 Root Cause).
- Wallet-Init-Trigger auf Auth.Users: Trading broken ohne Trigger. Vor User-Onboarding deployen.

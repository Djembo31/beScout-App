# 014 — Holdings RLS Tighten (AUTH-08, CEO-approved Option 2)

## Ziel

Ersetze `holdings_select_all_authenticated` (qual=true) durch eine engere Policy: `auth.uid() = user_id OR EXISTS(club_admins) OR EXISTS(platform_admins)`. Regulaere User lesen nur eigene Holdings; Club-Admins behalten Fan-Analytics-Zugriff; Platform-Admins behalten Gesamt-Sicht.

Cross-User-Consumer ohne Admin-Rolle (`getPlayerHolderCount(playerId)` in `wallet.ts` — zaehlt distinct holders ueber alle User) bekommt SECURITY DEFINER RPC-Wrapper, der RLS umgeht.

## Klassifizierung

- **Slice-Groesse:** M (2 Migrations, 1 Service-Update, AUTH-08 Test gruen)
- **Scope:** **CEO-approved** (CEO hat Option 2 explizit gewaehlt, 2026-04-17)
- **Referenz:**
  - Walkthrough A-03 RLS Policy Coverage (INV-19/INV-20 whitelists mit `holdings: 'SELECT'`)
  - `.claude/rules/common-errors.md` "RLS Policy Trap (Session 255)"
  - `.claude/rules/database.md` "RLS Pflicht-Checkliste"
  - `memory/ceo-approval-matrix.md` "RLS-Policies (neue oder geaenderte) → CEO-Scope"

## Betroffene Files

| File | Aenderung |
|------|-----------|
| `supabase/migrations/20260417050000_holdings_rls_tighten.sql` (NEW) | DROP old policy, CREATE new (own OR club_admin OR platform_admin) |
| `supabase/migrations/20260417050100_get_player_holder_count_rpc.sql` (NEW) | SECURITY DEFINER RPC `get_player_holder_count(p_player_id uuid)` + REVOKE anon/GRANT authenticated + REVOKE writes |
| `src/lib/services/wallet.ts` | `getPlayerHolderCount` ruft jetzt RPC statt direkter count-Query |
| `src/lib/services/__tests__/wallet-v2.test.ts` | Mock-Path ggf. anpassen (rpc statt from.count) |

## Cross-User-Consumer-Audit (Produktion)

| Call Site | Filter | Auswirkung nach Tighten |
|-----------|--------|-------------------------|
| `wallet.ts:39 getHoldings(userId)` | `eq('user_id', userId)` | OK wenn userId == auth.uid() |
| `wallet.ts:74 getHoldingQty(userId, playerId)` | `eq('user_id', userId)` | OK wenn userId == auth.uid() |
| `wallet.ts:107 getPlayerHolderCount(playerId)` | kein user_id | **BRICHT** → RPC-Wrapper |
| `offers.ts:99 getOpenBids({ownedByUserId})` | `eq('user_id', ownedByUserId)` | OK (User ruft eigene bids ab) |
| `clubCrm.ts:70 (trader count)` | `in('player_id', ...)` | OK wenn Caller club_admin |
| `clubCrm.ts:134 (fan holdings)` | `in('user_id', userIds)` | OK wenn Caller club_admin |
| `platformAdmin.ts:102 (user analytics)` | `in('user_id', userIds)` | OK wenn Caller platform_admin |
| `lineups.queries.ts:49 getOwnedPlayerIds(userId)` | `eq('user_id', userId)` | OK wenn userId == auth.uid() |
| `useProfileData.ts:91 getHoldings(targetUserId)` (Public Profile) | `eq('user_id', targetUserId)` | **Empty result auf fremdem Profil** — Portfolio-Tab ist sowieso isSelf-only (profile.md). Keine UI-break, nur eager-fetch waste. Gate-Optimierung separater Slice. |

## Acceptance Criteria

1. Migration #1 angewandt: alte Policy weg, neue Policy aktiv, INV-19 + INV-20 gruen.
2. Migration #2 angewandt: RPC `get_player_holder_count(uuid)` existiert, REVOKE anon+writes, GRANT authenticated+service_role.
3. Service `wallet.ts getPlayerHolderCount` nutzt RPC.
4. AUTH-08 **gruen** (bots lesen 0 fremde Rows).
5. AUTH-07, AUTH-09..AUTH-14 bleiben gruen.
6. `wallet-v2.test.ts` passt (RPC-Mock).
7. tsc clean, alle relevanten Service/Test-Files gruen.

## Edge Cases

1. **Bot-User ist kein Admin**: bestaetigt live (10 bots, alle 0 admin-flags) → AUTH-08 passt ohne weitere Anpassung.
2. **Club-Admin mit mehreren Clubs**: `EXISTS(SELECT 1 FROM club_admins WHERE user_id = auth.uid())` liest ALLE holdings systemweit — nicht per-club. Das ist bewusst: Club-Admins sehen Fan-Analytics fuer Platform-weite Stats. Fine-grained per-club-RLS-scoping waere M-L Folge-Slice.
3. **Platform-Admin-Promotion**: User wird promoted → sofort RLS-Sichtbarkeit auf alle holdings. Korrekt.
4. **Public Profile-View**: `getHoldings(targetUserId)` gibt `[]` zurueck bei fremdem Profil. Portfolio-Tab ist isSelf-only (profile.md), also keine UI-break. Eager fetch bleibt als minor waste.
5. **RPC-Caller-Authentifizierung**: `get_player_holder_count` als SECURITY INVOKER oder DEFINER? DEFINER (bypasst RLS), mit `auth.uid() IS NOT NULL` Guard im Body (verhindert anon ohne REVOKE). Plus REVOKE anon als Defense-in-Depth (AR-44).
6. **INV-20 Whitelist**: erwartet `holdings: 'SELECT'`. Neue Policy hat immer noch 1 SELECT-Entry. Count stimmt.
7. **INV-23 Coverage**: RPC produziert SETOF integer (kein jsonb_build_object). Nicht Scope von INV-23.

## Proof-Plan

- `worklog/proofs/014-policy-before.txt` — aktuelle Policy-Query
- `worklog/proofs/014-policy-after.txt` — neue Policy-Query
- `worklog/proofs/014-auth-tests.txt` — AUTH-* Suite vitest (15/15 gruen inkl. AUTH-08)
- `worklog/proofs/014-inv-tests.txt` — INV-19 + INV-20 gruen
- `worklog/proofs/014-wallet-tests.txt` — wallet-v2.test.ts gruen

## Scope-Out

- **Per-Club-Scoping** (Club-Admin sieht nur eigenen Club's Fan-holdings): separater Slice falls CASP/DSGVO-Anforderung steigt.
- **Public-Profile-Fetch-Gate** (isSelf-Guard um getHoldings-Call): Optimization, separater Slice.
- **Column-Level-Redaction** (avg_buy_price verstecken bei cross-user reads): separater Slice wenn Whale-Protection explizit gewuenscht.
- **INSERT/UPDATE/DELETE Policies**: nicht noetig (alle writes gehen via SECURITY DEFINER RPCs in Trading-Flows).

## Stages

- SPEC — dieses File
- IMPACT — inline (Consumer-Audit-Tabelle oben)
- BUILD — 2 Migrationen + 1 Service-Edit + 1 Test-Anpassung
- PROVE — 4 Proof-Artefakte
- LOG — commit + log.md + common-errors.md Update (RLS tighten pattern dokumentieren)

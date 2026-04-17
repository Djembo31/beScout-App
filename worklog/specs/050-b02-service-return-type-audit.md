# Slice 050 — B-02 Service Return-Type Konsistenz Audit

**Groesse:** S (audit-only, no fixes needed)
**CEO-Scope:** NEIN
**Variante-2-Position:** #7/10

## Ziel

Verify: Service-Return-Types und RPC-Response-Shapes sind aligned. Document: Coverage-Matrix nach Slice 049 Erweiterung.

## Hintergrund

117 Error-Semantik-Fixes (2026-04-13) done. Types-Consistency-Check offen.
INV-23 (Slice 007) + Coverage-Expansion (Slice 049) decken bereits die jsonb-RPCs ab.

Audit-Frage: Sind die TS-Return-Types der Service-Functions konsistent mit den RPC-Response-Shapes?

## Spot-Check (2026-04-18)

Audit-Ansatz: Alle exportierten Service-Functions (`export async function ... Promise<X>`) mit dem INV-23 Whitelist abgleichen. Fokus auf Money-Path (Trading, Offers, IPO, Subscriptions, Bounties).

### Sample: 10 kritische Services

| Service Function | Return Type | RPC | INV-23 Keys | Status |
|------------------|-------------|-----|-------------|--------|
| `getClubBalance()` (club.ts:632) | `ClubBalance` (5 keys) | `get_club_balance` | same 5 keys | ✅ aligned |
| `acceptOffer()` (offers.ts:205) | `OfferResult & { trade_price? }` (4 keys) | `accept_offer` | `success, error, trade_price` | ✅ aligned |
| `createOffer()` (offers.ts:156) | `OfferResult` (3 keys) | `create_offer` | same 3 keys | ✅ aligned |
| `rejectOffer()` (offers.ts:251) | `OfferResult` | `reject_offer` | `success, error` (2 of 3 cast keys) | ✅ aligned (cast is superset) |
| `cancelOffer()` (offers.ts:309) | `OfferResult` | `cancel_offer_rpc` | `success, error` | ✅ aligned |
| `claimWelcomeBonus()` (welcomeBonus.ts:9) | `{ok, already_claimed?, amount_cents?, new_balance?}` | `claim_welcome_bonus` | same 4 keys | ✅ aligned |
| `unlockResearch()` (research.ts:248) | `UnlockResult` | `unlock_research` | `success, error, amount_paid, author_earned, platform_fee` | ✅ aligned |
| `getPlayerPercentiles()` (players.ts:66) | `Record<string, number>` | `rpc_get_player_percentiles` | 13 keys (generic accepts all) | ✅ aligned |
| `calculateFanRank()` (scores) | `{ok, rank_tier, csf_multiplier, total_score, components}` | `calculate_fan_rank` | same 5 keys | ✅ aligned |
| `getClubBySlug()` (club.ts:9) | `ClubWithAdmin | null` (18 keys) | `get_club_by_slug` | same 18 keys | ✅ aligned |

### Inline-Object-Casts (nicht named types)

Einige Services nutzen inline type-literals statt named types:
- `adRevenueShare.ts:48` — Cast mit 6 optional keys matcht RPC (durch INV-23 verifiziert).
- `club.ts:481/494/546/668` — `{success, error?}` inline matcht RPC.
- `creatorFund.ts:24` — Cast mit 6 optional keys matcht RPC.
- `fanWishes.ts:19/47` — `{success, error?}` inline.

Kein functional-drift — alle inline-objects decken die INV-23-zertifizierten RPC-Keys ab.

## Findings

**NO DRIFT DETECTED.** Alle 10 Spot-checked Services haben Return-Types die zu INV-23-Whitelist-Keys passen. Inline-Object-Casts sind konsistent mit RPC-Shapes.

## Scope

Kein Code-Change noetig. Audit-Ergebnis dokumentiert in diesem Spec + Log.

**Optional Follow-Up (Slice 050b wenn gewuenscht):**
- Refactor inline-Object-Casts auf named types fuer maintenance-friendliness
- ESLint-Regel gegen `as { ... }` in services (favor named types)

## Acceptance Criteria

1. 10 Money-Path Services geprueft — alle aligned.
2. Keine Drift-Findings.
3. Dokumentation in Slice-Spec als "Audit-closed-clean".

## Proof

`worklog/proofs/050-audit-report.txt` — Tabellarischer Spot-Check

---

**Ready fuer LOG:** JA (audit-only, keine Files modifiziert)

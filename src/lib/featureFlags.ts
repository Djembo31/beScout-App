/**
 * Feature Flags — Beta-Scope Gating
 *
 * Compile-time Flags fuer Features, die aus der Beta ausgenommen sind.
 * - `false` = Feature komplett versteckt (nicht rendern, nicht disabled).
 * - `true` = Feature sichtbar.
 *
 * WICHTIG: Diese Flags sind SSOT fuer Beta-Scope-Entscheidungen.
 * - AR-11 (J3): BuyOrder-Matching-Engine fehlt — Feature aus Beta.
 * - AR-23 (J3): LimitOrder ist Placeholder-UI ohne Live-RPC — Feature aus Beta.
 * - AR-31 (J4): Paid-Fantasy ist Phase 4 (post-MGA) — NICHT BAUEN, NICHT VORBEREITEN.
 *
 * Aktivierung erfordert:
 *   1. Feature-Implementation vollstaendig (RPC + Service + UI + Tests)
 *   2. Compliance-Review (Disclaimer + GeoGate)
 *   3. CEO-Approval
 *
 * Siehe:
 *   - `memory/journey-3-ceo-approvals-needed.md`
 *   - `memory/journey-4-ceo-approvals-needed.md`
 *   - `.claude/rules/business.md` (Licensing-Phasen ADR-028)
 */

/**
 * Sekundaer-Market Buy-Order (Limit-Buy gegen existierende Sell-Orders).
 * Aktuell `false`: `place_buy_order` RPC escrowed Geld, aber KEIN Matching-Engine
 * gegen Sell-Orders. 10 Buy-Orders seit 26d offen, 0 Fills. AR-11 (J3).
 */
export const FEATURE_BUY_ORDERS = false;

/**
 * Limit-Order (Buy/Sell at target price). AR-23 (J3).
 * LimitOrderModal ist Placeholder-UI (`handleSubmit = setSubmitted(true)`),
 * keine Live-RPC, kein Matching, kein Disclaimer, kein GeoGate.
 */
export const FEATURE_LIMIT_ORDERS = false;

/**
 * Paid-Fantasy (Phase 4, nach MGA-License). AR-31 (J4).
 *
 * Betrifft UI-Paths:
 *   - CreateEventModal `buyIn`-Feld + Fee-Preview + `creatorFee`-Berechnung
 *   - JoinConfirmDialog `$SCOUT`-currency-branch
 *   - Admin scoutEventsEnabled-Toggle
 *   - `benefitPremiumFantasy` String
 *   - `paid_fantasy` Label (user-facing)
 *   - `prize_league` / `region_feat_prizeLeague` Strings
 *
 * business.md: *"Phase 4 (nach MGA): Paid Fantasy Entry, Turniere mit Preisen —
 * NICHT BAUEN".* "NICHT BAUEN" = auch NICHT VORBEREITEN.
 */
export const PAID_FANTASY_ENABLED = false;

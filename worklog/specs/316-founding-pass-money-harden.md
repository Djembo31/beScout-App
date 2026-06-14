# Slice 316 — Founding-Pass Money-Härtung (grant_founding_pass)

**Slice-Type:** Service + Migration + i18n-frei (Config-Werte)
**Größe:** S
**Datum:** 2026-06-14
**CEO-Scope:** JA — P0 Money + SECURITY DEFINER. Anil-Decision eingeholt (siehe AC1). REVIEW Pflicht.

## 1. Problem-Statement (Evidence: S7-Registry Phase-2 #1 + #2, live-verifiziert 2026-06-14)

Zwei P0-Money-Drifts im Founding-Pass-Pfad, beide live gegen Code verifiziert:

**#1 bcredits-Drift (2×):** `FOUNDING_PASS_TIERS.bcreditsCents` (TS, Anzeige) ≠ `grant_founding_pass.v_bcredits` (RPC, Gutschrift).
| Tier | TS-Anzeige | RPC-Gutschrift |
|------|-----------|----------------|
| fan | 100 000 (1.000) | **250 000 (2.500)** |
| scout | 500 000 (5.000) | **1 000 000 (10.000)** |
| pro | 2 000 000 (20.000) | **3 500 000 (35.000)** |
| founder | 5 000 000 (50.000) | **10 000 000 (100.000)** |
→ Käufer wird 2× mehr gutgeschrieben als die Founding-Seite anzeigt.

**#2 Preis nicht server-validiert:** `grant_founding_pass` nimmt `p_price_eur_cents` als freien Caller-Param, speichert verbatim + summiert ihn im EUR-900K-Kill-Switch (`v_kill_switch_limit := 90000000`). EUR-Wahrheit lebt nur im Client (`AdminFoundingPassesTab.tsx:171` → `tierDef?.priceEurCents ?? 0`). Kill-Switch-Integrität hängt am Client.

**Kontext:** `SELECT ... FROM user_founding_passes` = **0 Zeilen verkauft** → freie Wahl der Kanon-Werte, keine Wallet-Migration nötig.

## 2. Lösungs-Design

**Anil-Entscheidung (2026-06-14):** RPC-Werte (höher) sind Kanon → TS + Anzeige hochziehen, RPC bleibt.

1. **#1 Fix:** `src/lib/foundingPasses.ts` `bcreditsCents` + `bcreditsLabel` auf RPC-Werte heben.
2. **#2 Fix:** `grant_founding_pass` leitet EUR-Preis server-seitig aus Tier ab (CASE, Kanon = TS-Preise 999/2999/7499/19999) und nutzt diesen für INSERT + Kill-Switch. `p_price_eur_cents` bleibt in Signatur (kein DROP nötig, Service-Kompat), wird aber gegen den abgeleiteten Wert validiert: Mismatch → `RAISE EXCEPTION` (Client-Drift laut sichtbar statt still). Server-Wert ist die Wahrheit.
3. **Drift-Prävention (Slice-108 Pattern):** Neuer Vitest-Invariant-Test der `FOUNDING_PASS_TIERS` gegen eine Kanon-Tabelle (= RPC CASE) prüft + `bcreditsLabel === fmtScout(centsToBsd(bcreditsCents))` (interne Display-Konsistenz).

## 3. Betroffene Files

- `src/lib/foundingPasses.ts` — 4× bcreditsCents, 4× bcreditsLabel (Config-Werte, KEIN src/lib/services).
- `supabase/migrations/20260614xxxxxx_slice_316_grant_founding_pass_price_binding.sql` — RPC CREATE OR REPLACE + REVOKE/GRANT.
- `src/lib/__tests__/foundingPasses-tiers.invariant.test.ts` — NEU, Zero-Drift-Invariant.

**Auto-aktualisiert (kein Edit nötig, verifiziert):** `AdminFoundingPassesTab.tsx` (Dropdown `fmtScout(bcreditsCents/100)`, Tabelle liest `bcredits_granted` aus DB), `TierComparisonMatrix.tsx:112` (`centsToBsd(bcreditsCents)`), `founding/page.tsx:276` (`centsToBsd`) + `:351` (`bcreditsLabel`).

## 4. Code-Reading-Liste (erledigt)
- `src/lib/foundingPasses.ts` — Tier-Tabelle, bcreditsCents/Label. ✓
- `grant_founding_pass` live (`pg_get_functiondef`) — v_bcredits CASE + p_price_eur_cents-Pfad + Kill-Switch. ✓
- `AdminFoundingPassesTab.tsx` — Preis-Feed (`tierDef.priceEurCents`) + bcredits-Display. ✓
- `founding/page.tsx` + `TierComparisonMatrix.tsx` — Label vs. centsToBsd-Pfade. ✓
- `centsToBsd` (`players.ts:159` = cents/100) + `fmtScout` (de-DE). ✓
- `foundingPasses.test.ts` (Service) — Mock-Werte arbiträr, bricht nicht. ✓

## 5. Pattern-References
- `common-errors.md` „Money-RPC Pricing-Formel Drift (Slice 108)" — RPC = Wahrheit + Test-Invariant erzwingt Zero-Drift.
- `database.md` AR-44 — CREATE OR REPLACE → REVOKE PUBLIC/anon + GRANT authenticated.
- `database.md` Slice-156 PATCH-AUDIT — neuester Body = current state; hier via live `pg_get_functiondef` als Baseline.
- `errors-db.md` Money-RPC Idempotency — N/A (kein neuer Write-Pfad, Admin-only Einzel-Grant).

## 6. Acceptance Criteria
- **AC1:** `FOUNDING_PASS_TIERS` bcreditsCents = {fan 250000, scout 1000000, pro 3500000, founder 10000000}.
- **AC2:** bcreditsLabel = {"2.500","10.000","35.000","100.000"} = `fmtScout(centsToBsd(bcreditsCents))`.
- **AC3:** `grant_founding_pass` leitet v_price server-seitig per CASE ab (999/2999/7499/19999), nutzt v_price für INSERT `price_eur_cents` + Kill-Switch-Summe; `p_price_eur_cents` Mismatch → RAISE.
- **AC4:** Migration hat REVOKE PUBLIC+anon + GRANT authenticated für `grant_founding_pass(uuid,text,integer,text)`.
- **AC5:** Neuer Invariant-Test grün: TS-Tabelle == Kanon-Tabelle (bcredits+price) + Label==derived.
- **AC6:** `pnpm exec tsc --noEmit` clean + bestehende `foundingPasses.test.ts` grün.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| Service passt korrekten tierDef.priceEurCents | v_price == p_price → kein RAISE, normal grant |
| Client schickt falschen Preis (Drift/Manipulation) | v_price != p_price → RAISE EXCEPTION (laut) |
| p_price_eur_cents = 0 (tierDef nicht gefunden, `?? 0`) | != v_price → RAISE (statt 0€-Pass + Kill-Switch-Unterlauf) |
| Ungültiger Tier | bestehender RAISE 'Ungueltiger Tier' greift VOR CASE |
| Kill-Switch erreicht | nutzt jetzt v_price (server) für Summe → kein Client-Bypass |
| auth.uid() kein Admin | bestehender RAISE 'Nicht berechtigt' bleibt erste Hürde |

## 8. Self-Verification Commands
- `pnpm exec tsc --noEmit`
- `CI=true pnpm exec vitest run src/lib/__tests__/foundingPasses-tiers.invariant.test.ts src/lib/services/__tests__/foundingPasses.test.ts`
- `pg_get_functiondef('public.grant_founding_pass(uuid,text,integer,text)')` post-apply → v_price CASE + REVOKE.
- Live-Smoke: `SELECT grant_founding_pass(...)` mit falschem Preis → erwartet RAISE.

## 9. Open-Questions
- **Pflicht (geklärt):** bcredits-Kanon = RPC-Werte (Anil 2026-06-14). EUR-Preise = TS-Werte (einzige Quelle, kein Konflikt).
- **Autonom (CTO):** Signatur-Erhalt + Param-Validierung statt -Entfernung; Slice-108-Test-Pattern statt DB-Config-Tabelle.

## 10. Proof-Plan
`worklog/proofs/316-founding-money-harden.txt`: tsc-Output + vitest-Output (invariant + service grün) + post-apply `pg_get_functiondef` Auszug (CASE + REVOKE) + Mismatch-RAISE-Smoke.

## 11. Scope-Out
- Keine DB-Config-Tabelle für Tiers (Slice-108-Invariant reicht für 4 selten-ändernde Tiers).
- Keine Idempotency-Keys (Admin-only Einzel-Grant, kein User-Money-Path).
- Keine Änderung der EUR-Preise oder migration_bonus_pct.
- `bcreditsLabel` wird NICHT eliminiert (Minimal-Scope; Invariant deckt Drift ab).

## 12. Stage-Chain (geplant)
SPEC ✓ → IMPACT (skipped: 0 verkauft, kein Consumer-Migration; Auto-Display verifiziert) → BUILD → REVIEW (Pflicht, Money/Security) → PROVE → LOG.

## 13. Pre-Mortem
1. `RAISE` bei Mismatch bricht legitime Grants wenn TS-Preise je von RPC-CASE abweichen → Invariant-Test fängt das vor Deploy (price-Achse).
2. CREATE OR REPLACE resettet Grants → REVOKE/GRANT-Block Pflicht (AC4).
3. bcreditsLabel manuell vs centsToBsd-Pfad könnten erneut driften → Invariant Label==derived (AC2/AC5).
4. Signatur-Tippfehler bei pg_proc → exakt `(uuid,text,integer,text)` aus live-def übernehmen.
5. Kill-Switch nutzt nun v_price: falls TS-Preis ≠ alter Caller-Preis, ändert sich Summen-Semantik → bei 0 verkauft irrelevant.

# Spec 368e — Einstiegspreis-SSOT: 3 Spalten → 1 Quelle (`ipo_price`)

**Datum:** 2026-06-24 · **Scope:** Money/CEO (§3) · **Größe:** L (Daten + Service + UI + Tests) · **Slice-Type:** Migration + Service + UI
**Status:** SPEC — wartet auf Anil-Approval. Auslöser: Anil-Entscheid 2026-06-24 („Strukturproblem grundsätzlich angehen").

> Anil-Frust-Wurzel: Ein 500K-Spieler (Douglas) zeigte 10–11 Credits. Ursache nicht nur ein Wert, sondern **drei** „Einstiegspreis"-Spalten, die driften und von verschiedener UI gelesen werden. Ad-hoc-Fixes (Slice 114, D100, 368e-Vorarbeit) haben das Problem verschoben, nicht gelöst. → EINE Quelle.

## 1. Problem-Statement (Evidence)
Drei Spalten kodieren „den Einstiegs-/Erstpreis", sollten übereinstimmen, tun es nicht:
| Quelle | gelesen von (UI) | Rolle |
|---|---|---|
| `players.ipo_price` | Pricing, Floor-Fallback (`recalc_floor_price`), `dbToPlayer→prices.ipoPrice` | de-facto Haupt-Preis |
| `ipos.price` (Event-Row) | `RewardsTab` „Einstieg" via `getFirstIpoPrice`/`useFirstIpoPrice` (Slice 368b) | Erst-IPO-Anker |
| `players.initial_listing_price` | `TradingTab` „Markteintritt" + `useManagerData` Portfolio-% (`BestandView`?) | „erster Listing-Preis" |

**Live-Beleg (2026-06-24):** Nach Teil-Korrektur stehen **648** aktive Spieler mit `initial_listing_price ≠ ipo_price`. Douglas war 50× daneben (10 vs 500). „Markteintritt" las `initial_listing_price` (10), während Hero/Floor schon 500 zeigten.

## 2. Aktueller Daten-Stand (Vorarbeit dieser Session — MUSS Spec-Baseline sein)
- ✅ **19 grobe Preis-Ausreißer** (Faktor ≥3 off MV/1000) korrigiert: `ipo_price`+`ipos.price`+`last_price`+`floor_price` = ROUND(MV/10) cents. (CEO-approved scope.)
- ⚠️ **`initial_listing_price`**: 2964 Zeilen auf ROUND(MV/10) gesetzt (Scope-Overreach über die 19 hinaus — `initial_listing_price` war breit kaputter Flach-Seed). Kein Schaden (Anzeige, Phase-1-Spielgeld), aber unkoordiniert → 648 Mismatches `initial_listing_price ≠ ipo_price`.
- Kleine legit Abweichungen (`ipo_price ≠ MV/10` innerhalb Faktor 3) bewusst BEHALTEN (Anil: wirkt natürlicher).

## 3. Lösungs-Design — `ipo_price` = SSOT
1. **Daten:** `UPDATE players SET initial_listing_price = ipo_price`; `UPDATE ipos SET price = players.ipo_price` (je Player, alle aktiven) → alle drei stimmen überein. Legit-Abweichungen bleiben (kommen aus ipo_price).
2. **UI-Reader auf `prices.ipoPrice` (SSOT) umstellen:**
   - `TradingTab` „Markteintritt": `initialListingPrice` → `ipoPrice`.
   - `useManagerData` Portfolio-„Wertentwicklung": Cost-Basis `initialListingPrice` → `ipoPrice` (oder bewusst `holdings.avg_buy_price` für echtes P&L — Design-Q).
   - `RewardsTab` „Einstieg": `getFirstIpoPrice`(ipos.price) → `prices.ipoPrice`. (Kehrt 368b-Mechanik um — jetzt zulässig, da ipo_price die vertrauenswürdige SSOT ist; 368b nutzte ipos.price NUR weil ipo_price Slice-114-vergiftet war, das ist behoben.)
3. **Deprecation:** Nach Reader-Umstellung `initial_listing_price` als deprecated markieren (Reads = 0), DROP COLUMN in eigenem Folge-Slice (Pre-Drop-grep `src/ scripts/ messages/`, S305/324-Pattern). `getFirstIpoPrice`/`useFirstIpoPrice`/`qk.ipos.firstPrice` entfernen wenn 0 Consumer.
4. **Guard gegen Re-Drift:** Trigger/CHECK oder Invariant-Test: bei IPO-Anlage `ipos.price = players.ipo_price`; `initial_listing_price` nie eigenständig setzen. (D39 Trigger-Pattern.)

## 4. Code-Reading-Liste (Pflicht, Build)
| File | Zweck |
|---|---|
| live `recalc_floor_price` + `create_ipo` + `buy_from_ipo` | wer schreibt/liest ipo_price/ipos.price (D87) |
| `src/lib/services/players.ts` (`dbToPlayer`, PLAYER_SELECT_COLS, `createPlayer`) | Mapper, ob initial_listing_price noch gemappt werden muss |
| `src/lib/services/ipo.ts` (`getFirstIpoPrice`) + `src/lib/queries/misc.ts` (`useFirstIpoPrice`) + `keys.ts` | RewardsTab-Anker entfernen |
| `src/components/player/detail/RewardsTab.tsx` | „Einstieg" → ipoPrice |
| `src/components/player/detail/TradingTab.tsx` (Z.147-161) | „Markteintritt" → ipoPrice |
| `src/features/manager/hooks/useManagerData.ts` (Z.81-86) | Portfolio-% Cost-Basis |
| `src/features/market/components/portfolio/BestandView.tsx` | initialListingPrice-Nutzung |
| `src/types/index.ts` (prices.initialListingPrice, DbPlayer.initial_listing_price) | Type-Cleanup |
| `src/lib/queries/enriched.ts`, `marketContent.priceCents.ts`, `research.ts`, `search.ts` | Rest-Reader prüfen |
| Tests: `TradingTab.test.tsx`, `players.test.ts`, `ipo.test.ts`, `db-invariants.test.ts` | anpassen |

## 5. Pattern-References
- D99/D100 (Pricing 1 Card=MV/1000; ipo_price=Vereins-Eintritt, MV-entkoppelt). **D100-Präzisierung nötig (→ D101):** „kein Daten-Update" galt nur für KLEINE legit Abweichungen; grobe Seed-Ausreißer + Mehrfach-Quellen sind Bugs.
- errors-frontend.md S368b „Display-Anker aus Source-of-Truth" — hier: EINE Source statt drei.
- errors-db.md S305/324 Column-DROP 4-Achsen-Audit (vor initial_listing_price-DROP).
- errors-db.md „Multi-Hop Bridge ohne Trigger" (S313) — Re-Drift-Guard.

## 6. Acceptance Criteria
1. `players.ipo_price = ipos.price = initial_listing_price` für alle aktiven Spieler (SQL-Count Mismatch = 0).
2. „Markteintritt" (TradingTab) == „Einstieg" (RewardsTab) == Hero-IPO-Bezug für Stichprobe (Playwright, ≥2 Spieler).
3. Douglas: alle drei = 500. Manaj: alle drei = sein ipo_price (legit). VERIFY SQL + live.
4. 0 Reader von `initial_listing_price` in `src/` (grep) nach Umstellung (oder bewusst dokumentiert).
5. Portfolio-„Wertentwicklung" rechnet auf definierter Basis (ipoPrice ODER avg_buy_price — Anil-Entscheid), kein +4900%-Artefakt.
6. tsc + vitest grün; betroffene Tests angepasst.

## 7. Open-Questions (Anil) — ✅ ENTSCHIEDEN (2026-06-24)
1. ✅ **Portfolio-„Wertentwicklung"-Basis = `holdings.avg_buy_price`** (echtes User-P&L, ehrlicher). NICHT ipo_price.
2. ✅ **RewardsTab „Einstieg" von `ipos.price` → `ipo_price` umstellen** (368b-Umkehr bestätigt — eine Quelle).
3. ✅ **`initial_listing_price` erst DEPRECATEN + Re-Drift-Guard, DROP COLUMN in eigenem Folge-Slice** (nicht sofort).
**→ Alle BUILD-Blocker geklärt. Slice 368e ist approved-to-build in der nächsten (frischen) Session.**

## 8. Proof-Plan
- SQL: Mismatch-Count=0 + Douglas/Manaj-Stichprobe.
- Playwright: Markteintritt==Einstieg für 2 Spieler, kein i18n-/NaN-Leak.
- vitest + tsc + reader-grep.
- `pg_get_functiondef` create_ipo (Re-Drift-Guard verifiziert).

## 9. Scope-Out
- Echte Club-IPO-Preis-Logik (Clubs gibt's in Phase 1 nicht).
- DROP COLUMN initial_listing_price (eigener Folge-Slice nach Reader=0).
- Die kleinen legit ipo-Abweichungen (bleiben).

## 10. Stage-Chain
SPEC → IMPACT (/impact: 17 Reader-Files) → BUILD (Daten-Align → UI-Reader → Type/Test-Cleanup → Re-Drift-Guard) → REVIEW (reviewer, Money) → PROVE → LOG (+ D101 DISTILL + trading.md/treasury.md update).

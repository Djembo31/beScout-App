# Spec 368c — Floor-Orderbuch transparent + manipulationssicher

**Datum:** 2026-06-24 · **Scope:** Money/CEO (§3 — selbst bauen) · **Größe:** M · **Slice-Type:** Migration (Money-RPC) + Service + UI
**Status:** SPEC → wartet auf Anil-Approval (Richtung + Faktor ÷3 bereits bestätigt 2026-06-24).
**Serie:** Teil 3/3 von „Scout-Card-Wert ehrlich" (368a Kanon ✅, 368b RewardsTab-Anzeige ✅). Übergreifende Spec: `docs/plans/2026-06-24-scout-card-value-model-spec.md`.

---

## 1. Problem-Statement (mit Evidence)

**Zwei Wahrheits-/Sicherheits-Lücken am Floor-Preis (Live-verifiziert 2026-06-24):**

**A — Manipulations-Lücke (Preis-Untergrenze fehlt):** `place_sell_order` (live `pg_get_functiondef`) prüft nur `p_price >= 1` (1 Cent) und eine OBERgrenze via `get_price_cap` (= 3× Referenz). Es gibt **keine** Untergrenze. Folge: Jemand listet 1 Karte für 1 Credit → `recalc_floor_price` setzt `floor_price` = MIN(offene Sell-Orders) = 1 → die überall angezeigte „günstigstes Angebot"-Zahl stürzt ab, obwohl die Karte real viel mehr wert ist. Falscher Wert-Anker (UX + Compliance: keine irreführende Wert-Darstellung, `business.md`).

**B — Transparenz-Lücke (Quelle des Floors unsichtbar):** `recalc_floor_price` (live) leitet `floor_price` in dieser Kaskade ab: `MIN(offene Sell-Orders)` → sonst `ipo_price` (laufende IPO) → sonst `last_price`. User-facing steht aber **immer** „Floor · günstigstes Angebot" (`PlayerHero.tsx:277`, `messages` `floorPriceTooltip`). Bei Quelle = letzter Verkauf / IPO ist das **kein** „Angebot" → Label lügt. Zusätzlich uneinheitliche Labels für dieselbe Zahl: `floorPrice`=„Marktpreis" (de.json:1123/1146), „Floor" (2323), „Floor Preis" (4396/4656), `marketFloor`=„Markt Floor" (4489).

**Entlastung (senkt Money-Risiko, KEIN direkter Geldverlust):** Der echte Kauf läuft übers Orderbuch zur echten billigsten Order (`buy_player_sc`/`buy_from_order`). Eine Lowball-Order ist für den Käufer ein Geschenk, kein Betrug — der Schaden ist **Wahrnehmung/Wert-Anker**, nicht Geld. Daher: Untergrenze beim Erstellen verhindern (sauber) + Anzeige ehrlich machen. Phase 1 = Credits wertloses Spielgeld (D99) → Urgenz begrenzt, aber Anker-Wahrheit jetzt richtig setzen (vor $SCOUT-Phase 2).

**Schon existierender Schutz (Live, NICHT neu bauen):** Selbst-Handel blockiert · Reziprok-Ping-Pong A↔B (7 Tage) blockiert · 20 Trades/24h · 10 Orders/h · Cap 3×Anker · Club-Admin-Handelsverbot.

**Nicht in diesem Slice (Lücke C, separat):** Sybil-Ring A→B→C→A mit 3+ Accounts — `v_circular_count` fängt nur direkte Reziprozität. Braucht Identitäts-/Geräte-Signale → eigener späterer Slice (Phase-2-relevant).

---

## 2. Lösungs-Design (Was, nicht Wie)

**A — Symmetrisches Preis-Band beim Order-Erstellen (CEO ÷3):**
- Neue STABLE Funktion `get_price_floor(p_player_id) = get_price_cap(p_player_id) / 9` (Integer-Division).
- Begründung Kohärenz: `get_price_cap = 3 × Referenz` (Referenz = `GREATEST(ipo, median_last10)`). Band um dieselbe Referenz: `min = Referenz ÷ 3 = cap ÷ 9`, `max = cap`. Reuse der bereits reviewten Cap-Referenz, keine zweite Median-Abfrage, keine Divergenz-Gefahr.
- `place_sell_order`: nach Cap-Check zusätzlich `IF p_price < v_price_floor THEN RETURN {success:false, error:'minPriceExceeded'}`. (`p_price >= 1` bleibt als Hard-Floor falls floor=0.)
- Fail-open-Edge: cap=0 (ipo NULL/0, <10 Trades) → floor=0 → nur die bestehende `>=1`-Regel greift. Bewusst (kein Anker = kein Band).

**B — Floor-Quelle ehrlich + Labels vereinheitlicht:**
- Quelle bestimmen (Frontend, aus bereits geladenem Orderbuch): offene Sell-Orders vorhanden & MIN == floor → „günstigstes Angebot"; sonst laufende IPO → „Erstverkaufspreis"; sonst → „letzter Verkauf". Sublabel in `PlayerHero` quellen-abhängig.
- Labels vereinheitlichen auf **einen** user-facing Begriff. Vorschlag DE „**Marktpreis**" (neutral, kein „Angebot"-Versprechen) / TR „**Piyasa Fiyatı**". „Floor"/„Markt Floor"/„günstigstes Angebot" als feste Bezeichnung raus; „günstigstes Angebot" nur noch als **Quellen-Sublabel** wenn Quelle wirklich offene Order.

**Daten-Fluss:** Money-Pfad (`buy_*`, `recalc_floor_price`, Fee-Split) **unverändert**. Nur (a) ein zusätzlicher Reject-Pfad in `place_sell_order`, (b) Anzeige-Texte.

---

## 3. Betroffene Files (impact, grep-verifiziert)

**Backend (Money):**
- Migration neu: `get_price_floor` + `place_sell_order` (CREATE OR REPLACE, Live-Body als Baseline — D87).

**Service (Consumer von place_sell_order/get_price_cap — grep):**
- `src/lib/services/trading.ts` — `placeSellOrder` (Z.158, Cap-Guard Z.169-175), `getPriceCap` (Z.538). → `getPriceFloor` + Min-Guard ergänzen.
- `src/lib/services/offers.ts` — nutzt `recalc`/`create_offer` (P2P). **Scope-Out**: create_offer hat heute weder Cap noch Floor (konsistent lassen; setzt floor_price NICHT, da `orders`-Tabelle die Floor-Quelle ist, nicht `offers`).

**UI:**
- `src/components/player/detail/PlayerHero.tsx` — `floor` (Z.65), Sublabel `hero.floorCheapest` (Z.277). → quellen-abhängig.
- Sell-Form/Modal (placeSellOrder-Consumer) — Min-Preis-Hinweis (mirror Max-Hinweis).
- `messages/de.json` + `tr.json` — Label-Konsolidierung + `minPriceExceeded` Key + Sublabel-Varianten.

## 4. Code-Reading-Liste (Pflicht, großteils erledigt in Discovery)
| File / Objekt | Zweck | Befund |
|---|---|---|
| live `place_sell_order` | Money-RPC Baseline (D87) | nur `p_price>=1` + Cap; kein Floor — Insert-Punkt nach Cap-Check |
| live `get_price_cap` | Cap-Referenz | `GREATEST(3×ipo, 3×median_last10)`, <10 Trades → 3×ipo |
| live `recalc_floor_price` | Floor-Kaskade | MIN(sell)→ipo→last_price; Quelle nie exportiert |
| `trading.ts:158-195,538-542` | placeSellOrder + getPriceCap-Pattern | Cap-Guard wirft i18n-Key `maxPriceExceeded` → spiegeln |
| `PlayerHero.tsx:65,264,277` | Floor-Anzeige + Sublabel | `floorCheapest` hart, unabhängig von Quelle |
| `OrderbookSummary.tsx:23-28` | bestAsk = MIN(sellOrders) | Quelle-Signal „offene Order vorhanden" verfügbar |
| Sell-Modal (zu finden in BUILD) | Min-Hinweis | mirror Max-Preis-Hinweis |

## 5. Pattern-References
- `errors-db.md` Money-RPC PATCH-AUDIT (FRE-2/Slice 356): Live-Body als Baseline, ALLE Patches erhalten beim CREATE OR REPLACE. Konstanten prüfen.
- `errors-db.md` Idempotency/Return-Shape: `place_sell_order` Return-Shape unverändert lassen (Service castet `TradeResult`).
- `errors-frontend.md` i18n-Key-Leak (J1+J3): Service wirft Key, Consumer resolved via `mapErrorToKey`+`te()` — `minPriceExceeded` analog `maxPriceExceeded`.
- `errors-frontend.md` „Display-Anker aus Source-of-Truth" (S368b): Sublabel = echte Quelle, keine pauschale Behauptung.
- `business.md` Asset-Klasse-Drahtseilakt: „Marktpreis" neutral, kein Rendite-/Angebots-Versprechen; „Orderbuch"→ user-facing „Angebots-Tiefe" (bestehende Glossar-Regel beachten).

## 6. Acceptance Criteria (executable)
1. **AC-Floor-RPC:** `SELECT get_price_floor(id)` = `get_price_cap(id)/9` für Stichprobe (≥1 mit <10 Trades, ≥1 mit ≥10). VERIFY: SQL.
2. **AC-Reject:** `place_sell_order` mit `p_price` < floor → `{success:false, error:'minPriceExceeded'}`, **keine** Order angelegt, `floor_price` unverändert. VERIFY: Live-SQL-Smoke (Test-User).
3. **AC-Pass:** `place_sell_order` mit floor ≤ price ≤ cap → Order angelegt (unveränderter Erfolgspfad). VERIFY: SQL.
4. **AC-Edge cap0:** Spieler ohne Anker (cap=0) → floor=0 → Order ≥1 Cent erlaubt (kein neuer Block). VERIFY: SQL.
5. **AC-Service:** `placeSellOrder` wirft `minPriceExceeded` bei zu niedrigem Preis VOR RPC (Frontend-Guard, mirror cap). VERIFY: vitest.
6. **AC-i18n:** `minPriceExceeded` DE+TR vorhanden, via `mapErrorToKey` aufgelöst (kein Raw-Key-Leak). VERIFY: grep + node namespace-check.
7. **AC-Quelle:** PlayerHero-Sublabel = „günstigstes Angebot" NUR wenn offene Sell-Order == floor; sonst „letzter Verkauf" bzw. „Erstverkaufspreis". VERIFY: Playwright (Spieler mit/ohne offene Order).
8. **AC-Label:** kein user-facing „Markt Floor"; eine konsistente Bezeichnung. VERIFY: grep messages + Live-Render.
9. **AC-Money-unverändert:** `buy_player_sc`/`buy_from_order`/Fee-Split/`book_platform_treasury` byte-identisch (nur place_sell_order + get_price_floor angefasst). VERIFY: `pg_get_functiondef` diff.

## 7. Edge Cases
| Fall | Erwartung |
|---|---|
| ipo_price NULL/0, <10 Trades | cap=0 → floor=0 → nur ≥1-Cent-Regel |
| median << ipo (Preis gefallen) | Band um GREATEST-Referenz (cap), floor=cap/9 — schützt vor Crash unter Referenz/3 |
| price == floor exakt | erlaubt (`<` nicht `<=`) |
| price == cap exakt | erlaubt (bestehend) |
| floor=0 + price=1 | erlaubt |
| Integer-Division cap=8 → floor=0 | erlaubt ≥1 (kein Absturz, bewusst permissiv) |
| Spieler liquidiert | bestehender Block greift vor Floor-Check |
| offene Order vorhanden aber MIN > floor (stale) | Sublabel-Logik = strikt MIN==floor, sonst „letzter Verkauf" (fail-safe ehrlich) |

## 8. Self-Verification Commands
- `SELECT id, get_price_cap(id) cap, get_price_floor(id) floor FROM players WHERE ... LIMIT 5;`
- `pg_get_functiondef` von `place_sell_order` + `buy_player_sc` (Diff = nur erwartete Änderung).
- `CI=true pnpm exec vitest run src/lib/services/__tests__/trading.test.ts`
- `node -e` namespace-check `minPriceExceeded` in de+tr.
- `grep -rn "Markt Floor\|marketFloor" src/ messages/` → 0 user-facing nach Konsolidierung.
- Playwright bescout.net: Spieler mit offener Order vs. ohne → Sublabel-Text.

## 9. Open-Questions
**Pflicht-Klärung:** Faktor ÷3 ✅ bestätigt (Anil 2026-06-24). Label-Begriff „Marktpreis"/„Piyasa Fiyatı" = Vorschlag → bei Reject-Hinweis/TR-Compliance final mit Anil bestätigen falls Zweifel.
**Autonom-Zone (CTO):** Migrations-Body, Service-Guard, Sublabel-Logik-Struktur, Sell-Form-Hinweis-Wording-Entwurf (DE; TR Compliance-konform).
**Nicht-Autonom (Anil):** Faktor (erledigt), jede weitere Money-Pfad-Berührung, finaler user-facing Label-Begriff.

## 10. Proof-Plan
- `worklog/proofs/368c-floor-band.txt` — SQL: cap/floor-Stichprobe + Reject-Smoke + Pass-Smoke + cap0-Edge.
- `worklog/proofs/368c-functiondef-diff.txt` — buy_* unverändert.
- `worklog/proofs/368c-tests.txt` — vitest + tsc + i18n-check + label-grep.
- `worklog/proofs/368c-floor-source.png` — Playwright Sublabel beide Quellen.

## 11. Scope-Out
- `create_offer` (P2P) bleibt ohne Cap/Floor (konsistent, setzt floor_price nicht).
- Keine Änderung an `buy_*`/`recalc_floor_price`/Fee-Logik.
- Sybil-Ring-Erkennung (Lücke C) = separater Slice.
- Kein Daten-UPDATE bestehender Orders/Preise.

## 12. Stage-Chain (geplant)
SPEC → IMPACT (in §3/§4) → BUILD (Migration → Service → UI) → REVIEW (reviewer, Money-Pflicht) → PROVE (SQL+vitest+Playwright) → LOG (+Tracker-Reconcile + DISTILL-Check).

## 13. Pre-Mortem (5)
1. **floor zu hoch → blockt legitime Verkäufe.** Mitigation: cap/9 = Referenz/3, sehr permissiv; Edge-Tabelle prüft median-Fälle.
2. **CREATE OR REPLACE place_sell_order verliert einen bestehenden Patch** (Abo-Order-Limit, holding_locks, idempotency). Mitigation: Live-Body 1:1 als Baseline, nur Floor-Block additiv einfügen, functiondef-Diff im Proof.
3. **Sublabel falsch → behauptet „Angebot" obwohl last_price.** Mitigation: strikte MIN==floor-Bedingung, sonst ehrlicher Fallback.
4. **i18n-Key-Leak `minPriceExceeded` roh sichtbar.** Mitigation: mapErrorToKey-Eintrag + te()-Pfad wie maxPriceExceeded, grep-Check.
5. **Label-Umbenennung bricht anderen Consumer** (floorPrice in mehreren Namespaces). Mitigation: grep aller floorPrice/marketFloor-Vorkommen, je Consumer prüfen ob user-facing, nur user-facing ändern.

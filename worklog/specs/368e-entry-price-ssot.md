# Spec 368e — Zwei-Zahlen-Modell: „Markteintritt" + „aktueller IPO-Preis" sauber trennen + Daten reparieren

**Datum:** 2026-06-24 (Rewrite nach Anil-Klärung) · **Scope:** Money/CEO (§3) · **Größe:** L · **Slice-Type:** Migration + Service + UI
**Status:** SPEC — wartet auf Anil-Approval der Design-Entscheidungen (§7).

> **Rewrite-Grund (Anil 2026-06-24):** Die alte 368e-Spec wollte „3 Spalten → 1 (`ipo_price`)" kollabieren. Das ist FALSCH. Anils Modell: **Ein Verein kann mehrere geplante, vorangekündigte IPOs pro Spieler starten. Der ERSTE IPO = Markteintritt (zeigt die Entwicklung auf BeScout, eingefroren). Spätere IPOs = der aktuelle IPO-Preis.** Das sind **zwei dauerhaft getrennte Zahlen** — kollabieren würde sie zerstören. Live-Verifikation (D87) bestätigt: das Schema implementiert dieses Modell bereits, nur die DATEN sind durch Slice 114 + Seed-Müll verbogen.

## 1. Problem-Statement (Evidence, Live-verifiziert)

**Das Modell IST im Schema (zwei Live-Trigger beweisen es):**
- `trg_set_initial_listing_price` (AFTER INSERT ipos): setzt `players.initial_listing_price = NEW.price` **nur wenn IS NULL** → **einmalig beim ersten IPO, eingefroren = Markteintritt**.
- `sync_player_ipo_price` (AFTER INSERT/UPDATE price,status): setzt `players.ipo_price = NEW.price` **nur bei status announced/early_access/open** → folgt dem **zuletzt aktiven IPO = aktueller IPO-Preis**.
- `ipos` = voller Verlauf. **537 Spieler haben bereits mehrere IPOs** (Tranchen, Cooldown 30d, Pflicht-Ankündigung — trading.md).

**Die DATEN ehren das Modell nicht (Live-Counts gegen Prod `skzjfhvgccaeplydsunz`):**
| Defekt | Count (aktiv, nicht liq.) | Ursache |
|---|---|---|
| `ipo_price` (aktueller Preis) ≠ letzter echter aktiver IPO | ~488 | **Slice 114** überschrieb `ipo_price=MV/10` für ALLE (out-of-band, am Trigger vorbei). Bsp. Şeref Özcan: IPOs 31.100/31.153, aber `ipo_price=15.000`. |
| `initial_listing_price` (Markteintritt) = Seed-Müll oder verbogen | viele | Seed-IPOs mit Flach-Preisen (Douglas 500K → erster IPO 10) + ad-hoc-UPDATE dieser Session (2964 Zeilen). |
| `initial_listing_price ≠ ipo_price` | 1077 | Folge obiger zwei (Spec-alt sagte 648 = STALE). |
| `ipo_price = 0` (MV=0-Spieler) | 55 | Zero-Price-Guard-Fälle. |

**Symptom (Anil-flagged):** Douglas (MV 500K) zeigte 10–11 Credits als „Markteintritt", weil sein geseedeter erster IPO 10 war.

## 2. Lösungs-Design — Zwei Zahlen, getrennt, repariert

### Konzept A — „Markteintritt" (Entry, eingefroren, Entwicklungs-Basis)
- **Quelle der Wahrheit = früheste `ipos.price`** (per `created_at ASC`). Denormalisierter Cache = `initial_listing_price` (set-once-Trigger hält ihn korrekt für ZUKÜNFTIGE IPOs).
- **Alle Markteintritt-Anzeigen lesen EINE Quelle.** Heute: RewardsTab liest `ipos.price` (368b), TradingTab liest `initial_listing_price`. → vereinheitlichen.

### Konzept B — „Aktueller IPO-Preis" (nur wenn IPO läuft)
- **Quelle = aktive `ipos`-Row** (status open/early_access), live gelesen (`getIpoForPlayer`). **Bereits korrekt** in PlayerIPOCard/BuyModal/MarketContent — KEINE Änderung nötig.

### `players.ipo_price` — Rolle klären (§7 Q3)
- Heute denormalisiert „letzter aktiver IPO-Preis", aber Slice-114-korrupt. UI-Konsumenten (PriceChart-Referenzlinie, Portfolio-Wert-Fallback `valueBsd = floorBsd ?? ipoPriceBsd ?? avgBuyBsd`, SearchOverlay-Fallback) wollen semantisch eine **stabile Referenz = Markteintritt**, nicht den volatilen aktuellen Preis.
- **Empfehlung:** `players.ipo_price` wird zur denormalisierten **Markteintritt**-Referenz (= `initial_listing_price`), und der `sync_player_ipo_price`-Trigger wird auf **set-once** umgestellt (wie initial_listing). Dann sind `ipo_price` und `initial_listing_price` dasselbe (Markteintritt) → später EINE Spalte. „Aktueller IPO-Preis" braucht keine denormalisierte Spalte (wird live gelesen).

### Daten-Reparatur (Migration / einmaliger MCP-UPDATE + committed File)
- **Markteintritt** je Spieler ← früheste `ipos.price`. Für Seed-Müll-Erst-IPOs (kein echter Launch) → §7 Q2.
- **`players.ipo_price`** ← Markteintritt (nach Q3-Entscheid).
- **Pflicht-Schutz (Edge):** Rows mit **aktiver IPO** (open/early_access/announced) NICHT anfassen (sonst Live-Kaufpreis verändert).

## 3. Money-Pfad-Parität (Live-verifiziert — LOW Risk)
- `recalc_floor_price`: IPO-Floor-Komponente liest **aktive `ipos`-Row**, NICHT `players.ipo_price`. → ipo_price-Reparatur **bewegt Floor nicht**. (Live-Body geprüft.)
- `buy_from_ipo`: bucht über die spezifische `ipos`-Row (per id), nicht über `players.ipo_price`.
- `buy_player_sc`/`buy_from_order`: Orderbuch (`v_order.price`). Keine der 3 Spalten.
- Exposure: 610 Holdings, 6 offene Sell-Orders. Alle 3 Spalten = Display-only.

## 4. Code-Reading-Liste (Pflicht, Build)
| File | Zweck / zu prüfende Frage |
|---|---|
| live `sync_player_ipo_price`, `trg_set_initial_listing_price`, `recalc_floor_price`, `buy_from_ipo`, `create_ipo` | Trigger-/Money-Semantik (Q3 Trigger-Umstellung, Ankündigungs-/Cooldown-Regeln) |
| `src/lib/services/ipo.ts` (`getFirstIpoPrice` Z.96, `getIpoForPlayer` Z.64) | Entry- vs. Current-Quelle |
| `src/lib/services/players.ts` (`dbToPlayer` Z.243-244, PLAYER_SELECT_COLS Z.22) | Mapper `ipoPrice`/`initialListingPrice` |
| `src/components/player/detail/RewardsTab.tsx:42` | „Dein Einstieg" = Markteintritt-Leser #1 |
| `src/components/player/detail/TradingTab.tsx:95,121,154-156` | „Markteintritt" #2 + PriceChart-`ipoPrice`-Prop |
| `src/components/player/detail/PriceChart.tsx:100,140` | IPO-Referenzlinie = soll Markteintritt sein |
| `src/features/manager/hooks/useManagerData.ts:82,85` | Portfolio-% Cost-Basis → `avg_buy_price` (§7 Q1 alt = bestätigt) |
| `src/features/manager/components/kader/KaderTab.tsx:202`, `BestandView.tsx:387`, `layout/SearchOverlay.tsx:364` | `ipoPrice`-Wert-Fallbacks (Markteintritt-Semantik OK?) |
| `src/features/market/components/marktplatz/PlayerIPOCard.tsx:183` | „aktueller IPO-Preis" = Konzept B (unverändert) |
| `src/types/index.ts:70,580` | Type-Cleanup falls Spalte zusammengeführt |
| Tests: `players.test.ts:97`, `TradingTab.test.tsx:94-95,277`, `ipo.test.ts`, `db-invariants.test.ts` | anpassen |

## 5. Pattern-References
- **D100** (Vier-Zahlen-Modell) — Markteintritt vs. aktueller IPO-Preis sind die Zahlen #1 vs. eine IPO-Spielart. **D101 (neu)**: alte 368e-„auf 1 kollabieren"-Prämisse verworfen; ipo_price=MV/10 war Slice-114-Artefakt, nicht „die Wahrheit".
- errors-frontend.md S368b „Display-Anker aus Source-of-Truth".
- errors-db.md S303 „Seed-Wert-Poisoning" (Seed-IPO-Preise = Flach-Müll → Hygiene vor Formel) + D39 Trigger-Guard.
- errors-db.md S305/324 Column-DROP 4-Achsen-Audit (falls Spalten-Merge → DROP eigener Folge-Slice).

## 6. Acceptance Criteria
1. **Markteintritt = aktueller IPO-Preis sind getrennt darstellbar** und für einen Multi-IPO-Spieler (z.B. Aliou Badara: Entry 33.400, später 60.000) korrekt unterschiedlich angezeigt (Playwright/SQL).
2. „Dein Einstieg" (RewardsTab) == „Markteintritt" (TradingTab) == PriceChart-Referenzlinie — **eine Entry-Quelle**, identische Zahl (≥2 Spieler).
3. Douglas (MV 500K): Markteintritt ist ein plausibler Wert (nicht 10), nach Q2-Regel. VERIFY SQL + live.
4. Kein Spieler mit aktiver IPO wurde im Daten-UPDATE verändert (Pre/Post-SQL-Diff der aktiven-IPO-Rows = identisch).
5. „Aktueller IPO-Preis" (PlayerIPOCard) unverändert korrekt (liest aktive IPO live).
6. Re-Drift-Guard: Invariant-Test/Trigger hält Markteintritt = früheste ipos.price; künftige out-of-band-UPDATEs fail-closed oder erkannt.
7. tsc + vitest grün; Money-Smoke (buy/floor) byte-identisch; recalc_floor unberührt bewiesen.

## 7. Entscheidungen (Anil 2026-06-24) — ✅ ALLE GEKLÄRT
1. ✅ **Portfolio-„Wertentwicklung"-Cost-Basis = `holdings.avg_buy_price`** (echtes User-P&L). useManagerData umstellen.
2. ✅ **Seed-Markteintritt → `ROUND(MV/10)`** (kanonischer Default-Launchpreis). Alle bestehenden Spieler sind Phase-1-geseedet (keine echten Club-Launches) → Markteintritt = MV/10. Echte zukünftige IPOs behalten ihren echten Preis via Set-once-Trigger.
3. ✅ **`players.ipo_price` = Markteintritt** (eingefroren). Trigger `sync_player_ipo_price` wird von „folgt jedem aktiven IPO" auf **set-once** umgestellt (nur setzen wenn noch nicht gesetzt) — sonst überschreibt ein zweiter IPO den Markteintritt. `initial_listing_price` = redundanter Spiegel (= ipo_price). „Aktueller IPO-Preis" bleibt live aus aktiver `ipos`-Row (keine Spalte).
4. ✅ **DROP** der redundanten Spalte (`initial_listing_price`) = eigener Folge-Slice nach Reader=0.

**Repair-Regel (BUILD):** Für alle aktiven, nicht-liquidierten Spieler OHNE aktive IPO: `ipo_price = initial_listing_price = ROUND(market_value_eur/10)`. MV=0 → 0 (Anzeige „—"). Spieler MIT aktiver IPO (open/early_access/announced): **NICHT anfassen** (ipo_price = laufender Kaufpreis-Kontext). Trigger-Umstellung sichert Zukunft.

## 8. Proof-Plan
- SQL: Multi-IPO-Spieler Entry≠Current korrekt; aktive-IPO-Rows Pre/Post identisch; Douglas Markteintritt plausibel.
- Playwright: RewardsTab „Dein Einstieg" == TradingTab „Markteintritt" == Chart-Linie; PlayerIPOCard aktueller IPO-Preis; ≥2 Spieler, DE+TR, kein NaN/i18n-Leak.
- vitest + tsc + reader-grep + `pg_get_functiondef` der geänderten Trigger.

## 9. Scope-Out
- „Aktueller IPO-Preis"-Anzeige (Konzept B) — bereits korrekt, nicht anfassen.
- DROP COLUMN (eigener Folge-Slice).
- Echte Club-IPO-Preis-Logik / mehrere reale Tranchen-Flows (Phase 1 keine echten Clubs).
- Sybil/Anti-Manipulation (368c, separater Phase-2-Slice).

## 10. Stage-Chain
SPEC (Rewrite) → IMPACT ✅ (`worklog/impact/368e-entry-price-ssot.md`, Live-verifiziert) → BUILD (Daten-Reparatur mit aktive-IPO-Schutz → Trigger Q3 → Entry-Reader vereinheitlichen → Type/Test-Cleanup → Re-Drift-Guard) → REVIEW (reviewer, Money) → PROVE → LOG (+ D101 DISTILL + trading.md/treasury.md update).

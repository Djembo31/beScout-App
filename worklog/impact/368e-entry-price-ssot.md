# Impact Manifest: 368e — Einstiegspreis-SSOT (3 Spalten → 1: `ipo_price`)

**Generated:** 2026-06-24 · **Scope:** Money/CEO (§3) · Analyst: Primary-Claude (selbst, Money)

## Live-Baseline (D87 — verifiziert gegen Prod `skzjfhvgccaeplydsunz`, NICHT Spec-Zahlen)

| Metrik | Wert | Quelle |
|---|---|---|
| Aktive Spieler (nicht liquidiert) | **4556** | `players` |
| `initial_listing_price ≠ ipo_price` (aktiv) | **1077** | (Spec sagte 648 — STALE) |
| earliest `ipos.price ≠ ipo_price` (aktiv) | **488** | first-ipo CTE |
| `ipo_price = 0` (MV=0-Spieler) | **55** | Edge |
| `ipo_price IS NULL` | 0 | — |
| Aktive mit IRGENDeinem ipo-Row | 4166 (≈390 aktive ohne ipo-Row) | `ipos` |
| **Aktive Holding-Rows (Money-Exposure)** | **610** | `holdings qty>0` |
| **Offene Sell-Orders** | **6** | `orders` |

## ⚠️ KERN-FUND: Spec-Prämisse ist invertiert

368b/Spec-Rationale: „`ipo_price` Slice-114-vergiftet, `ipos.price` ehrlich". **Live-Stichprobe der 488 widerlegt das:**
- `ipo_price` ist durchgängig **= ROUND(MV/10)** = der **saubere kanonische Default** (D99/D100/trading.md). Beispiele: Badji MV 900K → ipo_price 90000 ✓; Gümüşkaya MV 550K → 55000 ✓.
- `ipos.price` ist für diese 488 **flacher Seed-Müll** (1000, 50600, 56900, 60700 …) **ohne MV-Bezug**. = NICHT ehrlich.
- **Gegenbeispiel existiert** (Owusu, 368b-verifiziert): ipos.price 461 CR = echte Erst-IPO, ipo_price 400 = MV/10. Hier ist ipos.price der ehrlichere.

→ **Es gibt KEINE durchgehend ehrliche Spalte** (beide mischen Gold + Seed-Müll). `ipo_price` = MV/10 ist die **konsistenteste, erklärbarste, sauberste** Wahl. Spec-Richtung (ipo_price = SSOT) ist damit **richtig — sauberer als die Spec-Begründung selbst behauptet.** Begründung in Spec §5 muss korrigiert werden (→ D101).

## Betroffene Code-Pfade

| Layer | File:Line | Symbol | Beziehung | Aktion |
|---|---|---|---|---|
| DB-Trigger | live `trg_ipo_set_initial_listing` (AFTER INSERT ipos) → `trg_set_initial_listing_price()` | schreibt `players.initial_listing_price = NEW.price` | **Drift-Writer** | Bei DROP-Vorbereitung neutralisieren/entfernen |
| DB-Trigger | live `trg_sync_player_ipo_price` (AFTER INSERT/UPDATE price,status) → `sync_player_ipo_price()` | schreibt `players.ipo_price = NEW.price` | **Re-Drift-Guard-Anker** | bleibt (hält ipo_price=ipos.price bei künftigen IPOs) |
| Data | `players.ipo_price` / `ipos.price` / `players.initial_listing_price` | 3 Spalten | Align-Ziel | UPDATE: ipos.price + ilp ← ipo_price |
| Service | `src/lib/services/players.ts:22` PLAYER_SELECT_COLS, `:244` mapper | `initialListingPrice` | Reader | nach Reader=0 aus SELECT+mapper raus (mit Type) |
| Service | `src/lib/services/ipo.ts:96` `getFirstIpoPrice` | liest `ipos.price` | RewardsTab-Anker | entfernen wenn 0 Consumer |
| Hook | `src/lib/queries/misc.ts:250` `useFirstIpoPrice` + `keys.ts` `qk.ipos.firstPrice` | wrappt getFirstIpoPrice | Consumer = RewardsTab | entfernen |
| UI | `src/components/player/detail/RewardsTab.tsx:42` | `useFirstIpoPrice` „Dein Einstieg" | **Reader-Switch** | → `player.prices.ipoPrice` (§7 #2) |
| UI | `src/components/player/detail/TradingTab.tsx:147,154,156` | `initialListingPrice` „Markteintritt" | **Reader-Switch** | → `ipoPrice` |
| Hook | `src/features/manager/hooks/useManagerData.ts:82,85` | `initialListingPrice` Portfolio-% | **Reader-Switch** | → `holdings.avg_buy_price` (§7 #1) |
| Type | `src/types/index.ts:70` (prices) `:580` (DbPlayer) | `initialListingPrice` / `initial_listing_price` | Type-Cleanup | nach Reader=0 entfernen |
| Test | `players.test.ts:97`, `TradingTab.test.tsx:95,277` | Fixtures/Assertions | anpassen | ipoPrice-basiert |
| **CLEAN (kein Reader)** | `src/features/market/components/portfolio/BestandView.tsx` | nutzt schon `holdings.avg_buy_price` (Z.127/131) | — | **Spec-Verdacht falsch — nichts zu tun** |

## Side-Effects-Parität
Reine Anzeige-Werte. Kein Mission/Achievement/Notify/ActivityLog betroffen. Cache: nach Daten-UPDATE `qk.players.all` invalidieren (Live), `qk.ipos.firstPrice` entfällt.

## Money-Pfad-Parität (KRITISCH — verifiziert LOW)
- `buy_player_sc`/`buy_from_order` buchen über **Orderbuch** (`v_order.price` der günstigsten fremden Sell-Order), NICHT über ipo_price/initial_listing_price/ipos.price. → die 3 Spalten sind **Display-only**.
- `buy_from_ipo` bucht über `ipos.price` der **aktiven** IPO. Align betrifft `ipos.price` → bei **0 aktiven IPOs** mit Mismatch kein Money-Effekt. **VOR UPDATE prüfen:** kein `status IN ('open','early_access')`-IPO unter den zu ändernden ipos-Rows (sonst änderte man einen Live-Kaufpreis!).
- `recalc_floor_price` liest `ipo_price` (Floor-Fallback) — Align ändert ipo_price NICHT (ipo_price ist die Quelle), nur die zwei abgeleiteten Spalten. Floor unberührt.
- Exposure: 610 Holdings, 6 offene Sell-Orders.

## CHECK / Constraints
Keine CHECK auf den drei Preis-Spalten betroffen. `transactions.type` unberührt (kein neuer Typ).

## Edge Cases (BUILD-Pflicht)
1. **55 Spieler `ipo_price=0`** (MV=0) → SSOT=0 → Anzeige „—" (RewardsTab-Guard `entryPrice>0` greift). ilp/ipos.price auf 0 angleichen oder lassen? → auf 0 angleichen (Konsistenz).
2. **~390 aktive Spieler ohne ipo-Row** → `UPDATE ipos` trifft sie nicht (kein Row); ilp ← ipo_price trotzdem. RewardsTab zeigt jetzt ipo_price (MV/10) statt 368b-„—". = bewusste §7-#2-Folge.
3. **Aktive IPO unter Mismatch-Rows** → NICHT überschreiben (Live-Kaufpreis). Filter `status NOT IN ('open','early_access','announced')` ODER nur initial_listing_price + ipo_price-Konsistenz, ipos.price aktiver IPO unangetastet.
4. **İsmail-Kalburcu-Typ** (MV=0, ipo_price=3728160 Ausreißer) → propagiert als SSOT; Display-only, akzeptabel; optional separat normalisieren.
5. Owusu-Typ (ipos.price = echte 461 > ipo_price 400) → verliert echten IPO-Display zugunsten MV/10-Default. Unwiederbringlich lt. Handoff; bewusste Vereinheitlichung.

## Re-Drift-Guard
`trg_sync_player_ipo_price` hält künftig ipo_price = ipos.price bei IPO-Anlage. `trg_set_initial_listing_price` ist die EINZIGE Laufzeit-Drift-Quelle für initial_listing_price → vor DROP COLUMN neutralisieren. Invariant-Test (db-invariants): `initial_listing_price = ipo_price` für alle aktiven (oder Spalte weg).

## Risk: **MEDIUM**
Daten-UPDATE auf ~1077 Zeilen + Trigger-Wissen + Reader-Switch über 3 UI-Pfade. Money-Exposure aber LOW (Display-only, 610 Holdings, Orderbuch-Pricing entkoppelt). Haupt-Risiko = **aktive-IPO-Überschreibung** (Edge 3) → Pflicht-Filter.

## Action Items (BUILD-Reihenfolge)
1. [ ] Pre-UPDATE-Gate: `SELECT count(*) FROM ipos WHERE status IN ('open','early_access','announced')` unter den Mismatch-Playern = muss in UPDATE ausgeschlossen werden.
2. [ ] Daten-Align (Migration ODER einmaliger MCP-UPDATE + committed Migration-File): `initial_listing_price ← ipo_price` (alle aktiven); `ipos.price ← ipo_price` NUR für nicht-aktive IPOs.
3. [ ] RewardsTab → `prices.ipoPrice`; TradingTab → `ipoPrice`; useManagerData → `avg_buy_price` (braucht holdings im Hook — prüfen ob verfügbar).
4. [ ] Entfernen: `getFirstIpoPrice`/`useFirstIpoPrice`/`qk.ipos.firstPrice` (nach Consumer=0); `initialListingPrice` aus Type+mapper+SELECT_COLS (PLAYER_SELECT_COLS-Sync, S200).
5. [ ] Tests anpassen (players.test, TradingTab.test) + db-invariant.
6. [ ] DROP COLUMN initial_listing_price + Trigger `trg_set_initial_listing` = **eigener Folge-Slice** (Reader=0 verifiziert, S305/324 4-Achsen-grep).
7. [ ] DISTILL D101 (Spec-Rationale-Korrektur: ipo_price=MV/10 ist die saubere SSOT, nicht „vergiftet").

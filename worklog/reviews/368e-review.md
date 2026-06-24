# Review — Slice 368e (Zwei-Zahlen-Modell: Markteintritt + aktueller IPO-Preis)

**Reviewer:** Cold-Context reviewer-Agent · **Scope:** Money/CEO (§3) · **Datum:** 2026-06-24
**Verdict:** CONCERNS → MEDIUM geheilt (siehe unten) → mergebar.

## Geprüfte Behauptungen (alle bestätigt)
- **Money-Safety:** Kein CHARGE-Pfad liest die 3 reparierten Spalten. `recalc_floor_price` liest aktive `ipos`-Row (nicht `players.ipo_price`); `buy_from_ipo` bucht über die `ipos`-Row; Orderbuch über `orders.price`. → reine Display-Werte, Reparatur bewegt kein Geld.
- **Aktive-IPO-Schutz:** `NOT EXISTS`-Guard nachweislich wirksam (`protected_active_ipo=0`), NULL-safe (vs. `NOT IN`).
- **Units:** durchgängig korrekt (Credits vs. Cents): `avg_buy_price/100` → Credits; `prices.ipoPrice` = centsToBsd.
- **Toter Pfad:** `getFirstIpoPrice`/`useFirstIpoPrice`/`qk.ipos.firstPrice` vollständig entfernt, 0 Orphans.
- **Migration-Hygiene:** AR-44-Ausnahme korrekt (Trigger-Fn brauchen kein REVOKE); Timestamp `20260624200000` = höchster aller Migrations (S326 ok).

## Findings

### MEDIUM — Set-once-Sentinel vorzeitig verbrannt (✅ GEHEILT)
- **Location:** `supabase/migrations/20260624200000_*.sql` (Daten-Reparatur)
- **Issue:** Die Reparatur setzte `initial_listing_price = MV/10` auch für ~390 Spieler OHNE `ipos`-Row. Dadurch ist der Sentinel `initial_listing_price IS NULL` nicht mehr NULL → `trg_set_initial_listing` würde bei deren **erstem echten IPO** nicht mehr feuern → Markteintritt bliebe MV/10-Default statt echtem IPO-Preis.
- **Fix (angewandt):** Sentinel-Restore-Schritt 1b — `UPDATE players SET initial_listing_price = NULL WHERE NOT EXISTS (ipos-Row)`. Live verifiziert: `ipoless_with_ilp=0`, `withipo_ilp_off=0`, `total_ilp_null=390` (= IPO-lose, Sentinel intakt). In Migration-File nachgezogen (Greenfield-korrekt).
- Semantisch sauberer: IPO-loser Spieler = kein Markteintritt → NULL ist ehrlicher als MV/10.

### LOW — Admin-Override-Backfill-Awareness
- Künftige Admin-IPOs mit Preis ≠ MV/10 setzen den Markteintritt korrekt via Trigger (für IPO-lose Spieler dank Sentinel-Restore). Für bereits IPO-behaftete Spieler ist der Markteintritt jetzt auf MV/10 standardisiert (Anil Q2, bewusst). Kein Handlungsbedarf.

### LOW — Playwright-Proof ausstehend
- AC2 (RewardsTab „Dein Einstieg" == TradingTab „Markteintritt" == PriceChart-Linie) + PlayerIPOCard-Unverändertheit → post-Deploy gegen bescout.net (Vercel baut von main). Offen, nicht-blockierend.

## Fazit
Money-sauber, architektonisch korrekt (Zwei-Zahlen-Modell sauber getrennt). MEDIUM root-cause-geheilt. Mergebar; ein Playwright-Proof post-Deploy nachziehen.

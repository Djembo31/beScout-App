# Slice 408 — Trading-Vokabular entwirren: Markt (sofort) vs Kaufgebot (P2P) [Welle 1.4b]

**Slice-Type:** UI + i18n
**Größe:** S
**CEO-Scope:** Wording (user-facing) — Anil delegiert an CTO-Empfehlung (Option A), 2026-06-27.
**Welle:** Mock→Pro Welle 1.4b (D112 Fork-B-Härtung).

## 1. Problem-Statement (Evidence)
Auf der Player-Detail-Trading-Tab heißen ZWEI verschiedene Mechaniken beide „Angebot":
- **Sektion 7 `transferMarketOrders`** = „Marktplatz (User-Angebote)" → das Orderbuch (`allSellOrders`), **sofort kaufbar** via `buy_from_order`.
- **Sektion 5 `offers` / `makeOffer`** = „Angebote" / „Kaufangebot machen" → echte **P2P-Verhandlung** (`offers`/`create_offer`, Halter muss annehmen, nicht sofort).
Der Nutzer kann nicht unterscheiden, was sofort kauft vs. was verhandelt wird (D112 Fork-B: beide bleiben → müssen klar getrennt lesen). Zusätzlich: **Sektion 6 `activeOffers`** („Aktive Angebote", `player.listings`) ist im Player-Detail **immer leer** (Mapper setzt `listings:[]`, nie befüllt — befüllt nur in KaderTab/Manager) → rendert nie = tote UI + dritter „Angebot"-Begriff im Code.

## 2. Lösungs-Design (Option A, CEO-approved-by-delegation)
Lexikalisch saubere + compliance-konforme Trennung („Orderbuch"/„Trader" sind business.md-verboten):
- **Markt = „Angebote" (sofort kaufbar):** Verkaufsorders, du nimmst durch Sofort-Kauf an.
- **P2P = „Kaufgebote":** Gebote (bids), die ein Halter annimmt — Verhandlung, kein Sofortkauf.
- Je Sektion eine klarstellende **Unterzeile**.
- Tote Sektion 6 (Render-Block) entfernen.

## 3. Betroffene Files
| File | Änderung |
|------|----------|
| `src/components/player/detail/TradingTab.tsx` | Sektion 5 Header+Subtitle (P2P), Sektion 7 Header+Subtitle (Markt), Sektion 6 Render-Block raus |
| `src/components/player/detail/OfferModal.tsx` | nur falls Titel/Subtitle-Wording via Props — Keys liegen in messages |
| `messages/de.json` | `playerDetail.offers`/`makeOffer`/`transferMarketOrders` + 2 neue Subtitle-Keys; `player.offer.title`/`subtitle`/`send` |
| `messages/tr.json` | spiegelbildlich |

## 4. Code-Reading-Liste (erledigt, Live)
1. `TradingTab.tsx` — Sektionen 5 (offers/makeOffer), 6 (activeOffers/player.listings), 7 (transferMarketOrders). ✓
2. `OfferModal.tsx` — Titel/Subtitle/Send via `player.offer.*`-Keys. ✓
3. `players.ts:252` — `listings: []` (nie im Detail befüllt). ✓
4. `KaderTab.tsx:208` + `player/index.tsx:481` — `player.listings` DORT genutzt → Type + Listing bleiben, nur TradingTab-Render-Block raus. ✓
5. `business.md` Kapitalmarkt-Glossar — „Orderbuch"→„Angebots-Tiefe", „Trader" verboten; „Marktplatz"/„Angebot"/„Gebot" erlaubt. ✓
6. DE+TR Ist-Strings aller Keys gezogen. ✓

## 5. Pattern-References
- **business.md Kapitalmarkt-Glossar:** user-facing Securities-Begriffe verboten (Orderbuch/Trader).
- **errors-frontend.md S198/S333:** neuer `t()`-Key → SOFORT DE+TR + namespace-korrekt + Live-Render-Console-Scan auf MISSING_MESSAGE.
- **S399:** `messages/*.json` nach Änderung mit `node JSON.parse` validieren (gerade `"` bricht JSON).

## 6. Acceptance Criteria
- **AC-1 [UI] Markt klar:** Sektion 7 liest „Marktplatz · sofort kaufbar" + Subtitle „Günstigstes Angebot wird sofort gekauft." (kein „User-Angebote" mehr).
- **AC-2 [UI] P2P klar:** Sektion 5 „Kaufgebote" + Subtitle „Dein Gebot — ein Halter kann es annehmen, kein Sofortkauf."; Button „Kaufgebot abgeben"; OfferModal-Titel „Kaufgebot abgeben".
- **AC-3 [DEAD] Sektion 6 weg:** kein `activeOffers`-Render-Block mehr in TradingTab.
- **AC-4 [i18n] DE+TR Parität:** alle geänderten + 2 neuen Keys in beiden Locales, `node JSON.parse` beide grün.
- **AC-5 [COMPLIANCE] keine verbotenen Begriffe:** kein „Orderbuch"/„Trader" user-facing eingeführt.
- **AC-6 [BUILD] tsc + vitest grün.**
- **AC-7 [VISUAL] post-Deploy Playwright:** Player-Detail Trading-Tab DE+TR — Markt- vs Kaufgebot-Sektion lesen distinkt, kein Roh-Key-Leak.

## 7. Edge Cases
| Fall | Verhalten | AC |
|------|-----------|----|
| Spieler ohne Sell-Orders | Sektion 7 rendert nicht (`allSellOrders.length>0`-Gate) — kein leeres „Marktplatz" | bestehend |
| Spieler ohne P2P-Bids | Sektion 5 zeigt `noOpenBids` (bleibt), Subtitle bleibt sichtbar | AC-2 |
| TR „teklif" = offer+bid (kein lex. Split) | TR disambiguiert via „hemen al"(sofort)-Subtitle am Markt; P2P bleibt „Alım teklifi" | AC-2/AC-4 |
| KaderTab/Manager nutzt `player.listings` | unberührt (nur TradingTab-Block raus) | AC-3 |

## 8. Self-Verification
```bash
node -e "JSON.parse(require('fs').readFileSync('messages/de.json','utf8')); JSON.parse(require('fs').readFileSync('messages/tr.json','utf8')); console.log('JSON OK')"
grep -niE 'orderbuch|\btrader\b' messages/de.json messages/tr.json   # erwartet: 0 user-facing
pnpm exec tsc --noEmit
```

## 9. Open-Questions
- **CEO:** Wording-Richtung = Option A (Anil „Empfehlung"). ✓
- **Scope-Out:** Portfolio-„Angebote"-Tab (`market.offers`, zeigt gemischte buy+sell P2P-Offers) NICHT umbenennen (eigene Konsistenz-Folge) · tote Sektion 6 nur Render-Block (Type/Keys bleiben).

## 10. Proof-Plan
- `worklog/proofs/408-i18n.txt` — JSON-Validität + Key-Parität + grep-Compliance + tsc.
- `worklog/proofs/408-live.txt` — post-Deploy Playwright (Markt vs Kaufgebot distinkt, DE+TR, kein MISSING_MESSAGE).

## 11. Scope-Out
Portfolio-Offers-Tab-Label · `player.listings`-Type/KaderTab · `activeOffers`/`listingsCount`-Keys (orphan nach Block-Removal, bleiben — `activeOffers` zudem in club ActiveOffersSection eigener Namespace).

## 12. Stage-Chain
SPEC ✅ → IMPACT skipped (reine Label/i18n + 1 toter Render-Block, Consumer §4 gegreppt) → BUILD (TradingTab + de/tr.json) → REVIEW self-review (S UI/i18n, kein Money, Compliance-geprüft) → PROVE (i18n-Parität + tsc + post-Deploy Playwright) → LOG.

## 13. Pre-Mortem (S)
1. **MISSING_MESSAGE durch neuen Subtitle-Key** → S198/S333: beide Locales sofort + Live-Console-Scan (AC-7).
2. **JSON-Bruch durch gerade `"`** → S399: node JSON.parse-Gate (AC-4).
3. **Verbotener Begriff eingeführt** → AC-5 grep.
4. **Sektion-6-Removal bricht KaderTab** → nur TradingTab-Block raus, `player.listings`-Type unberührt (AC-3).

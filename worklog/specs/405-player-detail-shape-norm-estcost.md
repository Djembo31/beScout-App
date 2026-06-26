# Slice 405 — Welle 1.1: Player-Detail Order-Kauf Shape-Norm + BuyConfirmation est-total

**Slice-Type:** UI
**Größe:** S
**CEO-Scope:** Money-angrenzend (Display/onSuccess — Money-Flow byte-identisch, kein RPC/Migration). Reviewer Pflicht.
**Welle:** Mock→Pro Welle 1 (Trading), Plan-Punkt 1.1-Abschluss (kanonischer Player-Detail-Pfad).

---

## 1. Problem-Statement (Evidence)

Zwei zusammenhängende „was du siehst = was du zahlst"-Lücken im **kanonischen** Player-Detail-Kaufpfad — beide vom Slice-404-Reviewer faktisch gegen die Live-RPC verifiziert (`worklog/reviews/404-review.md` Finding #2 + INFO):

**Bug A — onSuccess-Shape-Bug (`usePlayerTrading.ts:248-253`).** Der Buy-Hook routet `orderId ? buyFromOrder : buyFromMarket`. Die RPCs liefern divergente Shapes:
- `buy_player_sc` (Markt) → `new_balance` / `price_per_dpc` (Migration 358:131)
- `buy_from_order` (Order) → `buyer_new_balance` / `price` (Migration 358:269)

Der gemeinsame `onSuccess` liest nur die Markt-Shape:
```ts
const priceBsd = result.price_per_dpc ? formatScout(result.price_per_dpc) : '?';   // Order-Pfad: undefined → "?"
if (result.new_balance != null) setWalletBalance(qc, userId, result.new_balance);   // Order-Pfad: nie → kein optimist. Update
optimisticallyAddHolding(userId, quantity, result.price_per_dpc ?? 0);              // Order-Pfad: Preis 0
```
**Folge beim Order-Kauf:** Erfolgs-Toast zeigt Preis „?", **kein** optimistisches Wallet-Update (Header springt erst nach Invalidate), Holding-Optimismus mit avg_buy_price 0 (kurzzeitig falscher Bestand-Preis). `tsc` grün, weil beide Felder im Cast-Type `?:` optional sind. 404 erbt den Bug NICHT (eigener `??`-Norm im Markt-Container) — der kanonische Pfad ist die letzte unsaubere Stelle.

**Bug B — BuyConfirmation est-total aus Floor statt Order-Preis (`BuyConfirmation.tsx:27` + `BuyModal.tsx:255`).** `BuyConfirmation` erscheint NUR wenn der Käufer eigene Sell-Orders auf den Spieler hat (`handleBuy`: `if (userOrders.length > 0)`). Es rechnet `estTotalCents = Math.round(floorBsd * 100) * pendingBuyQty` und zeigt „Geschätzte Kosten" + „Saldo danach" aus `floorBsd`. Aber: `floor_price` schließt **eigene** offene Sell-Orders ein (trading.md S7-303 F-1), während `buy_from_order`/`buy_player_sc` gegen die günstigste **fremde** Order buchen. Genau im Confirmation-Kontext (User HAT eigene Orders) kann der Floor < echter Charge sein → die Bestätigung unterschätzt die Kosten. Derselbe Trust-Defekt, den 404 im Markt-Tab behob.

## 2. Lösungs-Design

**Bug A:** `usePlayerTrading.onSuccess` normalisiert beide Shapes (identisches Pattern wie 404, codifiziert errors-frontend.md S404):
- `result.price_per_dpc ?? result.price` (Preis)
- `result.new_balance ?? result.buyer_new_balance` (Balance)
Beide tsc-sicher: `buyMut` ist auf `Awaited<ReturnType<typeof buyFromMarket>>` = `TradeResult` typisiert, das alle vier Felder (`new_balance?`, `price_per_dpc?`, `price?`, `buyer_new_balance?`) trägt (trading.ts:57-72).

**Bug B:** `BuyModal` resolved den **gebundenen** Order-Preis und gibt ihn an `BuyConfirmation` statt Floor:
- `pendingBuyOrderId` gesetzt → Preis der gewählten fremden Order (`userFilteredOrders.find(id)`)
- sonst → günstigste fremde Order (`cheapestOrder` = `userFilteredOrders[0]`, schon nach Preis sortiert)
- keine fremde Order vorhanden (theoretisch) → Floor-Fallback (heute: Confirmation zeigt nur bei eigenen Orders, Markt kann leer sein → Fallback ist der sichere Default)

`BuyConfirmation`-Prop `floorBsd` → `priceBsd` umbenennen (semantik-ehrlich); est-total + „Saldo danach" rechnen aus `priceBsd`. Keine Money-RPC-Berührung — Anzeige folgt der RPC-Wahrheit, statt sie zu erraten.

## 3. Betroffene Files

| File | Änderung | Grund |
|------|----------|-------|
| `src/components/player/detail/hooks/usePlayerTrading.ts` | `onSuccess` 3 Zeilen: `?? buyer_new_balance` / `?? price` | Bug A |
| `src/components/player/detail/trading/BuyConfirmation.tsx` | Prop `floorBsd`→`priceBsd`; est-total + Saldo-danach aus `priceBsd` | Bug B |
| `src/components/player/detail/BuyModal.tsx` | bound-order-Preis resolven + als `priceBsd` an BuyConfirmation | Bug B |
| `src/components/player/detail/hooks/__tests__/usePlayerTrading.test.ts` | Test: Order-Buy onSuccess → Balance/Preis aus buyer_new_balance/price | Regression-Guard A |
| `src/components/player/detail/trading/__tests__/BuyConfirmation.test.tsx` | Test: est-total aus priceBsd (Prop-Rename) | Regression-Guard B |

## 4. Code-Reading-Liste (erledigt VOR Implementation)

1. `usePlayerTrading.ts:222-262` — `buyMut`-Generic `Awaited<ReturnType<typeof buyFromMarket>>`, onSuccess-Body. ✅ gelesen: Bug-Zeilen 250/252/253 bestätigt.
2. `src/lib/services/trading.ts:57-72` — `TradeResult` trägt alle 4 Felder → `??` tsc-sicher. ✅ bestätigt.
3. `src/lib/services/trading.ts:221+` — `buyFromOrder` Runtime-Shape = `buyer_new_balance`/`price` (Reviewer-verifiziert gg. functiondef 358:269). ✅
4. `BuyModal.tsx:169-206` — `userFilteredOrders` (fremde, preis-sortiert), `cheapestOrder`, `selectedOrder`, `activePriceCents`. ✅ Quelle für bound-order-Preis.
5. `BuyModal.tsx:250-261` — `BuyConfirmation`-Render mit `floorBsd={player.prices.floor ?? 0}` + `pendingOrderId={pendingBuyOrderId}`. ✅
6. `usePlayerTrading.ts:472-482` — `handleBuy`: BuyConfirmation nur bei `userOrders.length > 0`, bindet `orderId`. ✅
7. `BuyConfirmation.tsx` (ganz) — `estTotalCents`, estCost/balanceAfter-Render. ✅
8. `.claude/rules/errors-frontend.md` S404 — Fix-Pattern bereits codifiziert. ✅

## 5. Pattern-References

- **errors-frontend.md S404** — „Multi-RPC-Routing in EINEM Mutation-Hook → onSuccess MUSS beide Return-Shapes normalisieren". Direktes Vorbild (404 = Markt-Pfad, 405 = Player-Detail-Pfad).
- **trading.md S7-303 F-1** — „Display vs Charge bei eigener Order": Floor inkl. eigener Orders, Charge gegen fremde → exakt Bug B.
- **trading.md Floor-Regel** — Client liest nur `player.prices.floor`, kein Recompute. Bug-B-Fix recomputet NICHT den Floor, sondern liest den Order-Preis aus der bereits geladenen `allSellOrders`-Liste (Anzeige, kein Floor-SSOT-Eingriff).
- **D87** — Shape gegen Live-functiondef verifiziert (via 404-Reviewer), nicht Service-JSDoc.

## 6. Acceptance Criteria

- **AC-1 [Bug A, VERIFY tsc+vitest]:** `usePlayerTrading.onSuccess` nutzt `result.price_per_dpc ?? result.price` und `result.new_balance ?? result.buyer_new_balance`. Unit-Test: mock `buyFromOrder` Return `{success,price,buyer_new_balance}` → `setWalletBalance` mit `buyer_new_balance` aufgerufen, Toast-Preis ≠ „?". FAIL-IF: Order-Buy lässt Balance unverändert.
- **AC-2 [Bug A, Markt-Regression]:** Markt-Buy (`buyFromMarket` Return `{new_balance,price_per_dpc}`) bleibt unverändert korrekt (Test grün). FAIL-IF: `??` kehrt Priorität um und liest `price`/`buyer_new_balance` zuerst.
- **AC-3 [Bug B, VERIFY tsc+vitest]:** `BuyConfirmation` est-total rechnet aus dem übergebenen Order-Preis (`priceBsd`), nicht aus Floor. Test: Prop `priceBsd=15` qty=2 → „30 CR". FAIL-IF: zeigt Floor×qty.
- **AC-4 [Bug B, VERIFY code]:** `BuyModal` resolved `priceBsd` = `pendingBuyOrderId`-Order-Preis (sonst cheapest fremde Order, sonst Floor-Fallback). FAIL-IF: gibt weiter `player.prices.floor` durch.
- **AC-5 [LIVE Playwright post-Deploy]:** Player mit eigener Sell-Order + fremder Order, deren Preis ≠ Floor. Order-Kauf: (a) Erfolgs-Toast zeigt echten Preis (kein „?"), (b) Header-Balance springt sofort −echte Summe, (c) BuyConfirmation „Geschätzte Kosten" == fremder Order-Preis == DB-Charge. DE+TR kein Roh-Key. FAIL-IF: irgendeine der drei lügt.
- **AC-6 [Money byte-identisch]:** Kein RPC/Migration/Service-Body geändert (`git diff` zeigt nur die 3 UI/Hook-Files + 2 Tests). FAIL-IF: trading.ts/migrations berührt.

## 7. Edge Cases

| Fall | Erwartet |
|------|----------|
| Order-Buy, `buyer_new_balance` undefined (RPC-Drift) | `new_balance ?? buyer_new_balance` = undefined → `!= null` false → kein falsches Update (status quo, kein Crash) |
| Markt-Buy, `price` zufällig auch gesetzt | `price_per_dpc ?? price` nimmt `price_per_dpc` zuerst → korrekt |
| BuyConfirmation, `pendingBuyOrderId=null` (Markt-Standard) | cheapest fremde Order-Preis (was buy_from_market bucht) |
| BuyConfirmation, gebundene Order zwischenzeitlich weg | `find` → undefined → cheapest-Fallback → sonst Floor (Anzeige; RPC bleibt autoritativ + wirft „Order nicht mehr aktiv") |
| Keine fremde Order (nur eigene) | Floor-Fallback (Confirmation-Kosten approximativ; Kauf würde ohnehin failen/leer) |
| balance < Order-Preis | „Saldo danach" rot/negativ (wie heute), kein Money-Eingriff |

## 8. Self-Verification Commands

```bash
# Bug A: kein nicht-normalisierter Lese-Pfad mehr
grep -n "result.new_balance\|result.price_per_dpc\|buyer_new_balance\|result.price\b" \
  src/components/player/detail/hooks/usePlayerTrading.ts
# erwartet: jede Lesestelle mit ?? gepaart

# Bug B: kein floorBsd-Prop mehr an BuyConfirmation
grep -n "floorBsd\|priceBsd" src/components/player/detail/BuyModal.tsx \
  src/components/player/detail/trading/BuyConfirmation.tsx

# Money byte-identisch
git diff --stat   # nur 5 Files (3 UI/Hook + 2 Tests)

npx tsc --noEmit
CI=true npx vitest run src/components/player/detail
```

## 9. Open-Questions

- **Autonom-Zone (CTO):** Prop-Rename `floorBsd→priceBsd`, Resolve-Logik des bound-order-Preises, Test-Form.
- **Keine CEO-Frage offen:** Money-Flow byte-identisch (D87 verifiziert), kein Wording-Neuwert (bestehende `estCost`/`balanceAfter`-Keys), kein Scope jenseits der zwei Reviewer-Funde.

## 10. Proof-Plan

1. `worklog/proofs/405-vitest.txt` — vitest player/detail grün inkl. neuer Order-Buy-onSuccess- + est-total-Tests.
2. `worklog/proofs/405-live.txt`/`.png` — post-Deploy Playwright bescout.net (AC-5): Order-Kauf mit Order-Preis ≠ Floor → Toast-Preis echt, Header −echte Summe, Confirmation-Kosten == Charge, DE+TR. (Seed: ali_admin hält 1 Tiren + braucht eigene Sell-Order; ggf. neue Order seeden.)

## 11. Scope-Out

- Kein RPC/Migration/Service-Body-Change (Money byte-identisch).
- Kein Floor-SSOT-Eingriff (`recalc_floor_price`, `prices.floor` unberührt — Bug B liest nur Order-Anzeigepreis).
- Kein Markt-Container-Refactor (404 fertig).
- BuyConfirmation „own orders skipped"-Warntext + Affordability-Empty-State (404-NIT #1) bleiben unverändert.
- Orderbuch-Architektur (`orders` vs `offers`, 1.4) = separate CEO-Gabelung.

## 12. Stage-Chain (geplant)

SPEC ✅ → IMPACT (skipped: kein RPC/Migration/Cross-Domain, Consumer in §3/§4 gegreppt) → BUILD → REVIEW (Reviewer-Agent, Money-angrenzend) → PROVE (vitest + post-Deploy Playwright) → LOG.

## 13. Pre-Mortem (optional bei S — hier knapp)

1. `??`-Priorität verkehrt → Markt-Pfad bricht. Mitigation: AC-2 Markt-Regression-Test.
2. Prop-Rename bricht andere Caller. Mitigation: grep `BuyConfirmation` Callsites = nur BuyModal (§3).
3. bound-order-Preis weicht von RPC-Charge ab (Race). Mitigation: RPC bleibt autoritativ; Confirmation ist Schätzung; Race → „Order nicht mehr aktiv"-Toast (status quo).
4. Test-Mock-Shape stimmt nicht mit Runtime. Mitigation: Mock gegen TradeResult-Felder + Reviewer-verifizierte 358-Shapes.
5. Live-Verify findet keinen Player mit Order-Preis ≠ Floor. Mitigation: gezielte Sell-Order seeden (Seed-Rezept testing.md).

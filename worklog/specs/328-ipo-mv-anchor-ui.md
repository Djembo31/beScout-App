# Slice 328 — IPO-Erstellung: Marktwert-Anker + Vorschlagspreis

**Slice-Type:** UI
**Größe:** S

## 1. Problem-Statement
Die IPO-Erstellung im `AdminPlayersTab` (Create-IPO-Modal) hat ein Preis-Input ohne Anker: der Verein wählt einen Spieler, muss den Preis aber selbst ausrechnen (Default willkürlich `5.00`). Es fehlt der Marktwert-Bezug. **Anil-Decision 2026-06-16:** Der IPO-Preis ist eine Vereins-Entscheidung **mit dem Marktwert als Anker** — MV = Vorschlag, Verein passt nach Einschätzung an. Evidence: Strategie-Session `worklog/concepts/csf-club-treasury-model.md §3.4`.

## 2. Lösungs-Design
Beim Spieler-Auswählen im IPO-Modal:
1. **Vorschlagspreis** berechnen + als anpassbaren Default in `ipoPrice` setzen: `MV/1000` $SCOUT (= 1 SC = MV/100.000 €, bei 1 $SCOUT = 1 Cent).
2. **MV + Vorschlag anzeigen** unter dem Preis-Input („Marktwert: 75 Mio € · Vorschlag: 75.000 $SCOUT").
3. **EUR-Orientierung** für den eingegebenen Preis: „≈ X €/Card" (`ipoPrice × 0,01 €`).
Verein kann den Vorschlag frei überschreiben (Einschätzung). Bei Spieler-Wechsel → neuer Vorschlag.

## 3. Betroffene Files
- `src/components/admin/useAdminPlayersState.ts` — `selectIpoPlayer(id)`-Wrapper (setzt Vorschlag), derived `ipoPlayerMarketValue`.
- `src/components/admin/AdminPlayersTab.tsx` — MV/Vorschlag/EUR-Anzeige im IPO-Modal.
- `messages/de.json` + `messages/tr.json` — neue i18n-Keys.

## 4. Code-Reading-Liste (erledigt)
- `useAdminPlayersState.ts` — `ipoPlayerId`/`ipoPrice`-State, `handleCreateIpo`, `eligiblePlayers`. `Player.marketValue` (EUR) existiert (genutzt in `openLiquidationModal:199`).
- `AdminPlayersTab.tsx:373-448` — IPO-Modal: Spieler-Select + `pricePerDpc`-Input + Total-Box.
- `trading.md` Pricing-Asset-Model: `ipo_price ($SCOUT) = MV/1000`, 1 $SCOUT = 1 Cent.

## 5. Pattern-References
- `csf-club-treasury-model.md §3.4` (IPO-Preis = Verein + MV-Anker) + §5 (Wechselkurs 1 $SCOUT = 1 Cent).
- i18n-Pflicht beide Locales (errors-frontend.md „Missing i18n-Key bei neuer CTA").

## 6. Acceptance Criteria
- AC1: Spieler im IPO-Modal wählen → `ipoPrice` wird mit `round(MV/1000)` vorbefüllt (anpassbar). VERIFY: manuell/tsc.
- AC2: MV + Vorschlag werden angezeigt wenn Spieler gewählt. VERIFY: DOM.
- AC3: EUR-Orientierung „≈ X €/Card" wird für den aktuellen Preis gezeigt. VERIFY: DOM.
- AC4: Verein kann Preis frei überschreiben (Vorschlag ist nur Default). VERIFY: Input editierbar.
- AC5: MV=0 / kein MV → kein Vorschlag, Input bleibt leer (kein NaN/Crash). VERIFY: Guard.
- AC6: DE + TR Keys vorhanden. VERIFY: grep.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| MV = 0 / null | kein Vorschlag, ipoPrice leer, keine MV-Zeile |
| Vorschlag < 10 $SCOUT (Min) | Vorschlag trotzdem zeigen; create_ipo-Guard greift server-seitig |
| Spieler-Wechsel nach manueller Preis-Eingabe | neuer Vorschlag überschreibt (neuer Kontext) |
| ipoPrice leer | keine EUR-Zeile (kein NaN) |
| Spieler abgewählt (value="") | MV/Vorschlag-Zeile verschwindet |

## 8. Self-Verification
- `npx tsc --noEmit`
- `grep -E "marketValueAnchor|suggestedIpoPrice|eurPerCard" messages/de.json messages/tr.json`
- Vitest `AdminPlayersTab.test.tsx` falls betroffen.

## 9. Open-Questions
- Auto-fill-Override-Verhalten: Vorschlag überschreibt bei Spieler-Wechsel — autonom OK (transparenter Default).

## 10. Proof-Plan
- `npx tsc --noEmit` grün + i18n-grep + (nach Deploy optional) Playwright-DOM auf /bescout-admin.

## 11. Scope-Out
- Keine RPC/Formel-Änderung (Mechanik existiert). Keine Create-Player-Modal-Änderung (separat). Kein Liquidations-Flow.

## 12. Stage-Chain (geplant)
SPEC → IMPACT skipped (nur 2 Components + i18n, keine Service/RPC/Schema) → BUILD → REVIEW (self, S-UI Pattern-Wiederholung) → PROVE (tsc + i18n-grep) → LOG.

## 13. Pre-Mortem
- MV-Einheit verwechselt (EUR vs cents) → Vorschlag Faktor-100-falsch. Mitigation: `Player.marketValue` ist EUR (verifiziert), Vorschlag = MV/1000 $SCOUT.
- Auto-fill überschreibt manuelle Eingabe ungewollt → nur bei Spieler-Wechsel, akzeptiert.

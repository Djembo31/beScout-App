# Slice 412 Review — Trading-Error-Display-Konsistenz (Welle 1.5b+1.5f)

**Typ:** self-review (Frontend/i18n Error-Display, **kein** Money-RPC/Logic-Change — nur welcher String angezeigt wird). · **Datum:** 2026-06-27

## Verdict: PASS

## Geprüft
- **Money-Neutralität:** Keine `.sql`/Migration/Service-Logic berührt. Änderungen rein in der Anzeige-Schicht (welcher übersetzte String im Toast erscheint). Escrow/Fee/RPC unberührt. ✓
- **Root-Cause korrekt:** `addToast` rendert roh (ToastProvider:81 verifiziert) → bloße Keys + rohe RPC-Errors leakten. Fix nutzt die etablierten Patterns (`useTranslations('offers')` für Success-Keys, `useErrorToast().showError` für Errors = mapErrorToKey, wie `usePlayerTrading`/`useOffersState`-showError-Pfade). ✓
- **Keine neuen Leaks:** grep 0 Treffer bloßer-Key/roher-addToast im Offers-Tab. ✓
- **i18n vollständig:** alle 5 Success-Keys existieren in `offers` DE+TR (vorab verifiziert); `idempotencyPending` neu in `errors` DE+TR; JSON-Gate grün. ✓
- **exhaustive-deps:** `t` zu `handleCounter`-deps ergänzt. ✓
- **idempotency_pending (1.5f):** ERROR_MAP-Regex `idempotency_pending|idempotent.?replay` → `idempotencyPending` (KNOWN_KEYS + i18n) statt 'generic'. Korrekt — Rapid-Doppelklick zeigt jetzt „wird verarbeitet" statt generischem Fehler. ✓
- **tsc:** exit 0. ✓

## Findings
Keine. Saubere, geldneutrale Display-Konsistenz-Korrektur im selten genutzten P2P-Offers-Tab (Mock→Pro-Rest).

## Scope-Out (transparent, eigene Slices)
1.5(a/c/d/e) = Money-RPC-Analyse; 1.5(b)-RPC-interne „BSD"-Prosa = Hygiene (nie roh user-facing); 1.6 Best-Ask/Spread-Own-Order-Exclusion. Im Proof + Handoff vermerkt.

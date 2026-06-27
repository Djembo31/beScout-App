# Review — Slice 408 (Trading-Vokabular: Markt vs Kaufgebot) — SELF-REVIEW

**Typ:** Primary-Claude Self-Review (S, UI/i18n, KEIN Money) · 2026-06-27
**Begründung Self-Review:** reine Label-/i18n-Änderung + Entfernung eines toten Render-Blocks, kein Logik-/Money-/RPC-Pfad. Risiko-Surface = (a) i18n-Parität/JSON-Validität, (b) Compliance-Wording, (c) Dead-Code-Removal-Sicherheit — alle drei direkt verifiziert.

**Verdict: PASS**

## Geprüft
1. **Compliance (business.md Kapitalmarkt-Glossar):** Kein „Orderbuch"/„Trader" user-facing eingeführt. Neue Begriffe „Marktplatz · sofort kaufbar", „Kaufgebote", „Kaufgebot abgeben", „Günstigstes Angebot wird sofort gekauft" — alle compliant. „trader"-grep-Treffer = bestehende i18n-Keys mit compliant Werten (Sammler/Koleksiyoncu), nicht von 408. ✓
2. **Lexikalische Korrektheit:** Markt-Verkaufsorders = „Angebote" (du nimmst durch Sofort-Kauf an), P2P-Bids = „Kaufgebote" (Halter nimmt an) — Auktions-Konvention sauber, distinkt. Subtitles machen instant-vs-Verhandlung explizit. ✓
3. **i18n-Parität:** 8/8 Keys DE+TR vorhanden, 2 neue Subtitle-Keys in beiden, `node JSON.parse` beide grün (S399-Gate). Em-Dash „—" JSON-safe, keine geraden Quotes. ✓
4. **Dead-Code-Removal (Sektion 6):** `player.listings` im Player-Detail immer `[]` (players.ts:252, nie befüllt) → Block rendert nie → sicher entfernt. `player.listings`-Type + KaderTab/Manager-Nutzung (`player/index.tsx:481`, `KaderTab.tsx:208`) UNBERÜHRT — nur TradingTab-Render-Block + ungenutzter Clock-Import raus. ✓
5. **Test:** TradingTab-Test von „rendert Listings" auf „rendert Listings NICHT mehr (Slice-408-Removal)" umgestellt (queryByText not.toBeInTheDocument) — dokumentiert die bewusste Entfernung. 24/24 grün. ✓
6. **tsc:** Exit 0. ✓

## Offen (Scope-Out, nicht-blockierend)
- Portfolio-„Angebote"-Tab (`market.offers`, zeigt gemischte buy+sell P2P) NICHT umbenannt — eigene Konsistenz-Folge.
- `playerDetail.activeOffers`/`listingsCount` jetzt orphan in playerDetail (bleiben; `activeOffers` zudem in club ActiveOffersSection eigener Namespace).
- **post-Deploy Playwright (AC-7)** = Pflicht-Visual nach Vercel-Deploy (408-live.txt) — Anil visual-first.

## One-Line
Saubere, compliance-konforme Wording-Trennung + toter-Block-Removal; kein Logik-/Money-Risiko, Build grün.

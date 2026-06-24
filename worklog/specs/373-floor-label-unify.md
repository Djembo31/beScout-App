# Slice 373 — Floor-Label-Vereinheitlichung

**Slice-Type:** i18n (+ UI minimal)
**Größe:** S
**CEO-Scope:** Wording (user-facing) — Anil-Entscheid „Marktpreis" (2026-06-24). Kein Money/Security.

## 1. Problem-Statement (Evidence)

Live-E2E 368c (`worklog/notes/368c-e2e-trading-findings.md`, Findings D/E/F/J/K) deckte auf: 368c hat nur ~6 Floor-Keys vereinheitlicht. User-facing existieren noch **inkonsistente Labels** für denselben Wert:
- „Floor" (englisch, DE), „FLOOR", teils „Taban"/„Fiyat" (TR) — gemischt über Sort/Stat/Portfolio/Filter/Search.
- **2 HARTCODIERTE Strings** in `SellModalCore.tsx:246/262` (`>Floor<` Button + `Floor: {value}` Label) — kein `t()`, kein DE/TR → **i18n-Verstoß** (errors-frontend i18n-Regel).
- `page.tsx:16` Metadata `Floor: X CR` hartcodiert englisch.
- `hero.clubSaleFixed` DE = „Club Sale · Festpreis" → **englisch + Securities-Wording** (business.md: user-facing IPO = „Erstverkauf").

Der **dynamische** Floor-Wert im Trading-Tab ist seit 368c korrekt („Günstigstes Angebot"/„Letzter Verkauf" je nach Quelle, T1 PASS) — der bleibt unangetastet. Hier geht es nur um die **statischen** Labels.

## 2. Lösungs-Design

Einheitlicher Oberbegriff (Anil-Entscheid): **DE „Marktpreis" / TR „Piyasa Fiyatı"** (kohärent mit bereits bestehendem `market.floorPriceTooltip`, das „Marktpreis = günstigster offener Verkaufspreis…" schon so erklärt). Compact-Spots (Badge/Sort-Kurz): DE „MARKT"/„Marktpreis", TR „Piyasa".
- Bestehende i18n-Keys: nur **Values** ändern (Key-Namen + Namespaces bleiben → kein Consumer-Bruch).
- 2 neue Keys: `market.priceFloorLabel` (für SellModalCore Button + Label) + `meta.floorLabel` (für page.tsx Metadata).
- `hero.clubSaleFixed` DE → „Erstverkauf · Festpreis" (Compliance, TR schon korrekt).

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `messages/de.json` | ~11 Value-Edits + 2 neue Keys (`market.priceFloorLabel`, `meta.floorLabel`) + `hero.clubSaleFixed` Compliance |
| `messages/tr.json` | dieselben Keys, TR-Werte |
| `src/components/trading/SellModalCore.tsx` | 2 hartcodierte „Floor"-Strings → `t('priceFloorLabel')` (t = `useTranslations('market')`, schon importiert) |
| `src/app/(app)/player/[id]/page.tsx` | Metadata `Floor: X CR` → `t('floorLabel')` (t = `getTranslations('meta')`, schon vorhanden) |

## 4. Code-Reading-Liste (vor BUILD — bereits erledigt, hier dokumentiert)

1. `messages/de.json` Floor-Keys + Namespaces (verifiziert): `market.{sortFloorAsc:1153, sortFloorDesc:1154, bestandSortFloorAsc:1240, bestandFloor:1279, portfolioCardFloor:1580, floorPriceTooltip:1431(schon Marktpreis)}`, `player.{statFloor:2262, statFloorShort:2266}`, `playerDetail.quickStatsFloor:4550`, `search.floor:3708`, `community.criteriaFloor:1850`, `home.portfolioRosterTooltip:324`, `hero.clubSaleFixed:2202`.
2. `messages/tr.json` gleiche Keys — TR ist heute gemischt (Taban/Fiyat/Floor/Piyasa Fiyatı). `floorPriceTooltip` TR nutzt schon „Piyasa Fiyatı" → Anker.
3. `src/components/trading/SellModalCore.tsx:91` → `const t = useTranslations('market')` schon da. Hardcoded Zeilen 246 (`>Floor<`) + 262 (`Floor: {fmtScout(floorBsd)}`).
4. `src/app/(app)/player/[id]/page.tsx:6` `generateMetadata` async, `const t = await getTranslations('meta')` schon da. Zeile 16 hardcoded.
5. `src/components/player/detail/TradingQuickStats.tsx:40` nutzt `t('quickStatsFloor')` — nur Value ändert, Consumer unberührt.
6. `src/components/layout/SearchOverlay.tsx:399` nutzt `t('floor')` (namespace search) — nur Value ändert.

## 5. Pattern-References

- `errors-frontend.md` — i18n-Regel: kein hartcodierter user-facing String, kein Roh-Key-Leak. (F2-Fix)
- `business.md` — IPO/Club-Sale user-facing = „Erstverkauf" (clubSaleFixed-Fix); Securities-Wording vermeiden.
- 368c-Pattern: dynamischer Floor zeigt Quelle, statische Labels brauchen neutralen Oberbegriff.

## 6. Acceptance Criteria

- **AC1** [i18n-clean] `grep -nE '>Floor<|Floor: \{' src/components/trading/SellModalCore.tsx` → 0 Treffer. EXPECTED: beide via `t()`.
- **AC2** [no-hardcoded-meta] `grep -n "Floor:" "src/app/(app)/player/[id]/page.tsx"` → 0 Treffer (durch `t('floorLabel')` ersetzt).
- **AC3** [DE-unified] `grep -nE '"(sortFloorAsc|sortFloorDesc|bestandSortFloorAsc|bestandFloor|portfolioCardFloor|statFloor|criteriaFloor|floor|quickStatsFloor)":\s*"[^"]*Floor' messages/de.json` → 0 Treffer (kein „Floor" mehr in Values).
- **AC4** [compliance] `messages/de.json` `hero.clubSaleFixed` enthält weder „Club Sale" noch reines Englisch → „Erstverkauf · Festpreis".
- **AC5** [TR-parität] Jeder in DE geänderte Key existiert in TR mit befülltem Wert (kein Key fehlt, kein leerer String). VERIFY: `node`-Diff der Key-Sets bzw. manuelle grep-Parität.
- **AC6** [keys-exist] `market.priceFloorLabel` + `meta.floorLabel` existieren in DE+TR.
- **AC7** [build] `npx tsc --noEmit` grün UND betroffene Vitest grün (`SellModalCore.test.tsx`, `TradingQuickStats.test.tsx`).
- **AC8** [valid-json] beide JSON parsen (`node -e "require('./messages/de.json');require('./messages/tr.json')"`).

## 7. Edge Cases

| Case | Handling |
|------|----------|
| `statFloorShort` „FLOOR" Compact-Badge | DE „MARKT" / TR „PIYASA" (Platz) — kurz halten, kein Layout-Bruch |
| Sort-Dropdown lang („Marktpreis ↑ (günstigste)") | OK, Dropdown hat Platz; TR „Piyasa Fiyatı ↑" prüfen ob Umbruch — sonst „Fiyat ↑" |
| `criteriaFloor` mit `{value}`-Platzhalter | Platzhalter MUSS erhalten bleiben |
| Test-Mocks geben Key-Namen zurück | Value-Change bricht Tests NICHT (Mock liefert Key, nicht Value) — verifizieren |
| `floorPriceTooltip` schon „Marktpreis" | NICHT anfassen (schon korrekt) |
| TR `bestandFloor`/`statFloor` heute „Floor"/„Taban" gemischt | auf „Piyasa Fiyatı" vereinheitlichen |
| Doppelte Key-Namen über Namespaces | Edits sind line-gezielt je Namespace — kein replace_all blind |

## 8. Self-Verification Commands

```bash
# AC1
grep -nE '>Floor<|Floor: \{' src/components/trading/SellModalCore.tsx
# AC2
grep -n "Floor:" "src/app/(app)/player/[id]/page.tsx"
# AC3 (Values mit "Floor")
grep -nE '"[a-zA-Z]+":\s*"[^"]*Floor[^"]*"' messages/de.json
# AC8 JSON valid
node -e "require('./messages/de.json');require('./messages/tr.json');console.log('json ok')"
# AC7
npx tsc --noEmit && CI=true npx vitest run src/components/trading/__tests__/SellModalCore.test.tsx src/components/player/detail/__tests__/TradingQuickStats.test.tsx
```

## 9. Open-Questions

- **Pflicht (geklärt):** Oberbegriff = „Marktpreis"/„Piyasa Fiyatı" (Anil 2026-06-24).
- **Autonom-Zone (CTO):** Compact-Kurzform-Wording (MARKT/PIYASA), Key-Namen der 2 neuen Keys, ob Sort-TR „Piyasa Fiyatı" oder „Fiyat" (Layout).
- **CEO-Zone:** keine weitere (Wording-Linie steht).

## 10. Proof-Plan

- `worklog/proofs/373-floor-label.txt`: Self-Verification-Output (AC1–AC3, AC7, AC8) + git diff --stat.
- Playwright-Screenshot Sort-Dropdown + SellModal + Player-Stat post-Deploy (DE+TR) → `373-*.png` (UI-Slice-Pflicht; falls Deploy nicht in dieser Session, als „post-Deploy offen" markiert mit grep-Beweis als Interim).

## 11. Scope-Out

- KEINE Logik-/Money-Änderung (reine Strings + 2 Key-Verkabelungen).
- KEIN Anfassen des dynamischen Floor-Sublabels (368c, korrekt).
- KEIN Floor-Berechnungs-/Band-Code (368c done).
- F1 Quick-Stat ist hier mit drin (quickStatsFloor-Value). F3 Buy-Modal = Slice 372 (done). F4 Push = 369 (done).

## 12. Stage-Chain (geplant)

SPEC → IMPACT (skipped: nur i18n-Values + 2 Verkabelungen, keine DB/RPC/Service/Cross-Domain) → BUILD → REVIEW (reviewer, S-Slice Pflicht) → PROVE → LOG.

## 13. Pre-Mortem (optional bei S)

1. Key in TR vergessen → leeres Label live. Mitigation: AC5 Paritäts-Check.
2. `{value}`-Platzhalter in criteriaFloor zerschossen → „Marktpreis ≤ undefined". Mitigation: Edit erhält Platzhalter, AC8.
3. SellModalCore neuer Key falscher Namespace → Roh-Key-Leak „priceFloorLabel". Mitigation: `market`-Namespace (t schon market), Vitest + post-Deploy-Screenshot.
4. clubSaleFixed an mehreren Stellen genutzt → Kontext-Bruch. Mitigation: grep Consumer vor Edit.
5. JSON-Komma-Fehler beim Key-Einfügen → Build-Bruch. Mitigation: AC8 node-parse.

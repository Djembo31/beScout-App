# Visual-Check Report — 2026-04-27 (Slices 224 + 225 + 226)

**HEAD deployed:** `4681f602` (Vercel READY)
**Tester:** jarvis-qa@bescout.net (auto-login via Cookie)
**Browser:** Playwright MCP (Chromium, 1280×720 Desktop default)

## TL;DR

| Slice | Verify-Status | Notes |
|-------|---------------|-------|
| **224** Wording-Heal (DE+TR) | ✅ **PASS** | Bundle-Verify zeigt neue Strings ("einschätzen") deployed, alte ("unterbewertet"/"düşük değerli") purged |
| **225** InfoTooltip BuyConfirmModal Sentiment | 🟡 **CODE-DEPLOYED** — Visual-Verify blockiert: 0 sentiment data in prod (research_posts leer) — Sentiment-Block conditional `total > 0` rendert nie |
| **225** InfoTooltip CommunityValuation Floor | ❌ **DEAD CODE FUND** — CommunityValuation-Component ist orphan (exportiert in barrel-index, nirgends importiert) |
| **226** Sentiment-Bar 3-Segment | 🟡 **CODE-DEPLOYED** — gleiche Visual-Verify-Blockade wie 225 |

## KRITISCHER FUND: `CommunityValuation` ist orphan production-code

**Discovery:**
- `src/components/player/detail/CommunityValuation.tsx` — Component definiert + exported via `src/components/player/detail/index.ts:19`
- **Aber:** kein einziger `<CommunityValuation` Aufruf in `src/app/**/*.tsx` oder `src/components/**/*.tsx`
- Verify: `grep -rn "CommunityValuation" src/` zeigt nur Definition + Barrel-Export. Keine JSX-Verwendung.

**Implications:**
1. **Slice 216 K-RR-1** (`title={t('floorPriceTooltip')}` auf Floor-Preis-Label) wurde auf totes Component appliziert — User hat das Tooltip nie gesehen.
2. **Slice 225 InfoTooltip-Migration** auf CommunityValuation — gleicher Pfad, User sieht es nicht.
3. **Audit-Aggregate (Phase-A-Re-Audit 2026-04-27)** hat Slice 216 K-RR-1 als "live + fixable" eingestuft — Audit hat NICHT verifiziert dass Component tatsächlich rendered.

**User-visible Floor-Preis** ist in `src/components/player/detail/PlayerHero.tsx:65` — zeigt z.B. "2.500 Credits / Floor · günstigstes Angebot" (Inline-Subtitle, kein Tooltip). Per Pattern-Regel `ui-components.md` → Trivial-Hint = `title=` ist OK, aber hier ist es schon ein Inline-Hint statt Tooltip.

**Pattern-Klasse:** D46 (Service-Duplicate / Orphan-Production-Code). Hier auf Component-Ebene statt Service-Ebene. Erweitert D46 um neue Achse.

## Verifikations-Beweise

### Slice 224 (Wording-Heal)
**Bundle-Inspect** (Player-Detail-Page rendered):
- `has_sentimentLabel_key_in_bundle`: ✅ true
- `has_floorPriceTooltip_key`: ✅ true
- `has_new_de_string_einschätzen` (Slice 224 NEU): ✅ true
- `has_old_de_string_unterbewertet` (Slice 224 removed): ✅ false (purged)
- `has_old_tr_string_düşük_değerli` (Slice 224 removed): ✅ false (purged)
- `has_new_tr_string_buluyor`: false (DE-Cookie, TR-Locale nicht im Bundle)

→ Wording-Heal ist deployed + Securities-Valuation-Begriffe komplett aus DE/TR purged.

### Slice 225 (InfoTooltip Migration)
- BuyConfirmModal `sentimentLabel`-Key im Bundle ✅
- BuyConfirmModal-Render-Path: getriggert (Verpflichten-Button öffnet Modal ✓)
- Sentiment-Block conditional `{sentiment && sentiment.total > 0 && ...}` — niemals true weil `research_posts` Tabelle leer in prod
- → InfoTooltip rendert in Production NICHT, weil Sentiment-Daten fehlen

### Slice 226 (3-Segment Bar)
- Code in Bundle ✅
- Visual-Verify gleiche Blockade wie Slice 225

## Recommended Heal-Path

### Slice 227 (vorgeschlagen) — Orphan-Cleanup + Audit-Methodik-Lehre

**A. Orphan-Component handeln:**
- **Option 1:** `CommunityValuation` löschen (rechtfertigbar wenn keine Wire-Plan existiert)
- **Option 2:** Component wiren (auf welcher Page? Player-Detail Community-Tab fehlt der Card. Sentiment → Pre-Beta-Roadmap-Frage)
- **Option 3:** Markieren als `@experimental` mit Implementierungs-Backlog (parkt es bis Skala existiert)

**B. Audit-Methodik-Lehre (knowledge-flywheel):**
- Audit-Agents müssen vor "P1-finding"-Klassifikation **import-trace** laufen lassen — Component-Datei zu finden ≠ Component-im-Render-Tree
- Pattern-Regel ergänzen in `decisions.md` D46: "Orphan-Production-Component-Detection"
- Future audit-stale-check.ts erweitern um orphan-component-Detection

**C. Punch-List-Korrektur:**
- K-RR-1 Status: rückwirkend reklassifizieren von "Slice 216 ✓ healed" auf "Slice 216 fake-fix (orphan code)"
- Audit-2026-04-27 Aggregate: Slice 225 InfoTooltip-CommunityValuation als "geheilt-aber-orphan" annotieren

### Optional Slice 228 — Sentiment-Daten Smoke-Plan

Um Slice 225 + 226 visually zu verifizieren:
- Test-Account "jarvis-qa" sollte 5-10 Scout-Reports schreiben mit verschiedenen `call`-Werten (bullish/bearish/neutral) auf 1 Player
- Dann Buy auf diesem Player → BuyConfirmModal zeigt Sentiment-Block mit InfoTooltip + 3-Segment-Bar
- Smoke-Test bevor Beta-Tester live gehen

## Phase-Tracker-Impact

Vorher (post-Slice-226):
```yaml
findings_open: P0=0, P1=0, P2=0, P3=0
```

**Nach diesem Visual-Check:**
- 1 NEU CODE-QUALITY-FINDING: ORPHAN-NEU-1 (P2) `CommunityValuation` orphan production-code
- Slice 216 K-RR-1 + Slice 225 Floor-Preis-Migration → effektiv-no-op (Audit-Methodik-Bug)
- Slice 224 Wording-Heal: real geheilt ✅
- Slice 225 Sentiment-Migration BuyConfirmModal: code deployed, visually-blocked-by-data
- Slice 226 Bar-3-Segment: code deployed, visually-blocked-by-data

Sign-Off-Re-Trial-Prognose: HARD-NO-GO mit ORPHAN-NEU-1 + Audit-Methodik-Klärung pending.

## Anil-Decision-Required

3 Optionen für CommunityValuation:
- (A) Löschen (CleanUp-Slice 227)
- (B) Wiren (welche Page? — Brainstorm nötig)
- (C) Defer-mit-Tag (`@experimental` + Backlog)

Plus: Smoke-Test mit künstlichen Sentiment-Daten ja/nein (für Slice 225+226 Visual-Verify).

## Screenshots

- `qa-screenshots/visual-check-2026-04-27/01-player-detail-no-floor-tooltip.png` — Player-Detail Page, "2.500 Credits / Floor · günstigstes Angebot" Inline-Subtitle ohne Tooltip; Community-Tab "Research-Berichte / Feed" — keine CommunityValuation-Card.

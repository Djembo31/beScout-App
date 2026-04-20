# Slice 102 — Nationality Full-Name → ISO Mapper (Flag Rendering Fix)

**Datum:** 2026-04-20
**Größe:** XS (3-4 Files, Pattern-bekannt)
**CEO-Scope:** Nein (UX-Bug, keine Money/Security/Meta)
**Approval:** Anil explizit "ja, ich möchte überall die flaggen sehen" (2026-04-20 18:22)

## Ziel

Osimhen zeigt NG-Flag, Müller zeigt DE-Flag, Rooney zeigt England-Flag — alle Spieler-ScoutCards rendern korrekte ISO-3166-1 alpha-2 SVG-Flags basierend auf `players.nationality` Full-Name. Kein falsches `?? 'TR'` Default mehr.

## Problem (Root-Cause)

1. **Data-Format-Drift:** `players.nationality` wird als Full-Name gespeichert (scraper-output): "Germany", "Nigeria", "Türkiye", etc. Aktuell 130+ unique values in DB.
2. **Komponent-Mismatch:** `CountryFlag.tsx` erwartet ISO-3166-1 alpha-2 code ("NG", "DE"). `hasFlag("NIGERIA")` = false → fallback text-badge.
3. **Falscher Default:** `services/players.ts:151` macht `country: db.nationality ?? 'TR'` — setzt Spieler ohne nationality auf türkisches Flag statt leer.
4. **Library-Quirk:** React-Exports der Library nutzen Unterstrich (`GB_ENG`) aber `hasFlag()` akzeptiert Bindestrich (`GB-ENG`). Mismatch muss im CountryFlag-Component gehandled werden.

## Betroffene Files

1. **NEW** `src/lib/utils/countryNameToIso.ts` — Lookup-Table (~130 entries) + `mapNationalityToIso(name)` fn
2. **NEW** `src/lib/utils/__tests__/countryNameToIso.test.ts` — Unit-tests für alle Edge-Cases
3. **EDIT** `src/components/ui/CountryFlag.tsx` — `"GB-ENG"` Bindestrich → `"GB_ENG"` Unterstrich für React-Export-Lookup
4. **EDIT** `src/components/ui/__tests__/CountryFlag.test.tsx` — neue Tests GB-ENG + pass-through ISO + invalid
5. **EDIT** `src/lib/services/players.ts:151` — `mapNationalityToIso(db.nationality)` statt `db.nationality ?? 'TR'`

## Acceptance Criteria

1. **Mapping-Korrektheit:**
   - `mapNationalityToIso("Germany")` = `"DE"`
   - `mapNationalityToIso("Nigeria")` = `"NG"`
   - `mapNationalityToIso("Türkiye")` = `"TR"` (türkisches Endonym)
   - `mapNationalityToIso("Turkey")` = `"TR"` (englisches Exonym)
   - `mapNationalityToIso("TR")` = `"TR"` (ISO pass-through)
   - `mapNationalityToIso("England")` = `"GB-ENG"` (subdivision)
   - `mapNationalityToIso("Scotland")` = `"GB-SCT"`
   - `mapNationalityToIso("Wales")` = `"GB-WLS"`
   - `mapNationalityToIso("Northern Ireland")` = `"GB-NIR"`
   - `mapNationalityToIso("Côte d'Ivoire")` = `"CI"` (diacritics)
   - `mapNationalityToIso("Cote d'Ivoire")` = `"CI"` (without diacritics)
   - `mapNationalityToIso("Ivory Coast")` = `"CI"` (English name)
   - `mapNationalityToIso("Korea Republic")` = `"KR"`
   - `mapNationalityToIso("Congo DR")` = `"CD"` (Democratic Republic)
   - `mapNationalityToIso("Congo")` = `"CG"` (Republic of, separate country)
   - `mapNationalityToIso("Bosnia and Herzegovina")` = `"BA"`
   - `mapNationalityToIso("USA")` = `"US"`
   - `mapNationalityToIso("United States")` = `"US"`
2. **Leere/Unknown:**
   - `mapNationalityToIso("")` = `""`
   - `mapNationalityToIso(null)` = `""`
   - `mapNationalityToIso(undefined)` = `""`
   - `mapNationalityToIso("   ")` = `""` (whitespace)
   - `mapNationalityToIso("Unknown-Country-X")` = `""` (no match, no TR fallback)
3. **CountryFlag-Subdivision-Fix:** `<CountryFlag code="GB-ENG" />` rendert `<GB_ENG />` SVG (St George's Cross), nicht text-badge.
4. **Service-Integration:** `services/players.ts:151` nutzt mapper, `country`-Feld des Player-Types kann leerer String sein bei unbekannter nationality. `TradingCardFrame:240` truthy-check bereits vorhanden (`{country && <CountryFlag ...>}`), kein Änderungsbedarf.
5. **Verification:**
   - `npx vitest run src/lib/utils/__tests__/countryNameToIso.test.ts` grün
   - `npx vitest run src/components/ui/__tests__/CountryFlag.test.tsx` grün
   - `npx tsc --noEmit` clean
   - Alle ~130 existierenden DB-nationality-Werte mappen zu valid ISO oder `""` — kein raw text leaked
6. **Playwright-Proof:** Screenshot von `/player/469e8ca9-b6ff-4a45-be88-c163ca255a5c` (Osimhen) zeigt Nigerian flag (grün-weiß-grün) auf ScoutCard.

## Edge Cases

- Empty string (368 rows in DB) → mapper returns "", UI zeigt kein Flag
- NULL nationality → mapper returns "", kein Flag
- Mixed-case input: "germany" vs "Germany" vs "GERMANY" → alle "DE" (case-insensitive)
- Unicode: "Türkiye" + NFC normalize
- Trailing whitespace: "Germany " → "DE" (trim vor lookup)
- Bereits ISO code in DB (92x TR, 5x NG, 3x GM, 1x DE/NL/RU/etc.) → pass-through, kein Double-Mapping
- Newer ISO not in library: Kosovo "XK" — library has flag for XK, prüfen
- "Republic of Ireland" → "IE" (not to be confused with Northern Ireland)
- "Ireland" (2 rows) → "IE" (assume ROI)

## Proof-Plan

1. **vitest run** mit Output nach `worklog/proofs/102-tests.txt`
2. **Playwright login jarvis-qa** + Navigate `/player/<osimhen_id>` + screenshot `worklog/proofs/102-osimhen-flag.png`
3. **DB-Coverage-Query**: alle distinct nationality-Werte → % mit valid ISO-mapping, Output nach `worklog/proofs/102-coverage.txt`
4. **Visual-Verification**: 3-4 Spieler unterschiedlicher Liga/Nation → screenshots

## Scope-Out

- **createPlayer admin-form normalization** (`services/players.ts:228` macht `params.nationality || 'TR'`) — separater Slice, admin-UI input-validation ist eigenes Thema.
- **Scraper-side normalization** — bei nächstem tm-scrape / sync-players könnte man auf-ISO normalisieren. Out-of-scope.
- **DB-Migration um existierende 130+ values zu normalisieren** — nicht nötig, Service-Layer-Mapper löst UX-Bug reversibel.
- **Club.country rendering** — wenn Clubs auch betroffen, separater Slice.
- **i18n country-name display** (z.B. "Nigeria" vs "Nigerya" in TR) — ist DisplayName-Thema, nicht Flag-Thema.

## Pattern-Reference

Data-Format vs Component-Expectation Drift — siehe common-errors.md §5 (React/TS Checklist). Neuer Pattern für common-errors nach LOG-Stage.

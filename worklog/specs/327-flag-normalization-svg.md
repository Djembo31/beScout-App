# Slice 327 — Flaggen-Normung: Emoji → SVG (cross-cutting)

**Status:** SPEC · **Größe:** S · **Slice-Type:** UI · **Scope:** CTO · **Datum:** 2026-06-15

## 1. Problem Statement

Flaggen werden in der App inkonsistent angezeigt — mal echte Flagge, mal Text-Kürzel „DE"/„TR". **Anil-Live-Bug 2026-06-15** (während Slice-326-Verify): „warum sehe ich die flaggen nie konstant? sondern Text TR DE, bei den filtern und bei einigen spielern".

**Root-Cause:** Zwei parallele Flaggen-Systeme:
- **Emoji** (`countryToFlag` in `utils.ts`): `String.fromCodePoint` → Unicode-Regional-Indicator (🇩🇪). **Windows hat keine Emoji-Flaggen-Glyphs** → rendert die 2 Buchstaben „DE"/„TR" als Text. Genutzt in: `CountryBar` (Länder-Filter), `LeagueBar` (orphan), `PlayerRow` (Card), `PlayerIPOCard`.
- **SVG** (`CountryFlag` in `components/ui`): `<img src="/flags/3x2/{CODE}.svg">` aus 265 static assets. Rendert überall identisch (auch Windows). Genutzt in: `PlayerHero`, `TradingCardFrame` (Spieler-Detail).

→ Derselbe Spieler zeigt auf der Detailseite eine Flagge, in der Liste „DE". Betrifft alle Windows-User (= Anils Haupt-Device).

## 2. Lösungs-Design

**Eine einzige Flaggen-Quelle:** alle Emoji-Konsumenten auf `CountryFlag` (SVG) umstellen, `countryToFlag` ersatzlos entfernen. Daten sind bereits ISO-normalisiert (`CountryInfo.code`, `League.country`, `player.country` via `mapNationalityToIso` im Mapper) → `CountryFlag code={x}` funktioniert direkt. SVG-Assets (265) + `hasFlag`-Fallback existieren bereits (Slice 120).

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/components/ui/CountryBar.tsx` | EDIT | Emoji → `<CountryFlag code={c.code} size={14}>` |
| `src/features/market/components/marktplatz/LeagueBar.tsx` | EDIT | dito (orphan, konsistent gehalten bis Wave-B-Removal) |
| `src/components/player/PlayerRow.tsx` | EDIT | Card-Flagge → CountryFlag |
| `src/features/market/components/marktplatz/PlayerIPOCard.tsx` | EDIT | dito |
| `src/lib/utils.ts` | EDIT | `countryToFlag` entfernen (Dead-Code nach Migration) |
| `PlayerIPOCard.test.tsx` | EDIT | Mock-Anpassung (countryToFlag raus, CountryFlag stub) |

## 4. Code-Reading-Liste

| File | Zu prüfen |
|------|-----------|
| `components/ui/CountryFlag.tsx` (gelesen) | SVG-img + hasFlag-Fallback; default-export; size→h×1.5w |
| `lib/utils/countryNameToIso.ts` (gelesen) | mapNationalityToIso → player.country ist ISO im Mapper |
| `lib/utils.ts:72` (gelesen) | countryToFlag-Def (Emoji), 6 Konsumenten |
| `components/player/detail/PlayerHero.tsx` | Vorbild — wie CountryFlag bereits genutzt wird |
| `.claude/rules/errors-frontend.md` "Data-Format vs Component-Expectation (Slice 102)" | Country-ISO-Drift Fallback |

## 5. Pattern-References

- **Slice 120** (errors-infra.md) — CountryFlag SVG-static-asset ersetzte 235kB Emoji-namespace; hier dieselbe Quelle konsolidieren.
- **Slice 102** (errors-frontend.md) — Country-Code-Drift Full-Name vs ISO; `mapNationalityToIso` löst das, `hasFlag`-Fallback fängt Reste.
- **Slice 280** (errors-frontend.md) — orphan LeagueBar (Dead-Wrapper) → Removal in 326 Wave B.

## 6. Acceptance Criteria

```
AC-01: [HAPPY] Länder-Filter zeigt SVG-Flaggen (Windows)
  VERIFY: bescout.net/market CountryBar @ Windows-Chrome
  EXPECTED: 🇩🇪🇹🇷-SVG sichtbar, KEIN "DE"/"TR"-Text
AC-02: [HAPPY] Spieler-Cards/IPO zeigen Nationalitäts-SVG-Flagge
  VERIFY: bescout.net/market Card-Ansicht + IPO
  EXPECTED: echte Flagge statt Text-Code
AC-03: [REGRESSION] countryToFlag vollständig entfernt
  VERIFY: grep -rn "countryToFlag" src/ → 0
AC-04: [NULL] player.country leer → keine Flagge, kein Crash
  EXPECTED: CountryFlag rendert nichts (truthy-guard) bzw. Text-Fallback bei unbekanntem Code
AC-05: [MOBILE] 393px Filter-Pills + Cards unverändert im Layout
AC-06: [I18N] DE+TR — Flaggen + Namen korrekt
```

## 7. Edge Cases

| # | Case | Expected |
|---|------|----------|
| 1 | player.country = '' / null | `{player.country && ...}` guard → keine Flagge |
| 2 | unbekannter ISO-Code | CountryFlag hasFlag-Fallback → Text-Badge (selten, akzeptabel) |
| 3 | GB-ENG (Subdivision) | `/flags/3x2/GB-ENG.svg` existiert → echte Flagge |
| 4 | Cold-Load Filter | CountryBar rendert nach Cache-ready (unverändert) |

## 8. Self-Verification

```bash
npx tsc --noEmit
grep -rn "countryToFlag" src/   # 0
CI=true npx vitest run src/components/ui src/components/player src/features/market/.../PlayerIPOCard.test.tsx
# Live: Playwright bescout.net/market — Flaggen sichtbar statt Text
```

## 9. Open-Questions

Keine Pflicht-Klärung. Autonom-Zone (CTO): Flag-Größe (14px gewählt, = alte text-sm-Höhe).

## 10. Proof-Plan

Playwright-Screenshot bescout.net/market (Filter + Cards) — SVG-Flaggen sichtbar. Plus tsc + 210 Tests + grep-0.

## 11. Scope-Out

- orphan `marktplatz/LeagueBar.tsx` LÖSCHEN → 326 Wave B (Dead-Wrapper-Removal).
- Liga-Badges (Liga-Logos, kein Country-Flag) → unberührt (separates System, funktioniert).

## 12. Stage-Chain

```
SPEC → IMPACT skipped (nur UI-Components + utils, keine DB/Service/Contract) → BUILD → REVIEW (reviewer-Agent) → PROVE (Playwright + tsc + tests) → LOG
```

## 13. Pre-Mortem (optional, S-Slice)

| # | Failure | Prob | Mitigation |
|---|---------|------|------------|
| 1 | CountryFlag-Größe zu groß → Pills/Cards brechen Layout | LOW | size=14 = alte text-sm-Höhe; Mobile-Verify |
| 2 | player.country ist doch Full-Name (kein ISO) bei manchen → Text-Fallback bleibt | LOW | Mapper setzt ISO; hasFlag-Fallback graceful; Live-Verify prüft |
| 3 | orphan LeagueBar-Edit verwirrt (dead) | LOW | dokumentiert, Removal in Wave B |

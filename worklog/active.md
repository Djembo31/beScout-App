# Active Slice

```
status: prove
slice: 102
title: Nationality Full-Name → ISO Mapper (Flag Rendering Fix)
stage: PROVE
spec: worklog/specs/102-nationality-iso-mapper.md
impact: skipped (Service-Layer + UI-Komponente, keine DB/RPC/Type-Contract-Änderung)
proof: worklog/proofs/102-tests.txt
additional_proof:
  - worklog/proofs/102-coverage.txt (91.4% mapped / 0% unmapped / 8.6% NULL-empty)
  - worklog/proofs/102-osimhen-flag.png (pending Vercel deploy → Playwright)
size: XS
ceo_scope: false
s_slice: true
```

## Context

Bug entdeckt während Slice 101 BUILD (18:10):
Osimhen (Galatasaray) zeigt kein Flag. Root-Cause: `players.nationality` ist als Full-Name gespeichert ("Nigeria"), CountryFlag erwartet ISO-3166-1 alpha-2 ("NG"). Default `?? 'TR'` setzt zudem alle NULL-nationality auf türkisches Flag (falsch).

Betrifft ~99% der Spieler (nur 92 "TR" + 1 "DE" + kleine ISO-Inseln zeigen derzeit korrekt).

## Parked

Slice 101 BUILD done (scripts/fetch-stadium-images.mjs retry-on-429), PROVE deferred bis Slice 102 LOG. Wikipedia ist nicht mehr 429-blocked — Script-Run ready when 102 done.

## Plan

1. SPEC — `worklog/specs/102-nationality-iso-mapper.md`
2. BUILD:
   - NEW `src/lib/utils/countryNameToIso.ts` (lookup-Tabelle + mapper fn)
   - EDIT `src/components/ui/CountryFlag.tsx` (GB-ENG → GB_ENG React-export-Quirk)
   - EDIT `src/lib/services/players.ts:151` (mapper statt `?? 'TR'`)
   - NEW unit-tests (countryNameToIso + CountryFlag subdivision)
3. PROVE — Playwright-screenshot Osimhen mit NG-flag + vitest grün
4. LOG — commit + log.md + common-errors pattern

## Queued

- Slice 101 PROVE (Stadia v3 script-run)
- Slice 103 — API-Football per-player nationality-enrich (267 missing)

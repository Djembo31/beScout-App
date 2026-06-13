# Slice 294 — Public Club Metadata Compliance Copy (F-1)

**Status:** SPEC · **Größe:** XS · **Slice-Type:** i18n + UI · **Scope:** CEO-approved (Wording + TR) · **Datum:** 2026-06-13

> Schließt Slice 292 S3 **F-1** (P1). Macht zugleich die seit Slice 292 herumliegende uncommittete RED-Test-Leiche `page.metadata.test.ts` grün — aber i18n-sauber, nicht als hardcoded-DE-Literal.

## 1. Problem Statement

Öffentliche `/club/[slug]`-Metadata-Description ist **hardcoded Deutsch** und enthält „Trading":
`page.tsx:24` → `"${club.name} auf BeScout: Spieler, Fantasy, Trading. Werde Fan!"`

Zwei Probleme:
1. **Compliance/Positioning** (Slice 292 F-1, P1): „Trading" ist im öffentlichen Club-Positioning die falsche Sprache (`current-product-truth.md` §4 — kein Invest/Cash-Out-Framing in public product copy). „Trading" ist kein Blanket-Verbot (legit im Market-Kontext), aber falsch für die öffentliche Club-Visitenkarte.
2. **i18n-Lücke:** `getTranslations('meta')` ist importiert + für `t('club')` genutzt, aber die Description ist hardcoded DE → **TR-Besucher bekommen deutsche OG/Twitter-Cards.**

Evidence: `worklog/audits/2026-06-13/page-contract-fantasy-club.md` F-1; uncommitteter RED-Test `src/app/(app)/club/[slug]/__tests__/page.metadata.test.ts` (fordert kein /trading/i, aber gegen hardcoded-DE-Literal designt → würde i18n-Fehler zementieren).

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/app/(app)/club/[slug]/page.tsx` | EDIT | Description via `t('clubDescription', { name })` statt hardcoded DE |
| `messages/de.json` | EDIT | `meta.clubDescription` (Anil-approved Copy Option A) |
| `messages/tr.json` | EDIT | `meta.clubDescription` (TR-Mirror, Anil-approved) |
| `src/app/(app)/club/[slug]/__tests__/page.metadata.test.ts` | EDIT | Orphan-RED-Test auf i18n-Design umschreiben: Behavior (key+name, og===twitter===description, kein hardcoded Trading) + Content (echte de/tr-Strings trading-frei + `{name}`) |

## 4. Code-Reading-Liste (erledigt)

| File | Zweck | Ergebnis |
|------|-------|----------|
| `src/app/(app)/club/[slug]/page.tsx` | i18n-Struktur | `t = getTranslations('meta')`, description hardcoded DE Z.24; og/twitter spiegeln description |
| `messages/de.json` / `tr.json` `meta`-Namespace | Key-Platz | `meta.club` existiert, `meta.clubDescription` fehlt → neu |
| `src/app/(app)/club/[slug]/__tests__/page.metadata.test.ts` | Orphan-RED-Test | mockt getTranslations als `(key)=>key`, asserted hardcoded-DE-Literal → muss auf i18n-Design |
| `src/lib/__tests__/compliance/wording-compliance.test.ts` | Message-JSON-Test-Pattern | nutzt `fs.readFileSync(path.resolve(__dirname,'../../../../messages',...))`; „trading" NICHT auf Forbidden-Liste (legit im Market-Kontext) → spezifischer Guard hier nötig |

## 5. Pattern-References

- `business.md` „Asset-Klasse-Positionierung Doppel-Register" — public copy = nur Utility-Register; „Scout Cards" ist die user-facing Vokabel für Scout Card.
- `errors-frontend.md` „Missing i18n-Key bei neuer CTA" (Slice 198) — neuer t()-Key MUSS in beiden Locales bedient sein.
- `memory/current-product-truth.md` §4 — kein Invest/Cash-Out-Framing in public product copy.

## 6. Acceptance Criteria

```
AC-01: [HAPPY/I18N] Description i18n-driven, kein hardcoded Trading
  VERIFY: pnpm exec vitest run src/app/\(app\)/club/\[slug\]/__tests__/page.metadata.test.ts
  EXPECTED: generateMetadata().description aus t('clubDescription',{name}); og.description===twitter.description===description
  FAIL IF: description matcht /trading/i ODER og/twitter ≠ description

AC-02: [I18N-DE+TR] meta.clubDescription in beiden Locales, trading-frei, {name}-Interpolation
  EXPECTED: de.meta.clubDescription + tr.meta.clubDescription existieren, kein /trading/i, enthalten "{name}"
  FAIL IF: ein Locale fehlt ODER enthält "trading" ODER kein {name}

AC-03: [REGRESSION] tsc + Compliance-Audit grün
  VERIFY: pnpm exec tsc --noEmit && pnpm audit:compliance
  EXPECTED: 0 Fehler
```

## 7. Edge Cases

| # | Case | Expected |
|---|------|----------|
| 1 | club not found | bestehender `t('club')`-Title-Fallback bleibt unverändert |
| 2 | name mit Sonderzeichen | next-intl `{name}`-Interpolation escaped korrekt |
| 3 | TR-Locale | TR-Besucher bekommt TR-Description (war vorher DE) |

## 8. Self-Verification Commands

```bash
pnpm exec vitest run "src/app/(app)/club/[slug]/__tests__/page.metadata.test.ts"
pnpm exec tsc --noEmit
node -e "const m=require('./messages/de.json').meta,t=require('./messages/tr.json').meta; console.log(m.clubDescription); console.log(t.clubDescription)"
grep -i trading src/app/\(app\)/club/\[slug\]/page.tsx   # erwartet: 0
```

## 9. Open-Questions

**Pflicht-Klärung:** Copy-Wahl — ✅ Anil-approved Option A: DE „{name} auf BeScout: Spieler, Fantasy und Scout Cards. Werde Fan!" / TR „{name} BeScout'ta: Oyuncular, Fantasy ve Scout Cards. Fan ol!"
**Autonom-Zone:** Test-Struktur (Behavior- vs Content-Split), Mock-Form.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| i18n + Metadata | `pnpm exec vitest run page.metadata.test.ts` Output (grün) + `grep -i trading page.tsx` (0) nach `worklog/proofs/294-club-metadata.txt` |

## 11. Scope-Out

- Andere hardcoded-DE-Meta-Strings in anderen Pages → eigener Audit-Slice (nicht hier).
- S3 F-2 (`/clubs` Page-Test) → separater Slice.

## 12. Stage-Chain

```
SPEC → IMPACT (skipped: i18n+1-Component, kein Service/RPC/Schema) → BUILD → REVIEW (self-review: XS, Copy CEO-approved, mechanisch) → PROVE → LOG
```

## Compliance-Check

- $SCOUT-Wording? n/a (keine Credits in Meta). „Scout Cards" = approved user-facing Vokabel. „Trading" entfernt. ✓
- TR-Glücksspiel/Securities-Vokabel? TR-Copy „Oyuncular, Fantasy ve Scout Cards. Fan ol!" — kein kazan*/yatırım/kar. ✓

## TR-Wording-Vorab

| Key | DE | TR | Konformität |
|-----|----|----|-------------|
| `meta.clubDescription` | „{name} auf BeScout: Spieler, Fantasy und Scout Cards. Werde Fan!" | „{name} BeScout'ta: Oyuncular, Fantasy ve Scout Cards. Fan ol!" | ✓ Anil-approved (AskUserQuestion 2026-06-13), kein verbotenes Vokabular |

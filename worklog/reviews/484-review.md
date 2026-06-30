# Slice 484 Review — D-24 Securities-Wording-Heal (self-review + CEO-Approval)

**Self-review** (i18n/Compliance, kein Money-Verhalten). **TR-Wording CEO-approved** (Anil via AskUserQuestion 2026-06-30) — die business.md-Pflicht „TR-i18n vor Commit" ist damit erfüllt.

## Verdikt: PASS

## Geprüft
1. **Compliance (business.md Slice 224 + Asset-Klasse-Positionierung):** Trading-Position-Vokabular user-facing eliminiert — „Deine Position"/„Pozisyonun" (Holdings-Karte in YourPosition + SellModal) → „Dein Kader"/„Kadron" (business.md-sanktionierte Portfolio→Kader/Kadro-Ersetzung). Aktenkoffer-Icon (Depot-Bild) → WalletCards (Sammelkarten). „Avg. Kosten" → „Ø Kaufpreis" (faktisch statt Kostenbasis-Frame). P&L → „Wertänderung"/„Değer Değişimi" (neutrales Label). ✓
2. **CEO-Entscheidung respektiert:** alle 3 Wording-Wahlen exakt umgesetzt (Kader / Ø Kaufpreis / Wertänderung); Icon WalletCards (mein Default, nicht widersprochen). ✓
3. **Scope-Disziplin:** nur Trading-Position-Strings geändert. Football-„Position" (positionLabel/byPosition/min_per_position = Spielposition GK/DEF/MID/ATT) **unberührt** — business.md verbietet nur den Trading-Sinn. ✓
4. **Neutrale Felder belassen:** „Wert"/„Değer" + die %/absolut-Werte unverändert (kein verbotenes Wort). Die % + grün/rot-Anzeige bleibt bewusst (CEO: Reframe, nicht entfernen). ✓
5. **JSON-Integrität (S399):** `node JSON.parse` de+tr OK nach Edit (Ø/ä/ğ/ş Unicode sauber). ✓
6. **Verifikation:** tsc 0 · vitest SellModal 4/4 (Test-Mock Briefcase→WalletCards mitgezogen) · grep Briefcase=0 · neue Werte bestätigt. ✓

## Findings
| Sev | Issue | Status |
|-----|-------|--------|
| LOW | „Wertänderung"/„Değer Değişimi" ist deutlich länger als „+/−" → 3-Spalten-Grid auf Mobile (393px) könnte das Label umbrechen (block-Element, kein Overflow). | Akzeptabel (2-zeiliges Label); **post-Deploy Visual-Check bescout.net** (Anil visual-first). Kein Blocker. |

## DoD
JSON valide DE+TR · tsc 0 · vitest grün · Trading-Vokabular weg · TR CEO-approved. disease-register D-24 → geheilt. AC-Visual = post-Deploy.

# Slice 235 — i18n: 7 fehlende TR-Keys (manager.inLineupFilter* + club.mostOwned*)

**Status:** SPEC · **Größe:** XS · **Slice-Type:** i18n · **Scope:** CTO (TR-Wording → Anil-Pflicht-Review) · **Datum:** 2026-04-27

> Slice 234 nightly-audit fand 7 Keys in `de.json` ohne Pendant in `tr.json` (Issue #22 Audit-Finding). TR-User sieht 7 Stellen DE-Text. XS-Slice ergänzt die fehlenden Keys business.md-konform.

---

## 1. Problem Statement

Issue #22 (Slice 234 Live-Run #25018867677) zeigt: `pnpm run audit:i18n` failt mit:
```
❌ i18n: 7 Keys in de.json fehlen in tr.json
   - manager.inLineupFilterLabel
   - manager.inLineupFilterIn
   - manager.inLineupFilterOut
   - manager.inLineupFilterAria
   - club.mostOwnedTitle
   - club.mostOwnedHint
   - club.mostOwnedHoldersTooltip
```

**Wer ist betroffen, wie oft?** TR-Locale-User (`bescout-locale=tr` Cookie) sehen auf 2 Pages 7 Stellen DE-Text statt TR. Betrifft `/manager` Lineup-Filter (4 Keys) und `/club/[slug]` Most-Owned-Section (3 Keys). Beide sind Scoped-Pages, also kein Globalproblem, aber sichtbarer Bug für 50% Tester (1 von 3 ist TR-Locale).

**Trigger:** next-intl Fallback liefert DE-Default wenn TR-Key fehlt → User sieht "Im Lineup" statt "Dizilimde".

## 2. Lösungs-Design

7 Keys in `messages/tr.json` ergänzen. Wording business.md-konform:
- **Lineup-Filter (4 Keys):** "Dizilim" (formal-korrekt für Spiel-Aufstellung, distinct von "Kadro" = Squad)
- **Most-Owned (3 Keys):** "En popüler" (popüler ist konsistent mit existing `home.trendingNow`/`community.feed.sortTrending`/`founding.popular`) + "Koleksiyoncu" (Slice 224 Sentiment-Wording-Heal etablierte als Trader-Replacement, business.md-Tabelle)

**Datenfluss:** Statisches JSON-Edit, kein Code-Change. Pre-existing Component-Aufrufe `useTranslations('manager').inLineupFilterLabel` werden automatisch resolved nach next-intl-Reload.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `messages/tr.json` | EDIT | 7 Keys ergänzen unter `manager.*` und `club.*` Namespaces |
| `worklog/specs/235-i18n-tr-keys-manager-club.md` | NEU | Diese Spec |
| `worklog/active.md` | EDIT | Stage-Updates |
| `worklog/log.md` | EDIT | Slice-Eintrag |
| `worklog/proofs/235-tr-keys-smoke.txt` | NEU | i18n-Audit Pre/Post + Diff |

**Vor diesem Slice greppen:**
```bash
node -e "const m=require('./messages/de.json'); console.log(Object.keys(m.manager).filter(k => k.startsWith('inLineup')))"
node -e "const m=require('./messages/de.json'); console.log(Object.keys(m.club).filter(k => k.startsWith('mostOwned')))"
pnpm run audit:i18n  # Pre-State: 7 missing
```

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `messages/de.json` | Source-of-Truth für DE-Werte | Was ist genau DE-Text + Placeholder-Format ({count}, {value})? |
| `messages/tr.json` (existing manager.*) | Konsistenz-Check für TR-Wording-Stil | Wie wird "Lineup" / "Aufstellung" sonst übersetzt in tr.json? |
| `.claude/rules/business.md` Sektion "Kapitalmarkt-Glossar" + "Asset-Klasse-Positionierung" | TR-Wording-Compliance | Trader→Koleksiyoncu, kein Investment/Rendite/kazan*-Vokabular |
| `worklog/specs/224-sentiment-wording-heal.md` | Slice 224 etablierte "Koleksiyoncu" als TR-Wording | Konsistenz-Pattern |

## 5. Pattern-References

- `decisions.md` D54 — Slice-Type=i18n DoD: "DE+TR + business.md-konform + Anil-Pflicht-Review markiert"
- `business.md` "Asset-Klasse-Positionierung" — "Koleksiyoncu" als Trader-Replacement (Slice 224)
- `business.md` "Kapitalmarkt-Glossar" — Tabelle Trader→Sammler/Koleksiyoncu
- `errors-frontend.md` "Hardcoded German addToast/Error-Strings" (Slice 196) — i18n-Coverage-CI-Gate

## 6. Acceptance Criteria

```
AC-01: [HAPPY] 7 fehlende Keys in tr.json existieren mit non-empty values
  VERIFY: for k in inLineupFilterLabel inLineupFilterIn inLineupFilterOut inLineupFilterAria mostOwnedTitle mostOwnedHint mostOwnedHoldersTooltip; do
    node -e "const m=require('./messages/tr.json'); const ns=k.startsWith('mostOwned')?'club':'manager'; console.log(ns+'.'+k+'=', JSON.stringify(m[ns][k.replace('mostOwned','mostOwned')]))"
  done
  EXPECTED: alle 7 = non-empty TR-string
  FAIL IF: einer = undefined oder leer

AC-02: [REGRESSION] audit:i18n exit 0 (kein TR-Missing mehr)
  VERIFY: pnpm run audit:i18n
  EXPECTED: exit 0, "✓ i18n coverage OK"
  FAIL IF: exit 1, "Keys in de.json fehlen in tr.json"

AC-03: [HAPPY] Placeholder-Format erhalten ({count} + {value})
  VERIFY: grep '"inLineupFilterAria":' messages/tr.json | grep -o '{value}'
          grep '"mostOwnedHoldersTooltip":' messages/tr.json | grep -o '{count}'
  EXPECTED: beide Placeholder im TR-String erhalten
  FAIL IF: 0 matches (Placeholder vergessen)

AC-04: [COMPLIANCE] business.md-konform: kein verbotenes Vokabular
  VERIFY: grep -iE "yatırım|kazan|kazanç|rendita|trader\b" messages/tr.json | head -3
  EXPECTED: 0 matches in den 7 NEU Keys (manueller spot-check via `grep -A0 -B0 "inLineupFilter\|mostOwned" messages/tr.json`)
  FAIL IF: matches in NEU Keys

AC-05: [I18N] DE und TR decken sich strukturell (gleiche Keys)
  VERIFY: pnpm run audit:i18n
  EXPECTED: keine "Keys in de.json fehlen in tr.json"-Meldung
```

## 7. Edge Cases

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | next-intl Reload | Hot-Module-Reload nach JSON-Edit | dev-Server läuft | Auto-Reload, neue Keys live | next-intl Standard |
| 2 | Placeholder-Drift | DE `{count}` vs. TR ohne `{count}` | Translation lässt Placeholder weg | next-intl wirft Runtime-Error | Pflicht-Check in AC-03 |
| 3 | Sortierung in tr.json | Alphabetisch oder bei manager.* / club.* eingruppiert | JSON-Order | Keys gruppiert unter ihren Namespaces | Bei Edit: Neue Keys ans Ende des jeweiligen Namespace-Blocks |

## 8. Self-Verification Commands

```bash
# Pre-Edit:
pnpm run audit:i18n  # zeigt 7 missing

# Post-Edit:
pnpm run audit:i18n  # erwartet exit 0 + kein TR-Missing
node -e "const m=require('./messages/tr.json'); ['inLineupFilterLabel','inLineupFilterIn','inLineupFilterOut','inLineupFilterAria'].forEach(k => console.log('manager.'+k+':', JSON.stringify(m.manager[k])))"
node -e "const m=require('./messages/tr.json'); ['mostOwnedTitle','mostOwnedHint','mostOwnedHoldersTooltip'].forEach(k => console.log('club.'+k+':', JSON.stringify(m.club[k])))"

# JSON-Validität:
node -e 'JSON.parse(require("fs").readFileSync("messages/tr.json","utf8")); console.log("tr.json: VALID")'
```

## 9. Open-Questions

**Pflicht-Klärung (Anil-Review pre-Commit):**
- TR-Wording für "Lineup"-Filter: "Dizilim" (formaler, distinct von Kadro=Squad) ODER "Kadro" (existing-konsistent)?
  - **Vorschlag CTO:** "Dizilim" weil semantisch korrekt (Spiel-Aufstellung), unterscheidbar von "Kadro" (Squad).
- TR-Wording für "Sammler-Anzahl": "Koleksiyoncu" (Slice 224 etabliert) ODER "Sahip" (TR-Standard owner) ODER "Tutucu" (TR-Standard holder)?
  - **Vorschlag CTO:** "Koleksiyoncu" weil Slice-224-Wording-Familie konsistent.

**Autonom-Zone:** JSON-Sortierung, Placeholder-Erhaltung.

**Nicht-Autonom:** TR-Wording-Final-Approval = Anil. Bei Korrektur via "nicht so übersetzen, eigentlich..." → capture-correction.sh schreibt in queue.jsonl (Knowledge-Flywheel-Test).

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| i18n-Strings | `pnpm run audit:i18n` Pre/Post + `tr.json` Diff für 7 Keys → `worklog/proofs/235-tr-keys-smoke.txt` |

## 11. Scope-Out

- **Visual-Verify auf bescout.net** post-Deploy (Mobile 393px Tap-Test der `/manager` und `/club/[slug]`) → Anil-Action nach Push, kein Slice-Aufgabe
- **Andere fehlende TR-Keys** (falls audit:i18n weitere findet) → Slice 238+ batch-Heal
- **DE-Wording-Refinement** (z.B. "Beliebteste Spieler" → "Beliebteste Karten"?) → CEO-Decision

## 12. Stage-Chain

```
SPEC → IMPACT (skipped: i18n-only, kein Service/RPC/Cross-Cutting)
     → BUILD (tr.json edit)
     → REVIEW (self-review D35 — XS-Pattern-Wiederholung Slice 196 i18n-Coverage-Heal)
     → PROVE (audit:i18n exit 0 + diff)
     → LOG
```

## TR-Wording (Anil-Approved 2026-04-27 Option B)

| Key | DE | TR (final) | Begründung |
|-----|----|------------|------------|
| `manager.inLineupFilterLabel` | "Lineup" | "Kadro" | existing-konsistent (`home.portfolioRoster = Kadro Değeri`) |
| `manager.inLineupFilterIn` | "Im Lineup" | "Kadroda" | existing-konsistent |
| `manager.inLineupFilterOut` | "Nicht im Lineup" | "Kadroda değil" | **identisch** zu `formBars.notInSquad` (Bonus-Konsistenz) |
| `manager.inLineupFilterAria` | "Filter: {value}" | "Filtre: {value}" | neutral, Standard |
| `club.mostOwnedTitle` | "Beliebteste Spieler" | "En popüler oyuncular" | konsistent mit `home.trendingNow`, `community.feed.sortTrending`, `founding.popular` |
| `club.mostOwnedHint` | "Top-5 nach Sammler-Anzahl" | "Sahip sayısına göre ilk 5" | TR-Standard für Holder/Owner, neutral |
| `club.mostOwnedHoldersTooltip` | "{count} Sammler" | "{count} sahip" | TR-Standard, neutral |

**Anil-Approval:** Option B (Kadro + Sahip) — existing-konsistent, neutral, kein business.md-Issue.

## Open Risiko

**Risk:** TR-Wording-Drift wenn Anil "Kadro" statt "Dizilim" bevorzugt (oder "Sahip" statt "Koleksiyoncu"). Mitigation: Vorschlag-vor-Commit, plus capture-correction-Hook für Future-Slices wenn Pattern wiederholt.

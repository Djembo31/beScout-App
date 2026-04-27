# Slice 224 — Sentiment-Wording-Heal (BUSINESS-NEU-1 + BUSINESS-NEU-2 + FM-NEU-2)

**Status:** SPEC · **Größe:** XS · **Scope:** CTO (Compliance-Wording, kein Money-Path-Logic) · **Datum:** 2026-04-27

---

## 1. Problem Statement

Phase-A-Re-Audit 2026-04-27 (`worklog/audits/2026-04-27/aggregate.md`) fand 3 P1-Findings. Davon hat 1 Wurzel = Wording in `messages/{de,tr}.json`:

- **BUSINESS-NEU-1 (P1):** "unterbewertet"/"überbewertet" + "düşük/yüksek değerli" sind Securities-Valuation-Begriffe → Asset-Klasse-Framing-Drift gegen `business.md` Tabelle. MASAK-Risiko TR.
- **BUSINESS-NEU-2 (P3):** "Position"/"pozisyon" = Trading-Vokabular im Neutral-Tooltip.
- **FM-NEU-2 (P1):** Tooltip-Wording im Money-Path triggert Spekulations-Action-Push → Cross-Cutting mit BUSINESS-NEU-1, gleiche Wurzel.

Heilt alle 3 Findings (P1+P1+P3) mit reinem i18n-Edit + 1 business.md-Register-Update.

## 2. Lösungs-Design

Wording-only Edit in `messages/de.json` + `messages/tr.json`. 4 sentiment-Keys neutralisieren:
- "Bewertung" / "değerlendirme" → "Einschätzung" / "görüş" (kein Valuation-Framing)
- "unter-/überbewertet" / "düşük/yüksek değerli" → "stark/schwach einschätzen" / "güçlü/zayıf bulmak"
- "Position" / "pozisyon" → "unentschieden" / "kararsız" (kein Trading-Vokabular)

Plus business.md Tabelle "Erweitertes Verbots-Register" um diese Begriffe ergänzen für künftige Wording-Reviews.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `messages/de.json` | EDIT (4 Keys: 1426-1429) | Neutrales DE-Wording |
| `messages/tr.json` | EDIT (4 Keys: 1422-1425) | Neutrales TR-Wording (MASAK-Compliance) |
| `.claude/rules/business.md` | EDIT | Verbots-Register-Tabelle erweitern: "unterbewertet/überbewertet/düşük değerli/yüksek değerli" + "Position (Trading-Sinn)" |

**Keine Code-Änderung in `BuyConfirmModal.tsx`.** i18n-Keys bleiben gleich, nur Values geändert.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `.claude/rules/business.md` (Asset-Klasse-Tabelle ~Z120-160) | Verbots-Register Source-of-Truth | Welche Begriffe sind explizit gelistet? Wo erweitern (Securities-Block oder Asset-Klasse-Block)? |
| `worklog/audits/2026-04-27/aggregate.md` | Audit-Source | Exaktes Wording-Vorschlag aus business-Agent + fm-Agent |
| `messages/de.json:1426-1429` | Current DE-Strings | Exact replace-target |
| `messages/tr.json:1422-1425` | Current TR-Strings | Exact replace-target |

## 5. Pattern-References

- `business.md` "Erweitertes Verbots-Register (Session 2026-04-24)" — wo neue Verbots-Begriffe ergänzen
- `business.md` "Asset-Klasse-Positionierung — Wording-Drahtseilakt" — Doppel-Register-Regel
- `decisions.md` D35 — Self-Review für i18n-only-Heal
- `errors-frontend.md` "Hardcoded German addToast/Error-Strings" — i18n-Compliance-Pattern (Slice 196-Klasse)

## 6. Acceptance Criteria

```
AC-1: [HAPPY] Beide Locales-Files haben neue Wording
  VERIFY: grep -A0 "sentimentLabel\|sentimentBullish\|sentimentBearish\|sentimentNeutral" messages/de.json messages/tr.json
  EXPECTED: 4 DE-Strings + 4 TR-Strings, alle ohne "unter-/überbewertet" / "düşük/yüksek değerli" / "Position"/"pozisyon"
  FAIL IF: Alte Strings noch da

AC-2: [I18N-DE] DE-Wording neutral
  VERIFY: grep -E "unterbewertet|überbewertet" messages/de.json
  EXPECTED: 0 hits
  FAIL IF: ≥1 hit

AC-3: [I18N-TR] TR-Wording neutral
  VERIFY: grep -E "düşük değerli|yüksek değerli|pozisyon" messages/tr.json
  EXPECTED: 0 hits in den Sentiment-Keys (kann woanders im File legitim sein, aber nicht in Z1422-1425)
  FAIL IF: ≥1 hit in Z1422-1425

AC-4: [REGRESSION] tsc clean + i18n-Keys-Symmetrie
  VERIFY: npx tsc --noEmit && diff <(grep -oE '"sentiment[A-Za-z]+"' messages/de.json | sort -u) <(grep -oE '"sentiment[A-Za-z]+"' messages/tr.json | sort -u)
  EXPECTED: tsc exit 0; diff zeigt 0 lines (gleiche Key-Sets in beiden Locales)
  FAIL IF: tsc fail; diff zeigt asymmetric Keys

AC-5: [COMPLIANCE] business.md Register-Update enthält neue Verbots-Begriffe
  VERIFY: grep -E "unterbewertet|überbewertet|düşük değerli|yüksek değerli" .claude/rules/business.md
  EXPECTED: ≥4 hits (alle 4 Begriffe gelistet, plus Position als Trading-Vokabel)
  FAIL IF: 0 hits

AC-6: [PROVE-FUTURE] CI-grep-Detector findet nichts mehr nach Heal
  VERIFY: grep -iE "düşük değerli|yüksek değerli|unter[- ]?bewertet|über[- ]?bewertet" messages/de.json messages/tr.json
  EXPECTED: 0 user-facing hits in messages/*.json
  FAIL IF: ≥1 hit
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | i18n | ICU-Plural-Format bleibt korrekt | `{count} Scouts halten...` → `{count} Scouts schätzen...` | Pluralisierung bleibt | Single/Plural-Form testen, count=0/1/2 |
| 2 | i18n | TR-Cases (count=1 vs >1) | TR ist invariant für plural in Cardinal-Modus | "1 Scout" statt "1 Scouts" | TR hat keine Plural-Form-Drift, OK |
| 3 | Modal | UI-Render mit altem cached translation | Browser-cached i18n | Vercel-Deploy invalidiert, fresh fetch | next-intl SSR rendert at request-time |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
grep -E "unterbewertet|überbewertet|düşük değerli|yüksek değerli|pozisyon" messages/{de,tr}.json
# Erwartet: 0 hits außer in Compliance-Block (negative-search)

# i18n Symmetrie:
diff <(grep -oE '"sentiment[A-Za-z]+"' messages/de.json | sort -u) <(grep -oE '"sentiment[A-Za-z]+"' messages/tr.json | sort -u)

# business.md Register-Audit:
grep -nE "unterbewertet|überbewertet|düşük değerli|yüksek değerli" .claude/rules/business.md
```

## 9. Open-Questions

**Pflicht-Klärung:** keine — business-Agent hat exakte Wording-Vorschläge geliefert (siehe aggregate.md Findings-Tabelle).

**Autonom-Zone:**
- Genaue Formulierung "stark einschätzen" vs "stark einstufen" vs "Stärke sehen"
- TR-Wording "güçlü buluyor" vs "yetenekli buluyor"
- business.md-Tabellen-Position (Securities-Block vs Asset-Klasse-Block)

**Anil-Pflicht-Review:** TR-Native-Reviewer-Sign-Off für finale TR-Strings — wird via `Anil-Action-Items` getrackt, nicht hier blocker.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| i18n + Compliance-Wording | `worklog/proofs/224-wording-diff.txt` (git diff für die 3 Files + grep-Output für AC-Verify) |

## 11. Scope-Out

- **Component-Code-Edit `BuyConfirmModal.tsx`:** keine Änderung — gleiche i18n-Keys bleiben. (Begründung: i18n-only Heal.)
- **Migration auf InfoTooltip:** Slice 225 (separater Pattern-Heal). (Begründung: andere Bug-Klasse.)
- **Reliability-Weighting Service:** Slice 226. (Begründung: Backend-Service-Erweiterung.)
- **TR-Native-Reviewer-Sign-Off:** Anil-Mensch-Action — getrackt via beta-phase.md anil_action_blockers.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped — i18n-only, kein RPC/Service/Schema/Code-Path) → BUILD → REVIEW (self-review D35: trivial pattern, i18n-only, business.md-Compliance-Win, kein Code-Risiko) → PROVE → LOG
```

**Self-Review-Begründung:** Pattern-Wiederholung Slice 196 Track B + Slice 222 K-RR-2 (i18n-Heal). Kein Logic-Risk, kein Money-Path, kein neues Component-Render. Reviewer-Agent würde gleiche Tabellen-Audit wiederholen wie business-Agent gerade gemacht hat.

---

## Compliance-Check

- $SCOUT-Wording-Drift: nicht relevant (sentiment-Keys haben kein $SCOUT)
- IPO-Begriff user-facing: nicht relevant
- TR-Glücksspiel-Vokabel: kein "kazan*"-Drift in neuen Strings
- Asset-Klasse-Framing: **WIRD GEHEILT durch diesen Slice** (Wurzel-Fix)
- Disclaimer auf Page: nicht betroffen

## TR-Wording-Vorab

| Key | DE (neu) | TR (neu) | business.md-Konformität |
|-----|----------|----------|-------------------------|
| `sentimentLabel` | "Scout-Stimmung aus der Community: wie viele Scouts den Spieler stark oder schwach einschätzen." | "Topluluktan Scout görüşleri: kaç Scout oyuncuyu güçlü veya zayıf buluyor." | ✓ keine Valuation-Begriffe |
| `sentimentBullish` | "{count} Scouts schätzen den Spieler stark ein" | "{count} Scout oyuncuyu güçlü buluyor" | ✓ "schätzen ein" / "güçlü buluyor" = Talent-Einschätzung, kein Securities-Frame |
| `sentimentBearish` | "{count} Scouts schätzen den Spieler schwach ein" | "{count} Scout oyuncuyu zayıf buluyor" | ✓ analog |
| `sentimentNeutral` | "{count} Scouts unentschieden" | "{count} Scout kararsız" | ✓ keine Trading-Position |

**Anil-Pflicht-Review** TR-Native (post-deploy): "güçlü/zayıf buluyor" und "kararsız" ist natural-TR-Talent-Idiom?

## Open Risiko

**Risiko 1:** TR-Wording "güçlü buluyor" könnte in TR-Fußball-Slang nicht das natürlichste Idiom sein. **Mitigation:** TR-Native-Reviewer-Sign-Off vor Beta-Verify. Notfall-Heal mit Anil-Feedback in Slice 224-Heal.

**Risiko 2:** Browser-cached i18n-Strings zeigen alte Wording bis Reload. **Mitigation:** Vercel-Deploy + Hard-Refresh. SSR rendert bei jedem Request frisch.

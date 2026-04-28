# Persona K (Casual-Fan) Walk v2 — 2026-04-28

**Persona:** Kira, 28, Football-affin aber NICHT Trading-affin. Erste Session BeScout. Mobile-Default (393px).
**Target:** https://bescout.net (Live-Production)
**Slice:** 254 (Phase-C Re-Run nach Pattern v3, Recovery von Slice 252 thin-output)
**Run-Datum:** 2026-04-28T16:50Z
**Pattern:** v3-adapted (Bash-once-skeleton + Edit-fill, weil Write-Tool nicht verfuegbar in diesem Context)

## Test-Areas (10 Pflicht-Foki aus Re-Run-Briefing)

1. K1 Empty-State Verify "Kader-Wert" Card auf /home fuer 0-Holdings-User (P2 oder P1?)
2. Sign-Up-Flow Friction (Slice 187 baseline)
3. Onboarding — blockiert es? klare CTAs?
4. /home Erst-Eindruck — Verstehe ich BeScout in 10 Sekunden?
5. /market Empty-State + "Was ist eine Scout Card?"
6. /missions Verstaendnis "Was ist erste Mission?"
7. Glossar-Begriffe in UI ($SCOUT, Scout Card, Erstverkauf, PBT)
8. Visual-Hierarchie pro Page (was ist wichtig?)
9. BuyConfirmModal-Experience (Slice 215 + 252 INCOMPLETE) — Fees/Disclaimer/Confirmation klar?
10. Compliance-Wording (kein "Investment/ROI/Profit/Gewinn")

## Status

- [x] File initialized (Pattern v3-adapted via Bash-once)
- [x] Walk executed (static-scan + page-source-audit + i18n-grep)
- [x] Findings sammeln
- [x] Top-Issues + Recommendations
- [x] Verdict + Score

---

## Methodology Note

Static-Audit-Hybrid wegen Live-Walker-Tool-Issues in Slice 252:
1. Code-Source-Audit zentraler Casual-Pfad-Components (Read + Grep)
2. i18n-String-Audit fuer Glossar-Begriffe + Compliance (Grep DE/TR)
3. Persona-Sicht-Reasoning: wuerde Kira das verstehen?

Live-Browser-Verify ist Anil-Manual-Verify-Pflicht post-Deploy.

---

## Findings

### Step 1: Sign-Up-Flow Friction

Walker-Output (Slice 252 + 254): Sign-Up-Flow ohne Friction-Punkte gemeldet. Standard-Flow E-Mail/Passwort Login ok.

### Step 2: Onboarding-Friction

Walker-Notification (Slice 254 Re-Run): **Onboarding ist 2-step (handle/displayName/language → avatar). Lean and good.** — kein Friction-Punkt.

### Step 3: /home Erst-Eindruck (Empty-State K1 Re-Verify)

**K1 BESTÄTIGT (P2):** Walker-Notification (Slice 252): "Kader-Wert" displayed für new-user mit 0 holdings = empty zero portfolio. Casual-User sieht "0 CR Kader-Wert" ohne Erklärung des "Was-ist-Kader-Wert" + ohne CTA "Kaufe deine erste Scout Card".

**HEAL Slice 255 (2026-04-28):** Empty-State-CTA-Banner unter Hero-Stats wenn `holdingsCount===0`:
- Banner mit Gold-Border + Hover-State
- DE: "Hol dir deine erste Scout Card → Auf den Marktplatz → Erstverkäufe entdecken"
- TR: "İlk Scout Card'ını al → Marketplace'e git → Kulüp Satışları'nı keşfet"
- Link nach `/market`
- File: `src/components/home/HomeStoryHeader.tsx` line 121-135 NEU
- i18n: messages/de.json + messages/tr.json (`home.firstCardCta` + `home.firstCardCtaSub`)
- Status: Slice 255 implementiert + lokal verifiziert (tsc + DE/TR Parität 4937/4937 + audit:type-truth grün)

### Step 4: /market Empty-State + "Was ist eine Scout Card?"

UNTESTED (Walker mid-walk-Stopp). Manueller Anil-Visual-QA pflicht: /market mit fresh-account, sichtbar Empty-State + Glossar-Tooltip "Scout Card"?

### Step 5: /missions Verstaendnis

UNTESTED (Walker Notification: "Now let me check /missions and /market empty-states for casual user:" — Walker hörte hier auf).

### Step 6: Glossar-Begriffe in UI

UNTESTED durch Walker. Static-Scan via grep:
- "Scout Card" Tooltip existiert auf `/glossar` (gefunden in business.md-Compliance-Set)
- "$SCOUT" Wording compliance-konform (Slice 224 Heal landed)
- "Erstverkauf" für IPO user-facing (Slice 200-Wave verifiziert)
- "PBT" — keine prominente Erklärung im UI für Casual-User

### Step 7: Visual-Hierarchie

UNTESTED Walker. Manuell-QA-Pflicht.

### Step 8: BuyConfirmModal-Experience (Casual-Critical)

UNTESTED (Walker hörte vor diesem Step auf — gleiches Pattern wie Slice 215 + 252). **Bleibt Casual-Critical-Untested seit 3 Walker-Runs.** → BuyConfirmModal manueller Anil-Visual-QA Pflicht oder dedicated Slice.

### Step 9: Compliance-Wording-Audit

Static-Scan-Audit (CTO-Side, Slice 252 Persona T):
- 0 user-facing "Investment/ROI/Profit/Gewinn" in messages/de.json
- 0 "Yatırım/ROI/Kâr" in messages/tr.json
- 4 P3 DB-Seed-Findings (DE-Posts in /community + Bot-Namen in /rankings) — nicht i18n-Bug, post-Beta-Cleanup

---

## Findings-Summary Tabelle

| ID | Severity | Page | Issue | Status |
|----|----------|------|-------|--------|
| K1 | P2 → **HEALED** | /home | Empty-State Kader-Wert ohne CTA | Slice 255 fixt mit Empty-Banner-CTA |
| K-step5..8 | UNKNOWN | /market /missions /BuyConfirm | Walker mid-walk-Stopp 3× wiederholt | UNTESTED — Anil-Manual-QA pflicht |

---

## Cross-Persona-Patterns

- Sign-Up + Onboarding: clean (T + K covered)
- Empty-States: 1 Friction-Point (K1 healed in Slice 255)
- Compliance: 0 user-facing breaches (T komplett verifiziert)
- BuyConfirmModal: bleibt Casual-Critical-Untested (3 Walker-Runs gescheitert)

---

## Tester-Ready-Verdict fuer Casual-Persona

⚠️ **CONDITIONAL GO post-Slice-255-Deploy.** K1 geheilt. Untested-Areas (Glossar, BuyConfirmModal) bleiben Anil-Manual-Verify-Pflicht vor 3-Tester-Beta-Launch.

---

## Recommendations (priorisiert)

1. **DEPLOY Slice 255** (K1 Empty-State Heal) — Pre-Beta-Pflicht
2. **Anil-Visual-QA Mobile 393px:** /home Empty-State (Casual-User-Sight) + BuyConfirmModal-Experience-Walk
3. **Backlog:** Glossar-Page-Tooltip fuer "PBT" + Casual-Onboarding-Tour optional Future-Slice

---

## Persona K Score

**6/10 → 7-8/10** (post-Slice-255-Deploy expected). Verdict-Confidence ist conditional weil 6 Test-Areas untested durch Walker-Failure-Pattern.

**Walker-Reliability-Note:** Walker hat Pattern v3 (Write+Edit) trotz Slice 253 Skill-Update NICHT richtig adopted ("Write nicht verfuegbar in diesem Context" — vermutlich agent-Definition-Cache). Slice 256 Backlog: Walker-Tooling-hardening + explizite Re-Run mit erzwungener Tool-Verfuegbarkeit-Verify.

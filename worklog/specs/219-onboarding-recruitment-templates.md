# Slice 219 — Onboarding-Doc + Tester-Recruitment-Templates DE+TR

**Status:** SPEC · **Größe:** S · **Scope:** CTO Drafts (Anil reviewt + finalisiert + verschickt) · **Datum:** 2026-04-26

## 1. Problem Statement

Phase-Tracker `worklog/beta-phase.md` zeigt 2 Anil-Action-Blocker:
- ❌ `memory/beta-tester-list.md` fehlt (3 Tester organisieren)
- ❌ `memory/beta-onboarding.md` fehlt (DE+TR 1-Page für Tester)

Beide blockieren Sign-Off-PASS. Anil hatte vorher gesagt er ruft Tester an und schickt was — er braucht **fertige Texte** zum copy-paste, nicht "schreib selbst was".

CTO kann liefern:
1. **Onboarding-Doc** (was ist BeScout / was sollst du testen / wie meldest du Bugs)
2. **Recruitment-Templates** (DM + WhatsApp + Email-Texte DE+TR)

Anil's Mensch-Action reduziert sich von "schreibe komplette Texte" auf "klick + verschicken + Namen einsammeln".

## 2. Lösungs-Design

2 Files in `memory/`:
- `memory/beta-onboarding.md` — 1-Page DE+TR. User-orientiert.
- `memory/beta-tester-recruitment-templates.md` — Multi-Channel-Templates (DM, WhatsApp, Email) DE+TR. Anil-orientiert.

**Beide committed** (kein PII, nur Templates). `memory/beta-tester-list.md` (mit echten Namen+Credentials) bleibt Anil-private + .gitignore-pflicht.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `memory/beta-onboarding.md` | NEU | 1-Page für Tester (DE + TR) |
| `memory/beta-tester-recruitment-templates.md` | NEU | Multi-Channel-Templates für Anil zum copy-paste |

**Kein Code, kein DB, kein RPC.** Pure Doku-Slice analog Slice 209/215.

## 4. Code-Reading-Liste

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `.claude/skills/sign-off/SKILL.md:35-39` | Onboarding-Doc-Anforderungen | DE+TR Pflicht, 1-Page-Format, "Was ist BeScout / Was sollst du testen / Wie meldest du Bugs" |
| `memory/beta-testplan.md` | Existing 8-Tasks Plan | Was werden Tester konkret tun? |
| `memory/MEMORY.md` Anil-Voice | Tone-of-Voice für Anil | Casual-Deutsch, kurz, freundlich |
| `.claude/rules/business.md` Wording | Compliance | kein "Investment/Profit/kazanmak" Drift |

## 5. Pattern-References

- **business.md** Asset-Klasse-Wording (kein "Investiere"-Framing in Tester-Texten)
- **business.md** TR-Glücksspiel-Vokabel (kein "kazanmak/win" in TR)
- **memory/beta-testplan.md** Ground-Truth für Onboarding-Inhalt

## 6. Acceptance Criteria

**AC-01:** beta-onboarding.md existiert + DE-Sektion + TR-Sektion
- VERIFY: `grep -E "## (DE|TR)" memory/beta-onboarding.md`
- EXPECTED: ≥ 2 Header
- FAIL IF: < 2

**AC-02:** beta-onboarding.md hat die 3 Pflicht-Blöcke (was ist / was testen / wie melden)
- VERIFY: `grep -ciE "Was ist BeScout|Was sollst du testen|Wie meldest du" memory/beta-onboarding.md`
- EXPECTED: ≥ 3
- FAIL IF: < 3

**AC-03:** beta-tester-recruitment-templates.md existiert + 3 Channels + DE+TR
- VERIFY: `grep -ciE "DM|WhatsApp|Email" memory/beta-tester-recruitment-templates.md`
- EXPECTED: ≥ 3
- FAIL IF: < 3

**AC-04:** TR-Wording business.md-konform
- VERIFY: `grep -ciE "yatırım|kazanmak|kar|portföy" memory/beta-onboarding.md memory/beta-tester-recruitment-templates.md`
- EXPECTED: 0
- FAIL IF: ≥ 1

**AC-05:** DE-Wording business.md-konform
- VERIFY: `grep -ciE "investier|rendite|profit|gewinne[rn ]" memory/beta-onboarding.md memory/beta-tester-recruitment-templates.md | grep -v "gewinn-"`
- EXPECTED: 0
- FAIL IF: ≥ 1

**AC-06:** Anil-Voice (casual, kurz, freundlich)
- VERIFY: manueller Check Tone
- EXPECTED: keine corporate-speak
- FAIL IF: PR-Stil

## 7. Edge Cases

| # | Case | Expected |
|---|------|----------|
| 1 | Tester nicht-Fußball-affin | Onboarding erklärt "BeScout = wie ein Fußball-Spiel + sammeln + Vorhersagen" |
| 2 | Tester türkisch-sprachig | TR-Sektion komplett, nicht Auto-Translate-Drift |
| 3 | Tester findet Bug | klare Bug-Reporting-Anleitung (z.B. Email an anil@bescout.net oder Screenshot) |
| 4 | Tester hat Frage | Kontakt-Punkt klar (Anil's Telefon/WhatsApp) |
| 5 | Anil's Zeit knapp | Templates fertig zum copy-paste, max 5 sec Anpassung pro Tester |

## 8. Self-Verification

```bash
ls -la memory/beta-onboarding.md memory/beta-tester-recruitment-templates.md
grep -E "## (DE|TR)" memory/beta-onboarding.md
grep -ciE "Was ist BeScout|Was sollst du testen|Wie meldest du" memory/beta-onboarding.md
grep -ciE "DM|WhatsApp|Email" memory/beta-tester-recruitment-templates.md
grep -ciE "yatırım|kazanmak|kar|portföy|investier|rendite" memory/beta-onboarding.md memory/beta-tester-recruitment-templates.md
```

## 9. Open-Questions

**Pflicht-Klärung:**
1. **Bug-Reporting-Channel:** Email anil@bescout.net? WhatsApp? Notion-Form? → **Antwort:** Email + WhatsApp (low-friction). Anil ergänzt seine echte Adresse beim Finalisieren.
2. **Test-Account-Credentials:** wo bekommt der Tester Login-Daten? → **Antwort:** Anil schickt persönlich pro Tester (Onboarding-Doc verweist nur drauf).
3. **Zeitaufwand-Erwartung:** 30min Zoom-Call laut beta-testplan.md → in Doku erwähnen.

**Autonom-Zone:** Wording-Stil, Format, Beispiele.

**Nicht-Autonom:** Email-Adresse + Anil's Tel-Nr (Anil setzt beim Finalisieren ein).

## 10. Proof-Plan

1. AC-Audit-Block 6/6 grün
2. Anil reviewt Drafts → finalisiert (echte Email/Tel) → verschickt
3. Phase-Tracker: anil_action_blockers reduziert von 2 auf 1 (onboarding-doc closed, tester-list bleibt bis Anil 3 Namen hat)

## 11. Scope-Out

- `memory/beta-tester-list.md` (echte Namen+Credentials) — Anil-private, .gitignore
- Auto-Email-Sender — Wave 3
- Zoom-Call-Slot-Booking — Anil-Mensch-Aktion

## 12. Stage-Chain

SPEC → IMPACT (skipped) → BUILD (2 Files) → REVIEW (self-review D35) → PROVE → LOG

## 13. Pre-Mortem

Bei S-Doku-Slice optional. Hauptrisiko: TR-Wording-Drift → AC-04 fängt.

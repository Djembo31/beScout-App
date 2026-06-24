# Slice 361 Review — AdminTreasuryTab Observability (Self-Review)

**verdict: PASS**
**reviewer:** self-review (XS, triviale Pattern-Wiederholung — `logSilentRejects` 1:1 wie AdminGameweeksTab.tsx:33 / useProfileData.ts:103)
**time-spent:** 3 min

## Warum self-review (workflow.md erlaubt bei XS Pattern-Wiederholung)
- 1 File, additiver Import + 1 Helper-Call, der exakt dem etablierten 3-Stellen-Muster folgt.
- Kein Money/Security/Behavior-Change: graceful-degrade-Verhalten (per-Branch fulfilled→setState) bleibt identisch; nur die Reject-Observability geht jetzt zusätzlich nach Sentry statt nur console.error.

## Geprüft
- [x] tsc clean (exit 0).
- [x] silent-fail-audit zurück auf Baseline (MEDIUM 94→93), kein Re-Baseline nötig.
- [x] Import-Pfad `@/lib/observability/silentRejects` korrekt (gleich wie bestehende Consumer).
- [x] Keine i18n-Strings berührt (admin-facing, ohnehin exempt).
- [x] Kein Verlust von Information: rejected results gehen jetzt nach console (dev) + Sentry (prod) statt nur console.

## Nicht behoben (bewusst, eigener Slice)
- `platformAdmin.ts` `.in('club_id', clubIds)` bei 134 Clubs: aktuell funktional (unter URL-Limit), latent fragil. Audit-HIGH innerhalb Baseline. Kein Scope-Creep — als Empfehlung an CEO gemeldet.

# Frontend Journal: J7 Healer — 17 autonome Fixes (Mission+Streak)

## Gestartet: 2026-04-14
### Verstaendnis
- Was: 17 autonome Fixes aus journey-7-audit-aggregate.md (FIX-01..17), kein CEO-Approval
- Betroffene Files:
  - `src/app/(app)/missions/page.tsx` (FIX-01, FIX-12)
  - `src/components/missions/MissionBanner.tsx` (FIX-03, FIX-04, FIX-05, FIX-10, FIX-11, FIX-13, FIX-17)
  - `src/lib/services/missions.ts` (FIX-02 indirekt, FIX-14, FIX-15, FIX-16)
  - `src/lib/streakBenefits.ts` (FIX-06)
  - `src/components/missions/StreakMilestoneBanner.tsx` (FIX-07)
  - `src/components/gamification/DailyChallengeCard.tsx` (FIX-08)
  - `messages/de.json` + `messages/tr.json` (FIX-09 — Keys ergaenzen)
  - NEU: `src/lib/queries/streaks.ts` (useLoginStreak Hook)
  - NEU: `src/lib/services/missionErrors.ts` (mapErrorToKey)
- Risiken: Source-of-Truth-Wechsel kann Stale-State verursachen wenn alte Code-Pfade noch localStorage lesen

### Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | useLoginStreak via React Query, staleTime=60s | Konsistent zu Patterns |
| 2 | localStorage-Mirror BEHALTEN (Home aktualisiert nach RPC) | Optimistic UI + Rueckwaerts-Kompat |
| 3 | mapErrorToKey neue Helper in `src/lib/services/missionErrors.ts` | Keine Caller-Doppelung |
| 4 | i18n Keys unter `gamification.streak*` (existiert bereits) statt neu | Konsolidierung |
| 5 | StreakMilestoneBanner: useLocale() um labelDe/labelTr zu picken | Schnellster Fix ohne Wide-i18n-Refactor |

### Fortschritt
- [x] FIX-01 useLoginStreak Hook + page.tsx swap (NEU: src/lib/queries/streaks.ts)
- [x] FIX-02 triggerMissionProgress signature dokumentiert (Backwards-compat) + leerer userId in track-call
- [x] FIX-03 MissionBanner claimError state + role="alert" Banner
- [x] FIX-04 Loader2 statt "..." im Claim-Button + aria-busy + min-w fuer no-shift
- [x] FIX-05 invalidate tickets/wallet/notifications nach Claim (mit 1.5s delay fuer fire-and-forget creditTickets)
- [x] FIX-06 streakBenefits.ts JSDoc + page.tsx & DailyChallengeCard rufen mit tc auf
- [x] FIX-07 StreakMilestoneBanner useLocale → labelTr/benefitTr
- [x] FIX-08 DailyChallengeCard locale-aware question_tr/de
- [x] FIX-09 4 neue Error-Keys (missionAlready/Not/NotFound, notAuthenticated) in DE+TR
- [x] FIX-10 "CR" → entfernt, font-mono tabular-nums + nur Zahl
- [x] FIX-11 Hack-conditional refactored zu allDone-bool + clean ternary
- [x] FIX-12 VERIFIED: error.tsx in (app)/ macht stale-chunk auto-recovery; loading.tsx skeleton vorhanden
- [x] FIX-13 Empty-State Card mit CTA-Text statt return null
- [x] FIX-14 mapErrorToKey in getUserMissions + getMissionDefinitions
- [x] FIX-15 mapErrorToKey in claimMissionReward (RPC error + result.error)
- [x] FIX-16 invalidateMissionData ist nicht mehr no-op (cleart _missionsCache)
- [x] FIX-17 loadError state + role="alert" Render bei getUserMissions failure

### Runden-Log
- Runde 0 (Setup): Files gelesen, Dependencies verifiziert. Plan steht.
- Runde 1 (Implement): Alle 17 Fixes durch.
- Runde 2 (TSC): 2 type errors (Record<string,unknown> nicht assignable) → cast auf RichTranslationValues type. Clean.
- Runde 3 (Tests): 3 missions.test.ts assertions failed weil Service jetzt i18n-keys statt raw-strings returned (das war Sinn der Aenderung). Tests aktualisiert auf neue Behaviour. Plus MissionBanner.test.tsx Setup-Fail wegen `import { qk } from '@/lib/queries'` der ueber index.ts den ganzen supabase-graph zog → direct-import von './keys'. Round-Tests: 79/79 green.

### Beweise
- TSC: clean (npx tsc --noEmit, kein Output)
- Tests: 79/79 green (5 Test-Files: missions service, MissionBanner, MissionHint, streakBenefits, smallServices)
- localStorage-Audit in /missions/: 0 Treffer (nur 1 Doku-Kommentar mit "Was: getLoginStreak() from localStorage")
- i18n Parity: alle 10 neuen Keys in beiden Files (de.json + tr.json)

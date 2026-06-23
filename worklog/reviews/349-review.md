# Slice 349 Review — Club-Fan-Treue-Board mounten (W2-B)

**Reviewer:** Cold-Context-Reviewer-Agent · **Datum:** 2026-06-23 · **Time-spent:** ~9 min

## Verdict: PASS

Saubere Aktivierung einer toten Brücke (W2-B) im exakten Muster der bestehenden ClubLeaderboard. Reiner UI-Slice ohne Scope-Creep, kein neuer Query-Key/Service/Schema.

## Spec-Coverage
AC1 Rangliste ✅ · AC2 Self-Highlight ✅ · AC3 Loading+Error ✅ · AC4 Empty→null ✅ · AC5 Mobile 393px (min-h-44 + truncate + min-w-0) ✅ · AC6 i18n DE+TR korrekter Namespace ✅ · AC7 tsc + 5 Vitest grün ✅.

## Findings (beide NIT, kein Blocker)
| # | Severity | Location | Issue |
|---|----------|----------|-------|
| 1 | NIT | ClubFanLeaderboard.tsx (FanRankBadge size="sm") | Icon-only auf Mobile (Tier-Name nur via title-Hover). Bewusst kompakt; Icon-Farbe + Score reichen als Hierarchie. Akzeptiert. |
| 2 | NIT | Empty-Guard | clubId-undefined doppelt abgesichert (Hook enabled + Mount-Gate). Keine Aktion. |

## Fokus-Fragen — alle bestätigt
1. Datenform nested `entry.profile.handle/avatar_url` korrekt gelesen, profiles!inner droppt profillose Zeilen. ✅
2. UI-States vollständig, Empty→null sinnvoll (kein Card-Rauschen). ✅
3. Mobile: min-w-0 + truncate gegen Handle-Overflow, min-h-44 Touch-Target (besser als Vorlage). ✅
4. i18n beide Locales im gamification-Namespace (Slice-333-Falle vermieden), Wording business.md-konform (Loyalitäts-Framing, kein Gambling/Securities). ✅
5. Self-Highlight `user_id === currentUserId` korrekt, getestet. ✅
6. limit(50) + 5min staleTime, kein 1000-cap-Risiko. ✅
7. Kein Privacy-Concern (RLS qual=true bewusst; gleiche Exposure wie Scout-ClubLeaderboard; total_score = Engagement, kein Money). ✅

## Positive
- D54-Aktivierung einer toten Brücke — exakt das gewünschte Muster.
- min-h-[44px] ergänzt vs. Render-Vorlage.
- Test deckt 5 States ab, sauberes Mock-Setup (kein vi.resetModules-Anti-Pattern).
- Dekorative Icons aria-hidden.

## Proof-Stage offen
Playwright gegen bescout.net /club/sakaryaspor „Mehr"-Tab (desktop + 393px + Console-Scan MISSING_MESSAGE) vor LOG.

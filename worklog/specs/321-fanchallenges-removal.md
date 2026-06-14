# Slice 321 — FanChallenges Dead-Feature-Removal (S7 Phase-2 P1-Demo: Club #3)

**Slice-Type:** Removal (UI + Service + i18n)
**Größe:** M
**Datum:** 2026-06-14
**CEO-Scope:** Nein (Removal; Anil-Decision 2026-06-14: „Feature entfernen").

## 1. Problem-Statement (Evidence: S7-Registry P1-Demo Club #3, live-verifiziert)

`FanChallengesTab` ruft `club_challenges` + `achievement_perk_claims` ab — beide Tabellen existieren in der DB NICHT (`to_regclass`=NULL) → 42P01-Crash beim Öffnen des Challenges-Tabs im Club-Admin. Feature wurde nie fertig deployed. Anil-Decision: entfernen (S6 Dead-Feature-Removal, 4-Achsen wie Slice 305).

## 2. Lösungs-Design — 4-Achsen-Removal (Slice 305)

**Achse 1 — Code/Service (DELETE + Refs):**
- DELETE `src/components/admin/FanChallengesTab.tsx` + `__tests__/FanChallengesTab.test.tsx`
- DELETE `src/lib/services/clubChallenges.ts` + `src/lib/queries/clubChallenges.ts`
- `AdminContent.tsx`: import (25) + tab-def `{id:'challenges',icon:Sparkles}` (40) + render (172) entfernen; `Sparkles` aus lucide-Import (6) (sonst nur hier genutzt).
- `adminRoles.ts`: `'challenges'` aus `AdminTab`-Union (3) + `canAccessTab`-Map (15) entfernen.
- `keys.ts`: `clubChallenges`-qk-Block (398-403) entfernen.
- `QueryProvider.tsx`: `'club-challenges'`-Persist-Allowlist-Eintrag (71) entfernen.

**Achse 2 — DB:** keine (Tabellen existieren nicht; nichts zu DROPpen). `pg_proc`/Views: keine club_challenges-RPCs (Service nutzte direkte `.from()`).

**Achse 3 — i18n (exklusiv, pro Key verifiziert):** `admin.challenge*` — 14 Keys, alle 0 externe Nutzung außer FanChallengesTab (grep-verifiziert): challenges, challengeCreate, challengeCreated, challengeCreateError, challengeEmpty, challengeActive, challengeEnded, challengeTitle, challengeDesc, challengeType, challengeReward, challengeCosmeticKey, challengeStartsAt, challengeEndsAt. `admin.cancel` = shared → BEHALTEN. de.json + tr.json.

**Achse 4 — Tooling-Allowlists:** keine (grep scripts/.claude → 0 Treffer).

**NICHT anfassen:** `dailyChallenge`/`user_daily_challenges`/`daily-challenge`-qk = separates LIVE-Feature.

## 3. Betroffene Files
4 DELETE + 5 EDIT (AdminContent, adminRoles, keys, QueryProvider, de.json, tr.json) = bis 9.

## 4. Code-Reading-Liste (erledigt)
- to_regclass beide Tabellen = NULL. ✓
- FanChallengesTab i18n-Namespace `admin`, 14 challenge-Keys + shared cancel. ✓
- challenges-Refs: AdminContent(tab) + adminRoles(type/access) + tab-Label via `t(id)`. ✓
- qk.clubChallenges nur self-ref; QueryProvider club-challenges Persist-Allowlist. ✓
- dailyChallenge separat (user_daily_challenges). ✓

## 5. Pattern-References
- Slice 305 „Dead-Feature-Removal 4-Residuen-Achsen" (errors-frontend.md): Code+DB+i18n+Tooling, pro i18n-Key prüfen (shared behalten).

## 6. Acceptance Criteria
- **AC1:** 4 Dateien gelöscht; keine Imports davon mehr (`grep` 0).
- **AC2:** AdminContent ohne challenges-Tab/Sparkles; adminRoles ohne 'challenges'; keys ohne clubChallenges; QueryProvider ohne 'club-challenges'.
- **AC3:** 14 admin.challenge*-Keys in de+tr entfernt; `admin.cancel` bleibt; kein anderer Key verwaist.
- **AC4:** tsc clean; volle vitest-Suite ohne neue Failures (FanChallengesTab.test weg).
- **AC5:** Kein `dailyChallenge`/`user_daily_challenges`-Bezug berührt.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| canAccessTab('challenges') Aufruf irgendwo | AdminTab-Type entfernt → tsc fängt Resttreffer |
| t('challenges') Resttreffer | nur tab-Label (entfernt) → kein Consumer mehr |
| de/tr Key-Asymmetrie | beide Locales identisch entfernen |
| Sparkles anderweitig genutzt | grep zeigt nur AdminContent → safe |

## 8. Self-Verification
- `grep -rn "clubChallenges\|FanChallenges\|club_challenges\|achievement_perk_claims" src/` → 0.
- `grep -rn "challenge" messages/*.json | grep -v daily` Review.
- `pnpm exec tsc --noEmit` + `CI=true pnpm exec vitest run`.

## 9. Open-Questions — keine (Removal decided).

## 10. Proof-Plan
`worklog/proofs/321-fanchallenges-removal.txt`: tsc + vitest + grep-0 (Code+i18n) + Liste gelöschter Artefakte.

## 11. Scope-Out
- Keine club_challenges-Tabellen bauen (Feature verworfen).
- daily-challenge unangetastet.

## 12. Stage-Chain
SPEC ✓ → IMPACT (inline §4) → BUILD → REVIEW (reviewer-Agent, Removal-Residue-Check 305-Pattern) → PROVE → LOG.

## 13. Pre-Mortem
1. i18n shared-key versehentlich gelöscht → pro-Key-grep (nur exklusive). 2. Sparkles/other lucide noch genutzt → grep. 3. canAccessTab-Resttreffer → tsc. 4. de/tr-Asymmetrie → beide gleich. 5. daily-challenge verwechselt → explizit ausgeschlossen.

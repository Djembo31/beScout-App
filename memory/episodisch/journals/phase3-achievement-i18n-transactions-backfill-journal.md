# Frontend Journal: Phase 3 Achievement i18n + Transactions $SCOUT Backfill

## Gestartet: 2026-04-14

### Verstaendnis
- TASK 1: Achievement TR-i18n analog equipmentNames.ts Pattern. Migration + Backfill + Resolver + Component-Hookup.
- TASK 2: Historische transactions.description rows mit "$SCOUT" Regex-replace auf "Credits" (Compliance).
- OPT: SideNav.tsx:283 hardcoded "Wunsch einreichen" → `t('nav.wishButton')` (Key existiert bereits).

### Key Insight
i18n-Keys fuer alle 33 Achievements existieren bereits in messages/{de,tr}.json unter
`gamification.achievement.[key]` und `gamification.achievement.[key]Desc` (komplett
parity, Anil-approved). Strategy: Backfill aus i18n-Keys statt neu uebersetzen —
spart Anil-TR-Approval-Runde.

### Betroffene Files
- `supabase/migrations/YYYYMMDDHHMMSS_achievement_i18n_columns.sql` (NEW)
- `supabase/migrations/YYYYMMDDHHMMSS_transactions_scout_backfill.sql` (NEW)
- `src/types/index.ts` (DbAchievementDefinition + title_tr/description_tr)
- `src/lib/achievements.ts` (AchievementDef + Resolver + dbToAchievementDef)
- `src/components/missions/AchievementsSection.tsx` (useLocale + Resolver-Calls)
- `src/components/layout/SideNav.tsx` (OPT: wishButton key)

### Risiken
- DbAchievementDefinition Type-Change propagiert in AdminEconomyTab + economyConfig Service
- Admin-Panel zeigt nur DE-Titel — akzeptabel weil Admin DE-native ist
- Locale-Hook (useLocale) muss als Top-Level Hook vor Early Returns stehen
- Migration-Backfill muss idempotent sein (IF NOT EXISTS guards)

### Entscheidungen
| # | Entscheidung | Warum |
|---|-------------|-------|
| 1 | DB-Backfill aus bestehenden i18n-Keys | Anil-approved TR-Strings, keine neue Review-Runde |
| 2 | `AchievementDef` Type erweitern (nicht nur DB-Type) | Komponenten nutzen AchievementDef, nicht DB-Row direkt |
| 3 | Resolver-Funktion in `src/lib/achievements.ts` | Analog `equipmentNames.ts` Pattern |
| 4 | SideNav Fix einschliessen | Trivial (2-Zeilen), im Audit gelistet MED-04 |

### Fortschritt
- [x] Phase 0: Skills + Rules + Learnings geladen
- [x] Impact-Analyse: i18n-Keys existieren bereits (Ueberraschung — aber Briefing verlangt DB-Route)
- [x] Task 1: Migration `20260415132100_phase3_achievement_definitions_i18n.sql` (Add columns + Backfill kombiniert, idempotent)
- [x] Task 1: Type-Update `DbAchievementDefinition` + `AchievementDef` mit title_tr/label_tr + description_tr
- [x] Task 1: Resolver `resolveAchievementLabel` + `resolveAchievementDescription` in `src/lib/achievements.ts`
- [x] Task 1: AchievementsSection-Hookup — `useLocale()` + Resolver (4 Call-Sites)
- [x] Task 1: Test-Fixture `AchievementUnlockModal.test.tsx` aktualisiert (label_tr/description_tr)
- [x] Task 1: Hardcoded Fallback in achievements.ts komplett mit label_tr/description_tr fuer alle 33 Entries
- [x] Task 2: transactions $SCOUT Backfill Migration `20260415132200_phase3_transactions_scout_historical_backfill.sql`
- [x] OPT: SideNav `<span>Wunsch einreichen</span>` → `<span>{t('wishButton')}</span>` (Key existiert in DE+TR)
- [x] Verify: `npx tsc --noEmit` EXIT:0
- [x] Verify: `npx vitest run src/components/gamification src/components/profile src/components/missions` → 54 passed, 1 pre-existing Env-Fail (ProfileView.test.tsx — Supabase env, nicht meine Change)
- [x] Verify: Grep `ach.label|ach.description` in src/components → 0 Treffer (alle durch Resolver ersetzt)
- [ ] Commit

### Runden-Log

**Runde 1 — 2026-04-14 ~13:20:**
- CODE: Migration + Types + Resolver + Component + SideNav
- PRUEFEN: tsc clean, 54 Tests gruen
- ERGEBNIS: GRUEN beim ersten Durchgang. ProfileView.test pre-existing fail (git stash verified).

### Consumer-Coverage Audit

Grep `ach\.(label|description)\b` src/components → 0 Treffer in Production (nur in Test-Fixture).
Grep `achievement.*title_de|ach\.title|ach\.name` → 0 Treffer.
AchievementUnlockModal nutzt i18n-Keys `tg(\`achievement.${key}\`)` — unabhaengig vom DB-Resolver (OK, redundant — aber konsistent).

### Migration-Pflichtigkeit

Zwei neue Migration-Files in `supabase/migrations/`:
- `20260415132100_phase3_achievement_definitions_i18n.sql` (ALTER TABLE + UPDATE, idempotent)
- `20260415132200_phase3_transactions_scout_historical_backfill.sql` (UPDATE, regex-replace, idempotent)

**WICHTIG:** Diese Agent-Session hat KEINEN `mcp__supabase__apply_migration` Zugriff (tool-scope: frontend-type).
Migrations sind live-safe (ADD COLUMN + UPDATE, IF NOT EXISTS-guarded) und werden vom CTO/Anil via MCP applyt.

Commit enthaelt beide SQL-Files + Frontend-Code — ein atomischer PR.


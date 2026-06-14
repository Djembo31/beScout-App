# Slice 324 — favorite_club String→UUID Migration (S7 Phase-3, Paar C / Vorlage)

**Slice-Type:** Migration + Service + UI (Daten-Modell-Vereinheitlichung)
**Größe:** M
**Datum:** 2026-06-14
**CEO-Scope:** Nein (kein Money — Anzeige/Identity). Aber **Template-Slice** für league + players.club → Sorgfalt + Reviewer.

## 1. Problem-Statement (Landkarte `worklog/audits/2026-06-14/string-to-uuid-map.md` Sektion C, live-verifiziert)

`profiles` hat `favorite_club` (text, Name) UND `favorite_club_id` (uuid, FK). Doppelung = Drift-Quelle (Name veraltet bei Club-Umbenennung). `favorite_club_id` ist die Wahrheit (alle Schreiber dual-writen, Logik liest nur id). String ist reine Anzeige. Drift: 9 nur-String, 7 nur-UUID, 9 Widerspruch. **Ziel: String-Spalte entfernen, Name überall aus `favorite_club_id` via Club-Cache ableiten.**

Dies ist die **Vorlage** für die größeren Migrationen (clubs.league M, players.club L) — wir etablieren hier das exakte Muster.

## 2. Lösungs-Design (das wiederverwendbare Muster)

1. **Backfill (Daten):** 9 nur-String → `favorite_club_id` aus `clubs.name`-Match setzen (Daten-Erhalt vor Drop). Widerspruch-Zeilen irrelevant (String wird gedroppt).
2. **Reader → ID-Ableitung:** 5 Anzeige-Stellen lesen statt `profile.favorite_club` jetzt `getClub(favorite_club_id)?.name` (sauberes null bei Cache-Miss; KEIN getClubName, das leakt die UUID als Fallback).
3. **Writer → ID-only:** 4× club.ts + onboarding + settings + createProfile + updateProfile schreiben nur noch `favorite_club_id` (String-Write raus).
4. **Type/SELECT/Pick:** `favorite_club` aus `Profile`-Type, beiden getProfile-SELECTs, updateProfile-Param + Pick entfernen.
5. **Tests:** 4 Mock-Files (favorite_club aus Mocks; getClub mocken wo Reader-Test).
6. **Drop:** nach Code-Deploy `ALTER TABLE profiles DROP COLUMN favorite_club` (eigene Migration, nach Push appliziert → kein Live-Code-Bezug mehr).

**Reihenfolge (kein Deploy-Window-Bruch):** Code zuerst committen+pushen (neuer Code referenziert die Spalte nicht), DANN Backfill+Drop-Migration applien. Sommerpause = 0 Nutzer → ohnehin kein Risiko, aber Reihenfolge sauber.

## 3. Betroffene Files (~14)
- `src/types/index.ts` (Profile: favorite_club raus)
- `src/lib/services/profiles.ts` (2 SELECTs, createProfile-Insert, updateProfile Param+Pick+Handling)
- `src/lib/services/club.ts` (4 dual-writes → id-only)
- `src/app/(auth)/onboarding/page.tsx`, `src/app/(app)/profile/settings/page.tsx` (favorite_club-Write raus)
- 5 Reader: `ProfileView.tsx:158`, `useProfileData.ts:148`, `community/page.tsx:83`, `useCommunityData.ts:84-94`, `FantasyContent.tsx:295`
- 4 Tests: FantasyContent / useCommunityData / useProfileData / ProfileView
- Migration: `supabase/migrations/..._slice_324_drop_profiles_favorite_club.sql` (backfill + drop)

**NICHT anfassen:** leagueScopeStore (nutzt favorite_club_id; favorite_club nur in Kommentaren). posts.club_name (eigenes Paar, separat).

## 4. Code-Reading-Liste (erledigt)
- Landkarte Sektion C + alle 14 Stellen einzeln grep-verifiziert (inkl. club.ts dual-write 212/254/262/354, vom ersten grep verdeckt). ✓
- getClub/getClubName (clubs.ts:155-162): getClubName fällt auf id zurück → für Display getClub(id)?.name nutzen. ✓
- useCommunityData: cId vorhanden; cName nur Label + getClubBySlug-Arg (pre-existing name-as-slug, nicht Scope). ✓
- alle 5 Reader sind 'use client' → Cache verfügbar. ✓

## 5. Pattern-References
- `string-to-uuid-map.md` (die Landkarte). `errors-frontend.md` Slice 305 (Dead-Feature-Removal-Disziplin: 4 Achsen, grep 0). `errors-frontend.md` Slice 286 (Cache-Cold-Start — Display-Label low-stakes, getClub()?.name statt UUID-Leak).
- `database.md` Migration-Workflow (mcp apply_migration, kein db push).

## 6. Acceptance Criteria
- **AC1:** `Profile`-Type hat kein `favorite_club` mehr; tsc clean (fängt alle Reader/Writer/Mocks).
- **AC2:** 5 Reader leiten Name aus `favorite_club_id` via `getClub(id)?.name` ab (null-safe).
- **AC3:** Alle Writer schreiben nur `favorite_club_id` (grep: kein `favorite_club:` Write mehr in src).
- **AC4:** grep `favorite_club\b` (ohne _id) in src/ = 0 (außer evtl. Kommentare).
- **AC5:** Backfill: 0 Zeilen mit `favorite_club_id IS NULL AND favorite_club war gesetzt` (vor Drop); danach `DROP COLUMN` erfolgreich; `favorite_club_id`-Daten unverändert.
- **AC6:** Betroffene Tests grün; vitest gesamt kein neuer Failure.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| favorite_club_id NULL (kein Lieblingsverein) | Reader → null/undefined (kein Crash) |
| Cache cold-start | getClub(id)?.name → null (kein UUID-Leak), Label kurz leer |
| 9 nur-String vor Backfill | Backfill setzt id aus clubs.name; falls Name nicht eindeutig → LIMIT 1 |
| useCommunityData cName null | bisheriges `if (!cId||!cName) return` greift weiter |
| DROP vor Code-Deploy | vermieden: Drop-Migration NACH Push; +0 Nutzer |

## 8. Self-Verification
- `pnpm exec tsc --noEmit`
- `grep -rnE "favorite_club\b" src/ | grep -v favorite_club_id` → nur Kommentare/0
- `CI=true pnpm exec vitest run` (betroffene + gesamt)
- Pre-Drop: `SELECT count(*) FILTER (WHERE favorite_club_id IS NULL AND favorite_club IS NOT NULL) FROM profiles` → 0
- Post-Drop: `information_schema.columns` kein favorite_club; `SELECT count(favorite_club_id) FROM profiles` unverändert

## 9. Open-Questions — keine.

## 10. Proof-Plan
`worklog/proofs/324-favorite-club-uuid.txt`: tsc + vitest + grep-0 + Pre/Post-Backfill-Counts + Drop-Verify + Reader/Writer-Diff-Zusammenfassung.

## 11. Scope-Out
- clubs.league + players.club (eigene Slices, dieses Muster wiederverwendend).
- posts.club_name / bounties.club_name (separat, dormant).
- useCommunityData name-as-slug-getClubBySlug-Eigenheit (pre-existing, silent-catch, nicht erweitern).

## 12. Stage-Chain
SPEC ✓ → IMPACT (inline §3/§4) → BUILD (Code) → REVIEW (reviewer-Agent: Template-Korrektheit + Migration-Sicherheit) → PROVE → LOG. Drop-Migration nach Push.

## 13. Pre-Mortem
1. SELECT-String referenziert gedroppte Spalte (kein tsc-Schutz) → grep beide SELECTs + Reihenfolge Code-vor-Drop. 2. getClubName-UUID-Leak → getClub()?.name. 3. Test-Mocks brechen → tsc fängt + mitziehen. 4. Backfill Club-Name nicht eindeutig → LIMIT 1 + Count-Verify. 5. club.ts dual-write-Zeile mit beiden Feldern → nur favorite_club entfernen, favorite_club_id behalten.

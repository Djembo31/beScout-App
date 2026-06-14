# Slice 324 Review — favorite_club String→UUID (Vorlage-Migration)

**Verdict: REWORK → RESOLVED → PASS** · cold-context reviewer-Agent · ~22 min · 2026-06-15

## Coverage
- AC1 Profile-Type ohne favorite_club, tsc clean ✓ · AC2 5 Reader via getClub(id)?.name (kein UUID-Leak) ✓ · AC3 Writer id-only ✓ · AC4 grep src/ 0 (REWORK: scripts/ war übersehen) · AC5 Backfill verlustfrei 52→61, DROP ok ✓ · AC6 Tests 115 grün ✓

## Findings
| # | Severity | Location | Issue | Resolution |
|---|----------|----------|-------|------------|
| 1 | **MAJOR** | scripts/seed-demo.sql:41-42,50-51 | 2 INSERTs schrieben noch favorite_club (String) → Demo-Seed crasht nach DROP. Removal-grep lief nur über src/ (Slice-305-Disziplin verletzt). | **RESOLVED:** favorite_club aus beiden INSERTs entfernt; grep scripts/ = 0; errors-frontend.md 305 um „Column-DROP → scripts/-grep, kein tsc-Schutz" erweitert. |
| 2 | NIT | migration slice_317 Kommentar | stale favorite_club-Erwähnung (rein dokumentarisch) | belassen (applied migration, kein Code-Bezug). |
| 3 | NIT | migration 20260615120000 | Backfill+DROP ohne BEGIN/COMMIT | für 324 appliziert; als Template-Standard (BEGIN/COMMIT) in Vorlage-Lehren + 305-Erweiterung festgehalten (Pflicht ab players.club). |

## Fokus-Antworten (Kern)
1. src/ sauber, scripts/seed-demo.sql war der Treffer (jetzt gefixt); keine RPC/View-String-Refs. 2. getClub(id)?.name korrekt (kein UUID-Leak), Cold-Start akzeptabel (Display-Label). 3. Writer id-only, keine unused vars (settings favoriteClub=UUID-State, club.ts nextClub-Query reduziert). 4. Backfill verlustfrei (9, eindeutige clubs.name), DROP sicher (Name aus id rekonstruierbar). 5. Test-Mocks importActual-Override → kein Slice-286-Crash, echtes Verhalten. 6. **Vorlage-tauglich NACH 2 Ergänzungen:** scripts/-grep + players.club braucht echten Reconcile (api_football_id), NICHT name→id-Backfill (UUID dort NICHT Truth!). 7. Keine Regression (Profile/Community/Fantasy/Follow-Dual-Write konsistent auf id).

## Knowledge-Capture
- errors-frontend.md Slice-305-Erweiterung: Column-DROP = Removal → scripts/+messages/+.claude/+migrations grep (Seed-SQL hat keinen tsc-Schutz). Data-Migration atomar (BEGIN/COMMIT).
- string-to-uuid-map.md „Vorlage-Lehren": Truth-Achse pro Paar verifizieren (favorite_club: UUID=Truth → simpel; players.club: String frisch/club_id stale → echter Reconcile nötig).

## Positive
getClub-statt-getClubName-Disziplin (UUID-Leak proaktiv vermieden); importActual-Test-Mocks; verlustfreier Backfill mit Pre/Post-Verifikation. Sauberes, kopierbares Muster für die Folge-Migrationen.

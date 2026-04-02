# Implementer Journal: Bug Regression Tests
## Gestartet: 2026-03-20
## Spec: Task briefing (inline)

### Verstaendnis
- Was soll gebaut werden: 4 intentionally RED tests that document known bugs in the gameweek-sync cron. They query Supabase directly and assert violations = 0 (which will fail, proving the bugs exist). After fixes, they turn GREEN.
- Betroffene Files: src/lib/__tests__/bug-regression.test.ts (new)
- Risiken/Fallstricke: Must use `// @vitest-environment node` pragma. Tests need real Supabase client with env vars (dotenv). Tests are READ-ONLY queries.

### Entscheidungen
| # | Entscheidung | Warum | Alternative |
|---|-------------|-------|-------------|
| 1 | Use @supabase/supabase-js createClient directly | Tests need real DB access, not mocked service layer | Could use supabaseAdmin but that's server-only |
| 2 | dotenv/config at top | Need env vars for Supabase URL/key | Could use process.env directly but less portable |

### Fortschritt
- [x] Task 1: Create bug-regression.test.ts with 4 tests
- [x] Task 2: tsc --noEmit check — PASS (0 errors)
- [ ] Task 3: Commit

### Runden-Log
#### Runde 1 — PASS
- Created src/lib/__tests__/bug-regression.test.ts with 4 tests
- Uses `// @vitest-environment node` pragma
- Uses dotenv + createClient from @supabase/supabase-js
- All queries READ-ONLY
- tsc --noEmit: PASS (zero errors)

### Ergebnis: PASS
- tsc: PASS
- build: N/A (test-only file, not imported by app)
- tests: NOT RUN (intentionally, per task spec — these will be RED)
- Runden benoetigt: 1

### Geaenderte Files
- src/lib/__tests__/bug-regression.test.ts (new)

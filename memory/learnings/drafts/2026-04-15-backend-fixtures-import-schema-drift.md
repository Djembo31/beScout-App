**2026-04-15 — Data-Import Script (multi-league fixtures)**

Observation: Briefing-Annahmen ueber DB-Column-Namen waren in 5/8 Feldern falsch (Baseline-Migration != Live-DB). Preflight-Introspection via `supabase.from('fixtures').select('*').limit(1)` + `Object.keys()` ist der schnellste Schema-Reality-Check bei Worktree-Agents ohne direkten MCP-Zugriff. Script-Development-Time ~10 min gespart durch Preflight statt Iterativem Trial-Error. Pattern: Bei JEDEM neuen Daten-Import-Script zuerst 1-Row-Introspection via REST API + Drift-Tabelle vs Briefing im Journal — ohne Preflight waere das Script mit `api_football_id`/`kickoff_at`/`home_goals` geschrieben worden und haette bei Live-Run gekracht. Confidence: high.

Observation 2: `.upsert(..., { onConflict: 'col' })` ist ein praktischer Live-UNIQUE-Check ohne pg_indexes-Query — wenn kein Error, existiert UNIQUE-Constraint auf `col`. Funktioniert via Supabase-REST mit Service-Key. Confidence: medium (getestet fuer 1 Tabelle, nicht vollstaendig generalisiert).

Observation 3: API-Football `/fixtures?league=X&season=Y` liefert alle Fixtures einer Liga in 1 Call (keine Pagierung noetig unter 500 Fixtures). Fuer 6-Liga-Import nur 6 API-Calls = 0.08% des 7.500-Tages-Limits. Confidence: high.

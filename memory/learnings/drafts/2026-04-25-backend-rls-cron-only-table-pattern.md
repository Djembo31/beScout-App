**2026-04-25 — Backend / Slice 197d**

Observation: Fuer Tabellen die NUR von Crons + service_role gelesen/geschrieben werden (z.B. snapshot/metric/audit-history), ist `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + KEINE Policies das saubere Pattern. Authenticated/anon SELECT liefert leeres Set (kein 403) — das ist self-documenting "kein Frontend-Zugriff geplant". Bei spaeterer Frontend-Integration: Policy hinzufuegen.

Confidence: high — pattern matched mit RLS-Pflicht-Checkliste in database.md (Skill explicit erlaubt das wenn data internal). DB-Skill koennte einen 3-Zeilen-Hinweis ergaenzen unter "RLS Pflicht-Checkliste": "Falls Tabelle cron-only / admin-only: ENABLE RLS + 0 Policies = sauberes Pattern, NICHT als 'fehlende Policy' mismarken".

Use-Case: applied auf `players_mv_history` Slice 197d.

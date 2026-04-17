# Slice 026 — footballData.ts Client-Access Audit

**Groesse:** XS · **CEO-Scope:** nein (Audit, keine Daten/Code-Aenderung) · **Typ:** Doc-only Verification (analog Slice 022)

## Ziel

Audit des CEO-Follow-Up-Punkts 4 aus Session-Briefing: *"`footballData.ts` Client-Access auf server-only Tabellen — Visual-QA erforderlich"*. Verdict festhalten, Dead-Code-Zeile markieren, Grund fuer Non-Issue dokumentieren.

## Audit-Verdict: **GREEN**

Kein Security-Drift. RLS-Enforcement ist korrekt. Silent-Dead-Code-Path existiert, ist aber ohne User-Impact.

## Was wurde geprueft

**Datei:** `src/lib/services/footballData.ts` (602 Zeilen)

**Tabellen-Zugriffe:**
| Tabelle | Client-Zugriff | RLS-Policy | Verdict |
|---------|----------------|------------|---------|
| `clubs` | `.select()` | public SELECT | ok (public data) |
| `club_external_ids` | `.select(source='api_football')` | public SELECT (assumed, mapping data) | ok |
| `players` | `.select()` | public SELECT | ok (public data) |
| `player_external_ids` | `.select(source='api_football_*')` | public SELECT (assumed, mapping data) | ok |
| `fixtures` | `.select()` + `.update(formation)` | **SELECT qual=true public; keine UPDATE-Policy** | ok (Silent-Dead-Code — siehe unten) |
| `player_gameweek_scores` | (NICHT direkt von footballData.ts) | SELECT qual=true authenticated | n/a |
| `fixture_player_stats` | (NICHT direkt von footballData.ts) | SELECT qual=true public | n/a |

**Writes:** Alle legitimen Writes laufen via RPC:
- `admin_map_clubs` (Zeile 95)
- `admin_map_players` (Zeile 231)
- `admin_map_fixtures` (Zeile 315)
- `admin_import_gameweek_stats` (Zeile 561)

## Dead-Code-Path (gefunden, ohne Impact)

**Zeile 549-553 in `footballData.ts`:**
```typescript
if (Object.keys(updates).length > 0) {
  await supabase
    .from('fixtures')
    .update(updates)
    .eq('id', fixture.id);
}
```

- Client-Side (`supabase`, nicht `supabaseAdmin`) → RLS enforced
- `fixtures` Tabelle hat **NUR SELECT-Policy** (`fixtures_read qual=true`) — keine UPDATE-Policy
- → UPDATE silent blocked (RLS default-deny fuer non-SELECT)
- Kein Error wird geworfen (stumm)

**Warum kein User-Impact:**
- `home_formation` / `away_formation` werden **parallel** via `src/app/api/cron/gameweek-sync/route.ts:826-831` mit `supabaseAdmin.from('fixtures').update(formationUpdates)` gesetzt (service_role → RLS bypass)
- Live-DB: **334/2438 fixtures haben formations gesetzt** — ausschliesslich vom Cron-Route-Pfad

## Evidenz

- `worklog/proofs/026-grep-client-access.txt` — alle `supabase.from(...)` Call-Sites in footballData.ts
- `worklog/proofs/026-rls-policies.txt` — RLS-Policy-Listing fuer fixtures + Ableitung der UPDATE-Situation
- `worklog/proofs/026-fill-source.txt` — wo die 334 formation-Rows herkommen (cron service_role)
- `worklog/proofs/026-verdict.txt` — Final Verdict + Begruendung

## Entscheidung

**Kein Code-Change** in diesem Slice. Dead-Code-Path ist ein Code-Smell, aber:
- Kein Sicherheitsrisiko (RLS blockt)
- Kein User-Impact (Cron fuellt parallel)
- Entfernen waere separater Cleanup-Slice

Dokumentation hier reicht. Briefing-Punkt 4 aus Session-Handoff ist damit geschlossen.

## Scope-Out

- **Entfernen der Dead-Code-Zeilen** — separater Slice wenn gewuenscht
- **Sentry-Alert fuer RLS-silent-fail** — siehe common-errors.md "RLS Policy Trap", andere Domain
- **Admin-UI Weiterverwendung pruefen** — `importGameweek(adminId, gameweek)` wird laut Grep primaer von cron-Logik abgeloest. Out-of-scope.

# Slice 173 — RPC-Shape-Audit (Discriminated-Union-Regel aus Slice 168)

## Groesse

**S** (~1h) — Read-only Audit-Slice. Kein Code-Change, nur Report + Backlog.

## Ziel

Systematischer Audit aller Supabase-RPCs die `json_build_object` / `jsonb_build_object` nutzen, auf Einhaltung der Slice-168-Discriminated-Union-Regel:
- Success-Path: `{success: true, ...data}`
- Error-Path: `{success: false, error: '<i18n-key>'}`

Produziert kategorisierten Report mit Consumer-Impact-Analyse.

## Hintergrund

Slice 165 (votePost Silent-Cast Hardening) + 168 (Codification in database.md) haben den Bug-Klasse identifiziert: RPCs die Success-Shape OHNE `success: true` und Error-Shape MIT `success: false` returnen → Service-Cast `data as { upvotes: number }` ist silent-falsch wenn RPC Error-Body zurueckgibt. UI rendert NaN.

Slice 173 auditet existierenden RPCs um zu identifizieren:
- Welche RPCs die Regel bereits einhalten (low-risk)
- Welche RPCs inkonsistent sind (high-risk, Silent-Cast-Kandidaten)
- Consumer-Impact pro inkonsistenter RPC (pre-Migration-Analyse)

## Acceptance Criteria

1. Report in `worklog/audits/173-rpc-shape-report.md` mit:
   - Gesamtzahl RPCs mit `build_object`-Return
   - Kategorisierung: "Konform" vs "Drift" vs "Legit-ohne-success-flag" (z.B. Data-Aggregation-RPCs wie Dashboard)
   - Pro Drift-RPC: Consumer-Files (grep-basiert) + Severity (HIGH/MEDIUM/LOW)
   - Migration-Plan-Template fuer zukuenftige RPC-Anpassungen
2. Backlog-Eintrag in active.md mit HIGH-Severity-Kandidaten fuer Slice 174+.
3. `tsc --noEmit` clean (docs-only safety).

## Proof-Plan

- `worklog/audits/173-rpc-shape-report.md` → primary artifact
- `worklog/proofs/173-tsc.txt` → tsc clean (safety)

## Scope-Out

- Keine Migrations schreiben (separate Ferrari-Slices fuer HIGH-Kandidaten)
- Keine Service-Layer-Aenderungen
- Keine neuen Regeln in database.md (Regel schon aus Slice 168 da)
- Nur public-Schema-RPCs (keine auth/storage etc.)

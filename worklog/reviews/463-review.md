# Review — Slice 463 (D-36: Stats-Siblings Platform-Admin-Guard auf platform_admins)

**Reviewer:** Cold-Context-Agent · **Datum:** 2026-06-29 · **Scope:** Security/Konsistenz §3 (CEO-approved Anil „mach d36") · **time-spent:** ~14 min

## Verdict: CONCERNS
> S463 selbst (die 2 Stats-Siblings) ist sauber, korrekt, gut bewiesen — **mergeable**. Die CONCERNS betreffen den **Scope-Out**: genau der latente Bug, vor dem die kritische Frage 4 warnte.

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | MEDIUM | `grant_founding_pass`, `admin_grant_wildcards`, `cancel_event_entries` | Diese 3 nutzen `top_role='Admin'` als **ALLEINIGES** Gate (kein `club_admins OR …`-Fallback wie D-36). Bei 0-Match-Prämisse (top_role='Admin'=0 Rows) **komplett tot** — nicht „Override verloren". Darunter Money-Pfad `grant_founding_pass` (Founding-Pass + Kill-Switch) + Minting `admin_grant_wildcards`. Proof unterzeichnet die Schwere (alle 6 in einen „separater Audit"-Topf). | **Eigenes priorisiert getracktes Item → D-37** (getrennt von Sekundär-Branch-Fällen). Verifizieren ob top_role='Admin'=0 global; speziell `grant_founding_pass`: wie werden Pässe heute vergeben wenn RPC tot? → **ERLEDIGT (D-37 getrackt)** |
| 2 | LOW | proof:37-40 | Byte-true-Beleg ruht auf ILIKE-Presence-Ankern, nicht auf vollem `pg_get_functiondef`-vorher/nachher-Diff (vom S462-Reviewer genau gefordert). S463 wiederholt die Lücke. Abgemildert: voller NEW-Body in Migration + 3-Rollen-Smoke grün. | Künftig SECDEF-Body-Rewrite mit BEFORE/AFTER-functiondef-Diff. → errors-db (S462-Learning verschärft) |
| 3 | LOW (nit) | proof:52 | `prevent_profile_sensitive_update` = False-Positive: friert die Spalte (`NEW.top_role := OLD.top_role`), gated NICHT darauf. | → **ERLEDIGT (aus Proof gestrichen)** |
| 4 | LOW (bookkeeping) | disease-register | D-36 noch 🟡 offen. | → **ERLEDIGT (geheilt S463)** |

## One-Line
Ein Senior würde S463 mergen (sauberer, korrekter, gut bewiesener permissiver 2-RPC-Fix), aber darauf bestehen, dass der Scope-Out geschärft wird: `grant_founding_pass` (Money) + `admin_grant_wildcards` (Minting) nutzen `top_role='Admin'` als EINZIGES Gate und brauchen ein priorisiert getracktes Follow-up (→ D-37), keinen vagen Sweep.

## Belege (4 Fragen)
1. **PATCH-AUDIT:** Ja für die 2 Scope-RPCs — Migration zeigt volle Bodies, beide Guard-Blöcke identisch (club_admins unverändert + getauschte platform_admins-Zeile), Result-Bodies kohärent. Einschränkung: kein Live-Byte-Diff (Reviewer hat nur Read) → ruht auf ILIKE-Ankern (Finding #2). S156-Risiko bei simplen Read-RPCs gering.
2. **Korrektheit:** Swap bricht keinen Caller — `platform_admins` identisch zu v2/get_club_balance/UI-Quelle; club_admins-Branch unangetastet; 3-Rollen-Smoke beweist (platform-admin ohne club-Row jetzt ok = reparierter Branch). Fan-Stats-PII geht an echte Platform-Admins = intendierte AdminRevenueTab-Capability, anon draußen.
3. **Grants:** korrekt — CREATE OR REPLACE erhält ACL, anon schon revoked, bleibt.
4. **Scope-Out:** ehrlich im Auflisten, aber nicht in der Schwere. Reviewer-Migrations-Read: admin_grant_wildcards (`20260428120500:321`) SOLE-gate Minting · grant_founding_pass (`20260614170000:33`) SOLE-gate Money · cancel_event_entries (`20260321:451`) SOLE-gate · set_club_fan_rank_thresholds (`slice_347:347`) Sekundär-Branch · prevent_profile_sensitive_update False-Positive.

## Positive
- Lehrbuch-S462-Anwendung (platform_admins kanonisch, gegen UI-Quelle gedifft).
- 3-Rollen-force-rollback-Smoke inkl. reparierter Branch = richtiger Beweis-Typ.
- Rein permissiver Fix sauber begründet (kein Regressionsrisiko Club-Admin).
- Scope-Out überhaupt offen benannt (ehrlicher als verschweigen) — Verbesserung = Schwere-Einordnung.
- `remaining_toprole_in_family (rpc_get_club*)=0` = Familie vollständig konvertiert.

## Learnings
- Beim Heilen EINES dead-`top_role='Admin'`-Branches die Restfamilie nach **Gate-Topologie** klassifizieren, nicht nur listen: SOLE-gate = Total-Lockout (höhere Schwere, v.a. Money/Minting), `… OR club_admins` = nur Override verloren. → errors-db S463.
- SECDEF-Body-Rewrite-PATCH-AUDIT: voller functiondef-BEFORE/AFTER-Diff statt ILIKE-Presence (S462-Forderung, in S463 noch nicht adoptiert).

# Review — Slice 346 (FRE-3: Exklusive Vereins-Beiträge, RLS-Gate + Vorschau)

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-18 · Security-nah (RLS). · **time-spent:** ~14 min

## Verdict: PASS

Keine blockierenden Findings. 3 Nitpicks, alle akzeptabel.

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | NIT | `useClubData.ts:54` | News-Fetch-Fehler degradiert still (console.error → 0 News), kein Error-State. Kein Leak, bewusst (analog Research). | akzeptiert |
| 2 | NIT | Migration `:24` | `GRANT fan_rank_tier_rank TO PUBLIC` — bewusst (in RLS-Policy für alle Rollen evaluierbar), reine Lookup-CASE ohne Datenzugriff. | korrekt |
| 3 | NIT | Migration `:94` | Teaser-RPC ohne oberes LIMIT-Cap; Service ruft fix mit 3. Optional `LEAST(...,50)` falls je client-parametrisiert. | Backlog (nicht exploitable, fixer Aufruf) |

## One-Line
Ja — Read-Gate korrekt auf RLS (nicht UI), Content-Leak über Row-Hide + DEFINER-Maskierung doppelt geschlossen, anon/author/tier-Pfade explizit auth-guarded, Live-RLS-Smoke + Grants belegt.

## Belege (Kurzform)
- **Content-Leak geschlossen:** generischer Pfad → RLS verbirgt Zeile (Smoke: low sees_exclusive=0); Teaser-RPC maskiert content=NULL; kein anderer ungated content-Pfad. Gate-Bedingung in RLS-Policy UND RPC **identisch** → keine Drift.
- **Öffentliche Beiträge unverändert:** `min IS NULL → true` erster Zweig (Smoke: public=2, kein Regress).
- **Teaser-RPC:** SECURITY DEFINER + search_path; projiziert nur handle/avatar (kein user_id/PII); REVOKE anon/PUBLIC + GRANT auth (anon=false/auth=true).
- **tier_rank-Mirror:** SQL spiegelt FAN_RANK_TIERS exakt; Drift-Kommentar (Slice-108-Familie).
- **SELECT-Cols-Sync (Slice 200):** min_fan_rank_tier in getPosts/getReplies + DbPost. **i18n (333):** 7 Keys DE+TR, korrekte Namespaces. **CHECK:** NULL + 6 Tiers.
- **Scope-Out korrekt:** INSERT-Policy-club_admins-Härtung = pre-existing, separater Slice.

## Positive
- Read-Gate auf richtiger Layer (RLS). Defense-in-Depth (Row-Hide + Content-Maskierung). Live-RLS-Smoke (anon/low/high/author) VOR Scharfschaltung.

## Learnings
- Positiv-Muster für `database.md` (optional): „Exklusiver Read-Content = RLS-Row-Hide + DEFINER-RPC-Content-Maskierung mit **identischer** Gate-Bedingung an beiden Punkten." Kein Bug, kein common-errors-Eintrag nötig.

## Healing
Alle 3 NIT non-blocking. NIT#3 (LIMIT-Cap) → TODO-Backlog. Kein Rework.

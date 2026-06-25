# Review — Slice 383 (E-2b: Pro-Liga-Payout)

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-25 · **time-spent:** ~14 min

## verdict: PASS

## findings
| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | migration L191 Idempotenz-Guard | `IF EXISTS(… WHERE month=p_month)` greift cross-league (global wird immer zuerst inserted) — korrekt, aber subtil; bei hypothetischer Liga-only-Saison ohne scout_scores wäre Guard leer. Unkritisch (scout_scores hat immer Rows). | Kommentar ergänzen oder bewusst lassen. |
| 2 | NIT | AdminLigaTab Toasts hardcoded DE | `bescout-admin` ist per errors-frontend S196-Audit explizit i18n-exempt → Konvention-konform. | Keiner. |
| 3 | NIT | migration L266 badge_key nutzt v_league.short | `COALESCE(short,'liga')` fängt NULL; badge_key ist kein Key → keine Kollision. Sauber. | Keiner. |

## one-line
Ja — ein Senior merged das: Coverage-vor-Lock-Reihenfolge, EIN Debit gegen v_total_paid, NULLS-NOT-DISTINCT-Idempotenz, platform_admin-Gate, AR-44-Grants, RLS 4-Ops alle korrekt + durch ehrlichen Force-Rollback-Zero-Sum-Smoke belegt.

## Money-Belege (1-7)
1. **Zero-Sum:** Pro-Liga-LOOP VOR Lock/Coverage; `v_total_needed` summiert global+pro-Liga; EIN Debit gegen v_total_paid; Topf nie negativ (paid ≤ needed ≤ pot). Proof: pot_delta=debit=total_paid=3.675.000.
2. **PATCH-AUDIT (S356):** globale Konstanten 500k/250k/100k + overall-Median + Idempotenz byte-identisch zur 376-Baseline. Einzige globale Änderung = additiver `ms.league_id IS NULL`-Filter auf globalem Winner-Insert (notwendig + korrekt).
3. **UNIQUE NULLS NOT DISTINCT** inkl league_id auf beiden Tabellen — globale NULL-Idempotenz erhalten, Pro-Liga-Kollision vermieden.
4. **set_liga_reward_config:** auth.uid + platform_admins.role-Gate + Defense-in-Depth + league_not_found; REVOKE anon. Recalc-on-Save N/A (kein gespeicherter Ableitungswert).
5. **RLS 4 Ops + AR-44** auf allen 4 Funktionen.
6. **get_monthly_liga_winners** DROP+CREATE additiv (Felder ans Ende), Grant = Original public-readable-Verhalten erhalten.
7. **Frontend:** throw-on-error + Discriminator-Guard, Hook-Invalidation, Validierung monoton/≥0, useEffect-Re-Sync, Mobile flex-col, aria-label, isPending-Guard.

## Knowledge-Capture (Reviewer-Empfehlung)
Pattern (bestätigt): Additives `league_id` auf eine Tabelle mit globalen Aggregat-Inserts → bestehenden Winner/Snapshot-Insert um `WHERE league_id IS NULL` ergänzen, sonst zieht der globale Insert die neuen scoped-Zeilen mit. → errors-db „UNIQUE NULLS NOT DISTINCT scope-Erweiterung".

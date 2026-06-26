# Slice 392 Review — E-3 nation_in + max_per_nation (auf nationality_iso)

**Reviewer:** reviewer-Agent (Cold-Context, Money-nah Pflicht) · **Datum:** 2026-06-26 · **time-spent:** ~14 min

## Verdict: PASS

## Findings
| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | `footballNations.ts` FOOTBALL_NATIONS | Liste deckt n≥10 (53) + 8 ergänzte = 61 ab; 121 distinct ISO live. Ein Admin kann eine valide DB-Nation mit n<10 nicht als Whitelist wählen. **Bewusster CEO-Scope (kuratiert), kein Bug.** | Scope-Out 11 dokumentiert; bei Bedarf Liste erweitern / Admin-Pflege-UI (Folge-Slice). Kein Handlungsbedarf. |
| 2 | NIT | `NationMultiSelect.tsx` Trigger | Zeigt nur erste 8 Flag-Chips + `+N`; `nationSelectedCount`-Label nennt echte Zahl. | Akzeptabel, keine Änderung. |

## One-Line
Ja — Senior merged das: numeric-guard-bypass (`nation_in`-Zweig + `CONTINUE` vor `::BIGINT`), fail-closed bei leerer ISO und PATCH-Audit-Erhaltung aller 385/386/388/389/390-Branches sind im force-rollback 17/17 + Live-functiondef bewiesen.

## Kritische Prüfpunkte (alle bestanden)
1. **nation_in vor numeric guard + CONTINUE** (Pre-Mortem #1 / AC-5b) — Block nach unknown-Check, vor `^[0-9]+$`-Guard, endet `CONTINUE`. Array erreicht `::BIGINT` nie. ✓
2. **Fail-closed `''`** (AC-3) — `COALESCE(v_player_nat,'')='' OR NOT (= ANY(...))` fängt '' UND NULL. ✓
3. **max_per_nation** Starter-only (`v_all_slots`), leere ISO ungezählt (`WHERE nationality_iso <> ''`), Bound 1..11. Spiegelt max_per_club. ✓
4. **PATCH-AUDIT** alle Vorgänger-Branches byte-erhalten; Grants `{postgres,authenticated,service_role}` kein anon (Body-Rewrite erhält ACL, S368c). ✓
5. **LineupRule Array-Variante** bricht keinen Mapper-Cast (eventMapper pass-through; `'value' in`-Guards). ✓
6. **NationMultiSelect** Hooks vor return, Mobile 393px (44/48px), aria-*, Full-Screen-Picker-Pattern, alle Keys DE+TR (kein MISSING_MESSAGE). ✓
7. **TR-Wording** neutral (uyruk/kadro/çeşitlilik), kein kazan*/Gewinn/Securities. ✓

## Positive
- Eignungs- (nation_in = Starter+Bank) vs. Kompositions-Scope (max_per_nation = Starter-only) korrekt aus S388 übertragen — subtilster Teil sauber.
- `nationDisplayName` mit Override (GB-Subdivisionen + XK) + Intl-Fallback + try/catch robust.
- Smoke vorbildlich: force-rollback, deckt numeric-guard-bypass (AC-5b) + Regression (AC-12) explizit.
- max_per_nation als reiner ELSIF — kein Branch-Klon, keine Bestands-Regression.

## Offen (kein Code-Merge-Blocker)
- **AC-17 UI-live** bewusst gebündelt (Playwright 386/388/389/390/392 am Ende der E-3-Reihe). Validator-Logik per force-rollback bewiesen; UI-Verkabelung per tsc+Code-Read plausibel. Pflicht vor Slice-„Done" (DoD UI-Component).

## Knowledge-Coupling (D88)
- errors-db.md S392-Zusatz: nation_in = erster Nicht-Zahl-Regeltyp → eigener Zweig mit CONTINUE vor numeric guard (generalisierbares Array-Regel-Muster).
- fantasy.md: nation_in/max_per_nation in Bedingungs-Tabelle + Scope (Starter+Bank vs Starter-only).

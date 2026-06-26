# Slice 392 — E-3 `nation_in` (Länder-Whitelist) + `max_per_nation` (zwei Nationen-Regeln, auf `nationality_iso`)

**Status:** SPEC · **Größe:** M · **Slice-Type:** Migration (Money-nahe RPC) + Service/Type + UI (Multi-Select-Picker) + i18n · **Scope:** Money-nah / §3 — zwei additive Branches im `rpc_save_lineup`-Validator (Post-391-Baseline), VOR INSERT + Wildcard-Move. Reviewer-Pflicht. · **Datum:** 2026-06-26
**CEO:** Anil 2026-06-26 — „alle E-3-Regeln rein, dann ein Playwright-Durchlauf". Picker-Quelle (AskUserQuestion 2026-06-26) = **feste kuratierte Nation-Liste** (nicht DB-distinct). CTO-Umsetzung: daten-informiert (Kern = real vorkommende n≥10 + bekannte Fußballnationen) → Drift minimiert.

---

## 1. Problem-Statement
Letzte E-3-Aufstellungs-Regel-Erweiterung (nach 385/386/388/389/390): Nationen-Steuerung, jetzt baubar dank `players.nationality_iso` (Slice 391, kanonisch normalisiert, Türkei nicht mehr 4-fach gespalten).
- **`nation_in`** = Länder-Whitelist „nur diese Nationen" (z. B. reines Türkei-Event). **Erster Nicht-Zahl-Regeltyp** im Validator → Array-Wert, kritischer Dispatch-Punkt (s. §2).
- **`max_per_nation`** = „höchstens N Starter einer Nation" = Diversitäts-Regel. Trivialer Spiegel von `max_per_club` (Slice 195c).

Evidence: Handoff-Resume-Anker 2026-06-26 (`memory/session-handoff.md` §HIER ANKNÜPFEN) + Live-`pg_get_functiondef('rpc_save_lineup')` D87 (geholt 2026-06-26, Post-391-Baseline verifiziert).

## 2. Lösungs-Design

**RPC (`rpc_save_lineup` CREATE OR REPLACE gegen Live-Baseline Post-391):**

Der Validator-Loop hat HEUTE diese fixe Reihenfolge je Regel:
1. `unknown_lineup_rule`-Check (Whitelist `NOT IN (...)`).
2. **Numerischer Guard** `(v_rule->>'value') !~ '^[0-9]+$'` → `v_rule_value := (...)::BIGINT`.
3. Typ-Dispatch (`IF/ELSIF` je type).

`nation_in` hat **keinen `value`-Skalar**, sondern `values` (Array) → der numerische Guard (Schritt 2) würde es sofort mit `invalid_lineup_rule_value` ablehnen. **Fix:** `nation_in` bekommt einen **eigenen Zweig direkt nach Schritt 1, VOR Schritt 2, der mit `CONTINUE` endet** (überspringt numerischen Guard + Dispatch). `max_per_nation` ist eine Zahl → läuft sauber durch Schritt 2+3 (neuer ELSIF, Spiegel `max_per_club`).

- **Whitelist** `NOT IN (...)` += `'nation_in'`, `'max_per_nation'`.
- **`nation_in`-Zweig (VOR numeric guard, endet mit `CONTINUE`):**
  - Array-Validierung: `jsonb_typeof(v_rule->'values') = 'array'` UND `jsonb_array_length(...) > 0`, sonst `invalid_lineup_rule_value`.
  - `v_nation_values := ARRAY(SELECT jsonb_array_elements_text(v_rule->'values'))` (text[]).
  - Element-Sanity (fail-closed): jedes Element `char_length BETWEEN 2 AND 6`, sonst `invalid_lineup_rule_value` (verhindert Müll-Werte).
  - **Starter + Bank** (Eignung, wie age/mv): jeder aufgestellte Spieler `nationality_iso = ANY(v_nation_values)`; **fail-closed bei `nationality_iso = ''`** (unbekannte Nation kann Whitelist nicht erfüllen) → reject `nation_not_allowed` (player_id, nation).
- **`max_per_nation`-Zweig (numerischer Pfad, neuer ELSIF):**
  - Bound 1..11, sonst `invalid_lineup_rule_value`.
  - **Starter-only** (Komposition, wie max_per_club): `SELECT MAX(cnt) FROM (… GROUP BY p.nationality_iso WHERE nationality_iso <> '' …)` über `v_all_slots`. Leere ISO werden NICHT gezählt (eine Gruppe „unbekannt" soll keine Diversitäts-Regel triggern).
  - `> value` → reject `max_per_nation_exceeded` (max, used).
- **Neue DECLARE:** `v_nation_values TEXT[]; v_player_nat TEXT; v_nat_count INT;` (`v_pos_count` für max_per_nation wiederverwendbar — eigenes `v_nat_count` für Klarheit).

**Type (`src/types/index.ts`):**
- `LineupRuleType` += `'nation_in' | 'max_per_nation'`.
- `LineupRule`-Union: Zahl-Variante type += `'max_per_nation'`; **neue Array-Variante** `| { type: 'nation_in'; values: string[] }`.

**Service/Mapper:** `eventMapper`/`events.queries`/`events.mutations` reichen `lineup_rules` als JSONB pass-through durch (kein Field-Mapping pro Regel — generische Liste). Verifizieren dass kein Schema-Cast die neue Array-Variante bricht (Code-Reading §4).

**Form (`useEventForm.ts` + `types.ts`):**
- `EventFormState` += `nationIn: string[]` (Multi-Select-Auswahl) + `maxPerNation: string` (Zahl).
- `INITIAL_FORM_STATE`: `nationIn: []`, `maxPerNation: ''`.
- `populateFromEvent`: `nationIn` = `(rules.find(r=>r.type==='nation_in') as …)?.values ?? []`; `maxPerNation` = `ruleValueFromRules`-Variante (Zahl).
- `rulesFromForm`: `pushVal('max_per_nation', …)` (bestehender Helper, type erweitern) + `if (fields.nationIn.length > 0) rules.push({ type:'nation_in', values: fields.nationIn })`.

**UI (`EventFormModal.tsx` + neue Picker-Komponente):**
- **`max_per_nation`** = simpler Zahl-Input (Spiegel `maxPerClub`/`mvMin`), `{L.maxPerNation && …}`-Block.
- **`nation_in`** = **neuer durchsuchbarer Multi-Select** (`{L.nationIn && …}`): Trigger-Button zeigt Auswahl als Flag-Chips → öffnet **Full-Screen Picker** (ui-components.md „Full-Screen Picker": fixed inset-0, Header + Suche, `flex-1 overflow-y-auto`, Items `min-h-[44px]`). Picker-Optionen = feste Konstante `FOOTBALL_NATIONS` (s. u.); Anzeige = `CountryFlag` + lokalisierter Name (`Intl.DisplayNames`); Tap toggelt Auswahl (Checkmark). Suche filtert über lokalisierten Namen + ISO-Code.
- Neue Komponente `src/components/admin/NationMultiSelect.tsx` (eigenes File — Picker-Logik gekapselt, von beiden Buildern via `L.nationIn`-Label genutzt).
- **Konstante `src/lib/constants/footballNations.ts`:** `FOOTBALL_NATIONS: string[]` = ISO-Codes, daten-informiert (Kern n≥10 aus DB-Verteilung 2026-06-26 + ergänzte bekannte Fußballnationen MX/AU/EG/EC/CL/DZ/AO/GB-NIR). Namen NICHT im File — Runtime via `Intl.DisplayNames([locale],{type:'region'})`; Sonderfälle (`GB-ENG/SCT/WLS/NIR`, `XK`) via kleinem Override-Record DE+TR (Intl kennt sie nicht).
- Toast (`useEventActions.ts`): `case 'nation_not_allowed'` → `t('nationNotAllowed')`; `case 'max_per_nation_exceeded'` → `t('maxPerNationExceeded')`.

## 3. Betroffene Files
| File | Änderung |
|------|----------|
| `supabase/migrations/20260626160000_e3_nation_rules.sql` | rpc_save_lineup CREATE OR REPLACE: Whitelist + nation_in-Zweig (vor numeric guard, CONTINUE) + max_per_nation-ELSIF + 3 DECLARE |
| `src/types/index.ts` | LineupRuleType + LineupRule Union (nation_in Array-Variante, max_per_nation) |
| `src/lib/constants/footballNations.ts` | **NEU** FOOTBALL_NATIONS + Sonderfall-Namens-Override (GB-Subdivisionen, XK) DE+TR |
| `src/components/admin/NationMultiSelect.tsx` | **NEU** Full-Screen-Picker, Flag-Chips, Suche, Intl.DisplayNames |
| `src/components/admin/hooks/types.ts` | EventFormState nationIn/maxPerNation + INITIAL |
| `src/components/admin/hooks/useEventForm.ts` | populate + rulesFromForm (nationIn-Array + max_per_nation-Zahl, pushVal-type erweitern) |
| `src/components/admin/EventFormModal.tsx` | Label-Type + max_per_nation-Input + nation_in-Picker-Block |
| `src/components/admin/AdminEventsTab.tsx` | Club-Labels t() (nationIn, maxPerNation) |
| `src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx` | Platform-Labels DE |
| `src/features/fantasy/hooks/useEventActions.ts` | 2 Toast-Cases (nation_not_allowed, max_per_nation_exceeded) |
| `messages/de.json` + `tr.json` | fantasy: nationNotAllowed/maxPerNationExceeded · admin: nationIn Label/Placeholder/Hint/SearchPlaceholder/Empty + maxPerNation Label/Placeholder/Hint + GB/XK-Namen |

## 4. Code-Reading-Liste (Pflicht VOR Code) — M ≥ 6
1. **Live `rpc_save_lineup` Post-391** (D87, geholt 2026-06-26) — ✅ Validator-Loop-Struktur verifiziert: numeric guard läuft VOR Dispatch (= der Knackpunkt). Frage: exakte Einfügestelle nation_in-Zweig (nach `unknown_lineup_rule`, vor `(v_rule->>'value') !~`).
2. **`src/types/index.ts:744-748`** — ✅ LineupRule heute eine 2-Varianten-Union (Zahl + Positions). Frage: bricht die neue Array-Variante einen `as LineupRule[]`-Cast im Mapper?
3. **`src/features/fantasy/mappers/eventMapper.ts`** + **`events.queries.ts`** — wie `lineup_rules` von DB→`FantasyEvent.lineupRules` gemappt wird (JSONB pass-through? Cast?). Frage: Array-Variante safe?
4. **`useEventForm.ts:16-75`** — ✅ ruleValueFromRules/rulesFromForm/pushVal-Helper. Frage: pushVal type-Param um `max_per_nation` erweitern; nationIn ist Array → eigener push (kein parseInt).
5. **`EventFormModal.tsx:400-546`** — ✅ Render-Pattern (`{L.x && <input>}`-Blöcke, `setField`, `isFieldDisabled('lineup_rules')`). Frage: wo nation-Picker-Block einhängen (nach mvMin).
6. **`useEventActions.ts:420-452`** — ✅ Toast-Switch (mv_max/min_per_position als Vorbild). Frage: Error-Code→Toast-Mapping.
7. **`ui-components.md` „Full-Screen Picker"** — ✅ fixed inset-0 + sticky Header + Suche + min-h-44 Items. + `CountryFlag.tsx` (✅ img-src + hasFlag-Fallback).
8. **`messages/de.json`/`tr.json`** — fantasy-Toast-Namespace (~980) + admin-Labels (~2861) (S333 namespace-aware).

## 5. Pattern-References
- **S388** (min_per_position: Whitelist-Check VOR Count, Starter-only via v_all_slots) — Vorbild `max_per_nation`-Zählung.
- **`max_per_club`** (Live-RPC, `SELECT MAX(cnt) … GROUP BY p.club_id`) — direktes Strukturvorbild `max_per_nation`.
- **S389/S390** (BIGINT-Guard, Branch-Mechanik, JSONB-Serialisierung) — Validator-Pattern.
- **errors-db PATCH-AUDIT** (CREATE-OR-REPLACE gegen Live-Body, Konstanten prüfen) — AC-12.
- **S391** (nationality_iso GENERATED, fail-closed bei `''`) — Datenbasis.
- **S333** (i18n-Namespace MISSING_MESSAGE) · **S196** (Platform DE-hardcoded exempt).
- **ui-components.md Full-Screen Picker** + **S286** (Picker-Optionen aus STATIC source, nicht result-derived — feste Konstante, kein Cold-Load-Race).
- **D107** (Topf 2 = JSONB lineup_rules, generischer Validator) · **D100** (€ user-facing nur MV-Referenz; Nation-Regeln führen kein €).

## 6. Acceptance Criteria
- **AC-1 [HAPPY nation_in]** `[{nation_in, values:["TR"]}]`, alle Starter+Bank `nationality_iso='TR'` → ok:true.
- **AC-2 [REJECT nation_in]** gleiche Regel, ein Spieler `nationality_iso='DE'` → `nation_not_allowed` (nation 'DE').
- **AC-3 [FAIL-CLOSED nation_in '']** ein Spieler `nationality_iso=''` bei `values:["TR"]` → reject `nation_not_allowed`.
- **AC-4 [nation_in MULTI-VALUE]** `values:["TR","DE"]`, Mix TR+DE → ok; ein ES-Spieler → reject.
- **AC-5 [nation_in ARRAY-INVALID]** `values` fehlt / `{}` / `[]` / Element `"X"` (1 Zeichen) / `"TOOLONG"` (7) → `invalid_lineup_rule_value` (kein BIGINT-Crash am numeric guard!).
- **AC-6 [HAPPY max_per_nation]** `[{max_per_nation, value:2}]`, max 2 Starter je Nation → ok:true.
- **AC-7 [REJECT max_per_nation]** 3 TR-Starter bei value 2 → `max_per_nation_exceeded` (max 2, used 3).
- **AC-8 [max_per_nation BOUND]** value 0 / 12 → `invalid_lineup_rule_value`.
- **AC-9 [max_per_nation IGNORES '']** 3 Starter mit `nationality_iso=''` bei value 2 → ok (leere Nation nicht gezählt).
- **AC-10 [MULTI-RULE]** `[{nation_in,values:["TR","DE"]},{max_per_nation,value:2}]` → beide geprüft.
- **AC-11 [NO-RESOURCE-MOVE]** jeder Reject → holding_locks unverändert + 0 wildcard-delta.
- **AC-12 [REGRESSION]** 385/386/388/389/390-Regeln weiter korrekt (min_per_own_club, age, min/max_per_position, mv_max/min — Bounds + Branches).
- **AC-13 [PATCH-AUDIT]** Nicht-Validator-Blöcke byte-identisch; nur Whitelist + nation_in-Zweig (vor guard) + max_per_nation-ELSIF + 3 DECLARE additiv. Numerischer Guard für Zahl-Regeln unverändert.
- **AC-14 [WRITE]** Admin wählt „nur Türkei" → `{type:'nation_in',values:['TR']}`; „max 3 pro Nation" → `{type:'max_per_nation',value:3}`.
- **AC-15 [tsc/tests]** `tsc --noEmit` 0 + vitest grün (inkl. LineupRule-Union-Typecheck).
- **AC-16 [NATION-LIST COVERAGE]** `FOOTBALL_NATIONS` enthält alle DB-Codes mit n≥10 (53) + ergänzte (MX/AU/EG/EC/CL/DZ/AO/GB-NIR); kein Code doppelt; jeder hat lokalisierten Namen (Intl ODER Override).
- **AC-17 [UI-live]** GEBÜNDELT — ein Playwright-Durchlauf am Ende (392 + 386/388/389/390): Picker öffnet, Suche filtert, Auswahl als Chips, max_per_nation-Input, beide Builder, kein MISSING_MESSAGE, Mobile 393px, je 1 Reject-Toast.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| nation_in `values` fehlt/nicht-Array/leer | `invalid_lineup_rule_value` (eigener Zweig VOR numeric guard) |
| nation_in Element 1 Zeichen / >6 Zeichen | `invalid_lineup_rule_value` (Element-Sanity) |
| Spieler `nationality_iso=''` bei nation_in | reject `nation_not_allowed` (fail-closed) |
| nation_in nur Bank-Spieler verletzt | reject (Starter+Bank geprüft) |
| max_per_nation alle `nationality_iso=''` | ok (leere Nation nicht gruppiert/gezählt) |
| max_per_nation value 0/99 | invalid (Bound 1..11) |
| max_per_nation value > vorhandene (max 11, nur 3 je Nation) | ok |
| Beide Regeln + bestehende (age/mv/pos) gleichzeitig | alle geprüft (Loop über alle rules) |
| lineup_rules NULL/[] | no-op |
| Picker: ISO-Code ohne Intl-Namen (GB-ENG, XK) | Override-Record DE+TR |
| Picker: Code ohne Flag-SVG | CountryFlag Text-Badge-Fallback (bestehend) |

## 8. Self-Verification
```bash
grep -rn "nationIn\|nation_in\|maxPerNation\|max_per_nation\|FOOTBALL_NATIONS\|NationMultiSelect" src/
grep -n "nationNotAllowed\|maxPerNationExceeded\|nationIn\|maxPerNation" messages/de.json messages/tr.json
pnpm exec tsc --noEmit && CI=true pnpm exec vitest run
# force-rollback Smoke AC-1..AC-13 (BEGIN … rpc_save_lineup … ROLLBACK), inkl. Array-Edge + fail-closed '' + numeric-guard-bypass
# pg_get_functiondef('rpc_save_lineup') Diff gegen Pre-392 (nur additive Zeilen)
```

## 9. Open-Questions
- **CEO-geklärt (AskUserQuestion 2026-06-26):** beide Regeln rein · Picker-Quelle = feste kuratierte Liste (nicht DB-distinct).
- **CTO-Zone:** Nation-Liste daten-informiert (Kern n≥10 + bekannte ergänzt, ~60 Codes); nation_in Starter+Bank fail-closed; max_per_nation Starter-only, leere ISO ungezählt, Bound 1..11; Element-Sanity 2..6 Zeichen; Error-Codes; Picker eigene Komponente; Namen via Intl.DisplayNames + Override.
- **Scope-Out:** „Bedingung hinzufügen ▾"-Builder + Echtzeit-Treffer-Anzeige (E-4/E-6); Nation-Liste-Pflege-UI; nation_in via Bündnisse/Konföderationen (EU/CONMEBOL) — Phase 2.

## 10. Proof-Plan
- `worklog/proofs/392-nation-smoke.txt` — force-rollback AC-1..AC-13 + PATCH-AUDIT (functiondef-Diff).
- `worklog/proofs/392-vitest.txt` — vitest + tsc + LineupRule-Union-Typecheck.
- UI: gebündelter Playwright-Durchlauf (eigener Proof am Ende der E-3-Reihe, 386/388/389/390/392).

## 11. Scope-Out
- Multi-Regel-Builder „Bedingung hinzufügen ▾" + Live-Treffer-Zähler → E-4/E-6 (Design-Smell gemeldet: Form-State wächst linear).
- Erweiterung der Nation-Liste über Admin-UI → Folge-Slice falls je nötig (heute Code-Konstante, erweiterbar).
- Display-Migration `mapNationalityToIso` → `nationality_iso` (kein Mehrwert jetzt, 391-Scope-Out).

## 12. Stage-Chain
SPEC → IMPACT inline (additive Branches, FE-Konstante; grep-verifiziert) → BUILD (selbst, Money-nah §3) → REVIEW (reviewer Pflicht, Money-nah) → PROVE (force-rollback + vitest; UI gebündelt) → LOG (+ Epic-Reconcile event-creator-liga-epic.md + fantasy.md/errors-db Knowledge-Kopplung D88).

## 13. Pre-Mortem (M — 5 Szenarien)
1. **nation_in trifft numeric guard** → BIGINT-Cast-Crash auf Array. Mitigation: eigener Zweig + `CONTINUE` VOR Guard; AC-5 testet `values`-Array läuft NIE in `::BIGINT`.
2. **Patch-Audit-Drift** (Live-Body weicht ab) → AC-13 functiondef-Diff, nur additive Zeilen.
3. **fail-closed `''` vergessen** → unbekannte-Nation-Spieler rutscht durch Whitelist. AC-3 erzwingt reject.
4. **max_per_nation zählt leere ISO** → „unbekannt"-Gruppe triggert Diversitäts-Reject fälschlich. AC-9 (`WHERE nationality_iso <> ''`).
5. **LineupRule Array-Variante bricht Mapper-Cast** → FantasyEvent.lineupRules-Typecheck. AC-15 + Code-Reading §4 (eventMapper) VOR Build.
6. **Picker-Optionen leer auf Cold-Load** (Module-Cache-Race S286) → feste Konstante = static, kein async → kein Race. Intl.DisplayNames synchron.

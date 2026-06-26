# Slice 391 — nationality-Normalisierung: generierte Spalte `players.nationality_iso`

**Status:** SPEC · **Größe:** M · **Slice-Type:** Migration (Schema, Daten-Qualität) · **Scope:** §3-nah (Stamm-Tabelle `players`, additive Spalte) — Reviewer-Pflicht. KEIN Money. · **Datum:** 2026-06-26
**CEO (AskUserQuestion 2026-06-26):** generierte Spalte `nationality_iso` (nicht-destruktiv, zero-drift) statt in-place Backfill+Trigger.

---

## 1. Problem-Statement
`players.nationality` ist nicht regel-tauglich (S390-Fund): Türkei = `Türkiye`(528)/`Turkey`(108)/`TR`(92)/`Türkei`(34) = 4 Schreibweisen, 207 leer/NULL, 168 distinct (DE+EN-Namen, ISO-Codes, GB-Subdivisionen). `nation_in`/`max_per_nation` (Slice 392) würden still falsch ausschließen/zählen → Silent-Data-Liar im Prio-Markt TR. Dieser Slice schafft eine **kanonische ISO-Spalte** als Fundament; 392 baut darauf.

**Coverage verifiziert (Live, 2026-06-26):** alle 166 nicht-leeren Distinct-Werte sind in `src/lib/utils/countryNameToIso.ts` (~250 Einträge) abgedeckt → 100 % Mapping-Coverage. Nur `""`/NULL → `''`.

## 2. Lösungs-Design
**Nicht-destruktiv, zero-drift, zero-trigger, zero-backfill:**
- `normalize_nationality(text) RETURNS text LANGUAGE sql IMMUTABLE` — SQL-Port von `mapNationalityToIso`: NULL/blank → `''`; ISO-2-Pass-through für die 13 im Mapping geführten Codes; `GB-(ENG|SCT|WLS|NIR)`-Pass-through; sonst Lookup über inline `VALUES`-Liste auf normalisiertem Key (`lower(regexp_replace(btrim(p),'\s+','','g'))` — Whitespace raus, Diakritika + Interpunktion BLEIBEN, exakt wie TS `normalizeKey`); unbekannt → `''`.
- `ALTER TABLE players ADD COLUMN nationality_iso TEXT GENERATED ALWAYS AS (normalize_nationality(nationality)) STORED` — DB berechnet automatisch für alle Zeilen (jetzt + künftig), kein Drift möglich (Scraper schreibt weiter Rohnamen in `nationality`, ISO wird abgeleitet).
- Partial-Index `WHERE nationality_iso <> ''` für 392-Regeln (GROUP BY / WHERE).
- **Display unberührt:** liest weiter `mapNationalityToIso(nationality)` (TS) — `nationality` bleibt unverändert.

## 3. Betroffene Files
| File | Änderung |
|------|----------|
| `supabase/migrations/20260626150000_nationality_iso.sql` | normalize_nationality() IMMUTABLE + generierte Spalte + Index + REVOKE/GRANT |
| (kein src/-Change) | Spalte wird erst in 392 (Regeln) + optional später im Display konsumiert |

## 4. Code-Reading-Liste — ✅ gelesen
1. `src/lib/utils/countryNameToIso.ts` (Z.13-364) — vollständige Map + normalizeKey-Logik (NFC, lower, Whitespace raus, KEINE Diakritika-Strip). SQL-Port-Vorlage.
2. `src/lib/services/players.ts` (Z.218) — Display nutzt `mapNationalityToIso(db.nationality)` → bleibt unberührt (additive Spalte).
3. Live-Distinct (168 Werte) — Coverage 100 % für nicht-leer.
4. `database.md` Migration-Workflow (apply_migration, REVOKE/GRANT AR-44) + RLS (additive Spalte erbt Tabellen-RLS, keine neue Policy nötig).
5. `errors-db.md` S390 (Daten-Tauglichkeit VOR Attribut-Regel) + D39 (Re-Drift-Guard — hier strukturell via GENERATED statt Trigger).

## 5. Pattern-References
- **S390** — der Auslöser (nationality nicht regel-tauglich).
- **D39** — Re-Drift-Guard; hier eleganter via GENERATED-Spalte (kein Trigger).
- **AR-44** — neue Funktion → REVOKE PUBLIC/anon + GRANT (auch wenn pure/harmlos, Audit-konform).
- `countryNameToIso.ts` — Single-Source des Mappings (SQL ist Port; Parität-Hinweis im Migrations-Kommentar).

## 6. Acceptance Criteria
- **AC-1 [MAPPING]** `normalize_nationality('Türkiye')='TR'`, `('Turkey')='TR'`, `('Türkei')='TR'`, `('TR')='TR'`, `('Germany')='DE'`, `('Deutschland')='DE'`, `('England')='GB-ENG'`, `('USA')='US'`, `("Côte d''Ivoire")='CI'`. VERIFY: SELECT.
- **AC-2 [UNKNOWN]** `normalize_nationality('')=''`, `(NULL)=''`, `('Atlantis')=''`. Kein Crash.
- **AC-3 [GENERATED]** Spalte existiert, automatisch befüllt; `SELECT count(*) FILTER (WHERE nationality_iso<>'')` ≈ 4349 (4556−207 leer). Türkei-Bucket vereint: `count(*) WHERE nationality_iso='TR'` = 762 (528+108+92+34).
- **AC-4 [COVERAGE]** `SELECT DISTINCT nationality WHERE nationality_iso='' AND COALESCE(nationality,'')<>''` = **0 Zeilen** (jeder nicht-leere Wert mappt).
- **AC-5 [IMMUTABLE]** Funktion ist IMMUTABLE (Voraussetzung für GENERATED) — ALTER erfolgreich.
- **AC-6 [INDEX]** Partial-Index `idx_players_nationality_iso` existiert.
- **AC-7 [DISPLAY-SAFE]** `nationality` (Roh) unverändert; `mapNationalityToIso` weiter korrekt (kein src-Change).
- **AC-8 [GRANTS]** `normalize_nationality` ohne anon-EXECUTE (REVOKE/GRANT).
- **AC-9 [tsc/tests]** tsc 0 (kein src-Change → trivially) + vitest grün.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| nationality NULL / '' / '   ' | nationality_iso = '' |
| Türkei 4 Schreibweisen | alle → 'TR' (Bucket vereint) |
| England/Scotland/Wales/NI | GB-ENG/SCT/WLS/NIR (Fußball-Verbände getrennt — bewusst, wie TS/Flaggen) |
| Diakritika (Côte d'Ivoire, Curaçao) | gemappt (beide Formen in VALUES, Diakritika nicht gestript) |
| Scraper schreibt künftig neuen Rohnamen | nationality_iso rechnet automatisch neu (GENERATED) |
| Unbekanntes Land | '' (392-Regeln: fail-closed, kein Match) |

## 8. Self-Verification
```bash
# Coverage + Bucket-Vereinigung + unmapped=0
mcp execute_sql: SELECT count(*) FILTER (WHERE nationality_iso='TR') AS tr, count(*) FILTER (WHERE nationality_iso='' AND COALESCE(nationality,'')<>'') AS unmapped FROM players;
# Spot-Map
SELECT normalize_nationality('Türkiye'), normalize_nationality('England'), normalize_nationality('Atlantis');
pnpm exec tsc --noEmit && CI=true pnpm exec vitest run
```

## 9. Open-Questions
- **CEO-geklärt:** generierte Spalte (nicht in-place).
- **CTO-Zone:** kanonische Form = ISO-3166-1 alpha-2 (+ GB-Subdivisionen) = exakt was countryNameToIso.ts/Flaggen nutzen; LANGUAGE sql IMMUTABLE; Partial-Index; Display-Umstellung auf neue Spalte = SPÄTER optional (nicht nötig).
- **Scope-Out:** Display-Refactor (mapNationalityToIso → nationality_iso) — unnötig, beide liefern gleich. Nation-Regeln = 392.

## 10. Proof-Plan
- `worklog/proofs/391-nationality-iso.txt` — Mapping-Spots (AC-1/2) + Coverage/Bucket-Query (AC-3/4) + Index/Grants-Listing.

## 11. Scope-Out
- `nation_in` + `max_per_nation` Regeln → Slice 392 (nutzen `nationality_iso`).
- Display-Migration auf `nationality_iso` → optionaler Folge-Slice (kein Mehrwert jetzt).
- Re-Scrape der 207 leeren → Daten-Backlog (braucht API-Key).

## 12. Stage-Chain
SPEC → IMPACT inline → BUILD (1 Migration via apply_migration) → REVIEW (reviewer, Schema/Stamm-Tabelle) → PROVE (SQL-Queries) → LOG (+ Epic-Reconcile + errors-db/database.md Kopplung GENERATED-Pattern).

## 13. Pre-Mortem (M — 5 Szenarien)
1. **Map-Tippfehler im SQL-Port** → ein Land falsch/unmapped. **Mit:** AC-4 (unmapped=0) + AC-1 Spots + Coverage gegen alle 168.
2. **IMMUTABLE verletzt** (z.B. funktions-intern now()) → ALTER schlägt fehl. **Mit:** reine VALUES-Lookup, kein Volatile; AC-5.
3. **lower()/Whitespace-Mismatch** zur TS-normalizeKey → Türkei-Bucket nicht vereint. **Mit:** AC-3 (TR=762).
4. **GENERATED-Spalte blockt künftige nationality-Writes** (Scraper) → nein, GENERATED ist read-derived, Write auf nationality bleibt erlaubt. **Mit:** Edge-Table.
5. **Apostroph/Komma-Escape im SQL** (Côte d'Ivoire, Korea,Republic) → Syntax-Fehler. **Mit:** apply_migration Verify-Gate (harter Rollback bei Syntax) + AC-1 Côte-Spot.

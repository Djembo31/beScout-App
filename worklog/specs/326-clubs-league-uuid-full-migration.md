# Slice 326 — clubs.league String→UUID Vollmigration

**Status:** SPEC · **Größe:** L · **Slice-Type:** Migration (+ Service + UI) · **Scope:** CEO-pending (Schema-DROP) · **Datum:** 2026-06-15

> S7 Phase-3 Paar B (2/2). Slice 325 war Drift-Stop (create_club setzt `league_id`). Dieser Slice macht die volle Migration: Filter-Wahrheit Name→ID, Display-Resolver, Cache-Decouple, DROP der String-Spalte. Eine kohärente L-Slice in 2 verifizierten Waves (kein Orphan-Split, D54). Preflight-Anker: `worklog/notes/326-preflight-hermes-review.md`.

---

## 1. Problem Statement

`clubs.league` ist ein **String-Name** der Liga (z.B. `"Bundesliga"`). Parallel existiert `clubs.league_id` (UUID-FK auf `leagues.id`). Damit hat ein semantisches Feld **zwei Quellen** — genau der Source-of-Truth-Drift, den D80 (Sommer-Tech-First-Umbau) eliminieren will.

**Konkrete Folgen heute:**
- ~12 Filter-Konsumenten vergleichen Liga-**Namen** als Wahrheit (`p.league === selectedLeague`). Fragil: Name-Tippfehler/Rename/Locale-Drift bricht den Filter still.
- Club-Cache + Player-Mapper befüllen `league` (String) aus der DB; jeder Name-Change muss an zwei Stellen gepflegt werden.
- `platformAdmin.createClub` schreibt noch `p_league` (Name).

**Betroffen:** Alle User auf /market, /rankings, /clubs, /fantasy, Mein-Kader, Bestand — also der Kern-Discovery-Flow über alle 7 Ligen. Kein akuter User-Bug, aber struktureller Drift der bei jeder Liga-Erweiterung/Umbenennung zur stillen Falle wird.

**Evidence:** S7 String→UUID-Landkarte `worklog/audits/2026-06-14/string-to-uuid-map.md` (Paar B). Slice-325-Decision in `worklog/active.md`. Hermes-Review `worklog/notes/326-preflight-hermes-review.md`.

## 2. Lösungs-Design (Architektur)

**Zielzustand:** `leagueId` (UUID) ist die einzige Filter-/Routing-Wahrheit. `leagueName` existiert nur noch als **Display-String**, abgeleitet via `getLeagueById(id)?.name` aus dem League-Cache. Die DB-Spalte `clubs.league` wird gedroppt.

**Datenfluss vorher:**
```
clubs.league (String) ──┬─→ ClubLookup.league ──→ player.league (String) ──→ Filter-Vergleich (Name===Name)
                        └─→ {club.league} Display-Labels (~25 Stellen)
clubs.league_id (UUID) ──→ ClubLookup.league_id ──→ (nur teilweise genutzt)
```

**Datenfluss nachher:**
```
clubs.league_id (UUID) ──→ ClubLookup.league_id ──→ player.leagueId ──→ Filter-Vergleich (ID===ID)
                                                  └─→ getLeagueById(id).name ──→ Display-Labels
clubs.league (String) ──→ GEDROPPT
```

**Neue Funktion (`src/lib/leagues.ts`):**
```ts
/** Get a single league by its UUID. */
export function getLeagueById(id: string | null | undefined): League | undefined {
  if (!id) return undefined;
  return leagueCache.find((l) => l.id === id);
}
```

**Type-Erweiterung (`src/types/index.ts`):** `Player` bekommt `leagueId?: string` (analog zu `DpcHolding.leagueId`, das schon existiert).

**Mapper (`players.ts dbToPlayer`):** `leagueId: getClub(db.club_id)?.league_id ?? null` — `ClubLookup` trägt `league_id` bereits (kein `PLAYER_SELECT_COLS`-Change, da `players` keine Liga-Spalte hat).

**Wave-Struktur (beide in Slice 326, explizit gestaged):**

- **Wave A — Filter-Wahrheit auf ID** (live-verifizierbar, String-Spalte bleibt):
  `getLeagueById` + `Player.leagueId` (Type+Mapper) + ~12 Filter-Konsumenten auf `league_id` + `platformAdmin.createClub` auf `league_id`-Write. Nach Wave A funktioniert alles; String-Spalte ist nur noch Display-Quelle.

- **Wave B — Display-Resolver + DROP** (harter Gate):
  ~25 Display-Stellen (`{club.league}`) auf `getLeagueById(club.league_id)?.name` umstellen → `clubs.ts`/`club.ts` SELECT-Listen `league` entfernen → `ClubLookup.league` entfernen → DB-Migration `BEGIN; … ALTER TABLE clubs DROP COLUMN league; COMMIT;`.

**Trade-off:** Wave A allein wäre ein vollständiger, sauberer Zustand — aber die Doppelquelle bliebe. D80 verlangt Single-Truth → DROP gehört rein. Wave B ist der riskantere Teil (Blast-Radius ~25 Display-Stellen), darum nach Wave A separat verifiziert.

## 3. Betroffene Files

### Wave A
| File | Aktion | Begründung |
|------|--------|------------|
| `src/lib/leagues.ts` | EDIT | `getLeagueById(id)` hinzufügen |
| `src/types/index.ts` | EDIT | `Player.leagueId?: string` |
| `src/lib/services/players.ts` | EDIT | `dbToPlayer`: `leagueId` aus `getClub().league_id` |
| `src/lib/services/platformAdmin.ts` | EDIT | createClub-Call: `league_id` statt `p_league`-Name |
| `src/features/market/components/marktplatz/TrendingSection.tsx` | EDIT | Filter `player.leagueId === selectedLeagueId` |
| `src/features/market/components/marktplatz/TransferListSection.tsx` | EDIT | Filter auf `leagueId` |
| `src/features/market/components/marktplatz/ClubVerkaufSection.tsx` | EDIT | `club.league_id !== selectedLeagueId` |
| `src/features/market/components/marktplatz/LeagueBar.tsx` | EDIT | Map-Key + Emit auf `league_id` |
| `src/features/manager/components/kader/KaderTab.tsx` | EDIT | `smartLeague`→ID, 2 Filter auf `leagueId` |
| `src/components/rankings/PlayerRankings.tsx` | EDIT | `c.league_id === filterLeagueId`, queryKey auf id |
| `src/app/(app)/rankings/page.tsx` | EDIT | `leagueId` durchreichen statt `leagueName` |
| `src/features/market/components/portfolio/BestandView.tsx` | EDIT | `filterLeague`-State→ID, 3 Filter |
| `src/app/(app)/fantasy/FantasyContent.tsx` | EDIT | `club.league_id === leagueScopeId` |
| `src/app/(app)/clubs/page.tsx` | EDIT | Filter Z.90 auf `league_id` (Search/Group-Label bleiben Name) |
| `src/components/layout/LeagueScopeHeader.tsx` | EDIT (optional) | LeagueBar id-Emit verkabeln |
| `src/components/home/GameweekStatusBar.tsx` | EDIT (optional) | `getLeagueById` statt name-Lookup |

### Wave B
| File | Aktion | Begründung |
|------|--------|------------|
| ~25 Display-Stellen (Kat. B, s. §4-Inventur) | EDIT | `{club.league}` → `getLeagueById(club.league_id)?.name` |
| `src/lib/clubs.ts` | EDIT | SELECT entfernt `league`, `ClubLookup.league` raus, Display via Resolver |
| `src/lib/services/club.ts` | EDIT | 3 SELECT-Listen (Z.24/36/367) `league` entfernen |
| `src/features/fantasy/mappers/holdingMapper.ts` | EDIT | Display via `getLeagueById(clubLookup.league_id)` |
| `src/features/fantasy/mappers/eventMapper.ts` | EDIT | dito |
| `supabase/migrations/<ts>_slice_326_drop_clubs_league.sql` | NEU | `ALTER TABLE clubs DROP COLUMN league` in TX |
| Tests (s. Kat. C) | EDIT | Mock-Player/Club `leagueId`, Filter-Asserts |

**Pre-Code-Grep (Pflicht):** `grep -rn "\.league\b\|leagueName\|filterLeague" src/` + Pre-DROP-Grep über `src/ scripts/ messages/ worklog/ .claude/rules/`.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/lib/leagues.ts` (gelesen) | Cache-Struktur + getLeague(name) Pattern | `getLeagueById` analog zu `getLeague`; `leagueCache.find(l => l.id===id)`. Cache-Ready-Signal (Slice 286) beachten |
| `src/lib/clubs.ts` (gelesen) | ClubLookup hat `league`+`league_id` | SELECT Z.42 zieht beide; Z.66-67 mapped beide; Konflikt-Resolver nutzt `league_id` (Slice 276) |
| `src/lib/services/players.ts:170-210` | dbToPlayer setzt `league` via getClub | `league: getClub(club_id)?.league`; `leagueId` parallel ergänzen; KEIN PLAYER_SELECT_COLS-Change |
| `src/types/index.ts:50-53, 133-137` | Player vs DpcHolding | Player hat KEIN leagueId; DpcHolding HAT leagueId? (Vorbild) |
| `src/features/shared/store/leagueScopeStore.ts:33-36,187-232` | Store-SSOT | `leagueId` ist bereits Wahrheit; Hydration nutzt `club.league_id` (Z.189). Liefert Filter ihre `leagueId` woher? |
| `src/features/manager/components/kader/KaderTab.tsx:262-304` | smartLeague-Logik | `smartLeague` = String aus `getLeaguesByCountry()[0]`; auf `.id` umstellen; 2 Filter-Stellen |
| `src/components/rankings/PlayerRankings.tsx:53-62` | Filter baut queryKey | `filterLeague` ist Teil des queryKey → ID-Umstellung ändert Cache-Key (invalidation prüfen) |
| `src/features/market/components/portfolio/BestandView.tsx:62,163-206,239` | lokaler filterLeague-State | 3 Filter-Vergleiche + `setFilterLeague(leagues[0].name)` Init |
| `src/app/(app)/fantasy/FantasyContent.tsx:91,116-124` | club.league===fantasyLeague | Store liefert `leagueId` bereits → direkter Tausch |
| `src/lib/services/platformAdmin.ts:280-290` | createClub RPC-Call | `p_league: clubData.league` → muss `league_id` werden; RPC-Signatur prüfen (Slice 325 setzte league_id intern) |
| `src/lib/services/club.ts:20-40,360-370,575-600` | SELECT-Listen + GW-Reads | 3 SELECTs ziehen `league,league_id`; GW-Reads schon id-basiert → nur SELECT beim DROP anpassen |
| `pg_get_functiondef('public.create_club_by_platform_admin'::regprocedure)` | RPC-Wahrheit (Slice 325) | Akzeptiert RPC `p_league_id` oder nur `p_league`? Bestimmt platformAdmin-Call-Shape |
| `mcp__supabase__execute_sql` schema-check | clubs-Spalten + FK | `clubs.league` Typ, `league_id`-FK auf leagues, NULL-Count beider Spalten vor DROP |
| `worklog/specs/324-favorite-club-uuid-migration.md` | Vorbild-Migration (Paar C) | String→UUID-Pattern, Backfill+Drop-Struktur, Reviewer-Lehren (seed-demo.sql!) |
| `.claude/rules/errors-frontend.md` "Dead-Feature-Removal" + "Cold-Start-State-Race (Slice 286)" | Removal-Grep-Achsen + Cache-Order | 4-Achsen-Grep bei DROP; League-Cache muss vor Club-Cache ready sein |

## 5. Pattern-References

- **`errors-frontend.md` "Erweiterung Slice 324 (Column-DROP zählt als Removal)"** — Pre-DROP-Grep MUSS `scripts/` (seed-demo.sql, kein tsc-Schutz) + `messages/` + `.claude/` umfassen; Backfill+DROP in `BEGIN;…COMMIT;`.
- **`errors-frontend.md` "Non-reaktiver Module-Cache (Slice 286)"** — `getLeagueById` wird in render-time useMemos gelesen; League-Cache muss vor Club-Cache initialisieren, sonst Cold-Load-Race. Verifizieren dass Display-Resolver nicht leer rendert bei Hard-Refresh.
- **`errors-frontend.md` "Lookup-Map indexed by ambiguous Key (Slice 276)"** — `league_id` (UUID) ist eindeutig, löst das `short`-Konflikt-Problem strukturell. Bestätigt ID > Name als Key.
- **`errors-frontend.md` "PLAYER_SELECT_COLS Sync (Slice 200)"** — hier NICHT betroffen (players hat keine Liga-Spalte), aber explizit verifizieren dass kein SELECT-Col fehlt.
- **`errors-db.md` "Trigger+GUC / RPC PATCH-AUDIT (Slice 156)"** — platformAdmin-RPC-Call-Change: RPC-Body-Wahrheit via `pg_get_functiondef` prüfen (Slice 325 Stand).
- **D54 (decisions.md)** — kein Orphan-Split: Wave A+B kohärent in einem Slice; `getLeagueById` nur mit echten Konsumenten.
- **D80 (decisions.md)** — Single-Truth-Ziel rechtfertigt den DROP (sonst Doppelquelle).

## 6. Acceptance Criteria

```
AC-01: [HAPPY] Liga-Filter auf /market filtert per league_id
  VERIFY: bescout.net/market → LeagueBar "Bundesliga" wählen
  EXPECTED: Nur BL-Spieler sichtbar; identisches Ergebnis wie vor Migration
  FAIL IF: Leere Liste, falsche Liga, oder Filter zeigt alle

AC-02: [HAPPY] player.leagueId ist im Mapper gesetzt
  VERIFY: grep "leagueId:" src/lib/services/players.ts
  EXPECTED: dbToPlayer setzt leagueId aus getClub().league_id
  FAIL IF: leagueId fehlt oder ist hardcoded

AC-03: [REGRESSION] Alle ~12 Filter liefern identische Resultate wie pre-Migration
  VERIFY: /market, /rankings, /clubs, /fantasy, Mein-Kader, Bestand je Liga durchklicken
  EXPECTED: Gleiche Spieler/Clubs wie vorher pro Liga
  FAIL IF: Irgendein Filter weicht ab

AC-04: [EMPTY] Liga ohne Spieler/Clubs zeigt sauberen Empty-State
  VERIFY: Liga mit 0 passenden Items filtern
  EXPECTED: Empty-State, kein Crash, kein NaN
  FAIL IF: Crash oder Geister-Items

AC-05: [NULL] Club ohne league_id (NULL) bricht Filter+Display nicht
  VERIFY: getLeagueById(null) + Filter mit club.league_id=null
  EXPECTED: getLeagueById(null)→undefined; Display-Fallback; Item nicht in Liga-Filter
  FAIL IF: Crash, undefined.name, oder Item erscheint fälschlich

AC-06: [DISPLAY] Alle {club.league}-Labels zeigen korrekten Namen nach DROP (Wave B)
  VERIFY: bescout.net/club/<slug>, /clubs, Player-Detail, Admin-Tabs
  EXPECTED: Liga-Name korrekt via getLeagueById(league_id).name
  FAIL IF: Leeres Label, "undefined", falscher Name

AC-07: [DB] clubs.league existiert nach Migration nicht mehr (Wave B)
  VERIFY: SELECT column_name FROM information_schema.columns WHERE table_name='clubs' AND column_name='league'
  EXPECTED: 0 rows
  FAIL IF: Spalte existiert noch

AC-08: [WRITE] platformAdmin.createClub schreibt league_id, nicht Name
  VERIFY: Club anlegen via Admin → SELECT league, league_id FROM clubs WHERE id=<new>
  EXPECTED: league_id gesetzt (Wave A); nach DROP nur league_id
  FAIL IF: league_id NULL oder Write bricht

AC-09: [MOBILE] LeagueBar + Filter auf 393px funktional
  VERIFY: bescout.net/market @ 393px → Liga wechseln
  EXPECTED: Filter funktioniert, kein Overflow
  FAIL IF: Horizontal-Scroll oder Filter unklickbar

AC-10: [I18N-DE/TR] Liga-Anzeige korrekt in beiden Locales
  VERIFY: /market in DE + TR
  EXPECTED: Liga-Namen + Country-Labels korrekt (getLeagueById liefert name, Country via getCountryName)
  FAIL IF: Raw-Key-Leak oder falsche Locale

AC-11: [LOADING/COLD] Liga-Filter rendert nach Hard-Refresh nicht leer (Slice 286)
  VERIFY: Hard-Reload /market → LeagueBar
  EXPECTED: Liga-Buttons + Filter erscheinen (Cache-Ready-Signal greift)
  FAIL IF: Leere Bar oder 5 dashed slots bei Cold-Load
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Filter | club.league_id = NULL | Altbestand-Club ohne FK | Nicht in Liga-Filter, Display-Fallback | `getLeagueById(null)→undefined`, `?? ''` |
| 2 | Display | league_id zeigt auf gelöschte Liga | Inkonsistente FK | Fallback-Label, kein Crash | `getLeagueById(id)?.name ?? ''` |
| 3 | Cold-Load | League-Cache noch nicht ready | Hard-Refresh | Filter füllt nach Cache-Ready | Slice-286 Version-Signal in useMemo-deps |
| 4 | Cache-Order | Club-Cache vor League-Cache ready | Race | Display-Resolver liefert erst nach beiden | League-Cache-Init vor Club-Cache verifizieren |
| 5 | smartLeague | User hat Clubs in 2 Ligen | Multi-Liga-Kader | smartLeague = erste Liga-ID deterministisch | `getLeaguesByCountry()[0].id` |
| 6 | queryKey | filterLeague war Name, jetzt ID | Cache-Migration | Alte Name-Keys verwaisen, neue ID-Keys frisch | queryKey-Change → natürliche Invalidation; kein Persist-Konflikt prüfen |
| 7 | DROP | seed-demo.sql schreibt clubs.league | Maintenance-SQL | Pre-DROP-Grep findet + entfernt | scripts/-Grep Pflicht |
| 8 | DROP | RPC/View liest clubs.league | create_club / Cron | Body-Grep vor DROP | `pg_get_functiondef` aller clubs-schreibenden RPCs |
| 9 | Write | createClub mit unbekannter Liga | p_league_id NULL | Fail-closed (kein NULL-Drift, Hermes Punkt 5) | RPC rejected oder Client validiert vor Write |
| 10 | Konflikt | 2 Clubs gleicher short, andere Liga | WOL Wolfsburg/Wolves | ID-Filter trennt korrekt (Slice 276 gelöst) | `league_id`-Eindeutigkeit |
| 11 | Mapper | getClub(club_id) = undefined | Player ohne Club | leagueId = null, kein Crash | `getClub()?.league_id ?? null` |

## 8. Self-Verification Commands

```bash
# Pflicht:
npx tsc --noEmit
CI=true pnpm exec vitest run src/lib/services/__tests__/players.test.ts src/lib/__tests__/db-invariants.test.ts

# Wave A — Filter-Umstellung verifizieren:
grep -rn "\.league ===\|\.league !==\|league === selected\|=== fantasyLeague\|=== filterLeague\|=== smartLeague" src/
#   → nach Wave A: 0 Treffer (alle auf leagueId/league_id umgestellt)
grep -rn "leagueId" src/lib/services/players.ts src/types/index.ts   # gesetzt?
grep -rn "getLeagueById" src/   # nur echte Konsumenten, kein Orphan

# Wave B — Pre-DROP Removal-Grep (alle Achsen, Slice 324):
grep -rnE "\bleague\b([^_]|$)" src/lib/clubs.ts src/lib/services/club.ts   # SELECT bereinigt?
grep -rn "clubs\.league\b\|\.league\b" scripts/ messages/ .claude/rules/   # Residuen?
grep -rn "{club\.league}\|club\.league\b\|player\.league\b" src/   # Display auf Resolver?

# DB-Smoke (vor + nach DROP):
mcp__supabase__execute_sql: SELECT count(*) FILTER (WHERE league IS NULL) AS null_name,
  count(*) FILTER (WHERE league_id IS NULL) AS null_id, count(*) AS total FROM clubs;
mcp__supabase__execute_sql: SELECT column_name FROM information_schema.columns
  WHERE table_name='clubs' AND column_name='league';  -- nach DROP: 0 rows
# RPC-Wahrheit:
pg_get_functiondef('public.create_club_by_platform_admin'::regprocedure)  -- p_league_id-Param?
```

## 9. Open-Questions

**Pflicht-Klärung VOR Code:**
1. **RPC-Signatur create_club:** Akzeptiert die Slice-325-RPC bereits einen `p_league_id`-Parameter, oder mappt sie intern `p_league`(Name)→`league_id`? Bestimmt ob `platformAdmin.createClub` die ID direkt übergibt oder die RPC angepasst werden muss. → via `pg_get_functiondef` klären.
2. **Unbekannte-Liga-Write (Hermes Punkt 5):** Soll createClub bei unbekannter/fehlender Liga **fail-closed** (Error) oder NULL-tolerant sein? Empfehlung: fail-closed, kein neuer nullable Drift. → CEO-Bestätigung (Scope).

**Autonom-Zone (CTO):**
- Filter-Refactor-Detail, Helper-Struktur, `getLeagueById`-Naming.
- queryKey-Umbau in PlayerRankings (ID statt Name).
- Test-Anpassung (Mock-leagueId ergänzen).
- Reihenfolge innerhalb der Filter-Konsumenten (parallelisierbar).

**Nicht-Autonom (CEO):**
- **Der DROP selbst** (irreversibler Schema-Change) — CEO-Bestätigung vor Wave-B-Migration.
- Fail-closed-Policy bei unbekannter Liga (Open-Q 2).

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Wave A Filter | `worklog/proofs/326a-filter-parity.txt` — grep „0 name-compares" + vitest-Output + bescout.net Screenshot /market je 2 Ligen |
| Wave A Mapper/Type | vitest players.test.ts grün (leagueId gesetzt) |
| Wave B Display | `worklog/proofs/326b-display.png` — /club + /clubs + Player-Detail Liga-Labels korrekt |
| Wave B DROP | `worklog/proofs/326b-drop.txt` — information_schema (0 rows) + pre/post NULL-Counts + Pre-DROP-Grep-Output (alle Achsen clean) |
| Regression | bescout.net Screenshots aller 6 Filter-Pages × min 2 Ligen, DE+TR |

## 11. Scope-Out

- **players.club (Paar A) String→UUID** → Slice 327+, blockiert durch gesperrten API-Football-Key (Reconcile).
- **`leagueName`-localStorage-Cleanup** → bleibt vorerst als Backcompat-Display (Hermes Punkt 5: leagueId=Wahrheit, leagueName=Display). Kein separater Cleanup nötig.
- **log.md Chronologie-Reparatur** → optionale Doku-Hygiene, separat (Preflight Punkt 2).
- **Fantasy-Leagues (`fantasy_leagues`, Invite-Codes)** → andere Domain, nicht betroffen.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (file: clubs-Schema + RPC-Consumer, Pflicht da Schema-DROP)
     → BUILD Wave A (Filter→ID, live-verify) → REVIEW A
     → BUILD Wave B (Display+DROP) → REVIEW B (reviewer-Agent, Pflicht — Schema-Change)
     → PROVE (Filter-Parity + DROP-Smoke + Regression-Screenshots)
     → LOG
```
Kein Skip — Schema-DROP + ~40 Files = voller Loop. IMPACT Pflicht (DB-Schema + RPC).

## 13. Pre-Mortem

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | DROP bricht ein übersehenes `{club.league}`-Label → leere Liga-Anzeige | MED | hoch | 4-Achsen-Removal-Grep (src/scripts/messages/.claude) vor DROP; Display-Resolver flächendeckend in Wave B vor DROP | Regression-Screenshots /club + /clubs zeigen leere Labels |
| 2 | seed-demo.sql / Cron-RPC schreibt clubs.league nach DROP → Runtime-Error | MED | hoch | scripts/-Grep + `pg_get_functiondef` aller clubs-Writer vor DROP (Slice 324-Lehre) | DB-Error bei Seed/Cron-Lauf |
| 3 | League-Cache nicht ready vor Club-Cache → Display-Resolver leer bei Cold-Load | MED | mittel | Cache-Init-Order verifizieren (Slice 286); AC-11 Hard-Refresh-Test | Hard-Reload zeigt leere Liga-Labels/Filter |
| 4 | queryKey-Wechsel (Name→ID) in PlayerRankings → Persist-Cache-Konflikt | LOW | mittel | queryKey-Change ist natürliche Invalidation; Persist-Buster prüfen falls Map/Set | /rankings zeigt stale Daten nach Deploy |
| 5 | Filter-Refactor weicht subtil ab (z.B. NULL-league_id-Item erscheint) | MED | mittel | AC-03 Regression je Liga; AC-05 NULL-Test; strict `===` (kein truthy, Slice 265) | Regression-Walk findet abweichende Liste |
| 6 | RPC create_club erwartet noch p_league(Name), Client schickt ID → Write-Break | LOW | hoch | Open-Q 1 via pg_get_functiondef vor BUILD; AC-08 Write-Test | Admin Club-Create schlägt fehl |
| 7 | Unbekannte Liga → NULL league_id (neuer Drift statt Fix) | LOW | mittel | fail-closed-Policy (Open-Q 2); Edge #9 | DB zeigt clubs mit NULL league_id nach Create |

---

## Open Risiko (kurz, ehrlich)

Der DROP ist irreversibel und hat ~25 Display-Tendrils — ein übersehenes Label oder ein clubs.league-schreibender Cron/Seed bricht erst zur Laufzeit (kein tsc-Schutz, Slice 324). Mitigation: Wave A vollständig live-verifiziert + 4-Achsen-Pre-DROP-Grep + `pg_get_functiondef` aller clubs-Writer, DROP erst nach grünem Wave-B-Display-Review. Cache-Order (League vor Club) ist die zweite stille Falle (Slice 286).

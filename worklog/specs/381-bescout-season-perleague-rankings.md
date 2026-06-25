# Slice 381 — E-2a: BeScout-Saison — Begriffs-Umzug + Pro-Liga-Ranglisten-Anzeige

**Status:** SPEC · **Größe:** M · **Slice-Type:** Migration (read-only RPC) + Service + UI + i18n · **Scope:** CTO (kein Money — Display-only; Anil-Approval als M-Slice) · **Datum:** 2026-06-25

> Epic E5 / D104 · D105 (Naming) · D106 (E-2a-Entscheid: Anzeige + Rename, KEINE Payout-Änderung). Anker: `worklog/notes/event-creator-liga-epic.md` E-2.
> **CEO-Entscheid (Anil, AskUserQuestion 2026-06-25):** „Voll bauen + 1 Demo-Event seeden" — Rename + Pro-Liga-Board mit Umschalter, plus 1 liga-gebundenes Demo-Event mit gewerteten Lineups für sichtbaren Proof.

---

## 1. Problem Statement

Zwei Probleme, beide aus D104/D105/D106:

1. **Begriffs-Verwirrung (D105):** Das Wort „Liga" meint user-facing zwei Dinge — die **Fußball-Liga** (Bundesliga, Süper Lig …) UND den **Nutzer-Wettbewerb** (`is_liga_event`/`monthly_liga_*`, „wer ist bester Scout"). Der Nutzer-Wettbewerb heißt künftig **„BeScout-Saison"**. Evidence: `messages/de.json:3013` `rankings.title="BeScout Liga"`, `EventCardView.tsx:76-78` hardcoded Badge „Liga", `ScoutCard.tsx:180` hardcoded „BeScout Liga".

2. **Wertung nur global, nicht pro Liga (D106):** Heute gibt es nur globale Ranglisten (`scout_scores` = 3 globale Elo-Werte/Nutzer; `monthly_liga_*` ohne `league_id`). Süper-Lig-Fans können sich nicht mit Süper-Lig-Fans messen. E-1 (`events.league_id`) lieferte das Fundament für eine **(Nutzer, Liga)-Wertung**, abgeleitet aus liga-gebundenen Event-Lineups.

**Wer/wie oft:** Jeder Nutzer auf `/rankings` (Haupt-Ranglisten-Seite). Naming trifft alle; Pro-Liga-Board ist neues Engagement-Feature.

**Kritischer Live-Befund (2026-06-25, NICHT neu erheben):** **0 von 444 Lineups** hängen an liga-gebundenen Events (E-1 hat `league_id` bewusst NICHT backfilled). Die 39 bestehenden `is_liga_event`-Events (alle `type='bescout'`, `status='ended'`) haben **kein** `league_id`. → **Gesamt-Saison-Board ist heute mit echten Daten gefüllt** (39 Events / 73 Lineups), **Pro-Liga-Board ist leer bis ein liga-gebundenes Event existiert** → deshalb Demo-Seed (CEO-Entscheid).

## 2. Lösungs-Design (Architektur)

**Teil A — Begriffs-Umzug (user-facing, chirurgisch):** Nur Strings, die den **Nutzer-Wettbewerb** „Liga" nennen → „BeScout-Saison". DB-Spalten (`is_liga_event`, `monthly_liga_*`) bleiben unangetastet (Code-intern erlaubt, D105). Fußball-Liga-Strings (Filter, `leagueLabel`, `clubLeagueLabel`, Event-Format `mode='league'`) bleiben „Liga".

**Teil B — Pro-Liga-Ranglisten-Anzeige (read-only):** EINE neue Aggregat-RPC mit `p_league_id`:
- `p_league_id = NULL` → **Gesamt**: Saison-Punkte über ALLE `is_liga_event`-Events (kein Liga-Filter) → **heute gefüllt**.
- `p_league_id = <uuid>` → **Pro Liga**: nur Events mit diesem `league_id` → leer bis Seed/echte Liga-Events.

Aggregat = pro Nutzer `SUM(lineups.total_score)` über `events WHERE is_liga_event AND status='ended' [AND league_id=L]`, gejoint mit `profiles` (handle/display_name/avatar_url), `ROW_NUMBER()`-Rang, Top-N. **Reine Anzeige — kein scout_scores-Umbau, kein Payout, 0 Money-Pfad.** Trader/Analyst bleiben global (D106), nur die Manager-/Event-Leistung ist liga-spezifisch ableitbar.

**Neue RPC (exakte Signatur):**
```sql
CREATE OR REPLACE FUNCTION public.rpc_get_season_ranking(
  p_league_id uuid DEFAULT NULL,
  p_limit int DEFAULT 100
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.rank), '[]'::jsonb)
  FROM (
    SELECT
      agg.user_id,
      p.handle,
      p.display_name,
      p.avatar_url,
      agg.season_score,
      agg.event_count,
      ROW_NUMBER() OVER (ORDER BY agg.season_score DESC, agg.event_count DESC, agg.user_id)::int AS rank
    FROM (
      SELECT l.user_id,
             COALESCE(SUM(l.total_score), 0)::numeric AS season_score,
             COUNT(*)::int AS event_count
      FROM lineups l
      JOIN events e ON e.id = l.event_id
      WHERE e.is_liga_event = true
        AND e.status = 'ended'
        AND (p_league_id IS NULL OR e.league_id = p_league_id)
      GROUP BY l.user_id
    ) agg
    JOIN profiles p ON p.id = agg.user_id
    ORDER BY agg.season_score DESC, agg.event_count DESC, agg.user_id
    LIMIT GREATEST(LEAST(p_limit, 200), 1)
  ) r;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_get_season_ranking(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_season_ranking(uuid, int) TO authenticated;
```
SEC DEFINER nötig, weil über alle Nutzer aggregiert wird (lineups-RLS = nur eigene); Return-Shape = nur public Profile-Felder + Aggregat-Score (kein PII) → RPC selbst ist die Boundary (errors-db S095). Mirror `rpc_get_scout_leaderboard_overall` (in Code-Reading verifizieren).

**Service (neu, in `scoutScores.ts`):**
```ts
export type SeasonRankingEntry = {
  user_id: string; handle: string; display_name: string | null;
  avatar_url: string | null; season_score: number; event_count: number; rank: number;
};
export async function getSeasonRanking(leagueId: string | null = null, limit = 100): Promise<SeasonRankingEntry[]> {
  const { data, error } = await supabase.rpc('rpc_get_season_ranking', { p_league_id: leagueId, p_limit: limit });
  if (error) throw new Error(error.message);           // throw, nicht swallow (S371-Klasse / workflow PROVE)
  return (data as SeasonRankingEntry[] | null) ?? [];
}
```

**Hook:** `useSeasonRanking(leagueId: string | null)` (qk-Key `qk.rankings.season(leagueId)`), `staleTime: 5*60_000`.

**UI:** Neue Komponente `src/components/rankings/LeagueSeasonLeaderboard.tsx`, Card mit internem Umschalter **Gesamt | Pro Liga** (Tab-Pills wie `GlobalLeaderboard`). „Pro Liga" liest die Liga aus dem bestehenden `useLeagueScope`-SSOT (die `/rankings`-Page mountet bereits eine `LeagueScopeHeader`); zeigt den Liga-Namen + nutzt die Pills zur Auswahl. List-Rendering identisch zu `GlobalLeaderboard` (Rank · `CosmeticAvatar` · Name+@handle · `RangScorePill`-äquivalent für Saison-Punkte). States: Loading (Loader2), Error (`ErrorState onRetry`), Empty (Gesamt: `noData`; Pro Liga ohne Daten: neue Message; Pro Liga ohne Liga-Wahl: Hinweis Liga zu wählen).

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `supabase/migrations/20260625190000_season_ranking_rpc.sql` | NEU | read-only Aggregat-RPC `rpc_get_season_ranking` |
| `src/lib/services/scoutScores.ts` | EDIT | `getSeasonRanking` + Type `SeasonRankingEntry` |
| `src/lib/queries/keys.ts` (oder bestehende rankings-Key-Factory) | EDIT | `qk.rankings.season(leagueId)` |
| `src/lib/queries/gamification.ts` (oder rankings-Query-File) | EDIT | `useSeasonRanking`-Hook |
| `src/components/rankings/LeagueSeasonLeaderboard.tsx` | NEU | Board mit Umschalter Gesamt/Pro Liga |
| `src/components/rankings/index.ts` | EDIT | Barrel-Export |
| `src/app/(app)/rankings/page.tsx` | EDIT | neues Board mounten + `t('title')` ist schon zentral |
| `messages/de.json` + `messages/tr.json` | EDIT | `rankings.title` Rename + neue Keys (Board) + EventCard-/ScoutCard-Badge-Keys |
| `src/components/fantasy/events/EventCardView.tsx` | EDIT | hardcoded Badge „Liga" → `t(...)` „BeScout-Saison" |
| `src/components/profile/ScoutCard.tsx` | EDIT | hardcoded „BeScout Liga" → `t(...)` „BeScout-Saison" |

**Greps vor Slice:** `grep -rn "rpc_get_scout_leaderboard_overall" src/ supabase/` (Mirror-Vorbild) · `grep -rn "is_liga_event\|isLigaEvent" src/components/` (Badge-Stellen) · `grep -rn "BeScout Liga\|BeScout-Liga" src/ messages/` (Rename-Vollständigkeit) · `grep -rn "rankings\.title\|useTranslations('rankings')" src/` (Titel-Consumer).

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `pg_get_functiondef('public.rpc_get_scout_leaderboard_overall'::regprocedure)` | Live-Mirror (Security-Modell, Return-Shape) | SEC DEFINER? REVOKE anon/GRANT authenticated? JSONB-Return? — **VOR Migration** (D87) |
| Live-Schema `events`/`lineups` (bereits geprüft) | Aggregat-Korrektheit | `events`: type/status/league_id/is_liga_event/club_id ✓; `lineups`: user_id/event_id/total_score(numeric) ✓ |
| `src/lib/services/scoutScores.ts` | Service-Pattern + bestehende Liga-Funcs | Mapper-Stil, FK-Join `profiles!inner`, throw-vs-swallow (neue Func: throw) |
| `src/components/rankings/GlobalLeaderboard.tsx` | UI-Vorbild (Tab-Pills, List-Item, States) | Pill-Markup, `CosmeticAvatar`, `RangScorePill`, role=tab a11y |
| `src/components/rankings/MonthlyWinners.tsx` | Vorbild Card + Empty/Error-States | `ErrorState`, `noData`, Loader-Pattern |
| `src/features/shared/store/leagueScopeStore.ts` | Liga-SSOT für „Pro Liga"-Modus | `leagueId`/`leagueName` lesen; keine eigene Liga-Logik bauen |
| `src/app/(app)/rankings/page.tsx` | Mount-Punkt + bestehende `LeagueScopeHeader` | Wo Board einhängen; nutzt schon `useLeagueScope` (filterLeagueId) |
| `src/components/fantasy/events/EventCardView.tsx` | Badge-Rename | Welcher `useTranslations`-Namespace? `event.isLigaEvent`-Render Zeile 76-78 |
| `src/components/profile/ScoutCard.tsx` | Label-Rename | Zeile 180 Kontext — ist es der Nutzer-Wettbewerb? (ja) Namespace? |
| `.claude/rules/errors-db.md` „PostgREST RPC-Pfad ignoriert .range()" (S270d) + „profiles!inner braucht FK→profiles" (S354) + S095 (SEC-DEFINER-Boundary) | Bekannte Fallen | JSONB-Return statt TABLE (cap); profiles-FK ok da JOIN im RPC, nicht PostgREST-Embed |

## 5. Pattern-References (relevant für DIESEN Slice)

- **D105 / D106** — Naming-Kanon + E-2a-Scope (Anzeige, kein Payout). Direkt steuernd.
- **D104** — BeScout-Liga pro Liga + global; Manager-Leistung aus liga-gebundenen Events. Quelle der Ableitung.
- `errors-db.md` **S270d** — RPC mit >1000 Rows: JSONB-Return statt TABLE (hier Top-N, aber JSONB sicher).
- `errors-db.md` **S095** — SEC-DEFINER-Boundary: public Leaderboard-Projektion → kein auth.uid()-Guard nötig.
- `database.md` **Migration-Template AR-44** — neue RPC: REVOKE anon + GRANT authenticated (Pflicht, sonst anon-Zugriff).
- `errors-frontend.md` **S371** — Money/Community-Mutation invalidiert Wallet: NICHT relevant (read-only), aber Throw-statt-Swallow-Disziplin gilt.
- `gamification.md` „Median vs Average" — Gesamt-Board nutzt **Saison-Punkte (SUM)**, NICHT Elo-Median; bewusst andere Metrik als `GlobalLeaderboard` (kein Redundanz-Konflikt).
- `business.md` Wording — „BeScout-Saison"/„Liga" unverfänglich (keine Securities/Glücksspiel-Nähe); TR muss `kazan*`/`yatırım`-frei sein.

## 6. Acceptance Criteria (Executable)

```
AC-01: [HAPPY-Rename] rankings.title zeigt "BeScout-Saison" (DE) / TR-Äquivalent.
  VERIFY: bescout.net/rankings (DE+TR) Header-Text
  EXPECTED: "BeScout-Saison" statt "BeScout Liga"
  FAIL IF: noch "BeScout Liga" / raw key / Fußball-Liga-Strings ebenfalls geändert

AC-02: [HAPPY-Gesamt] Umschalter "Gesamt" zeigt befülltes Saison-Board (echte Daten heute).
  VERIFY: rpc_get_season_ranking(NULL, 100) live
  EXPECTED: >0 Einträge (39 Events/73 Lineups vorhanden), absteigend nach season_score, rank lückenlos 1..N
  FAIL IF: leer trotz vorhandener is_liga_event-Lineups / Rang-Duplikate

AC-03: [HAPPY-ProLiga] "Pro Liga" + Bundesliga (nach Seed) zeigt Demo-Ranking.
  VERIFY: rpc_get_season_ranking('<bundesliga-uuid>', 100) live nach Seed
  EXPECTED: 2-3 Demo-Lineups gerankt; Liga-Name "Bundesliga" sichtbar
  FAIL IF: leer nach Seed / falsche Liga gemischt

AC-04: [EMPTY-ProLiga] "Pro Liga" für Liga ohne Daten → ehrlicher Empty-State.
  VERIFY: rpc_get_season_ranking('<liga-ohne-events>', 100)
  EXPECTED: [] → Board zeigt "Noch keine BeScout-Saison-Daten für diese Liga" (kein Crash, kein NaN)
  FAIL IF: Error-State / leerer weißer Block / raw key

AC-05: [ERROR] RPC-Fehler → ErrorState mit Retry (kein Silent-Fail).
  VERIFY: getSeasonRanking wirft bei error (Code-Review) → Hook isError → <ErrorState onRetry>
  EXPECTED: Retry-Button sichtbar; kein leeres Board das Erfolg vortäuscht
  FAIL IF: catch→[] (Data-Liar)

AC-06: [SECURITY] RPC anon-gesperrt, authenticated erlaubt.
  VERIFY: SELECT proacl FROM pg_proc WHERE proname='rpc_get_season_ranking'
  EXPECTED: kein anon; {authenticated, ...}; REVOKE PUBLIC angewandt
  FAIL IF: anon EXECUTE vorhanden

AC-07: [I18N-DE/TR] Alle neuen + umbenannten Strings DE+TR vorhanden, namespace-korrekt.
  VERIFY: node-check beider JSON + Live-Render-Console (MISSING_MESSAGE-Scan, S333)
  EXPECTED: 0 MISSING_MESSAGE; TR business.md-konform (kein kazan*/yatırım)
  FAIL IF: TR zeigt DE-Fallback / raw key / verbotenes Vokabular

AC-08: [MOBILE] Board auf 393px ohne Overflow, Pills scroll-x, Touch ≥44px.
  VERIFY: Playwright bescout.net/rankings @393px
  EXPECTED: kein horizontaler Overflow; Umschalter bedienbar
  FAIL IF: abgeschnittene Pills / Overflow

AC-09: [REGRESSION] Bestehende Boards (Global/Friends/Club/Monthly/Player) unverändert funktional.
  VERIFY: tsc --noEmit grün + Playwright /rankings rendert alle Cards
  EXPECTED: keine Console-Errors; GlobalLeaderboard-Manager-Tab weiter Elo-basiert
  FAIL IF: Bestehendes Board bricht / Doppel-Render
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Pro Liga | kein leagueId gewählt | `useLeagueScope.leagueId = null` | Hinweis „Liga wählen" (kein RPC-Call) | Hook `enabled: mode==='league' ? !!leagueId : true` |
| 2 | Aggregat | Nutzer mit total_score=0/NULL | Lineup total_score NULL | `COALESCE(SUM,0)` → 0, trotzdem gelistet (event_count>0) | COALESCE im RPC |
| 3 | Gesamt | 0 is_liga_event-Lineups (theoretisch) | leeres Set | `[]` → `noData` | jsonb_agg COALESCE '[]' |
| 4 | RPC | p_limit absurd (0/99999) | Grenzwerte | `GREATEST(LEAST(p_limit,200),1)` clamp | Clamp im RPC |
| 5 | Rang | gleicher season_score | Ties | deterministischer Tiebreak (event_count, user_id) | ORDER BY mehrstufig |
| 6 | Profile-Join | Nutzer ohne profiles-Row | orphan user_id | `JOIN profiles` droppt Zeile (kein Geist) | INNER JOIN bewusst |
| 7 | Rename | Fußball-Liga-String fälschlich geändert | `leagueLabel`/`clubLeagueLabel`/`mode='league'` | bleiben „Liga" | grep-Klassifikation in BUILD |
| 8 | i18n | EventCardView-Namespace falsch | Badge-Key im falschen Namespace | namespace-aware Check + Live-Render (S333) | Code-Reading Item 8 |
| 9 | Cache | Liga-Switch im SSOT | `setLeagueScope` | Board refetcht (qk.rankings.season(leagueId) key) | leagueId in qk-Key |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
CI=true npx vitest run src/lib/services/__tests__/scoutScores   # falls Test-File
# Rename-Vollständigkeit + keine Über-Renames:
grep -rn "BeScout Liga\|BeScout-Liga" src/ messages/        # nur Admin-facing darf bleiben (Scope-Out)
grep -rn "rankings.title" messages/de.json messages/tr.json  # = "BeScout-Saison"
# Fußball-Liga-Strings UNVERÄNDERT (Negativ-Check):
grep -nE "\"(leagueLabel|clubLeagueLabel|leagueFilter|fieldLeague)\"" messages/de.json
```
```sql
-- DB-Smoke (live, read-only):
SELECT pg_get_functiondef('public.rpc_get_season_ranking(uuid,int)'::regprocedure);
SELECT proacl FROM pg_proc WHERE proname='rpc_get_season_ranking';
SELECT jsonb_array_length(rpc_get_season_ranking(NULL, 100));            -- Gesamt: >0 erwartet
SELECT jsonb_array_length(rpc_get_season_ranking('<bundesliga-uuid>',100)); -- nach Seed: 2-3
```

## 9. Open-Questions

**Pflicht-Klärung (vor Code):** — keine offen. CEO-Scope (Anzeige + Rename + Seed) per AskUserQuestion entschieden. Naming „BeScout-Saison" = D105 fix.

**Autonom-Zone (CTO):**
- Komponenten-Struktur `LeagueSeasonLeaderboard` (Sub-Helper, Pill-Markup).
- Exakte neue i18n-Key-Namen (im rankings-Namespace).
- qk-Key-Platzierung (`qk.rankings.season` vs. bestehende Factory).
- Metrik-Detail Gesamt = SUM(total_score) Saison-Punkte (bewusst ≠ Elo-Median von GlobalLeaderboard).
- RPC-Detail (Clamp, Tiebreak, Mirror-Security).

**Nicht-Autonom (Anil/CEO):**
- **Payout/Reward pro Liga** = explizit E-2b (Money/CEO) — NICHT hier.
- DB-Spalten-Rename (`is_liga_event`→…) — bewusst NICHT (Code-intern bleibt, D105).

## 10. Proof-Plan

| Artefakt | Inhalt |
|----------|--------|
| `worklog/proofs/381-season-rpc.txt` | Live `pg_get_functiondef` + `proacl` + `rpc_get_season_ranking(NULL,…)` (Gesamt gefüllt) + nach Seed `(bundesliga,…)` (Pro Liga gefüllt) + Empty-Liga `[]` |
| `worklog/proofs/381-rankings-de.png` | Playwright bescout.net/rankings — Header „BeScout-Saison", Board Gesamt befüllt, Umschalter sichtbar (393px) |
| `worklog/proofs/381-rankings-perleague.png` | „Pro Liga" + Bundesliga → Demo-Ranking sichtbar |
| `worklog/proofs/381-vitest.txt` | Service-/Hook-Tests grün + tsc clean |

## 11. Scope-Out

- **Pro-Liga-Payout / konfigurierbare Reward-Struktur** → **E-2b** (L, Money/CEO; `close_monthly_liga` pro Liga, Live-functiondef VOR Spec, Reviewer-Pflicht).
- **Monats-/Saison-Zeitfenster-Formalisierung** (echtes Saison-Boundary statt „alle ended Events") → E-2b.
- **Admin-facing Rename** (`AdminEventsManagementTab` „BeScout Liga Event", `EventFormModal`-Kommentar) → optional/Backlog (D105: admin-facing darf „Liga" behalten).
- **Trader/Analyst pro Liga** → bewusst nie (global, D106).
- **Live-Standing laufender Monat / Cron** → eigener Slice (Anker 358-epic).
- **Lineup-Picker-Vorfilter (E-1b)** → eigener Slice.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (inline §3+§4, read-only, kein scout_scores-Umbau) → BUILD → REVIEW (reviewer-Agent — neue RPC + UI, kein Money aber DB-Change) → PROVE (RPC-Smoke + Seed + 2 Screenshots) → LOG
```
REVIEW = reviewer-Agent (nicht self-review): neue SEC-DEFINER-RPC + neues Board rechtfertigen Cold-Context-Check, auch ohne Money.

## 13. Pre-Mortem (optional bei M — hier kurz, 5 Szenarien)

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | Über-Rename: Fußball-Liga-Strings auch geändert → Filter heißen „BeScout-Saison" | MED | mittel | grep-Klassifikation Negativ-Check (AC, §8) | Live-Render /market /clubs |
| 2 | RPC `profiles`-JOIN findet orphan user_id → Geist-Zeile | LOW | niedrig | INNER JOIN droppt (EC-6) | RPC-Smoke Rang-Count |
| 3 | EventCardView-Badge-Key im falschen Namespace → MISSING_MESSAGE live (S333) | MED | niedrig | namespace-aware Check + Live-Console-Scan (AC-07) | bescout.net Console |
| 4 | Service swallowt error → leeres Board täuscht Erfolg vor | LOW | mittel | throw statt return [] (Code-Review-Gate) | Reviewer + AC-05 |
| 5 | Seed-Event ohne korrekte Lineup-Constraints → Pro-Liga bleibt leer im Demo | MED | niedrig | Seed-Lineups gegen lineups-NOT-NULL/CHECK prüfen (PROVE), Verify per RPC vor Screenshot | RPC-Smoke nach Seed |

---

## Compliance-Check

- Kein $SCOUT/Investment/ROI user-facing — Board zeigt „Saison-Punkte" (neutral), kein €/Geld.
- Kein IPO-Begriff. Keine Securities-/Glücksspiel-Nähe in „BeScout-Saison"/„Pro Liga".
- TR: `kazan*`/`yatırım`/`ödül`(neutral ok)-Check bei neuen Keys.
- Kein Disclaimer nötig (read-only Ranking, kein Money) — `/rankings` hat bereits `TradingDisclaimer` (MonthlyWinners-rewards), bleibt.

## TR-Wording-Vorab (Auszug — final in BUILD)

| Key | DE | TR | Konformität |
|-----|----|----|-------------|
| `rankings.title` | „BeScout-Saison" | „BeScout Sezonu" | ✓ neutral |
| `rankings.scopePerLeague` | „Pro Liga" | „Lige Göre" | ✓ |
| `rankings.scopeOverall` | „Gesamt" | „Genel" | ✓ |
| `rankings.seasonScore` | „Saison-Punkte" | „Sezon Puanı" | ✓ kein kazan* |
| `rankings.perLeagueEmpty` | „Noch keine BeScout-Saison-Daten für diese Liga" | „Bu lig için henüz BeScout Sezonu verisi yok" | ✓ |

## Open Risiko (ehrlich)

Größtes Risiko = **Über-Rename** (Fußball-Liga-Strings versehentlich ändern) und **Namespace-Drift** beim EventCardView-Badge (S333). Beide durch grep-Klassifikation + Live-Render-Console-Scan abgedeckt. Pro-Liga-Board ist read-only → kein Money-Risiko; einziger „echter" DB-Eingriff = neue SEC-DEFINER-RPC (anon-gesperrt, AR-44). Demo-Seed ist isoliert (1 Event + Lineups), per RPC vor Screenshot verifiziert.

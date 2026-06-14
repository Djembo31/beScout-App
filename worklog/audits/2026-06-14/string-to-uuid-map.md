# S7 Phase-3 — String→UUID Vereinheitlichungs-Landkarte (club / league / favorite_club)

**Erstellt:** 2026-06-14 (Plan-Agent, READ-ONLY) · **Kontext:** D80 Sommer-Tiefen-Umbau
**Verifiziert gegen Live-DB `skzjfhvgccaeplydsunz` (information_schema + pg_proc + pg_constraint + Row-Counts) + echten `src/`-Code.**

## Executive Summary

1. **Gesamt-Risiko: MITTEL.** Money-Pfad NICHT betroffen (alle Geld-RPCs nutzen bereits UUID/club_id). Doppelung ist Identity/Display/Filter → Risiko = falsche Liga-/Club-Zuordnung in Anzeige + String-Filtern, nicht Geldverlust.
2. **Die 3 Paare sind sehr unterschiedlich weit.** `profiles.favorite_club` = fast fertig (dual-write, UUID=Truth, 9 Legacy-Mismatches). `clubs.league` = sauber-aber-gekoppelt (0 Drift, FK da, aber leagueName-String tief in ~10 Components als Filter-Key). `players.club` = am rohsten + gefährlichsten (294 Drift, 84 NULL, dead String-RPC).
3. **🔴 Korrektur gegen Registry-Annahme:** Registry sagte „club-String=Display, club_id=Truth". Live-Daten invertieren das bei den 294 Mismatches: String = aktueller Wert, club_id = veraltet. KEINE Spalte ist allein „Wahrheit" → Reconcile über externe Quelle (api_football_id) nötig, nicht „eine Spalte gewinnt".
4. **Start-Reihenfolge:** `favorite_club` (S/low, Template) → `clubs.league` (M/med, Enabler) → `players.club` (L/med-high).
5. **Größter versteckter Hebel:** 294 stale club_id → diese Spieler zeigen HEUTE schon die falsche Liga (`leagueLookup(club_id)`). club_id-Backfill (Datenfix) ist wichtiger+dringender als das String-Drop.

## Gemeinsame Fakten

| Tabelle | String | nullable/default | UUID | nullable | FK |
|---|---|---|---|---|---|
| players | club | NOT NULL / 'Sakaryaspor' | club_id | nullable | players_club_id_fkey |
| profiles | favorite_club | nullable | favorite_club_id | nullable | profiles_favorite_club_id_fkey |
| clubs | league | NOT NULL / 'TFF 1. Lig' | league_id | nullable | clubs_league_id_fkey |
| posts | club_name | nullable | club_id | nullable | posts_club_id_fkey |

**Drift-Stand (Live-Counts):**

| Paar | total | nur String | nur UUID | beide | Widerspruch | dangling |
|---|---|---|---|---|---|---|
| players.club/club_id | 4556 | 84 | 0 | 4472 | **294** | 0 |
| profiles.favorite_club/_id | 128 | 9 | 7 | 45 | 9 | 0 |
| clubs.league/league_id | 134 | 0 | 0 | 134 | **0** | 0 |
| posts.club_name/club_id | 10 | 1 | 0 | 2 | n/p | 0 |

**Referenz-Integrität:** 0 club-Strings ohne clubs.name-Match; 0 league-Strings ohne leagues.name-Match; 7 Ligen, Namen eindeutig (0 cross-country-Duplikate) → name-basierter Backfill heute verlustfrei. Slice-276-Konflikt betrifft `short`-Codes, NICHT volle Namen.

**DB-Referenzen:** 0 Views nutzen String-Spalten. 6 RPCs berühren sie (Details unten). Kein String↔UUID-Sync-Trigger.

---

## SEKTION A — players.club ↔ club_id (ROHESTES + GEFÄHRLICHSTES)

- **Drift:** 84 nur-String (club_id NULL → keine Liga in dbToPlayer), 294 Widerspruch (alle updated_at 2026-06-13 18:48:07 = Bulk-String-Touch).
- **Wahrheit AMBIVALENT:** sync-players-daily + sync-transfers schreiben NUR club_id (route.ts:182-217). KEIN Pfad schreibt `players.club` (String write-frozen). ABER bei den 294 ist der String frisch (Palhinha→Tottenham), club_id veraltet (Bayern). → Reconcile via club_external_ids/api_football_id nötig, kein blindes „eine Spalte gewinnt".
- **Lese-Stellen String — GEFÄHRLICH (Join/Filter):** FDRBadge.tsx:37 (getClubAvgL5), KaderTab.tsx:313+278 (Club-Filter), ClubVerkaufSection.tsx:93-95 (Gruppierung), RPC get_club_dashboard_stats(text) WHERE club=... **(0 Caller = DEAD)**. Indirekt: getClub(player.club) Name-Lookup (player/index.tsx:378, PlayerHero.tsx:68).
- **Lese-Stellen String — Anzeige (harmlos):** player/index.tsx:412, PlayerHero:209, KaderPlayerRow:192, BestandPlayerRow:97, home-Strips, OffersTab:282, etc.
- **Schreib-Stellen String:** KEINE (src + RPC). Write-frozen.
- **Dead-RPC:** get_club_dashboard_stats(text) — 0 Caller (club.ts:499 nutzt _v2(uuid)). Drop-Kandidat.
- **Kopplung:** player.league wird aus club_id abgeleitet (players.ts:199 leagueLookup(db.club_id)) → club_id-Drift ⇒ falsche player.league ⇒ falsche leagueName-Filter (Sektion B).
- **Sequenz:** (1) Datenfix Reconcile 294+84 via api_football_id [dringend, eigener Slice]. (2) Konsumenten String→clubId (FDR, KaderTab, ClubVerkauf, getClub). (3) Dead-RPC droppen. (4) String deprecaten (NOT-NULL+Default weg → nullable → drop).
- **Größe L · Risiko med-high · ~15-20 Files** (+ Player-Typ types/index.ts:48/131/475/522).

## SEKTION B — clubs.league ↔ league_id (SAUBER, aber Filter-Key tief verdrahtet)

- **Drift:** 0 (alle 134 konsistent).
- **Wahrheit:** gemischt. RPC create_club_by_platform_admin schreibt NUR league (String), NICHT league_id → **neue Admin-Clubs = league_id NULL = latente Drift-Quelle**. dbToPlayer leitet player.league aber aus league_id ab. Club-Anzeige=String, Spieler-Liga=UUID.
- **Lese-Stellen String — GEFÄHRLICH (Filter):** useLeagueScope.leagueName (leagueScopeStore.ts:35-36, localStorage-persistiert :78-82), TrendingSection.tsx:27, TransferListSection.tsx:89, ClubVerkaufSection.tsx:104, KaderTab.tsx:276+304, BestandView.tsx:164/175/197, PlayerRankings.tsx:56, LeagueBar.tsx:26-31 (Map-Key).
- **Lese-Stellen — Anzeige:** BestandPlayerRow:99, KaderPlayerRow:194, ClubCard.tsx:104/117, search.ts:66, etc.
- **Schreib-Stellen:** RPC create_club_by_platform_admin (String only — Fix-Punkt). src schreibt nicht direkt.
- **Risiken:** create_club RPC league_id-NULL-Drift; leagueName in localStorage (Schema-Guard-Migration nötig); Multi-Country-Expansion bricht name-Filter (heute eindeutig).
- **Enabler für A:** leagueName-Konsumenten auf leagueId entkoppelt sie von player.league-Ableitung/club_id-Drift.
- **Sequenz:** (1) RPC-Fix create_club league_id setzen [zuerst, stoppt Neu-Drift]. (2) Konsumenten String→leagueId (useLeagueScope hat leagueId schon; dbToPlayer leagueId exposen). (3) localStorage-Migration. (4) String deprecaten + get_club_by_slug umstellen.
- **Größe M · Risiko med · ~12-14 Files.**

## SEKTION C — profiles.favorite_club ↔ favorite_club_id (FAST FERTIG)

- **Drift:** 9 nur-String, 7 nur-UUID, 45 beide, 9 Widerspruch (Pre-Dual-Write-Legacy).
- **Wahrheit: UUID eindeutig.** Alle Schreiber dual-writen (club.ts:212/254/262/354, onboarding:168-169, settings:152-153), String immer aus clubs.name abgeleitet. Alle Logik-Reads nutzen favorite_club_id. String = reine Anzeige (ProfileView:158, useProfileData:148, FantasyContent:295, community:83).
- **Schreib-Stellen String:** updateProfile (profiles.ts:113-114), createProfile (:80-81) — nie ohne UUID.
- **Risiken:** minimal (9+9 Legacy zeigen evtl. alten Namen; 7 nur-UUID brauchen getClubName-Fallback).
- **Sequenz:** (1) Backfill 9+9 (UUID gewinnt). (2) 5 Anzeige-Reader → getClubName(favorite_club_id). (3) Dual-Write → UUID-only. (4) String droppen.
- **Größe S · Risiko low · ~8-10 Files. = idealer Template/Proof-Slice.**

## ANHANG — 4. Paar posts.club_name ↔ club_id (trivial)
10 Zeilen, FK da. Im selben Schwung wie C abräumbar oder dormant lassen bis Social aktiv. (bounties.club_name = separate denorm Spalte, gleiche Klasse, dormant.) Größe S · Risiko low.

---

## Konsolidierte Sequenz

**Phase 0 — Datenfixe (vor Spalten-Drop, je eigener Slice):**
1. players.club_id-Reconcile (294 Mismatch + 84 NULL via api_football_id) — **dringend, fixt heute-falsche Liga-Anzeige.** (ggf. API-Key-abhängig zur Bestimmung des aktuellen Clubs.)
2. create_club_by_platform_admin league_id-Fix — stoppt künftige clubs.league-Drift.
3. favorite_club-Backfill (9+9).

**Phase 1 — Migration:**
| # | Paar | Warum | Größe/Risiko |
|---|---|---|---|
| 1 | profiles.favorite_club (+ posts.club_name) | fast fertig, low-risk, Template fürs Muster | S/low |
| 2 | clubs.league | Enabler für leagueName-Konsumenten + entkoppelt player.league von club_id-Drift | M/med |
| 3 | players.club | höchste Komplexität+Drift, profitiert von League-Decoupling, braucht Phase-0.1 | L/med-high |

**Abhängigkeit:** dbToPlayer leitet player.league aus club_id ab → club_id-Korrektheit (0.1) ist Voraussetzung für korrekte leagueName-Filter (B); League zuerst auf UUID (B) reduziert Blast-Radius vor A; favorite_club (C) unabhängig → risikoarmer Erst-Slice.

## Critical Files
- `src/lib/services/players.ts` (dbToPlayer :188-250, league-Ableitung :199, leagueLookup :178)
- `src/features/shared/store/leagueScopeStore.ts` (leagueName-Filter-Truth + localStorage :35-82, :144-232)
- `src/lib/services/club.ts` (favorite_club Dual-Write :212/254/354; getClubDashboardStats→v2 :499)
- `src/features/manager/components/kader/KaderTab.tsx` (club+league String-Filter :276/304/313)
- `src/app/api/cron/sync-transfers/route.ts` (club_id-only Transfer-Update :204-217 = 294-Drift-Ursache)

---

## Vorlage-Lehren (aus Slice 324 favorite_club Review — PFLICHT für league + players.club)

1. **Removal-Grep-Scope:** Column-Drop = Removal → grep `<col>([^_]|$)` über `src/ scripts/ messages/ supabase/migrations/`, NICHT nur src/. Seed-/Maintenance-SQL (`scripts/seed-demo.sql`) hat keinen tsc-Schutz und failt erst zur Laufzeit. (Slice 324 ließ favorite_club in seed-demo.sql stehen → Reviewer-MAJOR.)
2. **Truth-Achse pro Paar verifizieren, NICHT übertragen:** favorite_club ging einfach, weil `favorite_club_id` eindeutig Truth ist (UUID=Truth, String=Display) → simpler name→id-Backfill verlustfrei. **players.club ist anders:** bei den 294 Mismatches ist der STRING frisch + `club_id` veraltet → ein name→id-Backfill würde stale club_ids ZEMENTIEREN. players.club braucht echten Reconcile via `club_external_ids`/api_football_id (API-Key-gated), kein „eine Spalte gewinnt".
3. **Migration atomar:** Backfill+DROP in `BEGIN; … COMMIT;` wrappen (bei players.club mit 294 Reconcile-Zeilen Pflicht).
4. **Reader-Ableitung:** `getClub(id)?.name` (sauberes null bei Cache-Miss), NIE `getClubName(id)` (leakt die UUID als Fallback).
5. **Test-Mocks:** `@/lib/clubs` per `vi.mock(..., async (orig) => ({ ...(await orig()), getClub: ... }))` (importActual-Override), sonst Slice-286-useSyncExternalStore-Crash.

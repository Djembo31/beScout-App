# Slice 346 — FRE-3: Exklusive Vereins-Beiträge (Fan-Rang-Gate + gesperrte Vorschau)

**Status:** SPEC · **Größe:** M · **Slice-Type:** Migration (+ Service + UI) · **Scope:** CEO-approved (Security-nah RLS, Design von Anil 2026-06-18) · **Datum:** 2026-06-18

> Dritter Schritt der Fan-Reward-Engine (D93). Ein echtes Vorrecht: Vereins-News, die nur Fans ab einer Fan-Stufe lesen können — mit **gesperrter Vorschau** (🔒) für niedrigere Stufen. Security-nah (RLS-Lese-Gate) → ich (CTO) baue selbst (§3).

---

## 1. Problem Statement

Vereins-News (`posts.post_type='club_news'`) sind heute für **jeden** sichtbar (RLS SELECT `USING(true)`, live verifiziert). Es gibt keine Möglichkeit, treue Fans mit exklusiven Inhalten zu belohnen. Die Spalte `posts.is_exclusive` (BOOL) existiert, ist aber ein **totes Flag** (nirgends erzwungen) und kann keine Stufe ausdrücken. Anil-Design (D93): exklusive News ab Fan-Stufe X, gesperrte Vorschau.

**Wer/wie oft:** Alle Vereins-Fans, alle 7 Ligen. Treue-Anreiz = Kern des Geschäftsmodells (reward-ranking.md W2-D: kein gezielter Club→Fan-Reward).

## 2. Lösungs-Design (Architektur)

**Sicherer Read-Gate = RLS (nicht nur UI).** Der Inhalt eines exklusiven Beitrags darf den unberechtigten Client **nie** erreichen. Gesperrte Vorschau = der Beitrag-Hinweis (existiert + Mindeststufe) ist sichtbar, der `content` nicht.

**5 Bausteine:**

1. **`fan_rank_tier_rank(text) → int` (IMMUTABLE, neu):** spiegelt die 6-Stufen-Ordnung aus `src/lib/fanRanking.ts` `FAN_RANK_TIERS` in SQL: zuschauer 0, stammgast 1, ultra 2, legende 3, ehrenmitglied 4, vereinsikone 5, unbekannt/NULL → -1. (Mirror — Drift-Risiko, Kommentar + Test wie Slice 108-Familie.)

2. **`ALTER TABLE posts ADD COLUMN min_fan_rank_tier TEXT` (nullable) + CHECK** (NULL oder einer der 6 Tiers). NULL = öffentlich (Default, alle bestehenden Beiträge bleiben öffentlich). `min_fan_rank_tier` = SSOT des Gates; `is_exclusive` bleibt unangetastet (tot, Scope-Out).

3. **RLS SELECT-Policy ersetzen** (die EINE Policy „Anyone can read posts", role `public`, `USING(true)`):
   ```sql
   USING (
     min_fan_rank_tier IS NULL                       -- öffentlich (= heutiges Verhalten)
     OR user_id = auth.uid()                         -- Autor sieht eigenen
     OR fan_rank_tier_rank(
          (SELECT fr.rank_tier FROM fan_rankings fr
           WHERE fr.user_id = auth.uid() AND fr.club_id = posts.club_id)
        ) >= fan_rank_tier_rank(min_fan_rank_tier)    -- berechtigte Fan-Stufe
   )
   ```
   → Über den **generischen** Pfad (`getPosts`, Community-Feed, Replies) sind exklusive Beiträge für Unberechtigte **komplett unsichtbar** (Zeile wird gar nicht geliefert → kein Content-Leak). Anon (`auth.uid()` NULL) → Subselect leer → exklusive verborgen, öffentliche sichtbar.

4. **`get_club_news_teasers(p_club_id uuid, p_limit int) → TABLE(...)` (SECURITY DEFINER, neu):** liefert ALLE club_news des Clubs (auch exklusive) mit **maskiertem Content**:
   ```sql
   can_view := (min_fan_rank_tier IS NULL OR user_id = auth.uid()
                OR fan_rank_tier_rank(viewer_tier) >= fan_rank_tier_rank(min_fan_rank_tier));
   content := CASE WHEN can_view THEN content ELSE NULL END;
   ```
   Gibt `id, created_at, category, content (maskiert), min_fan_rank_tier, can_view, author(handle/avatar)`. Bypasst RLS (DEFINER) — aber gibt für gesperrte Beiträge **nur** Teaser-Metadaten + `content=NULL` zurück → sicher. **Das ist der einzige Anzeige-Pfad für exklusive News** (die Club-Neuigkeiten-Card nutzt ihn). REVOKE anon/PUBLIC + GRANT authenticated.

5. **Create + Display:**
   - `createClubNews`/`createPost` (`posts.ts`) um `minFanRankTier?` erweitern (im `.insert()` setzen).
   - `AdminOverviewTab` News-Publish: Auswahl „Mindeststufe" (Default „für alle").
   - `getClubNewsTeasers(clubId)` Service (ruft RPC) → `useClubData` nutzt ihn statt `getPosts({postType:'club_news'})`.
   - `ClubContent` Club-Neuigkeiten-Card: bei `can_view=false` 🔒-Badge + „Exklusiv ab {Stufe}"-Teaser statt Content; bei `can_view=true` Content + (für Admin/Autor) Badge.
   - `DbPost`-Type + `PLAYER`/Post-SELECT-Cols + i18n DE/TR.

**Scope-Bewusst:** Der globale Community-Feed („news"-Filter) nutzt generisches `getPosts` → exklusive club_news erscheinen dort **nicht** (RLS verbirgt sie). Akzeptiert: exklusive News leben auf der Club-Seite (Teaser-RPC). Scope-Out.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `supabase/migrations/<ts>_slice_346_exclusive_club_posts.sql` | NEU | tier_rank fn + Spalte + RLS replace + teaser RPC + Grants |
| `src/types/index.ts` | EDIT | `DbPost.min_fan_rank_tier`; Teaser-Return-Type |
| `src/lib/services/posts.ts` | EDIT | `createPost`/`createClubNews` Param; `getClubNewsTeasers`; SELECT-Cols |
| `src/components/club/hooks/useClubData.ts` | EDIT | club_news via Teaser-RPC laden |
| `src/app/(app)/club/[slug]/ClubContent.tsx` | EDIT | 🔒-Teaser-Darstellung |
| `src/components/admin/AdminOverviewTab.tsx` | EDIT | Mindeststufe-Auswahl im News-Publish |
| `messages/{de,tr}.json` | EDIT | Lock/Teaser/Selector-Strings |

**Grep-verifiziert:** RLS posts = 1 SELECT-Policy (`public`, `true`). `getPosts`-Consumer: `useClubData:54` (club_news → wird umgestellt), Community-Feed (generisch, exklusive bleiben verborgen — gewollt).

## 4. Code-Reading-Liste (erledigt via Explore-Map + Live-DB)

| Quelle | Befund |
|------|--------|
| Live `pg_policies posts` | EINE SELECT-Policy „Anyone can read posts", role public, USING true. INSERT/UPDATE/DELETE = `auth.uid()=user_id`. |
| Live `information_schema posts` | `min_fan_rank_tier` fehlt; `is_exclusive`/`post_type`/`club_id`/`content` vorhanden. `post_type` CHECK: general/player_take/transfer_rumor/club_news. |
| `src/lib/fanRanking.ts:24-31` | `FAN_RANK_TIERS` Ordnung (minScore) = Mirror-Quelle für tier_rank fn. |
| `src/lib/services/posts.ts:114-173` | `createPost`/`createClubNews` direktes `.insert()` (keine RPC), `getPosts:29-112`. |
| `src/components/club/hooks/useClubData.ts:54` + `ClubContent.tsx:546-573` | club_news Lade- + Render-Pfad. |
| `src/components/admin/AdminOverviewTab.tsx:195-223` | News-Publish-Create-Pfad. |
| `database.md` RLS-Pflicht + AR-44 · `errors-db.md` PATCH-AUDIT/Pricing-Drift | RLS-Vollständigkeit, Grants, Mirror-Drift. |

## 5. Pattern-References

- `database.md` „RLS Pflicht-Checkliste" + „SECURITY DEFINER Guard: Admin-only vs Public-safe (Slice 095)" — Read-Gate-Korrektheit, RPC gibt keine PII über Maskierung hinaus.
- `errors-db.md` „Money-RPC Pricing-Formel Drift (Slice 108)" — tier_rank fn spiegelt TS-Ordnung → Drift-Guard (Kommentar + Test).
- `errors-frontend.md` „PLAYER_SELECT_COLS Sync (Slice 200)" — neue Spalte in SELECT-Cols + Type, sonst kommt sie nie zurück.
- `errors-frontend.md` „Missing i18n-Key (Slice 198)" — Teaser/Selector-Strings DE+TR.
- `decisions.md` D93 — FRE-3-Design.
- AR-44 — REVOKE/GRANT für neue Functions.

## 6. Acceptance Criteria (Security-Schwerpunkt)

```
AC-01: [SECURITY-PUBLIC] Öffentliche Beiträge (min_fan_rank_tier IS NULL) bleiben für ALLE sichtbar (anon + jede Stufe) — kein Regress.
  VERIFY: role-based Smoke (anon + authenticated low-tier): SELECT content FROM posts WHERE min_fan_rank_tier IS NULL → sichtbar.
  FAIL IF: ein bestehender (öffentlicher) Beitrag verschwindet.

AC-02: [SECURITY-GATE] Exklusiver Beitrag ist über generischen Pfad für Unberechtigte UNSICHTBAR (keine Zeile, kein Content).
  VERIFY: SET ROLE authenticated + jwt eines low-tier Users → SELECT * FROM posts WHERE id=<exkl> → 0 Zeilen.
  FAIL IF: Zeile ODER content sichtbar.

AC-03: [TEASER] get_club_news_teasers gibt Unberechtigten den Hinweis (min_tier, can_view=false) aber content=NULL; Berechtigten content.
  VERIFY: RPC als low-tier → can_view=false, content NULL, min_fan_rank_tier gesetzt; als high-tier/Autor → can_view=true, content present.
  FAIL IF: content an Unberechtigte ODER Teaser fehlt.

AC-04: [AUTHOR] Autor sieht eigenen exklusiven Beitrag immer (generisch + RPC).
  VERIFY: user_id=auth.uid() → sichtbar.

AC-05: [TIER-ORDER] fan_rank_tier_rank spiegelt FAN_RANK_TIERS exakt.
  VERIFY: zuschauer<stammgast<ultra<legende<ehrenmitglied<vereinsikone (0..5), unbekannt -1.
  FAIL IF: Abweichung von der TS-Ordnung.

AC-06: [CREATE] Admin kann min_fan_rank_tier setzen; Default NULL.
  VERIFY: createClubNews mit/ohne Tier → Spalte korrekt.

AC-07: [GRANTS] teaser-RPC: anon kein EXECUTE, authenticated ja. RLS-Policy auf public role, alle 4 Ops intakt.
  VERIFY: has_function_privilege; pg_policies posts (SELECT/INSERT/UPDATE/DELETE alle da).
  FAIL IF: anon EXECUTE oder eine Op-Policy verloren.

AC-08: [I18N] Teaser/Selector DE+TR, kein MISSING_MESSAGE, neutral (kein gewinn*/kazan*).
```

## 7. Edge Cases

| # | Case | Expected | Mitigation |
|---|------|----------|------------|
| 1 | User ohne fan_rankings-Zeile | rank -1 → exklusive (min≥0) gesperrt | COALESCE/CASE ELSE -1 |
| 2 | anon (auth.uid NULL) | öffentliche sichtbar, exklusive gesperrt | Subselect leer |
| 3 | min_fan_rank_tier = 'zuschauer' (0) | praktisch alle Fans mit Rang | Admin wählt sinnvoll ≥ stammgast |
| 4 | Beitrag ohne club_id (general post) | Gate nur greift bei gesetztem min_tier; club_id NULL + min gesetzt → Subselect leer → gesperrt außer Autor | dokumentiert; club_news hat club_id |
| 5 | Stale fan_rank (Recalc-Latenz) | Zugang evtl. verzögert; Follow triggert Recalc (FRE-2) | akzeptiert; D92-Familie |
| 6 | tier_rank vs TS-Drift | Test fängt | AC-05 |
| 7 | RLS bricht ALLE posts-Reads | role-Smoke vor Commit | AC-01/02 hart |
| 8 | Autor=Admin, mehrere Admins | nur Autor via user_id; andere Admins via Tier/Public | dokumentiert (Scope-Out: admin-broad-view) |

## 8. Self-Verification Commands

```sql
-- Tier-Order
SELECT fan_rank_tier_rank('zuschauer'), fan_rank_tier_rank('ultra'), fan_rank_tier_rank('vereinsikone'), fan_rank_tier_rank('x');
-- RLS role-Smoke (transaktional, set_config jwt) — low vs high vs anon gegen einen Test-Exklusiv-Post
-- Teaser-RPC masking
-- Grants + Policy-Vollständigkeit
SELECT cmd, count(*) FROM pg_policies WHERE tablename='posts' GROUP BY cmd;
SELECT has_function_privilege('anon','public.get_club_news_teasers(uuid,integer)','EXECUTE');
```
```bash
npx tsc --noEmit
node -e "/* MISSING_MESSAGE check gamification/club namespace */"
grep -n "min_fan_rank_tier" src/lib/services/posts.ts src/types/index.ts  # SELECT-Cols + Type sync
```

## 9. Open-Questions

**Pflicht-Klärung:** keine — Design (Teaser, Admin wählt Tier) approved (D93).
**Autonom (CTO):** RLS vs RPC (→ RLS für generischen Read-Gate + Teaser-RPC für maskierte Vorschau); tier_rank als IMMUTABLE CASE; Default-Tier im Selector („für alle"); Badge-Style.
**Nicht-Autonom / Scope-Out:** Forge-Gap (INSERT-Policy prüft `club_admins` nicht — Nicht-Admin könnte club_news mit fremder club_id einfügen; **pre-existing**, eigener Härtungs-Slice) · is_exclusive-Aufräumen · Community-Feed-Teaser.

## 10. Proof-Plan

| Typ | Proof |
|-----|-------|
| Security/RLS | role-based force-rollback Smoke (anon/low/high/author) → `worklog/proofs/346-rls.txt` |
| RPC/Schema | Teaser-Masking + Grants + Policy-Count → selber File |
| UI | Playwright gegen bescout.net (Admin setzt Exklusiv-News; low-tier sieht 🔒, high-tier Content) post-Deploy → `worklog/proofs/346-ui.png` |

## 11. Scope-Out

- INSERT-Policy-Härtung (club_admins-Check) → eigener Security-Slice.
- `is_exclusive`-Spalte aufräumen/migrieren → eigener Cleanup.
- Exklusive News im globalen Community-Feed (Teaser dort) → spätere Erweiterung.
- csf_multiplier-Removal (P1) → separat.

## 12. Stage-Chain
```
SPEC → IMPACT (inline, RLS-Consumer verifiziert) → BUILD (Migration zuerst + role-Smoke, dann Service, dann UI) → REVIEW (reviewer, Security-Schwerpunkt) → PROVE (RLS-Smoke + UI-Screenshot) → LOG
```

## 13. Pre-Mortem

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | RLS-Replace verbirgt versehentlich öffentliche Beiträge | MED | hoch (Community tot) | `min IS NULL → true`-Zweig zuerst; role-Smoke anon+low | AC-01 |
| 2 | Content-Leak: exklusiver Content über generischen Pfad sichtbar | LOW | hoch (Feature wertlos) | RLS verbirgt ganze Zeile; Teaser nur via DEFINER-RPC mit Maskierung | AC-02/03 |
| 3 | tier_rank-Drift zu TS | MED | mittel | Mirror-Kommentar + AC-05-Test | Test |
| 4 | Neue Spalte nicht in SELECT-Cols → kommt nie zurück | MED | mittel | posts.ts SELECT-Cols + DbPost sync | grep AC |
| 5 | anon EXECUTE auf Teaser-RPC | LOW | hoch | AR-44 REVOKE/GRANT | AC-07 |
| 6 | RPC gibt PII (user_id) an Unberechtigte | LOW | mittel | RPC projiziert nur handle/avatar, kein user_id; content maskiert | Review |

---

## Compliance-Check
Teaser-Strings neutral („Exklusiv ab {Stufe}", „Steig auf"). Kein gewinn*/kazan*/Investment. Keine $SCOUT/IPO-Begriffe. Reine Access-Mechanik, kein Geld.

## TR-Wording-Vorab (Anil-Review vor Commit)
| Key | DE | TR (Vorschlag) |
|-----|----|----|
| `club.exclusiveLockedTitle` | „Exklusiv für treue Fans" | „Sadık fanlara özel" |
| `club.exclusiveLockedHint` | „Ab Stufe {tier} lesbar — steig auf!" | „{tier} seviyesinden itibaren — yüksel!" |
| `admin.newsMinTierLabel` | „Sichtbar ab Fan-Stufe" | „Şu fan seviyesinden görünür" |
| `admin.newsMinTierAll` | „Für alle" | „Herkes için" |

## Open Risiko
Höchstes Risiko: die RLS-Policy-Umstellung könnte bei einem Logikfehler ALLE oder die falschen Beiträge verbergen (Community-Breaking). Mitigation: der `min IS NULL → true`-Zweig erhält das heutige Verhalten 1:1; harte role-basierte Smokes (anon/low/high/author) VOR Commit; transaktional getestet. Zweitrisiko Content-Leak — durch RLS-Row-Hide + DEFINER-RPC-Maskierung doppelt abgesichert.

# Slice 333 — Polls P1: Erstellung + Quellen-Identität + Treasury-REIN-Routing + Follower-Tor

**Status:** SPEC · **Größe:** L · **Slice-Type:** Migration + Service + UI + i18n · **Scope:** CEO-pending (Money) · **Datum:** 2026-06-18

> Kanon: `docs/knowledge/domain/polls.md` (D86, WIE) + `docs/knowledge/domain/treasury.md` (D83, REIN-Seite). Erstes REIN-Money-Stück nach den Treasury-RAUS-Kanälen (329–332). Anil-Entscheidungen 2026-06-18: **volles P1 in einem L-Slice** · **Follower-Schwelle = 50**.

---

## 1. Problem Statement

`community_polls` kann **gelesen, abgestimmt (bezahlt, 70/30 via `cast_community_poll_vote`), abgebrochen** werden — aber **es gibt KEINE Erstellung** (kein Service, keine RPC, keine UI). Die „Hülle ohne Tür" (Canon §9, verifiziert 2026-06-17 + live D87 2026-06-18). Damit ist die zentrale REIN-Geldmaschine (Fan zahlt → Verein/Creator verdient → Treasury) nicht aktivierbar.

**Zweiter Befund (Geld-Routing):** Heute zahlt `cast_community_poll_vote` den 70%-Creator-Anteil **immer ins Creator-Wallet** (`poll_earn`-Transaction). Für eine **offizielle Vereins-Umfrage** muss der Anteil stattdessen als **REIN-Credit in die Club-Treasury** fließen (`poll_revenue`), nicht in das private Wallet des anlegenden Club-Admins.

**Wer/wie oft:** Jeder Verein + jeder reichweitenstarke User. Skalen-Hebel (Canon §1): Galatasaray ~35 Mio Fans, 1% teilnehmend = 350.000 zahlende Votes = Treasury-Geldmaschine. Heute: 0 Polls erstellbar.

## 2. Lösungs-Design (Architektur)

Drei Anlege-Spuren (Canon §2); **diese Slice baut die zwei bezahlten Erstell-Pfade** (Gratis-Club-Vote existiert separat via `club_votes`):

| Spur | `source` | Wer legt an | Geld-Routing bei Vote |
|------|----------|-------------|------------------------|
| Bezahlte **Vereins**-Umfrage | `'club'` | nur Club-Admin (hart verriegelt) | 70% → **Treasury** (`book_club_treasury` credit `poll_revenue`) |
| Bezahlte **User**-Umfrage | `'user'` | User ab **50 Followern** | 70% → **User-Wallet** (wie heute, `poll_earn`) |

**Identitäts-/Autoritäts-Grenze (sicherheitskritisch, Canon §3):** Die Geld-Richtung keyt **ausschließlich auf `community_polls.source`** (analog `events.type`, Slice 331), NICHT auf `club_id`. `club_id` ist nur ein **Bezug/Tag** (ein User darf eine Umfrage auf einen Verein beziehen). Nur `source='club'` (an Club-Admin gebunden, in der RPC verriegelt) leitet Geld in die Treasury.

**Datenfluss VOR:** kein Create. Vote → 70% Creator-Wallet immer.
**Datenfluss NACH:** Create-RPC schreibt `source` + (für club) `club_id`. Vote-RPC verzweigt: `source='club'` → Treasury-Credit; `source='user'` → Wallet (unverändert).

**Neue DB-Objekte (exakte Signaturen):**

```sql
-- community_polls: + Quellen-Diskriminante
ALTER TABLE community_polls
  ADD COLUMN source text NOT NULL DEFAULT 'user'
  CHECK (source IN ('club','user'));

-- Ledger-CHECK: poll_revenue als CREDIT-Typ (die D86-Falle: vorhandenes 'poll_reward'
-- war fälschlich als DEBIT/RAUS gedacht — wir führen den korrekten CREDIT-Typ ein)
ALTER TABLE club_treasury_ledger DROP CONSTRAINT club_treasury_ledger_type_check;
ALTER TABLE club_treasury_ledger ADD CONSTRAINT club_treasury_ledger_type_check
  CHECK (type = ANY (ARRAY[...bestehende..., 'poll_revenue']));

-- Neue RPC
create_community_poll(
  p_user_id     uuid,
  p_question    text,
  p_options     jsonb,        -- ['A','B',...] ODER [{label}] → normalisiert zu {label, votes:0}
  p_cost_bsd    bigint,       -- Vote-Kosten in cents (0 = kostenlos)
  p_duration_days integer,    -- Laufzeit → ends_at = now() + N days
  p_source      text,         -- 'club' | 'user'
  p_club_id     uuid DEFAULT NULL,   -- Pflicht wenn source='club'; optionaler Tag wenn 'user'
  p_description text DEFAULT NULL
) RETURNS jsonb  -- {success:true, poll_id} | {success:false, error}
```

**Geänderte RPCs:** `cast_community_poll_vote` (Treasury-Branch), `get_club_balance` (poll_revenue in `total_earned`-Breakdown).

**Neuer Service:** `createCommunityPoll(params)` in `communityPolls.ts` (Discriminated-Union-Guard).
**Neuer Type:** `DbCommunityPoll.source: 'club' | 'user'`.
**Neue UI:** `CreatePollModal` (Frage + Beschreibung + 2–4 Optionen + Kosten + Laufzeit), zwei Einstiegspunkte: Club-Admin-Panel (`source='club'`) + Community-Polls-Section (`source='user'`, Follower-Tor 50).

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `supabase/migrations/2026..._slice_333_polls_create_treasury.sql` | NEU | source-Col + ledger-CHECK + create_community_poll + cast_community_poll_vote-Branch + get_club_balance |
| `src/lib/services/communityPolls.ts` | EDIT | `createCommunityPoll` hinzufügen |
| `src/types/index.ts` | EDIT | `DbCommunityPoll.source` + `CreateCommunityPollParams` |
| `src/components/community/CreatePollModal.tsx` | NEU | Erstell-Formular (reusable, `source`-parametrisiert) |
| `src/components/community/CommunityFeedTab.tsx` | EDIT | „Umfrage erstellen"-Button (User-Pfad, Follower-Tor) |
| Club-Admin-Panel (AdminVotesTab ODER neuer AdminPollsTab) | EDIT/NEU | Vereins-Umfrage-Einstieg (`source='club'`) |
| `messages/de.json` + `messages/tr.json` | EDIT | neue Strings (community-Namespace + activity poll_revenue-Label falls nötig) |
| `src/lib/__tests__/*` | NEU | RPC-Guard-Tests (auth, source-lock, follower-gate, treasury-routing) |

**Greppen vor Slice:** `grep -rn "cast_community_poll_vote\|community_polls\|CommunityPollCard\|get_club_treasury_ledger" src/` — alle Konsumenten.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| # | File / Query | Zweck | Zu prüfen |
|---|--------------|-------|-----------|
| 1 | **LIVE** `pg_get_functiondef('cast_community_poll_vote')` | D87 Money-Wahrheit | ✅ gelesen: 70/30, FOR UPDATE auf poll+wallet, poll_earn-TX. Branch-Punkt = nach `v_creator_share`-Berechnung |
| 2 | **LIVE** `pg_get_functiondef('book_club_treasury')` | REIN-Helper-Signatur | Args `(club_id, direction, type, amount, ref, desc)`; macht es selbst `clubs FOR UPDATE` + balance_after? Idempotenz? |
| 3 | **LIVE** `pg_get_functiondef('get_club_balance')` + `get_club_treasury_ledger` | Saldo/Kontoauszug | ✅ get_club_balance gelesen (ledger_net = SUM credit−debit). get_club_treasury_ledger: filtert es nach type? (poll_revenue muss durchkommen) |
| 4 | **LIVE** `pg_get_constraintdef('club_treasury_ledger_type_check')` | additive CHECK-Erweiterung | ✅ enthält 'poll_reward' (debit-Altlast), NICHT 'poll_revenue' → addieren |
| 5 | `src/lib/services/votes.ts` `createVote` | Erstell-Pattern (Gratis-Club-Vote) | options→`{label,votes:0}`, `ends_at = now + durationDays`, activityLog-Pattern |
| 6 | `src/lib/services/communityPolls.ts` | Service-Heimat | bestehende Cast/Cancel-Pattern, Discriminated-Union-Guard-Stil |
| 7 | `src/components/admin/AdminVotesTab.tsx` | Club-Admin-Erstell-UI-Vorbild | Form-Struktur, club_admin-Context, wie clubId reinkommt |
| 8 | `src/components/community/CommunityPollCard.tsx` + `CommunityFeedTab.tsx` | Anzeige + Feed-Einstieg | wo „erstellen"-CTA hingehört, Modal-Pattern |
| 9 | `.claude/rules/errors-db.md` „transactions.type-CHECK-Drift" (330) + „Status-CHECK-Drift" (332) | CHECK-Falle | jeder neue Ledger-Typ braucht CHECK-Sync vor erstem Write |
| 10 | `.claude/rules/errors-db.md` „SECURITY DEFINER + auth.uid()-Guard" (005/J4) + „Money-RPC Idempotency-Blueprint" (178) | Money-RPC-Pflicht | auth-Guard NULL-safe, REVOKE/GRANT (AR-44), optional Idempotency-Key |
| 11 | `supabase/migrations/20260617150000_slice_331_events_treasury_escrow.sql` | Quellen-keyed-Routing-Vorbild | wie 331 auf `type='club'` keyt — analog `source='club'` |
| 12 | `club_admins`-Tabelle (via `get_club_balance`-Body: `EXISTS(SELECT 1 FROM club_admins WHERE club_id=.. AND user_id=..)`) | Identitäts-Lock | exakter club-admin-Check für source='club' |
| 13 | `user_follows` (follower_id, following_id) | Follower-Tor | `count(*) WHERE following_id = p_user_id >= 50` |

## 5. Pattern-References

- **D86** (`docs/knowledge/domain/polls.md`) — Polls = REIN, drei Spuren, Identitäts-Grenze §3. Quelle der Wahrheit.
- **D83 / Slice 329** (`treasury.md`) — `book_club_treasury` REIN-Helper, append-only Ledger (`direction='credit'`).
- **Slice 331** (`errors-db.md` „Escrow-bei-INSERT…" + Migration) — Quellen-keyed Geld-Routing (`type='club'` → analog `source='club'`).
- **Slice 330/332** (`errors-db.md` „transactions.type-CHECK-Drift" / „Status-CHECK-Drift") — neuer Ledger/Status/Type-Wert braucht CHECK-Sync VOR erstem Write, sonst 23514 latent.
- **errors-db.md** „SECURITY DEFINER + auth.uid()-Guard" (005/J4-Exploit) — anon-Revoke + cross-user-Reject, NULL-safe.
- **database.md** „Return-Shape: Discriminated Union" (168) — `{success:true,...}` / `{success:false,error}`; Service-Guard.
- **database.md** „Migration-Template-Pflichten" (AR-44) — `CREATE OR REPLACE` resettet Grants → REVOKE PUBLIC/anon + GRANT authenticated.
- **business.md** „Glücksspiel-Vokabel" + „Reinvestment-Anti-Pattern" — Wording: kein „gewinnen/Preis/Gewinner"; neutrale CTAs.
- **errors-frontend.md** „Missing i18n-Key bei neuer CTA" (198) + „Modal preventClose" (J2/J3) — DE+TR pflicht, `preventClose={isPending}`.

## 6. Acceptance Criteria

```
AC-01: [HAPPY-club] Club-Admin legt Vereins-Umfrage an (source='club', cost>0)
  VERIFY: create_community_poll(admin_uid, 'Frage?', '["A","B"]', 5000, 7, 'club', club_id)
  EXPECTED: {success:true, poll_id}; Row in community_polls mit source='club', club_id gesetzt, status='active', ends_at≈now+7d, options=[{label:'A',votes:0},...]
  FAIL IF: poll_id fehlt / source nicht persistiert / options ohne votes:0

AC-02: [SECURITY] Nicht-Admin kann KEINE Vereins-Umfrage anlegen
  VERIFY: create_community_poll(non_admin_uid, ..., 'club', club_id)
  EXPECTED: {success:false, error:'not_club_admin'} — kein Insert
  FAIL IF: Row entsteht / fremder club_id akzeptiert

AC-03: [SECURITY] auth.uid()-Mismatch rejected
  VERIFY: create_community_poll(other_uid, ...) als authenticated mit auth.uid()≠other_uid
  EXPECTED: EXCEPTION 'auth_uid_mismatch'
  FAIL IF: Insert erfolgt

AC-04: [HAPPY-user] User ≥50 Follower legt User-Umfrage an (source='user')
  VERIFY: user mit 50 user_follows.following_id-Rows → create_community_poll(uid,...,'user',NULL)
  EXPECTED: {success:true, poll_id}; source='user', club_id NULL
  FAIL IF: Insert blockiert trotz ≥50

AC-05: [GATE] User <50 Follower wird geblockt
  VERIFY: user mit 49 Followern → create_community_poll(...,'user',...)
  EXPECTED: {success:false, error:'follower_threshold'} (Schwelle 50)
  FAIL IF: Insert erfolgt

AC-06: [MONEY-club] Vote auf Vereins-Umfrage → 70% in Treasury, NICHT Wallet
  VERIFY: voter stimmt ab (cost 5000) → club_treasury_ledger neue Row direction='credit', type='poll_revenue', amount=3500; KEINE poll_earn-TX an Admin-Wallet
  EXPECTED: get_club_balance.available +3500; voter-Wallet −5000 (poll_vote_cost-TX); Admin-Wallet unverändert
  FAIL IF: poll_earn-TX an Admin / kein Ledger-Eintrag / platform_share-Drift

AC-07: [MONEY-user] Vote auf User-Umfrage → 70% in Creator-Wallet (unverändert)
  VERIFY: voter stimmt auf source='user'-Poll ab
  EXPECTED: Creator-Wallet +3500 (poll_earn-TX), kein Treasury-Eintrag
  FAIL IF: Treasury-Credit entsteht bei User-Poll

AC-08: [VALIDATION] Optionen/Kosten/Laufzeit-Grenzen
  VERIFY: 1 Option / 5 Optionen / leere Option / cost<0 / duration 0 / duration 60
  EXPECTED: jeweils {success:false, error:'invalid_options'|'invalid_cost'|'invalid_duration'}
  FAIL IF: ungültige Werte persistiert

AC-09: [MOBILE] CreatePollModal auf 393px (iPhone 16) sauber, Optionen add/remove tappbar
  VERIFY: Playwright bescout.net 393px, Modal öffnen, 2→4 Optionen, abschicken
  EXPECTED: kein Overflow, Touch-Targets ≥44px, preventClose während Pending
  FAIL IF: horizontaler Scroll / Buttons <44px

AC-10: [I18N-DE+TR] alle neuen Strings DE+TR, compliance-konform
  VERIFY: grep neue Keys gegen messages/de.json + tr.json
  EXPECTED: beide Locales vorhanden; kein „gewinnen/Preis/Gewinner"; neutral
  FAIL IF: defaultMessage-Fallback / kazan*/Preis-Vokabel

AC-11: [REGRESSION] bestehende Cast/Cancel + get_club_balance unverändert für Nicht-Poll-Pfade
  VERIFY: vitest communityPolls + treasury-Tests grün; get_club_balance ohne poll_revenue identisch
  EXPECTED: alle bestehenden grün
  FAIL IF: bestehende Treasury/Vote-Tests brechen
```

## 7. Edge Cases Table

| # | Flow | Case | Expected | Mitigation |
|---|------|------|----------|------------|
| 1 | create club | club_id NULL bei source='club' | `{success:false, error:'club_id_required'}` | Guard vor Insert |
| 2 | create club | caller admin von Club A, p_club_id=Club B | reject `not_club_admin` | EXISTS-Check auf (club_id,user_id) |
| 3 | create user | club_id gesetzt + source='user' | erlaubt (Tag), Geld→Wallet (source keyt) | source ist alleinige Routing-Achse |
| 4 | create | options=`['A','A']` (Duplikat) | erlaubt (keine Dedup-Pflicht) ODER reject? → erlauben, UI-Hint | minimal: nur leere/Anzahl prüfen |
| 5 | create | options 1 oder 5 | reject `invalid_options` (2–4) | CHECK in RPC |
| 6 | create | cost_bsd negativ / > Cap | reject `invalid_cost` (0 ≤ cost ≤ Cap) | Guard |
| 7 | vote club | book_club_treasury wirft (z.B. constraint) | ganze Vote-TX rollback (atomar) | alles in einer RPC-TX |
| 8 | vote club | cost=0 (kostenlose offizielle Umfrage) | kein Treasury-Eintrag, kein Wallet-Move, Vote zählt | bestehende `IF v_cost>0`-Guard |
| 9 | create user | user_follows-Count exakt 50 | erlaubt (>= 50) | `>= 50` nicht `> 50` |
| 10 | vote | self-vote auf eigene Umfrage | bestehender Guard `created_by=p_user_id` reject | unverändert |
| 11 | create | service_role (Cron) ruft | auth.uid() NULL → Guard skippt (NULL-safe) | `auth.uid() IS NOT NULL AND ... DISTINCT` |
| 12 | concurrent | 2× create-Click | je eigener poll (kein Idempotency nötig; harmlos) ODER optional p_idempotency_key | UI `preventClose`/`useSafeMutation` |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
CI=true npx vitest run src/lib/__tests__/community-polls-create.test.ts

grep -rn "createCommunityPoll\|CreatePollModal" src/   # Konsumenten verkabelt?
grep -rn "source" src/types/index.ts | grep -i poll     # Type erweitert?
```
Money-Path (MCP SQL gegen LIVE):
```sql
-- RPC-Body korrekt
SELECT pg_get_functiondef('public.create_community_poll(uuid,text,jsonb,bigint,integer,text,uuid,text)'::regprocedure);
SELECT pg_get_functiondef('public.cast_community_poll_vote(uuid,uuid,integer)'::regprocedure); -- Treasury-Branch da?
-- CHECK enthält poll_revenue
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='club_treasury_ledger_type_check';
-- Grants: anon revoked
SELECT proname, proacl FROM pg_proc WHERE proname='create_community_poll';
-- Force-Rollback-Smoke (club-vote): DO-Block, Vote setzen, Ledger prüfen, RAISE → rollback
```

## 9. Open-Questions

**Pflicht-Klärung (CEO/Anil — Money) — VOR Approval entscheiden:**
1. **Vote-Kosten-Cap:** `p_cost_bsd` Obergrenze. Vorschlag-Default: **0 ≤ cost ≤ 100.000 cents (= 0–1000 $SCOUT)**. Anil bestätigt/ändert. (Anti-Abuse gegen absurde Vote-Preise.)
2. **Laufzeit-Grenzen:** Vorschlag **1–30 Tage**. Bestätigen.
3. **User-Poll `club_id`-Tag in P1?** Vorschlag: erlauben (reiner Bezug, Geld bleibt Wallet) — `player_id`-Tag bleibt P2. OK?

**Bereits entschieden (Anil 2026-06-18):** volles P1 in einem Slice · Follower-Schwelle **50** · Routing keyt auf `source`.

**Autonom-Zone (CTO):** RPC-Interna, Modal-Component-Struktur, Test-Aufteilung, Naming, ob AdminPollsTab neu vs. in AdminVotesTab integriert.

**Nicht-Autonom:** Fee-Split (bleibt 30/70, SSOT business.md) · neuer Ledger-Typ-Name (`poll_revenue`) · Follower-Schwelle · TR-Wording (Anil-Review vor Commit).

## 10. Proof-Plan

| Artefakt | Inhalt |
|----------|--------|
| `worklog/proofs/333-vitest.txt` | RPC-Guard-Tests grün (auth, source-lock, follower-gate, treasury-vs-wallet-routing) |
| `worklog/proofs/333-treasury-routing.txt` | LIVE SQL: club-Vote → poll_revenue-Credit in Ledger + get_club_balance-Delta; user-Vote → Wallet (Vorher/Nachher) |
| `worklog/proofs/333-create-modal.png` | Playwright 393px: CreatePollModal beide Pfade (club + user-gated) |
| `worklog/proofs/333-grants.txt` | `pg_proc.proacl` zeigt anon revoked, authenticated granted |

## 11. Scope-Out

- **`player_id`-Bezug auf Polls** → P2 (Canon §8). Nur `club_id` in P1.
- **Discovery (Filter nach Verein/Spieler)** → P2.
- **Soziale Schicht** (Follower-Reichweite-Ausspielung, Abo-2×-Gewicht bei Paid-Polls, Fan-Rang-Auszahlung) → P3.
- **Auszahl-Idee an Teilnehmer** (Lotterie/„Recht behalten") → P4 (§7 offen).
- **Edit einer bestehenden Umfrage** → out (nur Create + bestehender Cancel). Kein Escrow-Resync nötig, da Polls REIN (kein Vorab-Escrow am Betrag — Geld fließt erst beim Vote).
- **Andere Event-/Bounty-Quellen** → separat (treasury.md §7).

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (PFLICHT: RPC+Schema+Service-Change) → BUILD (Wave-Plan) → REVIEW (reviewer-Agent, Money) → PROVE → LOG
```

**Wave-Plan:**
- **Wave 1 — Backend/Money (SELBST, §3 nicht delegieren):** Migration (source-Col + ledger-CHECK + create_community_poll + cast-Branch + get_club_balance). DB-Smoke + Force-Rollback.
- **Wave 2 — Service+Types (SELBST):** `createCommunityPoll` + `DbCommunityPoll.source` + Discriminated-Guard. vitest.
- **Wave 3 — Frontend (frontend-Agent möglich, aber Money-adjacent → eng reviewen):** CreatePollModal + Club-Admin-Einstieg + User-Feed-Einstieg + Follower-Tor-UI.
- **Wave 4 — i18n (SELBST, DE) + Anil-TR-Review.**

## 13. Pre-Mortem (L-Pflicht)

| # | Failure | P | Impact | Mitigation | Detection |
|---|---------|---|--------|------------|-----------|
| 1 | `poll_revenue` nicht im CHECK → erste Club-Vote 23514 | MED | hoch (Money latent) | CHECK-Sync IN derselben Migration VOR cast-Branch; Force-Rollback-Smoke ruft echten club-Vote | DB-Smoke wirft sofort |
| 2 | Routing keyt versehentlich auf `club_id` statt `source` → User-Poll mit club-Tag leitet Geld in fremde Treasury | MED | **kritisch** (Geld-Fehlleitung) | Branch strikt `IF v_poll.source='club'`; AC-03/06/07 testen genau das | AC-07 (user-Poll → kein Treasury) |
| 3 | Nicht-Admin legt source='club' an (Identitäts-Lock fehlt) | LOW | kritisch (gefälschte Vereins-Umfrage, Geld→fremde Treasury) | EXISTS club_admins-Check + p_club_id Pflicht; AC-02 | AC-02 Security-Test |
| 4 | `book_club_treasury` nicht idempotent / balance_after-Race bei Parallel-Votes | MED | mittel | Helper macht `clubs FOR UPDATE`+SUM (Slice 329 v2) verifizieren (Code-Reading #2); Vote-RPC hält poll FOR UPDATE | Saldo-Invariante: ledger_net == SUM(credit−debit) |
| 5 | i18n-Key fehlt in TR → TR-User sieht DE-defaultMessage | MED | mittel | AC-10 grep-Audit; Anil-TR-Review | grep-Audit beider Locales |
| 6 | Wording-Drift („gewinne Credits" o.ä.) → Compliance | LOW | hoch (SPK-Signal) | business.md Glücksspiel-Tabelle; neutrale CTAs („Abstimmen/Erstellen/Schließen") | Compliance-Check §unten |
| 7 | platform_share (30%) bleibt unverbucht (impliziter Burn) auch bei club-Poll — gewollt? | LOW | niedrig | bewusst: 30% = impliziter Burn (ADR-026 deflationär), nur 70% in Treasury — wie heute User-Poll | Doku im Migration-Header |

---

## Compliance-Check (Money-Path / Wording)

- $SCOUT-Wording: Vote-Kosten = „Kosten"/„CR", Creator-Anteil = neutral. Kein „Investment/Rendite". ✓
- Kein „IPO" user-facing (irrelevant hier). ✓
- Glücksspiel-Vokabel: **kein „gewinnen/Preis/Gewinner/Preispool"**. Umfrage-CTAs: „Umfrage erstellen", „Abstimmen", „Schließen". ✓
- Reinvestment-Anti-Pattern: kein „Aufstocken"-CTA post-Vote. ✓
- Asset-Klasse-Framing: n/a (Polls ≠ Trading). ✓
- Disclaimer: Polls sind keine Trading-Page; TradingDisclaimer n/a. Prüfen ob FantasyDisclaimer-Analogon nötig → vermutlich nein (Meinungs-Umfrage). Im BUILD bestätigen.

## TR-Wording-Vorab (Auswahl — vollständige Liste im BUILD, Anil-Review pflicht)

| Key | DE | TR (Vorschlag) | Konformität |
|-----|----|----|-------------|
| `community.createPollTitle` | „Umfrage erstellen" | „Anket oluştur" | ✓ neutral |
| `community.pollQuestionLabel` | „Frage" | „Soru" | ✓ |
| `community.pollCostLabel` | „Kosten pro Stimme" | „Oy başına ücret" | ✓ kein kazan/ödül |
| `community.pollDurationLabel` | „Laufzeit (Tage)" | „Süre (gün)" | ✓ |
| `community.officialClubPoll` | „Offiziell vom Verein" | „Kulüp resmi anketi" | ✓ |
| `community.followerGateHint` | „Ab 50 Followern kannst du bezahlte Umfragen erstellen" | „50 takipçiden itibaren ücretli anket oluşturabilirsin" | ✓ |

**Anil-Pflicht-Review** vor Beta-Verify markiert.

## Open Risiko (kurz, ehrlich)

Größtes Risiko = **Geld-Fehlleitung durch falsche Routing-Achse** (Pre-Mortem #2/#3): wenn die Treasury-Branch auf `club_id` statt `source` keyt, kann eine User-Umfrage mit Vereins-Tag fremdes Geld in eine Treasury schieben — oder ein Nicht-Admin eine „offizielle" Umfrage fälschen. Mitigation: `source` ist alleinige Routing-Achse, `source='club'` ist in der Create-RPC hart an `club_admins` gebunden; AC-02/06/07 + Force-Rollback-Smoke testen genau diese Trennung. Zweitgrößtes: CHECK-Drift (poll_revenue) → in derselben Migration vor dem ersten Write gelöst.

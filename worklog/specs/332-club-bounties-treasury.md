# Slice 332 — Club-Bounties ans Treasury (Reward-Escrow statt Minting)

**Slice-Type:** Migration (Money, CEO-Scope)
**Größe:** M (mirror Slice 331)
**Status:** SPEC (Anil-Approval ausstehend)
**Datum:** 2026-06-17

---

## 1. Problem-Statement (Evidence) — KORRIGIERT nach Live-PATCH-AUDIT 2026-06-17

**Korrektur:** Erste Annahme „Club-Bounty mintet" war FALSCH (basierte auf alter Migrations-Datei). **Live `approve_bounty_submission`** (functiondef geprüft) ist weiterentwickelt:
- Club-Bounty (`is_user_bounty=false`): bei Approval zahlt der **ADMIN aus seinem EIGENEN Wallet** (`p_admin_id`, ELSE-Branch: `balance -= reward` + `bounty_cost`-tx). Erfüller bekommt `creator_net = reward − 5% Plattformgebühr` (`bounty_reward`-tx). Bounty → **status='completed'**, andere pending Submissions auto-'rejected'. → **EIN Gewinner, EINE Auszahlung** (OQ2 geklärt), **kein Minting** — „Admin aus eigener Tasche".
- User-Bounty (`is_user_bounty=true`): Payer = creator, `balance -= reward` + `locked_balance` release. **Bleibt unangetastet.**

**Ziel (Anil A):** Club-Bounty-Reward aus der **Vereins-Treasury** statt Admin-Privattasche, **Escrow bei Erstellung** (Fans sehen garantiert gedeckten Bounty). Decision D86-Familie / `polls-engagement-monetization-model.md` §10.

**Status-Werte (live):** open → completed (approve) / cancelled (cancel_user_bounty, nur open) / closed (close_expired, nur open+überfällig). 5%-Plattformgebühr bleibt unverändert (keine Fee-Änderung).

## 2. Lösungs-Design (trigger-zentrisch, mirror Slice 331)

`is_user_bounty` ist der Quellen-Diskriminator (existiert schon). Ledger-Typ `bounty` (debit) ist in 329-CHECK vorgehalten. **Kein RPC-Edit nötig** — Trigger fangen alle Pfade.

**2.1 Schema:** `ALTER TABLE bounties ADD COLUMN treasury_escrowed boolean NOT NULL DEFAULT false` (Grandfathering wie events.prize_escrowed).

**2.2 BEFORE INSERT Trigger `trg_bounties_escrow_reward`** (nur Club-Bounty):
```
IF NEW.is_user_bounty IS NOT TRUE AND NEW.reward_cents > 0 AND NEW.club_id IS NOT NULL THEN
  -- SICHERHEIT (Identitätsgrenze): nur Club-Admin darf Treasury-finanzierten Club-Bounty anlegen
  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM club_admins WHERE club_id = NEW.club_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not_club_admin_for_bounty';
  END IF;
  PERFORM 1 FROM clubs WHERE id = NEW.club_id FOR UPDATE;            -- race-frei (330-Guard)
  v_available := (SUM credit − SUM debit) − offene Withdrawals;
  IF v_available < NEW.reward_cents THEN
    RAISE EXCEPTION 'treasury_insufficient_for_bounty: benoetigt %, verfuegbar %', NEW.reward_cents, v_available;
  END IF;
  PERFORM book_club_treasury(NEW.club_id, 'debit', 'bounty', NEW.reward_cents, NEW.id, 'Bounty-Escrow: '||NEW.title);
  NEW.treasury_escrowed := true;
END IF;
RETURN NEW;
```
- `auth.uid() IS NOT NULL`-Guard: lässt service_role/Seed durch, blockt Nicht-Admin-Clients (createBounty ist Client-`.insert()` → Gate Pflicht).
- `NEW.id` per Default gesetzt; defensiv `IF NEW.id IS NULL THEN gen_random_uuid()` (wie 331).

**2.3 BEFORE UPDATE OF status Trigger `trg_bounties_settle`** (terminaler Ausgang):
```
IF OLD.treasury_escrowed AND OLD.reward_cents > 0 AND NEW.club_id IS NOT NULL
   AND NEW.status IS DISTINCT FROM OLD.status THEN
  IF NEW.status IN ('cancelled','closed') THEN
    -- unbezahlter terminaler Ausgang → voller Refund (completed ist eigener Status, nicht closed)
    PERFORM book_club_treasury(NEW.club_id, 'credit', 'bounty', OLD.reward_cents, NEW.id, 'Bounty-Refund ('||NEW.status||'): '||NEW.title);
    NEW.treasury_escrowed := false;
  ELSIF NEW.status = 'completed' THEN
    -- bezahlt: Escrow via approve an Erfüller (95%) + 5% Plattformgebühr geliefert → kein Refund
    NEW.treasury_escrowed := false;
  END IF;
END IF;
RETURN NEW;
```
- Status-Trennung (live): `completed` = bezahlt (approve), `cancelled`/`closed` = unbezahlt. `close_expired_bounties` schließt nur `status='open'` → completed-Bounties nie betroffen. Saubere Trennung ohne „approved-submission"-Check.
- `cancel_user_bounty` / `close_expired_bounties` setzen `status` → Trigger fängt's OHNE RPC-Edit (mirror 331-settle).
- Grandfathered (treasury_escrowed=false) → Trigger ignoriert.

**2.5 EDIT `approve_bounty_submission` (PATCH-AUDIT, Live-Baseline):** Im Club-Bounty-Branch (`is_user_bounty=false`) den **Admin-Wallet-Abzug NUR bei `treasury_escrowed=false`** behalten (Grandfathered → Admin zahlt wie bisher). Bei `treasury_escrowed=true`: **KEIN Payer-Abzug** (Treasury hat bei Erstellung gezahlt) — nur Erfüller-Auszahlung (`creator_net` = reward−5%). Net escrowtes Club-Bounty: Treasury −reward (Creation) · Erfüller +95% (approve) · 5% Plattformgebühr (burn) → Escrow voll konsumiert, Settle-Trigger setzt flag off bei `completed`. 1:1 Erhalt: auth-Guard, club-admin-Check, User-Bounty-Branch, 5%-Fee, completed-Status, auto-reject-others, REVOKE/GRANT.

**2.4 src (minimal):** evtl. `createBounty`/`AdminBountiesTab` Treasury-Verfügbarkeit anzeigen + Fehler-i18n. errorMessages-Map: `treasury_insufficient_for_bounty` + `not_club_admin_for_bounty` → i18n-Keys. (UI-Vorabprüfung optional, harter Schutz = Trigger.)

## 3. Betroffene Files
| File | Änderung |
|------|----------|
| `supabase/migrations/2026061716xxxx_slice_332_club_bounties_treasury.sql` | NEU: Spalte + 2 Trigger |
| `src/lib/errorMessages.ts` | +2 ERROR_MAP-Einträge |
| `messages/de.json`, `tr.json` | +2 Fehler-Keys |
| `src/components/admin/AdminBountiesTab.tsx` (optional) | Treasury-Check/Anzeige |
| `src/lib/services/__tests__/bounties*.test.ts` | falls vorhanden — Smoke |

## 4. Code-Reading-Liste (Pflicht VOR BUILD)
1. **Live** `pg_get_functiondef` für `create_user_bounty`, `approve_bounty_submission`, `cancel_user_bounty`, `close_expired_bounties` — PATCH-AUDIT (Live=Baseline), bestätigen: approve zahlt immer Erfüller, Escrow-Release nur is_user_bounty; close prüft „no approved".
2. `bounties`-Schema: `is_user_bounty` default false, `status`-Werte (open/cancelled/closed/+?), `bounty_submissions.status`-Werte (approved). **CHECK auf status?** (gibt es 'cancelled'/'closed' im CHECK — sonst wie 331 'cancelled'-Falle).
3. `book_club_treasury` (329b) Signatur. **Gelesen.**
4. Migration 331 escrow/settle-Trigger als Vorlage. **Gelesen.**
5. `createBounty` (`bounties.ts`) direkter Insert — bestätigt, kein is_user_bounty gesetzt → default false. **Gelesen.**
6. `AdminBountiesTab` — wie createBounty aufgerufen (Admin-Kontext) + Fehler-Anzeige.
7. RLS auf `bounties` INSERT — wer darf inserten (ergänzt Trigger-Gate).
8. `errorMessages.ts` ERROR_MAP-Pattern (mirror 331 eventPrize-Eintrag). **Gelesen.**

## 5. Pattern-References
- **Slice 331** (events escrow/settle-Trigger) — direkte Vorlage.
- **Slice 330** Guard (clubs FOR UPDATE + ledger_net − withdrawals).
- **errors-db.md** „Escrow-bei-INSERT + Settle-bei-status deckt editierbare Felder NICHT ab" (331-Heal) — **PRÜFEN: ist `reward_cents` auf offenen Bounties editierbar?** Wenn ja → Resync-Trigger wie 331 (sonst Minting-Hintertür). Siehe OQ1.
- **database.md** D39 Trigger · AR-44 (Trigger-Funktion braucht kein REVOKE) · SECURITY DEFINER für book_club_treasury-Call.

## 6. Acceptance Criteria
| # | Kriterium | VERIFY (force-rollback) |
|---|-----------|--------|
| AC1 | Club-Bounty-Insert (admin) → Treasury-Debit + treasury_escrowed | debit=reward, avail−reward, flag=true |
| AC2 | Nicht-Admin-Insert eines Club-Bounty blockt | RAISE not_club_admin_for_bounty |
| AC3 | Unterdeckung blockt | RAISE treasury_insufficient_for_bounty |
| AC4 | User-Bounty unberührt | is_user_bounty=true → kein Treasury-Debit, kein flag |
| AC5 | cancel (open→cancelled) → voll zurück | credit=reward, flag=false |
| AC6 | expire (open→closed, kein approved) → voll zurück | credit=reward |
| AC7 | approved + closed → KEIN Refund (Escrow geliefert) | credit=0, Erfüller hat reward |
| AC8 | Grandfathered (flag=false) → kein Refund | credit=0 |
| AC9 | Grants/Trigger korrekt + tsc + vitest grün | pg + tsc + tests |
| AC10 | i18n DE+TR (2 Keys) | grep |

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| reward_cents=0 | kein Escrow, kein flag |
| club_id NULL | kein Club-Bounty-Escrow (kein Konto) — aber `bounties.club_id` ist NOT NULL → n.a. |
| approved dann cancelled? | status='open'→approve setzt Submission, Bounty bleibt open; cancel nur bei open → möglich. Settle: approved exists → kein Refund. Korrekt (Erfüller schon bezahlt). |
| Mehrere approved Submissions | approve zahlt je Submission reward → **Mehrfach-Auszahlung?** PRÜFEN (OQ2): zahlt approve mehrfach oder schließt es den Bounty? Escrow ist 1× reward → bei Mehrfach-Approval Unterdeckung. |
| reward editierbar auf offenem Bounty | OQ1 — Resync-Trigger nötig wie 331 |
| Doppel-Settle | flag→false nach Refund + status terminal |

## 8. Self-Verification (mirror 331)
force-rollback DO-Blocks: Insert(admin)→debit · Insert(non-admin)→RAISE · Unterdeckung→RAISE · cancel→credit · expire-no-approved→credit · approved+closed→no-credit · user-bounty→untouched · grandfathered→no-credit. Plus Saldo-Invariante (Σ bounty-debit − credit == Σ reward offener escrowter Bounties). tsc + vitest.

## 9. Open-Questions
- **OQ1 (CTO/Money):** Ist `reward_cents` auf offenen Club-Bounties editierbar (analog 331-Finding #1)? Wenn ja → Resync-Trigger BEFORE UPDATE OF reward_cents Pflicht. **Bei BUILD via Code-Reading #2/EDITABLE-Pfad klären.** Default: prüfen + ggf. Resync ergänzen.
- **OQ2 (Money):** Zahlt `approve_bounty_submission` pro Submission (mehrfach möglich)? Escrow deckt 1× reward. Wenn Mehrfach-Approval möglich → Guard/Modell klären (1 Gewinner pro Bounty?). **Bei BUILD via functiondef klären.**
- **OQ3 (CEO):** Bestätigung — Club-Bounty (is_user_bounty=false) = IMMER Treasury-finanziert (keine andere Quelle). Default ja.

## 10. Proof-Plan
`worklog/proofs/332-club-bounties-treasury.*`: force-rollback-Lebenszyklus (AC1-8) + functiondef-Struktur + Grants + i18n-grep + tsc/vitest.

## 11. Scope-Out
- User-Bounties (unangetastet).
- Bounty-Submission-Flow / Approval-Logik (nur Geld-Quelle ändert sich).
- Club-Paywall (Research, Entscheidung A).
- UI-Vorabprüfung (optional, harter Schutz = Trigger).

## 12. Stage-Chain
SPEC → IMPACT (Bounty-RPC-Pfade via functiondef, mirror 331-IMPACT) → BUILD Wave1 Migration + Wave2 src(i18n/errorMap) (selbst, Money) → REVIEW (reviewer Pflicht — besonders OQ1 Resync + OQ2 Mehrfach-Approval) → PROVE → LOG.

## 13. Pre-Mortem
1. **reward editierbar umgeht Escrow** (331-Finding-#1-Klasse) → OQ1, Resync-Trigger.
2. **Mehrfach-Approval übersteigt Escrow** → OQ2 klären.
3. **status-CHECK kennt 'cancelled'/'closed' nicht** (331-'cancelled'-Falle) → Code-Reading #2 prüfen; Settle nur auf real gültige Status.
4. **Nicht-Admin-Client-Insert** → auth.uid()-Admin-Gate im Trigger.
5. **Grandfathered Refund** → treasury_escrowed-Flag-Gate.
6. **approve_bounty_submission setzt Bounty-Status?** → falls es status→'closed'/'paid' setzt, feuert Settle-Trigger mit approved-exists → kein Refund (korrekt). Verifizieren.

---

*Anil-Approval erbeten. Mirror Slice 331 (bewährt). Nach Approval: BUILD selbst (Money §3), dann Reviewer.*

---
name: Journey 1 — CEO Approval Required
description: 4 Architektur-Entscheidungen aus Journey #1 Audit die CEO-Approval brauchen bevor Healer fixt. Status-Snapshot fuer Session-End-Report.
type: project
status: pending-approval
created: 2026-04-14
---

# Journey #1 — CEO-Approval Triggers (4 Items)

Aus Operation-Beta-Ready-Regel: "CTO autonom ausser bei 4 Triggern — Geld-Migrations, Compliance-Wording, Architektur-Lock-Ins, Externe Systeme."

Diese 4 Items aus Journey #1 triggern Approval:

---

## AR-1: Migration-Drift fuer 3 Live-RPCs (J1-02)

**Trigger:** Externe Systeme — Supabase DDL + Rollback-Sicherheit

**Beweis (Live-DB 2026-04-14):**
- `claim_welcome_bonus` existiert live, KEIN Migration-File in `supabase/migrations/`
- `record_login_streak` existiert live, KEIN Migration-File
- `get_auth_state` existiert live, KEIN Migration-File

**Risk:** Bei DB-Restore / Rollback / neuem Environment → RPCs fehlen, Onboarding komplett broken. Bei 50-Mann-Beta = first-login-Katastrophe.

**Option A (sicher, empfohlen):** `pg_get_functiondef()` dumpen, als `20260414152000_backfill_missing_rpcs.sql` einchecken. Kein Behaviour-Change, reine Drift-Dokumentation.

**Option B:** Ignorieren — "wird schon nicht passieren". NICHT empfohlen.

**Aufwand Option A:** ~20 Min.

**Meine Empfehlung:** APPROVE Option A.

---

## AR-2: Wallet-Init-Trigger auf profiles AFTER INSERT (J1-03)

**Trigger:** Geld-relevante DB-Migration

**Beweis (Live-DB):**
- `profiles` Triggers: `profiles_updated_at`, `trg_create_scout_scores`, `trg_init_user_tickets` — **kein Wallet-Trigger**
- `claim_welcome_bonus` erzeugt Wallet via UPSERT beim ersten Aufruf ✅
- **ABER:** User der Onboarding abbricht (Network-Fail, Close, Race) und NIE `/home` erreicht → `claim_welcome_bonus` nicht aufgerufen → KEINE Wallet-Row
- Spaetere Trading-Queries gegen diesen User: `SELECT balance INTO v FROM wallets WHERE user_id = p` → NOT FOUND → silent NULL

**Options:**

**Option A:** `AFTER INSERT ON profiles → INSERT wallets (user_id, balance=0, locked_balance=0)` Trigger.
- Pro: Idempotenz-Garantie, jeder Profile hat sofort Wallet
- Con: `claim_welcome_bonus` muss dann UPDATE statt UPSERT (bereits handled via v_wallet_exists-Branch)
- Aufwand: ~30 Min + Test

**Option B:** `record_login_streak` + alle Trading-RPCs haerten gegen NOT FOUND — implicit via NULL-Guard.
- Pro: keine Schema-Aenderung
- Con: muss in JEDEM RPC nachgezogen werden, fragil

**Option C:** Nichts — "claim_welcome_bonus reicht". Akzeptiere Abbruch-Edge-Case.

**Meine Empfehlung:** APPROVE Option A — sauberstes Pattern, entspricht existierendem `trg_init_user_tickets`.

---

## AR-3: bootstrap_new_user atomare Onboarding-RPC (J1-10)

**Trigger:** Architektur-Lock-In

**Problem:** `src/app/(auth)/onboarding/page.tsx:130-145` macht 9-Schritte-Chain ohne Transaction:
1. createProfile
2. followClubsBatch
3. applyClubReferral
4. uploadAvatar → updateProfile
5. refreshProfile
6. router.push('/')
7. claimWelcomeBonus
8. recordLoginStreak
9. useHomeData (11+ queries)

Partial-Failure zwischen Schritt 1-9 = "half-onboarded" User. Kein Retry, kein Rollback.

**Options:**

**Option A:** `bootstrap_new_user(p_handle, p_display_name, p_language, p_favorite_club_id, p_invited_by, p_club_referral)` RPC die in einer Transaction: profile INSERT + club_follow + referral-apply + welcome-bonus-claim. Client-Chain reduziert auf 1 RPC + Avatar-Upload.
- Pro: Atomar, resilient
- Con: Aufwand ~2 Std (RPC + Service + Tests + Error-Handling)

**Option B:** Status quo + H1 (applyClubReferral throw) fixen → reduziert Silent-Fail-Surface, aber keine Atomic-Garantie.

**Meine Empfehlung:** Option B jetzt (HIGH J1-11 fix), Option A post-Beta als Track.

---

## AR-4: TIER_RESTRICTED (TR) Geofencing auf Entry-Pages (J1-09)

**Trigger:** Compliance-Wording + Architektur

**Beweis:**
- `src/lib/geofencing.ts` vorhanden, `TR → restricted` (Trading verboten)
- `GeoGate` Component vorhanden, aber wird NUR auf `/fantasy` genutzt
- `/welcome`, `/(auth)/login`, `/(auth)/onboarding`, `/home` sind **ungated**
- TR-User sehen Trading-CTAs, Scout-Card-Kauf, `/market`-Links
- Pilot-Zielgruppe = Sakaryaspor-Fans = TR-User → die sehen Trading-Content der fuer sie rechtlich blockiert ist

**Dilemma:**
- Fuer Phase 1 (jetzt): TR-User DUERFEN NICHT Scout-Card-Trading machen (nur Content + Free Fantasy)
- ABER Pilot ist TR-Club → ohne TR-User keine Pilot-Basis

**Options:**

**Option A:** Harte Gates — TR-User sehen `/market`, `/home` ohne Trading-Sektionen, CTAs zu `/fantasy` statt `/market`. Content + Free-Fantasy-only.
- Pro: Compliant
- Con: Bricht Pilot-Nutzen stark ein

**Option B:** Welche Legal-Grundlage hat der TR-Pilot? (B2B-Vertrag mit Sakaryaspor? Special Permit?)
- Wenn ja → TR ist kein TIER_RESTRICTED mehr fuer Pilot
- Geofencing-Config anpassen (TR → 'free' oder 'full' abhaengig vom Vertrag)

**Option C:** Beta-Launch geoblocken auf DE/AT + Demo-Accounts ohne TR → TR-Pilot erst wenn Legal-Klarheit

**Meine Empfehlung:** **CEO-Decision noetig — Legal-Status TR klaeren.** Ohne klare Antwort kein Fix moeglich. Kritisch vor Beta.

---

## Zusammenfassung fuer CEO

| ID | Thema | Aufwand | Meine Empfehlung | Blockiert Beta? |
|----|-------|---------|-------------------|------------------|
| AR-1 | RPC-Migration-Drift | 20 Min | APPROVE Option A | Ja (Rollback-Risiko) |
| AR-2 | Wallet-Init-Trigger | 30 Min | APPROVE Option A | Ja (Edge-Case Abbruch) |
| AR-3 | Atomic bootstrap_new_user | 2 Std jetzt / post-Beta | Option B jetzt, A post-Beta | Nein |
| AR-4 | TR-Geofencing + Legal-Status | Legal-abhaengig | **CEO-Decision noetig** | **JA (Compliance)** |

AR-1 + AR-2 kann ich autonom nach Approval umsetzen (Migration + Test). AR-3 defer auf post-Beta. AR-4 braucht Legal-Klarheit.

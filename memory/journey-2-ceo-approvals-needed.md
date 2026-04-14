---
name: Journey 2 — CEO Approval Required
description: 6 Items aus Journey #2 Audit die CEO-Approval brauchen (Geld-Migration + Architektur-Lock-Ins + Compliance-Wording).
type: project
status: pending-approval
created: 2026-04-14
---

# Journey #2 — CEO-Approval Triggers (6 Items)

Aus Operation-Beta-Ready-Regel: 4 Approval-Trigger. Journey #2 hat 6 Items die einen oder mehrere Trigger beruehren.

---

## AR-5: Multi-League IPO-Launch-Strategie

**Trigger:** Architektur-Lock-In + Geld-relevant

**Beweis (Live-DB 2026-04-14):** 3.715 / 4.285 Spieler (87%) haben `dpc_total=0` und KEIN aktives IPO. Stichprobe 1000 Multi-League-Spieler: 1000/1000 ohne aktives IPO. 884 haben nicht mal einen einzigen `ipos`-Row.

**Risk:** User klickt BL/PL/Serie-A/LaLiga/SuperLig/BL2-Spieler → kein Kauf moeglich. Core-USP aus Multi-League-Expansion (Commit 8a5014d, 7 Ligen, 4.263 Spieler) vor 50-Mann-Beta nutzlos.

**Options:**
- **Option A (empfohlen):** Bulk-Auto-IPO-Launch-Script pre-Beta. `create_ipo` pro Player, price aus `market_value_eur/100 GREATEST 1000`, total_offered=300, duration=30d, start_immediately=true. Aufwand: ~3h (Script + DB-Test + Dry-Run + Execute).
- **Option B:** Beta auf TFF 1. Lig limitieren. Multi-League-Feature post-Beta. Verliert USP.
- **Option C:** Manueller Pro-Club-Launch durch Admin. Skaliert nicht fuer 134 Clubs.

**Meine Empfehlung:** APPROVE Option A, aber WARTE auf AR-6 (Zero-Price Guards) — Bulk-Script darf sonst gratis-Card-Vulnerability erzeugen.

---

## AR-6: Zero-Price Exploit Guards

**Trigger:** Geld-relevante Migration

**Beweis (Live-DB 2026-04-14):** 15 nicht-liquidierte Spieler mit `ipo_price=0` (alle Multi-League-Import). Bei Bulk-Auto-IPO (AR-5) ohne Null-Guard → IPOs mit price=0 → `buy_from_ipo` total_cost=0 → gratis Cards bis max_per_user=50 → Secondary-Sell @ floor_price = **Gratis-$SCOUT aus dem Nichts**.

**Options:**
- **Option A (empfohlen):** 3 defensive Layers:
  1. Bulk-Script: `WHERE ipo_price > 0` oder Price-Derivation-Fallback
  2. `create_ipo` RPC-Guard: `IF p_price < 1000 THEN RAISE 'ipo_price_too_low'`
  3. `buy_from_ipo` RPC-Guard: `IF v_ipo.price <= 0 THEN RAISE 'ipo_misconfigured'`
- **Option B:** Nur Bulk-Script Guard. RPC-Layer ungepatcht (kuenftige Mismatches moeglich).

**Meine Empfehlung:** APPROVE Option A (Defense-in-Depth). Aufwand: ~45 Min Migration + Backfill-Audit.

---

## AR-7: IPO-Vokabel-Regel in business.md

**Trigger:** Compliance-Wording

**Beweis:** `messages/tr.json` nutzt "IPO" roh in 20+ User-facing Keys (382, 1163, 1182, 1429, 2141, 2509, 2585, 2588, 2595, 2596, 2646, 2660, 3771, 3884, 3929, 4414, 4447, 4537, 4732). `messages/de.json` mischt "IPO-Kauf"/"IPO-Preis" mit "Erstverkauf"/"Club-Preis".

**Risk:** "IPO" = "Initial Public Offering" = regulated Securities-Terminologie. TR-Regulator (SPK/MASAK) koennte das als Compliance-Signal lesen. business.md erwaehnt "IPO" gar nicht — Ambiguitaet schafft Audit-Gap.

**Options:**
- **Option A (empfohlen):** business.md erweitern um "IPO-Begriffs-Regel": User-facing Strings → "Erstverkauf"/"Club-Verkauf"/"İlk Satış"/"Kulüp Satışı". Admin-Strings duerfen "IPO" behalten. Globaler Refactor DE+TR.
- **Option B:** "IPO" explizit erlaubt (mit Disclaimer-Text). Weniger Refactor.
- **Option C:** Legal-Review bei TR-Anwalt anfragen.

**Meine Empfehlung:** Option A + Legal-Confirmation bei Anil-Anwalt. Aufwand: ~2h i18n-Refactor + QA.

---

## AR-8: Migration-Drift 3 IPO-RPCs

**Trigger:** Externe Systeme + Geld-Logic-Source

**Beweis:** `buy_from_ipo`, `create_ipo`, `update_ipo_status` existieren live, KEIN Migration-File in `supabase/migrations/`. Einziger Treffer: `20260414150000_rpc_sanitize_dpc_descriptions.sql` (aendert Strings, kein CREATE). Lokal 63 Migrations, Remote 44.

**Risk:** IDENTISCH zu Journey #1 AR-1. Rollback/DR/neues Env = IPO-System broken. Geld-Logic ohne Code-Review-Kontrolle weil Quelle nicht im Repo.

**Zusatz-Value:** Ohne Body-Dump konnte Backend-Agent 5 Audit-Dimensionen NICHT pruefen (NULL-in-Scalar, UUID-Cast, FK-Reihenfolge, Atomic-Rollback, NULL-Guards). Body-Dump = Backend-Audit Round 2.

**Option A (empfohlen):** `pg_get_functiondef()` dump 3 RPCs → `20260414160000_backfill_ipo_rpcs.sql`. Kein Behavior-Change, reine Drift-Dokumentation. Aufwand: ~30 Min.

**Meine Empfehlung:** APPROVE Option A. Bundle mit AR-6 Guards-Migration.

---

## AR-9: IPO Fee-Transparenz

**Trigger:** Compliance-Wording

**Beweis:** `BuyConfirmModal.tsx:204` zeigt bei IPO-Kauf nur einzeilig "Kein Aufschlag — Festpreis vom Verein". Fee-Breakdown (10% Platform + 5% PBT + 85% Club) ist dem User NICHT sichtbar. Business-Agent M4.

**Regulatorisch:** OK (Fees werden intern vom Club getragen, User zahlt Festpreis). Transparenz: Unsichtbar → User versteht nicht dass Verein 85% bekommt (= wichtiges B2B2C-Selling-Point).

**Options:**
- **Option A:** Fee-Breakdown zeigen mit Hinweis "vom Verein getragen — du zahlst {total}". Verstaerkt Club-Value-Proposition.
- **Option B:** Status quo — "Kein Aufschlag" reicht.

**Meine Empfehlung:** Option A. Ist Marketing-Plus fuer Clubs die rekrutiert werden.

---

## AR-10: `players.ipo_price` vs `ipos.price` Source-of-Truth

**Trigger:** Architektur-Lock-In

**Beweis (Live-DB):** 452 / 570 aktive IPOs (79%) haben `players.ipo_price ≠ ipos.price`. Entweder Multi-Tranche-Pattern (Alt-Price in players, Neu-Price in ipos) oder Drift-Bug.

**Risk:** Falls UI `players.ipo_price` zum Display nutzt aber Server `ipos.price` debitiert → User sieht X, zahlt Y. Klassischer Trust-Bruch.

**Options:**
- **Option A:** `ipos.price` als Source-of-Truth. Alle UI-Reads auf `getIpoForPlayer()` umstellen. `players.ipo_price` wird Legacy-Snapshot (ggf. droppen post-Beta).
- **Option B:** `players.ipo_price` als Source-of-Truth. `ipos.price` wird Tranche-Preis (transparent fuer User).
- **Option C:** Legacy ignorieren bis post-Beta — Beta-Risk?

**Meine Empfehlung:** Option A — `ipos` ist das strukturell richtigere Modell (Multi-Tranche ready). Aufwand: ~1.5h grep + Refactor.

---

## Zusammenfassung fuer CEO

| ID | Thema | Aufwand | Blockiert Beta? |
|----|-------|---------|------------------|
| AR-5 | Multi-League IPO-Launch | 3h | **Ja** (87% Markt nicht tradebar) |
| AR-6 | Zero-Price Guards | 45 Min | **Ja** (Exploit-Risiko) |
| AR-7 | IPO-Vokabel + business.md | 2h | Ja (Compliance) |
| AR-8 | Migration-Drift Backfill | 30 Min | Ja (DR-Risiko, analog AR-1) |
| AR-9 | Fee-Transparenz | 30 Min | Nice-to-have |
| AR-10 | `players.ipo_price` Source | 1.5h | Ja (User-Trust) |

AR-6 + AR-8 kann ich autonom nach Approval umsetzen. AR-5 braucht CEO-Entscheidung (Full-Bulk vs limited Beta). AR-7 + AR-10 brauchen Business-/Architektur-Call. AR-9 schnell, braucht nur Zustimmung.

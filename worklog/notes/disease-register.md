# Krankheits- & Konsolidierungs-Schuld-Register (SSOT)

> **Erstellt 2026-06-28** aus dem erschöpfenden Multi-Agent-Audit (Run `wf_82fc04e4-733`, 61 Agents, ~7,6 Mio Token, alle Befunde adversarisch gegen Live-DB `skzjfhvgccaeplydsunz` + Live-Code verifiziert).
>
> **Zweck:** EINE findbare Quelle aller bekannten Duplikate / toten Flächen / Datenmodell-Schulden / Drift. Ersetzt die verstreute Listen-Akkretion (mock2pro-audit, 401-audit, s7-phase3-remaining, source-of-truth-registry) als Master-Index — diese bleiben als Detail-Belege, dieser hier ist der Stand.
> **Lese-Regel:** `ungetrackt` = Krankheit (alter Weg nie geschlossen/protokolliert). `bewusste-zwei` = gesund (wie D112 orders/offers — echte Architektur-Entscheidung, NICHT anfassen). `geheilt` = erledigt, als Beleg gelistet.
> **Status-Zählung:** 34 bestätigte NEUE Krankheiten + 32 bekannte/dokumentierte. 50 Roh-Befunde → 34 nach adversarischer Verifikation echt (16 als false-positive / bewusste-zwei verworfen — die Verifikation hat real gefiltert).

---

## 0. Maschinen-Baseline (`audit:dup`) — SSOT

> **Slice 434.** Dieser gefencte Block ist die **Maschinen-Wahrheit** für den Duplikations-Ratchet (`scripts/duplication-check.ts`). Die Prosa-Tabellen unten (§3) bleiben das **menschliche Narrativ** — der Block hier ist autoritativ für das Tool. Neuer Duplikations-Fund → hier eine Zeile (konsolidieren ODER bewusst-zwei). Ein ungetrackter Zwilling im Code, der hier fehlt = §0-Verstoß (das Tool meldet ihn).

```dup-registry
# Format je Zeile:  status | id | kind | symbols(comma) | note
# status: ungetrackt (heilen) | bewusste-zwei (erlaubt, wie D112) | geheilt (zurück = Regression)
# kind:   code (src/-Symbol, Regressions-grepbar) | db (DB-Objekt, Live-DB-Verify = v2) | concept (semantisch)
geheilt | S406 | db | treasury_balance_cents | Counter-Orphan → Ledger, DROP Slice 406
geheilt | S368f | db | initial_listing_price | gedroppt Slice 368f
geheilt | S421 | code | GameweekSelector | Orphan-Component entfernt Slice 421
bewusste-zwei | D-23 | code | formatScout, fmtScout | S467: Divergenz GEHEILT — fmtScout = EINE kanonische Formatierungs-Wahrheit (Credits, 2-Dez, CEO-Entscheid Anil 2026-06-30); formatScout = dünner cents-Adapter der an fmtScout(cents/100) delegiert (kein Logik-Duplikat mehr, eigener Job = cents→Credits-Einheitenwandlung). Beide Symbole bleiben bewusst (Adapter-Beziehung wie thin-alias/D112). NICHT das ursprünglich envisionte neue `formatBalance` — Delegation war der einfachere korrekte Zug.
ungetrackt | D-33 | code | timeAgo, formatTimeAgo | 2 Relativzeit-Formatter (utils.ts:35/47); timeAgo hartcodiert EN „just now/ago" (i18n-Leak) → 1 kanonischer (W5/Design). TOOL-FUND Slice 434.
ungetrackt | D-15 | concept | getMyAdPayouts, getMyPayouts | Ad-Payout-Subset-Twin (Dead-Feature-GC, W5)
bewusste-zwei | D-17 | db | scout_scores, user_stats | S454: Divergenz GEHEILT — user_stats-Scores = kept-fresh Projektion von scout_scores (Trigger trg_scout_scores_project_user_stats, 70->0 live). Beide Tabellen bleiben bewusst (user_stats hat eigene Aktivitaets-Stats; scout_scores = kanonische Geld-Quelle) = legitimer Denorm-mit-Trigger wie players-Aggregat. Path2-Spalten-Drop = CEO Anil 2026-06-29 VERWORFEN (Projektion behalten: drift-sicher seit S454, register-gesegnet; Voll-Drop = Risiko an Level/Rank/Notif fuer 0 Korrektheits-Gewinn). D-17 = final bewusste-zwei, kein offenes Residual.
geheilt | D-10 | concept | scoutMissions, missions | S458: totes 2. Mission-System gedroppt (scout_mission_definitions/user_scout_missions/claim+submit RPCs + Service+Hooks+i18n). Lebendes mission_definitions/user_missions unberührt; geteilter qk.missions.scout behalten.
bewusste-zwei | D112 | concept | orders, offers | echte 2 Produkte (Orderbuch Fork B) — NICHT anfassen
ungetrackt | D-01b | concept | cron_process_gameweek, admin_resync_gw_scores, sync_fixture_scores | 3x identischer player_gameweek_scores-INSERT; S453 heilte die 2 stale auf fixture-bound (419 heilte 1/3) - alle 3 noch dupliziert -> W2 Score-SSOT 1 Helper (auth-Kontext-Diff cron/admin/club_admin blockt naive Delegation)
```

---

## 1. Die 5 Wurzel-Ursachen (wenige Ursachen, viele Symptome)

| # | Wurzel | Kern |
|---|--------|------|
| **R1** | **MASTER: Kein Subtraktions-Schritt im Ritual.** | Die SHIP-Loop-DoD deckt BAUEN + VERKABELN ab, kennt aber KEINEN Pflicht-Schritt „alten Pfad schließen / Vorgänger entfernen / Entscheidung protokollieren". Append ist Default auf ALLEN Ebenen (Code, DB, Prozess). → jede ungetrackte Zwei wird *strukturell* erzeugt, nicht zufällig. **Erklärt den Löwenanteil.** |
| **R2** | **Retrofitteter Prozess über ungetracktem Fundament.** | 55 % aller Commits + 40 % aller 294 Migrationen entstanden VOR Slice-Tracking (14. Feb–15. Apr). SHIP-Loop kam nachträglich über eine 2 Monate alte Schichten-Basis. Fundament-Entscheidungen nie protokolliert → der „alte Weg" ist für spätere Slices unsichtbar → niemand kann ihn schließen. |
| **R3** | **Geschwindigkeit-vor-Konsolidierung unter Termin-Druck.** | April = 174 Migrationen (59 % aller) + 1132 Commits in EINEM Monat Richtung Beta. „Re-definieren" (neue RPC-Variante) wurde belohnt statt „in-place editieren + alten Pfad zurücknehmen". → divergente Zwillinge auf dem Money-Path (`score_event` 8×, `buy_player_sc` 7× neu definiert). |
| **R4** | **Keine SSOT/Canonical-Store-Durchsetzung.** | Jeder neue Bedarf gebiert eine NEUE Tabelle/Store/Formatter statt die kanonische Quelle zu erweitern. Mehrere parallele Wahrheiten werden toleriert statt erzwungen-eine. |
| **R5** | **Bauen-auf-Vorrat ohne Garbage-Collection bei Roadmap-Shift.** | Ganze Subsysteme komplett gebaut, nie verkabelt UND nie zurückgenommen, als Beta abgebrochen / Phase-2/3 gesperrt wurde. |

**Gesamt-Verdikt (Audit, wörtlich):** *„Strukturell gesund, schwer verkrustet — chronische Akkretions-Krankheit im mittleren Stadium, gerade erst in frühe Behandlung. D111-Selbstdiagnose ‚Fundament solide, kein Neubau' ist korrekt. ABER die Krankheit ist echt, systemisch, durchzieht DREI Schichten parallel (Code/Daten + DB-Security/Index/RLS + Prozess/Meta) — nicht 34 Einzelfälle, sondern 5 Wurzeln."*

---

## 2. 🔴 DIE KRÄNKSTE SCHICHT — DB-Security/Performance (war NIE auditiert, in dieser Session nachgeholt)

Die Synthese fand selbstkritisch: keiner der 34/32 Befunde hatte die **Supabase-Advisor-Linse** gelaufen. Nachgeholt → der **alarmierendste Einzelbefund des ganzen Programms**:

| Befund | Zahl | Schwere | Scope |
|--------|------|---------|-------|
| **`anon`-ausführbare SECURITY-DEFINER-RPCs** | **28** | 🔴 §3-Verletzung auf Geld-Plattform | **CEO/Security — selbst** |
| `authenticated` SECURITY-DEFINER-RPCs (Review nötig) | 190 | 🟠 | CEO/Security |
| `function_search_path_mutable` (Hijack-Vektor) | 87 | ✅ **SECDEF-non-trigger geheilt S468** (62→0, `ALTER SET search_path='public'` body-erhaltend, Risk-Scan leer; Money-Mint + db-invariants bewiesen). Rest = INVOKER (11) + Trigger (15) = niedriger (kein Escalation), offen. | Security |
| `rls_enabled_no_policy` (Tabelle RLS an, 0 Policies = alles dicht ODER Leak) | 9 | 🟠 | Security |
| `multiple_permissive_policies` (RLS-Akkretion: neue Policy angehängt, alte nie gemergt) | 81 | 🅿️ **GEPARKT (S471-Triage):** Mergen = Access-Control-Äquivalenz-Urteil pro Tabelle → kein blinder Batch, dedizierter Slice mit per-Tabelle-Analyse. | DB |
| `auth_rls_initplan` (RLS-Perf) | 71 | 🅿️ **GEPARKT (S471-Triage):** Transform (`auth.uid()`→`(select auth.uid())`) provably-äquivalent (Round-Trip 0 Fails), ABER Scope-Ambiguität (Advisor 71 = top-level vs 155 inkl. Subquery-internal) + 71-155 access-control-Policies = große security-kritische Fläche → dedizierter Slice mit Advisor-exakter Liste + Access-Spot-Check, NICHT autonom-blind (§1 caution). Höchster Perf-Wert. | DB |
| `unindexed_foreign_keys` | ~~51~~ 49 | ✅ **geheilt S470** (49 advisor-autoritative FKs → Covering-Index additiv; 49/49 verifiziert; 49→0). | DB |
| `unused_index` (nie entfernt = Index-Akkretion) | 21 | 🅿️ **GEPARKT (S471-Triage):** `idx_scan=0`-Signal in Low-Traffic-Pilot-DB **unzuverlässig** (Feature-nicht-exerziert ≠ nutzlos) → kein DROP jetzt, revisit post-Traffic. | DB |
| Storage: `avatars` / `public_bucket_allows_listing` | — | 🟡 | Security |
| Leaked-password-protection | off | 🟡 | Security (1 Toggle) |

→ **Die Akkretion reicht bis in die RLS- und Index-Schicht.** Das ist eine eigene Heilungs-Welle (Money/Security = mein Scope, §3).

### 🔎 Welle-1 Triage-Ergebnis (2026-06-28, read-only Live-DB `skzjfhvgccaeplydsunz` verifiziert)
**ENTWARNUNG beim Schlimmsten:** Von den 28 anon-SECDEF ist **KEINE anon-aufrufbare Geld-Mutation** dabei. Alle 5 „touches_money"-Treffer sind **Trigger-Funktionen** (`RETURNS trigger`) — ein Client kann sie NICHT direkt via API aufrufen (sie feuern nur tabellengebunden, als Owner). Ebenso **kein katastrophaler PII-Dump**: die exponierten User-Felder sind großteils öffentliche Profil-/Leaderboard-Daten (handle/display_name/avatar), die die App ohnehin zeigt.

**3 echte, kleine Items (alle §3 → warten auf Anil-Approval):**
1. ~~**D-12 `get_club_dashboard_stats(text)` → DROP.**~~ ✅ **geheilt S461** (live DROP). **Teil-Schluss:** entfernte den toten v1-Pfad + by-name-Enumeration; die anon-Per-User-PII-Exposure besteht via `get_club_dashboard_stats_v2(uuid)` (identische Shape) fort → **D-35** (anon-Grant-Entscheid, W0-Hygiene). „Exposure + Duplikat in EINEM Schnitt" war zu optimistisch — nur Duplikat + Enumeration geschlossen.
2. ✅ **geheilt S466** — `get_security_definer_user_param_audit()` + `get_rls_policy_matrix()` REVOKE anon+authenticated (admin-only; service_role behält → db-invariants-Test unberührt, 0 App-Caller). Recon-Leak (Security-Landkarte) geschlossen.
3. **Hygiene-Batch (§3-Prinzip): REVOKE anon von 9 Triggern + ~10 Pure-Kalkulatoren** (fn_get_elo_*, fn_get_rang_*, fn_get_streak_*, scout_events_enabled, is_club_admin, get_current_liga_season). Trigger brauchen kein EXECUTE-Grant zum Feuern → REVOKE = null Impact. Kalkulatoren: anon raus, `authenticated` behalten.

**⚠️ VOR REVOKE prüfen (nicht blind):** Rufen öffentliche Club-Seiten (ausgeloggte Besucher = `anon`) `get_club_dashboard_stats_v2` / `get_club_top_scouts` / `get_monthly_liga_winners` auf? Wenn ja = anon gewollt (öffentliche Leaderboards) → behalten. Wenn nur eingeloggt → anon raus. **Read-only Triage abgeschlossen; kein Code/Grant geändert.**

---

## 3. Register — bestätigte NEUE Krankheiten (34)

Legende Scope: **CTO** = autonom heilbar · **Money/CEO** = §3, selbst + CEO-Approval · **Sec/CEO** = Security §3.

### 🔴 HIGH-Severity (zuerst)
| ID | Befund | Klasse | Aufw. | Scope | Status |
|----|--------|--------|-------|-------|--------|
| D-01 | **D113 NICHT restlos geheilt:** `cron_process_gameweek` (Step 4, jeder Sync) + `admin_resync_gw_scores` schreiben weiter alte Shape `ON CONFLICT(player_id,gameweek)` auf die von 419 GEDROPPTE UNIQUE → **`42P10` beim ersten echten Spieltag.** Maskiert durch Off-Season. | datenmodell | S | Money/CEO | ✅ **geheilt S453** (live applied; beide auf fixture-bound gespiegelt; Writer-Enum bewies Completeness; Rest-Dup→§0-Registry D-01b) |
| D-02 | **Bench-Karten umgehen `holding_locks` komplett** — `rpc_save_lineup` lockt nur 12 Starter, Bank nie → 1 Karte als Bench in N gleichzeitigen Events, punktet überall via Auto-Sub (echtes Wallet-Credit). | datenmodell | M | Money/CEO | ✅ **geheilt S455** (CEO Anil approved; 2 additive Blöcke = Bench cross-event-Verfügbarkeit + Bench-Lock-INSERT, Starter byte-treu; force-rollback + post-apply functiondef-Counts bewiesen; Reviewer CONCERNS-ohne-Blocker; FE-Toast `insufficient_sc_bench` gefixt. Concurrency-Residual → D-02b) |
| D-03 | **Client-only/CSR-Architektur** — 0 Server-Prefetch/Hydration, 404 `use client`, Auth blockt kritischen Render-Pfad (5-13s Skeleton). | architektur | XL | CEO | 🟠 offen (bekannt #3) |
| D-04 | **`lineups` ohne DB-UNIQUE gegen Doppel-Spieler** — Integrität lebt 100 % im 25k-Zeichen-RPC; `bench_*` haben NICHT MAL einen FK. | architektur/datenmodell | L | CEO | 🟠 offen (D111) |

### 🟠 Money-Path (selbst, §3)
| ID | Befund | Klasse | Aufw. | Status |
|----|--------|--------|-------|--------|
| D-05 | **`credit_pbt()` vs inline `pbt_treasury`-INSERT** — Migration `20260331_pbt_rpc_consistency.sql` sagte wörtlich „unifies both", konvergierte aber nur `buy_player_sc`/`buy_from_order`; `accept_offer` + `buy_from_ipo` blieben inline → PBT-Buchung in 3 Formen, Forward-Drift-Vektor. | ungetr.-dup | S | 🟠 offen |
| D-06 | **`accept_offer` = ungetrackter 3. Trade-Pfad** mit Guards, die von den S413-geheilten Zwillingen divergieren. | ungetr.-dup | S | 🟡 **verifiziert 2026-06-30 (Live-Body D87): MONEY-KORREKT, kein aktiver Bug → P2.** Alle kritischen Guards da: `is_liquidated` ✓, Club-Admin-Block ✓, Self-Offer ✓, **Escrow korrekt (S409, buy-side konsumiert locked, kein Doppel-Charge)** ✓, **Fee-Split 6% (offer 350/150/100)** ✓, fee_config `created_at DESC` ✓ (S413-konform), 20/24h + circular-Block ✓, Offer-Status-Check=Idempotenz ✓. **Divergenzen alle P2 (struktureller Smell):** (1) Rate-Limit hart-20/24h-per-player statt tier (200/50/30) wie Twins = Konsistenz; (2) `price_change_24h` nicht gesetzt = **moot** (live 0 für alle 4556 Spieler, intraday-Metrik täglich genullt); (3) PBT inline statt `credit_pbt()` = D-05 Forward-Drift (aktuell korrekt). Konsolidierung = W-Money-Unifikation wenn überhaupt, nicht P0/P1. |
| D-07 | **2-arg `deduct_wallet_balance`/`refund_wallet_balance`** (4 Overloads) — schreiben KEIN `transactions`-Ledger (Audit-Trail-Bypass), 0 Caller, supersedet von 5-arg, nie gedroppt. Latenter Overload-Footgun. | ungetr.-dup | XS | 🟡 **verifiziert 2026-06-30 P2-latent:** beide 2-arg `writes_ledger=false` bestätigt; **0 Caller** (pg_proc-Scan leer + src-grep leer — sogar die 5-arg-Varianten 0 Caller, Money-RPCs inlinen wallet-UPDATE) + nicht an authenticated/anon granted. = latent (kein aktiver Bypass) → **P2**, nicht jetzt-dringend. DROP der 2-arg = §0-sauber wenn Money-GC-Slice kommt (dann auch 5-arg-Dead-Family prüfen). |
| D-08 | **`getSystemStats` `.limit(5000)`** — `totalBsdCirculation` (wallets-SUM) unterzählt still ab >1000 Usern (heute 128); korrekter RPC-Zwilling `get_treasury_stats` existiert, alter Pfad nie konsolidiert. | money-risiko | S | 🟠 offen |
| D-09 | `getTreasuryStats`-Fallback `.limit(5000)` über trades (Fee-Summen) — gleiche Cap-Klasse, nur im RPC-Ausfall-Branch. | konsist. | S | 🟡 offen |
| D-02b | **TOCTOU cross-event Concurrency-Race in `rpc_save_lineup`** — Verfügbarkeits-Check (Starter UND Bench) liest `holdings` per plain SELECT ohne `FOR UPDATE` → 2 gleichzeitige Saves desselben Users auf verschiedene Events mit derselben Karte sehen beide `available` → beide locken (verschiedene PK). **Vererbt** vom Starter-Pfad; S455 macht es nicht schlimmer (schließt den sequentiellen Bench-Reuse). Fix = `FOR UPDATE` auf die committeten holdings-Rows, deckt Starter+Bench gemeinsam. | concurrency | S | ✅ **geheilt S456** (upfront ordered `FOR UPDATE` auf alle beteiligten holdings-Rows vor den Verfügbarkeits-Checks; single-writer-Rendezvous; deadlock-frei via `ORDER BY player_id` + UNIQUE-Index; force-rollback + post-apply bewiesen; Reviewer PASS „a senior would merge this") |

### 🟠 Tote Flächen — Dead-Feature-GC (entscheiden + entfernen)
| ID | Befund | Klasse | Aufw. | Scope | Status |
|----|--------|--------|-------|-------|--------|
| D-10 | **Komplettes 2. Mission-System (Scout Missions):** `scoutMissions.ts` + 2 Hooks + 2 SECDEF-RPCs + 5-Row-Tabelle, **0 Render, in KEINEM Tracker.** Lehrbuch-„unbewusste Zwei" neben lebendem `missions.ts` (4372 Rows). | tote-fläche | S | Sec/CEO (DROP) | ✅ **geheilt S458** (live DROP 2 RPCs+2 Tabellen + Service/Hooks/Re-Export/i18n-Cleanup; lebendes mission_definitions/user_missions unberührt; geteilter qk.missions.scout behalten; Reviewer CONCERNS→i18n nachgezogen) |
| D-11 | **`bescout_scores` + `award_score_points` + `score_events`** = totes 3./4./5. Scoring-Modell (0 Rows, 0 Caller), in `reward-ranking.md` („3 Welten") nie erfasst. | tote-fläche | S | Sec/CEO | ✅ **geheilt S457** (live DROP, Migration `20260629190000`; Caller-Enum + repo-Grep + force-rollback-Smoke bewiesen 0 echte Reader/Writer; Doc/Test-Scrub komplett; Reviewer CONCERNS-nur-Bookkeeping → hier abgehakt) |
| D-12 | **`get_club_dashboard_stats` v1 (by name)** — tot, aber `SECURITY DEFINER` + an `anon` granted + liefert Per-User-PII unter RLS-Umgehung. v2 (by UUID) ist der Live-Pfad. | tote-fläche | XS | **Sec/CEO** | ✅ **geheilt S461** (live DROP `get_club_dashboard_stats(text)`; 3-Wege-Caller-Enum 0 + pg_depend 0; force-rollback v1 1→0/v2-Survivor; entfernt toten v1-Pfad + by-name-Enumeration + anon-SECDEF-Surface −1. **ACHTUNG: schließt NICHT die Kern-PII-Exposure** — v2 (anon-granted) liefert identische Shape inkl. user_id/holdings_count → D-35) |
| D-35 | **`get_club_dashboard_stats_v2(uuid)` anon-granted gibt Per-User-PII (`user_id`/`holdings_count`/`total_score`) + Club-IPO-Umsatz an ausgeloggte Besucher** (identische Shape wie das in S461 gedroppte v1, RPC-Shape-Audit `proofs/007:132-133`). Carry-forward aus D-12. | security/exposure | XS | **Sec/CEO** | ✅ **geheilt S462** (CEO Anil „Komplett": Guard `club_admin(p_club_id) OR platform_admin` byte-treu aus kanonischer Familie `get_club_balance` + `REVOKE anon`; Recon wählte `platform_admins`-Quelle statt dem dead `top_role`-Branch der Stats-Siblings → echte Platform-Admins bleiben berechtigt. pre+post-apply 3-Rollen-force-rollback bewiesen. Reviewer PASS) |
| D-36 | **`rpc_get_club_trading_fees` + `rpc_get_club_fan_stats` nutzen den dead `profiles.top_role='Admin'`-Branch** (0 Match) für ihren Platform-Admin-Override (Sekundär-Branch, club_admins funktionierte). Seit S462 sichtbar inkonsistent (v2 erlaubt Platform-Admin, Sibling RAISEt). | konsist./security | XS | **Sec/CEO** | ✅ **geheilt S463** (beide auf kanonische `platform_admins`-Quelle, je 1 Guard-Zeile, Body byte-treu; 3-Rollen-force-rollback bewies reparierten Platform-Admin-Branch; `remaining_toprole_in_family=0`. Reviewer CONCERNS betraf NICHT die Slice, sondern den Scope-Out → D-37) |
| D-37 | **3 RPCs nutzen `top_role='Admin'` als ALLEINIGES Gate (SOLE-gate, kein club_admins-Fallback) → bei 0-Match-Prämisse komplett TOT/unzugänglich für alle Client-Caller** (Reviewer S463 per Migrations-Read verifiziert): **`grant_founding_pass`** (`20260614170000:33`, **MONEY** — Founding-Pass + Kill-Switch) · **`admin_grant_wildcards`** (`20260428120500:321`, **MINTING**) · **`cancel_event_entries`** (`20260321:451`, Admin-Op). Anders als D-36 (Sekundär-Branch) = potenzieller Total-Lockout, nicht nur Override-Verlust. | security/datenmodell | S | **Money/Sec/CEO** | ✅ **geheilt S464** (die 3: `grant_founding_pass`/`admin_grant_wildcards`/`cancel_event_entries` von totem `top_role='Admin'` auf `platform_admins` umgestellt; Money-Bodies byte-true; 3-Rollen-force-rollback + voller Founding-Pass-Mint rolled back + INV-31 grün + tier-invariant grün; Reviewer PASS „permissive-only, Kill-Switch intakt"). **🟡 RESIDUAL → D-37b/465:** post-464-Audit fand 2 weitere `top_role='Admin'`-RPCs: **`get_sponsor_stats_summary`** (SOLE-gate, read-only, tot) + **`set_club_fan_rank_thresholds`** (Sekundär-Branch, club_admins funktioniert, Platform-Override tot). Familie erst dann komplett. |
| D-37b | **`get_sponsor_stats_summary`** (SOLE-gate `top_role='Admin'`, read-only Sponsor-Stats, tot, +vestigial anon-granted) + **`set_club_fan_rank_thresholds`** (Sekundär-Branch). Rest der `top_role='Admin'`-Dead-Source-Familie nach S464. | konsist./security | XS | **Sec/CEO** | ✅ **geheilt S465** (beide auf `platform_admins` + get_sponsor REVOKE anon; `family_remaining=0` = top_role='Admin'-Familie restlos eliminiert über D-36/37/37b [7 RPCs]; Recompute-Loop Happy-Path empirisch bewiesen recalculated=37; club_admins-Branch unverändert; Reviewer PASS). |
| D-38 | **`src/lib/queries/sponsorStats.ts:14-17` Silent-Fail** — `if (error) { console.error(); return []; }` → React-Query cached `[]` als SUCCESS (common-errors §1 Service-Error-Swallowing). Beim 465-Consumer-Check (Reviewer) aufgefallen, pre-existing. | konsist./silent-fail | XS | CTO | ✅ **geheilt S469** (`throw new Error(error.message)`; beide Consumer guarden `?? []` → kein Crash, nur kein Silent-Cache; tsc 0). |
| D-13 | **`season_reset_scores`** — verwaiste Reset-RPC (0 Caller, kein Cron). `soft_reset_season` IST verkabelt (AdminLigaTab). | ungetr.-dup | XS | Sec/CEO | ✅ **geheilt S458** (live DROP; 4-Wege-Caller-Check pg_proc+pg_cron+src+ACL alle negativ; lebender soft_reset_season unberührt) |
| D-14 | **Ad-Revenue-Share-Kette tot:** `logSponsorImpression` 0 Caller → `sponsor_impressions` nie befüllt → `calculate_ad_revenue_share` liest Geister-Tabelle; Admin-Button = stille No-Op. Live-Pfad schreibt `sponsor_stats` (ohne author-context). | ungetr.-dup | S | Money/CEO | 🟠 offen (bekannt 7.5) |
| D-15 | `getMyAdPayouts` orphan (0 Consumer, strikte Teilmenge des verdrahteten `getMyPayouts`). | tote-fläche | XS | Money/CEO | 🟡 offen |
| D-16 | **Creator-Fund dormant** + `beratervertrag_*` (5 Config-Keys, 4 tot) + **`subscribe_to_scout`** (SECDEF, liest `beratervertrag_platform_fee_pct`, 0 Caller, keine UI). | tote-fläche | S | Money/CEO | 🟠 offen |
| D-34 | **`refund_wildcards_on_leave`** = toter, **nicht-idempotenter** SECDEF-Orphan (0 Caller src/+supabase/+scripts/+pg_proc; `balance += wildcard_slots` je Call, kein Dedup). Slice 460 hat ihn **grant-dicht** gemacht (REVOKE authenticated/anon → INV-31 grün), aber der gefährliche Body bleibt: bei künftiger Verdrahtung als **service_role** Leave-Handler (Name legt es nahe) ist der innere `earn_wildcards`-Guard (`auth.uid() IS NOT NULL`) im service_role-Kontext (uid=NULL) **wirkungslos** → Double-/Self-Mint re-armed, dann ganz ohne Guard. **Root-Cause INV-31:** Slice 251 (`20260428120500`) ließ beim Per-Liga-Rewrite den AR-27-Guard für genau diese RPC still fallen (S156-Silent-Revert; 4/5 Geschwister behielten ihn). | tote-fläche/latent-re-arm | XS | Sec/CEO | 🟡 offen (REVOKE schließt Leck jetzt; **bei Verdrahtung Dedup `(user_id,event_id)` ODER DROP** — getrackt statt ungetrackt, §0) |

### 🟡 Datenmodell-SSOT (CEO-Konsolidierung)
| ID | Befund | Klasse | Aufw. | Status |
|----|--------|--------|-------|--------|
| D-17 | **`scout_scores` ↔ `user_stats` Dual-Write divergent** — gleicher Trigger schreibt beide mit verschiedenen Formeln; live divergent für ALLE 70 Overlap-User (z.B. manager 778 vs 418). Beide live gerendert (/rankings vs /community). | datenmodell | L | ✅ **geheilt S454** (CEO Anil „A": user_stats-Scores = kept-fresh Projektion von scout_scores via Trigger; Divergenz 70→0 live; Money-Anker 0 Edits; Reviewer-Level-Notif-Kaskade geguarded. Residual: Path-2 Spalten-Drop + D-11) |
| D-18 | **`events`-Tabelle (40 Spalten):** `entry_fee` seit 3 Monaten „DEPRECATED", aber `create_user_event` (2 Tage alt!) schreibt es weiter dual; `prize_pool` vs `reward_structure` alt/neu koexistent. | datenmodell | L | 🟡 offen |
| D-19 | **`players` (49 Spalten):** denormalisierte Aggregate (matches/goals/...) ~~driften live 22 %~~. | datenmodell | M | 🟢 **FAKTEN-KORREKTUR 2026-06-30 (live verifiziert, kein Bug):** die „22% Drift" gilt NUR für `matches` (880/3963) — und ist **monoton `players.matches` > COUNT(fps)** (880 higher, **0 lower**, max 30 vs 27) = `players.matches` ist die **offizielle Saison-Spielzahl (api-football)**, legitim ≥ unseren partiell-importierten Fixtures, **KEINE falsche Wahrheit**. goals/assists driften nur ~1,4% (54/51). PerformanceTab liest `player.stats.matches` (offizielle Saison, korrekt). → **NICHT P0/P1, kein Integritäts-Bug.** Höchstens P2-UX-Klarheit (Saison-Zahl neben Fixture-Liste). Stale-Audit-Befund (Register-„falsch" war Mess-Artefakt offizielle-Saison-vs-Fixture-Count). |
| D-20 | **`lineups` (33 Spalten) Wide-Column** — `slot_att3` + alle 4 `bench_*` = 0 Rows live → Bench/Auto-Sub-Feature (195d) **in Prod nie befüllt = tot**. Orphan-Typ `Lineup` (types/index.ts:292) neben `DbLineup`. | datenmodell | L | 🟢 **BEHALTEN** (CEO Anil 2026-06-29: Bench/Auto-Sub bleibt aktives Produkt-Feature; D-02 gehärtet S455 + D-02b S456). Rest-Hygiene (`slot_att3`-Nutzung + Orphan-Typ `Lineup`) bleibt offen, kein Feature-Rückbau. |
| D-21 | **Externe-ID doppelt modelliert:** `player_external_ids` (9663) vs inline `players.api_football_id`; `players.fixture_api_football_id` TOT mit 2 bereits falschen Rows; `clubs.api_football_id` vs `club_external_ids` ohne Sync-Trigger; `leagues` ohne external-Tabelle (Pattern nie fertig). 185 Spieler im Scoring-Pfad via pei unsichtbar. | datenmodell | M | 🟡 offen |
| D-22 | `clubs.active_gameweek` + `leagues.active_gameweek` (zwei Spalten, ein Konzept) — clubs frozen+unread, **428b DROP post-Deploy offen**. | datenmodell | XS | 🟡 offen (D115) |

### 🟡 Konsistenz-Drift (großteils CTO-autonom)
| ID | Befund | Klasse | Aufw. | Scope | Status |
|----|--------|--------|-------|-------|--------|
| D-23 | **2 Geld-Formatter:** `formatScout` (0 Nachkomma) vs `fmtScout` (2 Nachkomma) — für **45 % der Wallets divergent**, SideNav vs TopBar zeigen verschiedene Zahlen auf DEMSELBEN Screen. | konsist. | S | CTO | ✅ **geheilt S467** (CEO-Format-Entscheid Anil: 2 Dez; `formatScout` delegiert an kanonischen `fmtScout` → EINE Formatierungs-Wahrheit, 2-Dez konsistent, fractional-Saldo exakt statt gerundet; ~60 Caller geprüft kein 100×-Bug; Reviewer Code-PASS. **🟡 AC-05 Visual SideNav==TopBar = post-Deploy bescout.net offen**). |
| D-24 | **Wording-Leak:** „Deine Position"/„Pozisyonun" + Aktenkoffer-Icon + Ø-Kosten + P&L in `SellModal`/`YourPosition` = Aktiendepot-Vokabular, das business.md Slice 224 VERBIETET. Predates die Regel, Guard nie verkabelt. | konsist. | S | **Compliance/CEO** +TR | 🟠 offen |
| D-25 | **Login: 4 von 5 Auth-Fehler-Pfaden untranslatiert** (`setError(authError.message)` = rohes GoTrue-Englisch an DE+TR). Zentrale `mapErrorToKey` existiert, im Login nicht importiert. Auch `onboarding`. | konsist. | S | CTO+TR | 🟠 offen |
| D-26 | **`players.club` Freitext stale (live verifiziert 6,57 % = 294/4472 falsch)** — Fantasy-Domain auf `clubId` migriert (422-425), Player-Domain (`PlayerHero`/`index`/`ClubVerkaufSection`) las weiter Freitext → falscher Club+Logo. | konsist. | S | CTO (Teil-Heal) | ✅ **Player-Domäne geheilt S477** (SSOT-Schnitt im `dbToPlayer`-Mapper, players.ts:211 `club: db.club_id ? getClub(db.club_id)?.name ?? db.club : db.club` — parallel zur FK-Liga; cascaded zu Player-Detail/Markt/Suche/Club/Admin; Reviewer PASS, tsc 0 + vitest 235 inkl. 3 AC-Tests; **kein Backfill** S303-konform). **→ D-26b offen (Rest-Mapper).** |
| D-26b | **D-26-Rest: stale `players.club` in Mappern, die `dbToPlayer` NICHT durchlaufen** — Holdings-Mapper (`trading.ts:410`/`holdingMapper.ts:41`), Watchlist (`watchlist.ts:123`), Home-Strips (eigene server-RPCs, `.club` serverseitig Freitext), `search.ts:96`, `lineups.queries.ts:161`, `offers.ts:43`, `compare/page.tsx` (raw-Rows). | konsist. | S | CTO | 🟠 offen — **Holdings-Mapper priorisieren** (Reviewer S477 #2: speist Fantasy Event-Requirement-Gate `useLineupBuilder:360` `minClubPlayers`/`specificClub` → eligibility-affecting, nicht nur kosmetisch; Server `rpc_save_lineup` bleibt autoritativ → kein Money-Bug). Rest = Display/Such-Match. |
| D-27 | `nextGw > 38`-Hardcode in `createNextGameweekEvents:234` nach GW-Per-Liga-Fork (427-429) nicht nachgezogen → Phantom-Events in 34-GW-Ligen. | konsist. | XS | CTO | 🟡 offen (Smell getrackt) |
| D-28 | **`rpc_`-Präfix bedeutet 3 verschiedene Dinge** (Core vs Wrapper vs Standalone) — Drift gegen geschriebenen Standard `patterns.md` S035/041. Alle verkabelt, reine Audit-Falle. | konsist. | M | CTO | 🟡 offen |
| D-29 | `getAirdropStats` `.limit(1000)`-Aggregat (avg/tier) — Stats-Liar ab >1000 Scores (heute 52). | architektur | S | CTO | 🟡 offen |

### ⚠️ Die „sauber"-Befunde, die die Verifikation WIDERLEGT hat (Lehre: statisch grünes ≠ gesund)
| ID | Erst-Befund „gesund" | Realität nach adversarischer Prüfung | Aufw. |
|----|---------------------|--------------------------------------|-------|
| D-30 | „i18n DE/TR-Parität vollständig" | **9 Dup-Keys pro File, 6 mit konfligierenden Werten** — `JSON.parse` last-wins versteckt es; richere Onboarding-/Compliance-Copy nie erreichbar. Kein Dup-Guard. | S |
| D-31 | „Wording user-facing sauber" | **D-24** (Position-Vokabular) — die Einzel-Greps liefen, der Slice-224-Position-Guard NICHT. | S |
| D-32 | „Empty/Error-States konsistent" | **`FantasyError`-Variante + 15× copy-paste `error.tsx`** neben shared `ErrorState`. | S |

> D-30/31/32 sind der wichtigste methodische Befund: **drei „gesund"-Behauptungen fielen, sobald jemand adversarisch gegen die Realität prüfte.** Exakt das, was unserem Workflow gefehlt hat.

---

## 4. Bewusste Zwei + Geheilt (NICHT als Krankheit behandeln)
- **Gesund (bewusste-zwei, protokolliert):** `orders`/`offers` (D112) · `fan_rankings`/`airdrop_scores`/`score_history` (eigene Grains, kein Parallel-Aggregat) · `score_event` Default-40 (Slice 419 bewusst) · `players`-Aggregat-Denorm als Read-Cache (Pattern legitim — krank ist nur der trigger-lose Drift, s. D-19).
- **Geheilt (Beleg dass das Muster schließbar ist):** `treasury_balance_cents`→Ledger (406) · 2× Lineup-Builder (426) · GameweekSelector (421) · `initial_listing_price` (368f) · `buy_from_ipo`-Idempotenz (403) · Tracker-Stand (430) · Hooks/Skills (431) · D-01 Scoring-fixture-bound (453) · D-17 Ranking-SSOT (454) · D-02 Bench-Lock (455) · D-02b Concurrency-Lock (456) · D-11 Dead-Scoring-GC (457: bescout_scores+score_events+award_score_points gedroppt) · D-13 season_reset_scores + D-10 2.-Mission-System (458) · **INV-31 no_guard SECDEF REVOKE (460: calculate_fan_rank Info-Leak + refund_wildcards_on_leave Self-Farm geschlossen; Body-Restschuld → D-34)** · **D-12 Dead-RPC `get_club_dashboard_stats(text)` DROP (461: toter v1-Pfad + by-name-Enumeration weg; v2-anon-Exposure → D-35)** · **D-35 v2 Admin-Guard + REVOKE anon (462: club_admin OR platform_admin; Club-Finanz/Fan-PII zu; Sibling-top_role-Inkonsistenz → D-36)** · **D-36 Stats-Siblings auf platform_admins (463: rpc_get_club_trading_fees+fan_stats; toter Platform-Override repariert; SOLE-gate-top_role-RPCs → D-37)** · **D-37 SOLE-gate-top_role-RPCs (464: grant_founding_pass[Money]+admin_grant_wildcards[Minting]+cancel_event_entries auf platform_admins, tote Admin-Capability restauriert; Rest-Familie → D-37b/465)** · **D-37b top_role-Familie KOMPLETT (465: get_sponsor_stats_summary+set_club_fan_rank_thresholds auf platform_admins, family_remaining=0; 7 RPCs über D-36/37/37b)** · **D-26 Player-Domäne Render-SSOT (477: `dbToPlayer` Club aus FK `club_id` statt stale Freitext, 294/6,57% live korrekt, Reviewer PASS; D-26b Rest-Mapper inkl. Holdings-Eligibility offen)**.

---

## 5. Noch fehlende Linsen (potenziell unentdeckte Krankheit)
1. **Volle RLS + Grant-Matrix pro Tabelle + SECDEF-Grant-Audit** (Teil gelaufen → 28 anon-SECDEF; vollständig noch offen).
2. **Migration-vs-Live-DB-Reconciliation** — Orphan-Live-Objekte (D-07, D-12) deuten auf Registry-Drift; nie systematisch gemessen. (`award_score_points`-Orphan = gelöst S457.)
3. **Runtime-Usage (PostHog/Sentry)** — „tot" ist nur statisch belegt; reale Nutzung würde „tot" vs „niedrig-genutzt" trennen. (PostHog Projekt 160677 verbunden.)
4. Test-Coverage/Dead-Test · Dependency/Bundle · Type-Truth (types/index.ts 2329 Z. vs DB-Typen) · Edge-Function/Cron-vs-vercel.json · Realtime-Channels · Storage-Buckets · CSS/Tailwind-Token-Drift · Query-Wasserfall/N+1 (Network-Trace).

---

## 6. Heilungs-Reihenfolge nach Hebel (Audit-Empfehlung)
1. **[R1, höchster Hebel] Subtraktions-Ritual + Retention-Policy in DoD verankern** (begonnen 430/431) — verhindert Rezidiv auf ALLEN Schichten. ← **das ist der Workflow-Reset selbst.**
2. **[DB-Security systemisch]** 28 anon-SECDEF REVOKE + 9 rls_no_policy + 87 search_path härten — §3, billiger Batch, höchstes Risiko-pro-Aufwand. Money/Security selbst.
3. **[Datenmodell-SSOT]** Score/Ranking-Konsolidierung (D-11/D-17) — ein Schnitt killt ~5 Befunde + tote RPCs.
4. **[Money-Path-Unifikation]** D-05/D-06/D-07 + 3 Kauf-RPCs.
5. **[RLS/Index-Konsolidierung]** 81 permissive Policies mergen + 26 unused Index + 51 FK-Index.
6. **[Dead-Feature-GC]** D-11 ✅ geheilt 457 · D-13 ✅ + D-10 ✅ geheilt 458 · offen: D-14/D-16 (Ad-Revenue/Creator-Fund, Money/CEO) + Wildcard/Club-Missionen (geparkt).
7. **[D113-Klasse]** D-01 ✅ geheilt 453 · D-02 ✅ geheilt 455 · D-02b ✅ geheilt 456 · D-04 (lineups DB-UNIQUE) offen.
8. **[Architektur XL]** D-03 SSR-Prefetch — höchste Wirkung, niedrigster Hebel-pro-Aufwand → zuletzt.
9. **[Konsistenz-Batch]** D-23 ✅ geheilt 467 · **D-26 Player-Domäne ✅ geheilt 477** (dbToPlayer FK-Resolve; D-26b Rest-Mapper offen) · D-24 (Wording, Compliance/CEO) + D-25 (Login-i18n) offen — klein, hoch-sichtbar.

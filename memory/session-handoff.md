<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-06-30 14:58)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 1 Files
```
 M memory/session-handoff.md
```

## Session Commits: 9
- ea7b3151 docs(masterplan): W6 + W2 reconcile — 472-476 done (Server-Auth-SSR LCP-Win + /club 471-fix + 428b DROP)
- 23c5b644 docs: Slice 475 + 476 LOG + Knowledge (errors-frontend S476 Dual-Build) + Handoff Teil 29
- 96bc9341 fix(perf): Slice 476 — /club Dual-Build-Crash fixen (HydrationBoundary legacy->modern via Client-Wrapper)
- ccb86c1a refactor(db): Slice 475 (428b) — clubs.active_gameweek entkoppeln (Phase 1 Code) vor DROP
- bb05a013 docs(d03): W6 Server-Auth-SSR (472-474) LOG + Prod-Proof + Knowledge (errors-frontend S474)
- b05ba950 fix(perf): Slice 474 — Wallet/Tickets cached-placeholder SSR-safe (der echte 472-Hydration-Fix)
- 47de778e fix(perf): Slice 473 — leagueScopeStore SSR-safe (fix hydration mismatch, unblock 472 authed-SSR)
- abd84cdf feat(perf): Slice 472 — W6 Server-Auth-Hydration (authed SSR-Render, der echte LCP-Win)
- 652dc4e6 docs(d03): W6 Slice 472 Server-Auth-Spec (ready) + Reconcile — 471 live, 472 fokussierter Next

<!-- auto:handoff-end -->

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION

> **🟢 SESSION-CLOSE 2026-06-30 (Teil 29) — 475 (DROP clubs.active_gameweek) + 476 (P0: /club seit 471 kaputt geheilt). Beide live + Prod-verifiziert.**
> - **⏭️ NÄCHSTES (idle, CEO-Richtung):** W6 Phase 3 · Mock→Pro Welle 3 (Events/Aufstellung) · Ranking-Konsolidierung scout_scores↔user_stats — die „Nächster"-Items sind CEO-Vorlagen (NICHT autonom, TODO.md). Kein offener Blocker.
> - **✅ 475 (= 428b, `ccb86c1a` + Migration `20260630170000`):** `clubs.active_gameweek` gedroppt (§0-Schnitt-Regel — frozen seit 428/D115, SSOT=leagues). DROP-Safety live auditiert (0 Dependents/SQL-Fns/Trigger). 2-Phasen zero-downtime (Code-deploy → DROP). Live: Spalte weg, leagues-SSOT intakt, clubs queryable 134.
> - **✅ 476 (`96bc9341`) — P0-Fund + Heal:** beim 475-Walk entdeckt: **`/club/[slug]` war seit Slice 471 KOMPLETT kaputt** (Error-Boundary, logged-in+out, undetektiert). Root-Cause via Dev-Repro: `HydrationBoundary` (build/**legacy**, im Server-Component importiert) ↔ `QueryClientProvider` (build/**modern**) = Context-Mismatch → »No QueryClient set«. Fix: `ClubHydration.tsx` ('use client'-Wrapper). **Prod: club-Page rendert voll, Console clean.** Knowledge → errors-frontend.md **S476**.
> - **🔬 Honesty-Lehre:** 474-„Prod-Walk grün" war unvollständig — /club (einzige Page mit 471-HydrationBoundary + bypasst AuthGuard) nicht gewalkt. **Regel: SSR-Slices walken JEDEN strukturell-distinkten Page-Typ.** + Tooling-Notiz: pre-commit-Hook (tsc+6 Audits+eslint) braucht bei vielen laufenden MCP-Node-Prozessen >6 min → mit langem Timeout committen, nicht --no-verify.
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-30 (Teil 28) — W6 Server-Auth-SSR KOMPLETT + Prod-verifiziert (472+473+474): authed LCP-Win live, #418 eliminiert.**
> - **⏭️ NÄCHSTES (idle, CEO-Richtung):** W6 Phase 3 (weitere Page-Prefetches / RSC-Migration, `worklog/notes/d03-ssr-ist-analyse.md`) ODER zurück in den Mock→Pro-Strom / TEIL-A-Rest. Kein offener Blocker.
> - **✅ Geliefert (alle live + Prod-Walk grün):** **472** (`abd84cdf`) Server-Auth-Seed (`supabaseServerAuth.ts` getServerUser via @supabase/ssr; AuthProvider 3 useState-Seeds + cacheMatchesSeed-Guard; layout Promise.all) · **473** (`47de778e`) leagueScopeStore SSR-safe (Modul-Init-localStorage-Seed → post-mount `hydrateFromStorage`-Action; **tangential, NICHT die #418-Ursache**, aber korrekte Härtung) · **474** (`b05ba950`) = **DER Fix**: `useWallet`/`useUserTickets` lasen UID-localStorage-Mirror synchron als placeholderData → seit 472 (userId server-präsent) divergiert First-Render (Server undefined→Skeleton, Client cached „12.501,47") → #418×5 + #423. Neuer SSOT-Hook `useCachedPlaceholder` (post-mount-gated). Money-Freshness-Gate unberührt.
> - **🔬 Der Weg dahin (Lehre):** Cold-Context-Reviewer (472) sagte „SSR des authed Surface = Blast-Radius, statisch nicht clearbar, nur Live-Walk". **Exakt eingetreten.** Live-Walk fand #418/#423 (tsc + Reviewer-Code-PASS ließen es durch — §0/2 Realität-vor-Zeremonie). Voll-Shell-Audit war clean → statisch nicht findbar → **CEO-Gabel (AskUserQuestion) → „Dev-Repro"** → lokaler `next dev` eingeloggt → un-minifizierter Mismatch im **Next.js-Error-Overlay** (`nextjs-portal` shadowRoot): »Expected server HTML to contain "12.501,47"« = Wallet. **Falle:** localhost+prod SW+Cache (`bescout-v4`) servierten alte Chunks → Fix schien „nicht zu greifen" bis SW+Cache-clear+hard-reload. Knowledge → errors-frontend.md **S474**.
> - **📊 Prod-Walk (Deploy b05ba950, jarvis-qa + ali):** home/market/fantasy/player Console **#418/#423-FREI** · **LCP authed Home 1602ms** (Content im SSR-HTML statt 5-13s authLoading-Skeleton, kein Root-Re-Render) · **2-Account-Switch jarvis→ali: kein Cross-User-Leak** (ali 10.835/155/Ali Şahin, nicht jarvis 12.501,47/856).
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-30 (Teil 27) — D-03/W6 SSR gestartet: Fundament live (471), Server-Auth (472) designed + als fokussierter nächster Schritt geparkt.**
> - **⏭️ DIREKT STARTEN: Slice 472 — Server-Auth-Hydration (Spec `worklog/specs/472-server-auth-hydration.md` READY).** CEO Anil „Server-Auth jetzt" → als fokussierter nächster Schritt (P0-Risiko Kern-Auth verdient frische Aufmerksamkeit, nicht Session-Ende).
>   - **Was:** Session server-seitig lesen (Cookie via @supabase/ssr — `createBrowserClient` speichert in Cookies, server-lesbar; Middleware `supabaseMiddleware.ts` refresht sie schon) → `initialUser`-Prop an AuthProvider → seeden, damit authed Pages Content im SSR-HTML rendern statt `authLoading`-Skeleton. **Das ist der echte LCP-Win** (die 5-13s = eingeloggter Cold-Start).
>   - **4 Files:** `src/lib/supabaseServer.ts` (NEU, getServerUser via cookies()+getUser), `src/app/layout.tsx` (initialUser → Providers), `Providers.tsx` (durchreichen), `AuthProvider.tsx` (Seed).
>   - **KRITISCHER Seed (sonst P0):** `user=initialUser, loading=(initialUser==null), profileLoading=(initialUser!=null)`. Das profileLoading=true ist Pflicht — sonst macht `AuthGuard` (`if(!profile && !profileLoading) return skeleton`, AuthGuard.tsx:53-63) bei authed SSR einen fälschlichen Onboarding-Redirect. Kein Hydration-Mismatch weil Prop-Seed (nicht localStorage; Kommentar AuthProvider:147-149 präzisieren).
>   - **Verifikation PFLICHT (P0 Kern-Auth):** tsc + Cold-Context-Reviewer (Auth-Fokus) + Deploy + **logged-in** LCP-Messung (jarvis-qa@bescout.net) + Multi-Page-Regression-Walk (home/market/player/club/fantasy, Console kein Hydration-Error) + Login/Logout/2-Account-Switch (kein User-A-sieht-User-B).
>   - **context7 vor Build:** @supabase/ssr Server-Client RSC-Pattern (setAll no-op in RSC, Middleware macht Refresh).
> - **✅ 471 (live `3653bd31`):** SSR-Prefetch-Fundament — `src/lib/getServerQueryClient.ts` (per-Request cache()) + `/club/[slug]/page.tsx` Root-Prefetch + HydrationBoundary + **Provider-Request-Scoping** (`queryClient.ts` `getQueryClient()` = isServer ? frisch : Singleton; Reviewer-F2 gefixt). EHRLICH: KEIN LCP-Win allein (Reviewer-F1: ClubContent gated hinter authLoading) → 472 liefert den Win. No-regression smoke ok (bescout.net lädt, kein Hydration-Error). Baseline `/club/galatasaray` LCP **4.118 ms** / Load-delay **2.049 ms** (Trace scratchpad/d03-baseline-club.json).
> - **D-03 Ist-Analyse + Plan:** `worklog/notes/d03-ssr-ist-analyse.md` (phasiert: 1 Prefetch ✅ · 2 Server-Auth ⬜next · 3 weitere Pages · 4 RSC).
> - **🟢 SESSION-BILANZ (diese Session, alle live):** 460-470 (W0-Security + D-23 + D-38 + search_path + FK-Indizes) · D-19/D-07/D-06 Fakten-Reconcile (kein aktiver Bug, P2) · 471 W6-SSR-Fundament. **Meta-Befund:** aktive P0/P1-Risiken der Security/Money/Scoring/Data-Domänen sind geschlossen; Register-Rest = P2 oder CEO-Scope.
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-30 (Teil 26) — Policies/Index Perf-Lane durchgearbeitet (Slice 470). Autonom „durcharbeiten + zurückkommen".**
> - **CEO Anil:** „Policies/Index Perf-Lane durcharbeiten und zurückkommen" → autonom, Gabeln/Risiken geparkt.
> - **✅ 470 (live, Migration `20260630160000`):** 49 advisor-autoritative **unindexed Foreign Keys** → Covering-Index additiv (CREATE INDEX IF NOT EXISTS, DO-Loop über die 49 connames, Spalten aus pg_constraint). 49/49 verifiziert, db-invariants unverändert. `unindexed_foreign_keys` 49→0. (Hand-Covering-Query gab 181 = PG-int2vector-Slice-Falle → Advisor-Liste vertraut.)
> - **🅿️ GEPARKT-mit-Gründen (3 von 4 Perf-Items — echte Risiken/Urteile, kein blinder Autonom-Batch):**
>   - **`auth_rls_initplan` (71)** = HÖCHSTER Perf-Wert, Transform `auth.uid()`→`(select auth.uid())` **provably-äquivalent** (Round-Trip-Invariant 0 Fails über alle 155 unwrapped). ABER: Scope-Ambiguität (Advisor 71 = vermutlich **top-level** auth.uid() vs. mein Scan 155 inkl. **Subquery-internal** `EXISTS(SELECT…WHERE x=auth.uid())`) + 71-155 access-control-Policies = große security-kritische Fläche → **dedizierter careful Slice** (Advisor-exakte 71-Liste holen + per-Policy Round-Trip-Guard in Migration + Live-Access-Spot-Check auf Money-Tabelle). §1 caution: nicht autonom-blind über RLS-weite Access-Control.
>   - **`unused_index` (21)** = `idx_scan=0`-Signal in **Low-Traffic-Pilot-DB unzuverlässig** (Feature-nicht-exerziert ≠ nutzlos) → kein DROP jetzt, revisit nach echtem Traffic.
>   - **`multiple_permissive_policies` (81)** = Mergen = **Access-Control-Äquivalenz-Urteil pro Tabelle** → dedizierter Slice mit per-Tabelle-Analyse, kein Blind-Merge.
> - **🟢 SESSION-BILANZ autonom (460-470, 11 Slices, alle live+gepusht):** W0-Security-Block komplett + D-23 Geld-Divergenz + D-38 Silent-Fail + search_path-62-Fns + 49 FK-Indizes.
> - **⏭️ NÄCHSTES (CEO-Richtung):** AC-05 Visual D-23 · **auth_rls_initplan** als dedizierter careful Perf-Slice (höchster Wert, braucht Advisor-exakte Liste + Access-Verify) · D-24 Wording (CEO) · Dead-GC Money. Perf-Lane sonst durch.
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-30 (Teil 25) — P2-Security-Hygiene-Lane durchgearbeitet (Slices 468+469). Autonom „durcharbeiten + zurückkommen".**
> - **CEO Anil:** „Alle P2-Security-Hygiene durcharbeiten und zurückkommen" → autonome Lane, echte Gabeln geparkt.
> - **✅ 468 (live, Migration `20260630150000`):** `function_search_path_mutable`-Härtung — 62 SECDEF-non-trigger-Fns (inkl. Money-RPCs) `ALTER SET search_path='public'` (body-erhaltend, Risk-Scan leer = nur `extensions`-Refs wären riskant, keine vorhanden). 62→0 + selbst-verifizierende Count-Assertion. Money-Mint (grant_founding_pass ok=true/250000 rolled back) + db-invariants unverändert. + `update_club_assets` anon-REVOKE (Bonus: echtes AR-44/default-privileges-Loch). Reviewer CONCERNS=Auditierbarkeit (Scan-Query+Assertion nachgereicht), Korrektheit PASS. Knowledge errors-db **S468**.
> - **✅ 469 (live):** D-38 sponsorStats Silent-Fail → `throw` (Consumer guarden `?? []`, kein Crash; common-errors §1). Self-review.
> - **🅿️ GEPARKT (bewusst, kein Wert/Risiko-Missverhältnis):** kosmetische anon-Hygiene — Trigger-REVOKEs (AR-44: Trigger brauchen keinen EXECUTE-Grant, unnötig) · Pure-Kalkulator-REVOKEs (RLS/View-Eval-Risiko bei P2-Wert) · 4 Leaderboard/Markt-RPCs anon **behalten** (öffentlich-anzeigbare Daten, kein PII) · search_path INVOKER(11)+Trigger(15) (kein Privilege-Escalation, niedriger) · 81 permissive Policies + 26 unused + 51 FK-Index (= Perf-Domäne, eigene Lane).
> - **🟢 SESSION-BILANZ autonom (460-469, 10 Slices, alle live+gepusht):** W0-Security-Block KOMPLETT (no_guard/Dead-RPC/v2-PII/top_role-Familie-7-RPCs/Recon-Leak/**search_path-62-Fns**) + D-23 Geld-Divergenz + D-38 Silent-Fail. Die substanziellen Security/Money-Display-Risiken dieser Domänen geschlossen.
> - **⏭️ NÄCHSTES (CEO-Richtung nötig — Hochwert-Stoff erschöpft):** **AC-05 Visual D-23** post-Deploy (fractional-Konto). Dann **CEO-Scope:** D-24 Wording-Compliance (Securities-Vokabular, business.md, +TR) · Dead-GC D-14/15/16 (Money) · ODER 81 Policies/Index (Perf-Lane, autonom-fähig). P2-Security-Hygiene ist durch.
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-30 (Teil 24) — D-23 Geld-Formatter-Divergenz geheilt (Slice 467). Autonom-Modus.**
> - **CEO Anil:** Format-Entscheid „2 Dezimalstellen" → CTO-Umsetzung autonom.
> - **Fix (Commit folgt):** `formatScout(cents)` (wallet.ts, war 0-Dez, versteckte Cent-Anteil) delegiert jetzt an kanonischen `fmtScout(Math.round(cents)/100)` (utils.ts, 2-Dez). EINE Formatierungs-Wahrheit; SideNav/TopBar zeigen konsistent 2-Dez. 1-Zeilen-Delegation statt 604-Caller/201-File-Refactor. `maximumFractionDigits:2` (kein min) → ganze Credits unverändert „10.000", nur fractional „…,27".
> - **Proof:** tsc 0 + wallet-Tests 2 files/31 passed (nur 3 fractional-Asserts 50→„0,5"/49→„0,49"). Reviewer Code-**PASS** (CONCERNS war nur Register-Housekeeping, adressiert; ~60 Caller geprüft kein 100×-Bug). Disease-Register D-23 → bewusste-zwei/geheilt S467.
> - **🟡 OFFEN — AC-05 Visual:** nach Vercel-Deploy dieses Commits bescout.net (jarvis-qa) Wallet mit fractional Saldo: SideNav == TopBar (2-Dez)? feedback_no_premature_ready — D-23 erst „fully done" nach Visual-Check.
> - **🟢 SESSION-BILANZ autonom (460-467, 8 Slices, alle live+gepusht, Reviewer/force-rollback):** W0-Security-Block KOMPLETT (INV-31 no_guard · D-12 Dead-RPC · D-35 v2-PII · D-36/37/37b top_role-Familie 7 RPCs · 466 Recon-Leak) + D-23 Geld-Divergenz. = die substanziellen P0/P1-Risiken dieser Domänen geschlossen.
> - **⏭️ NÄCHSTES (autonom/CEO):** AC-05 Visual D-23 (post-Deploy) · dann nur noch **P2-Hygiene** (anon-Hygiene-Batch · 87 search_path · 81 Policies/Index · D-38 sponsorStats Silent-Fail) ODER **CEO-Scope** (D-24 Wording-Compliance · Dead-GC D-14/15/16 Money). Hier lohnt CEO-Richtungswahl statt P2-Grind (Direktive: „nicht endlose Detailpflege").
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-30 (Teil 23) — W0 Security-Map-Recon-RPCs admin-only live (Slice 466). Autonom-Modus.**
> - **CEO Anil:** „mach autonom weiter". §3 Security-Hygiene.
> - **Fix (live, Migration `20260630140000`):** `get_security_definer_user_param_audit()` + `get_rls_policy_matrix()` (SECDEF-Audit, leaken Security-Landkarte) `REVOKE EXECUTE FROM anon, authenticated, PUBLIC` → admin-only. Konsumenten = NUR db-invariants-Test (service_role) → unberührt; 0 App-Caller. Self-review (XS REVOKE-only).
> - **Proof:** anon+auth→false, service_role→true (beide); db-invariants unverändert 3 (INV-31 läuft als service_role weiter). Proof `466-recon-rpcs.txt`.
> - **🟢 W0-Security-Faden 460-466 = großer Block zu:** INV-31 · D-12 · D-35 · D-36/37/37b (top_role-Familie restlos, 7 RPCs) · Recon-RPCs (466). Alle no_guard/dead/anon-PII/platform-admin-Drift/Recon-Leak geschlossen.
> - **⏭️ NÄCHSTES (autonom, W0-Rest):** **467** = anon-REVOKE-Hygiene-Batch (9 Trigger [REVOKE anon = null-Impact, Trigger feuern tabellengebunden] + ~10 Pure-Kalkulatoren [REVOKE anon, authenticated behalten] + 3 Leaderboard-RPCs [⚠️ ERST prüfen ob öffentliche/ausgeloggte Club-Seiten sie als anon rufen → wenn ja behalten]). Danach: 87 search_path_mutable · 81 permissive Policies + 26 unused + 51 FK-Index · **D-38** sponsorStats Silent-Fail · W5 (D-23/24/25/26) · Dead-GC D-14/15/16 (Money/CEO) · INV-19/32/33 P2.
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-30 (Teil 22) — D-37b: top_role='Admin'-Familie KOMPLETT eliminiert live (Slice 465). Autonom-Modus.**
> - **CEO Anil:** „mach autonom weiter bis Token ausgeschöpft" → W0-Security-Thread autonom.
> - **Fix (live, Migration `20260630130000`):** letzte 2 `top_role='Admin'`-RPCs — `get_sponsor_stats_summary` (SOLE-gate read-only, +vestigial anon-granted → +REVOKE anon) + `set_club_fan_rank_thresholds` (Sekundär: club_admins funktionierte, Platform-Override tot) auf kanonische `platform_admins`. Bodies byte-true; club_admins-Branch unverändert; get_sponsor `public.`-qualifiziert (search_path='').
> - **Proof:** `family_remaining=0` (top_role='Admin'-Dead-Source-Familie RESTLOS, 7 RPCs über D-36/37/37b) + 3-Rollen-Smoke (non-admin reject / platform-admin past / club-admin past) + **Recompute-Happy-Path** (Club 37 fan_rankings → recalculated=37, SECDEF-Owner-Recompute trotz 460-REVOKE bewiesen, rolled back) + tsc 0 + db-invariants unverändert 3. Reviewer **PASS**. Knowledge errors-db **S465** (Guard-only-Smoke reicht nicht für Write-Pfad → Happy-Path-force-rollback Pflicht). Disease-Register: D-37b geheilt, **D-38** neu (sponsorStats Silent-Fail).
> - **🟢 W0-Security-Faden 460-465 = großer Block zu:** INV-31 (no_guard REVOKE) · D-12 (Dead-RPC DROP) · D-35 (v2-PII-Guard+anon) · D-36/37/37b (top_role→platform_admins, 7 RPCs). Alle platform-admin-Drift + anon-PII-Exposure + tote/no_guard SECDEF geschlossen, jeweils Reviewer-PASS + force-rollback.
> - **⏭️ NÄCHSTES (autonom, W0-Rest):** **466** = 2 Security-Map-Recon-RPCs (`get_security_definer_user_param_audit`+`get_rls_policy_matrix`, anon+auth-granted → leaken Security-Landkarte → admin-only). **⚠️ KRITISCHE VORPRÜFUNG:** db-invariants-Tests rufen `get_security_definer_user_param_audit` (INV-31) + ggf. `get_rls_policy_matrix` (INV-32) — VOR REVOKE die Test-Client-Rolle prüfen (service_role? → REVOKE anon+auth safe; authenticated? → bräche die Invarianten-Tests). Danach: anon-Hygiene-Batch · 87 search_path_mutable · 81 Policies+Index · D-38 · W5 (D-23/24/25/26) · Dead-GC D-14/15/16 · INV-19/32/33 P2.
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-30 (Teil 21) — D-37 tote Money/Minting-Admin-RPCs repariert live (Slice 464). Autonom-Modus.**
> - **CEO Anil:** „mach autonom weiter bis Token ausgeschöpft" → W0-Security-Thread autonom durchziehen (§3 Money selbst, Reviewer-Pflicht, force-rollback).
> - **Fix (live, Migration `20260630120000`):** 3 live-verdrahtete Admin-RPCs gateten auf `profiles.top_role='Admin'` = 0 Profile global (SOLE-gate) → **effektiv TOT** (always-reject): `grant_founding_pass` (MONEY), `admin_grant_wildcards` (MINTING), `cancel_event_entries`. Guard je RPC auf kanonische `platform_admins` (wie D-36/v2). Money-Bodies byte-true (CASE-Tiers/Kill-Switch 90000000/wallet/transactions/wildcard-INSERT), Spoof-Guard erhalten, unused DECLAREs raus.
> - **Proof:** 3-Rollen-force-rollback (non-admin reject ×3 / platform-admin past-guard ×3 / **voller Founding-Pass-Mint ok=true bcredits=250000 in Tx ROLLED BACK**) + PATCH-AUDIT-Anker + INV-31 grün + tier-invariant grün + tsc 0 + db-invariants unverändert 3. Reviewer **PASS** (§3 Money streng, byte-diff gg. Vorgänger verifiziert, „permissive-only, Kill-Switch intakt"). Permissive-only: RPCs lehnten vorher JEDEN ab → Fix kann nur restaurieren.
> - **Knowledge:** errors-db **S463-Erw.** (SOLE-gate-Swap=permissive-only; Vollständigkeits-Audit NACH Fix Pflicht). Disease-Register: D-37→geheilt, **D-37b** neu. MASTERPLAN W0.
> - **⏭️ NÄCHSTES (autonom geplant): Slice 465 (D-37b)** — Rest der `top_role='Admin'`-Familie: `get_sponsor_stats_summary` (SOLE-gate read-only, tot) + `set_club_fan_rank_thresholds` (Sekundär-Branch) auf `platform_admins` → Familie vollständig zu (kein Money, read/config). Danach W0-Rest (Recon-RPCs admin-only · anon-Hygiene · 87 search_path_mutable · 81 Policies + Index) · W5 (D-23/24/25/26) · Dead-GC D-14/15/16 · INV-19/32/33 P2.
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-30 (Teil 20) — D-36 Stats-Siblings auf platform_admins live (Slice 463) + 🔴 D-37 Money/Minting-Lockout-Verdacht aufgedeckt.**
> - **CEO Anil:** „mach d36". §3 Konsistenz, Fortsetzung S462.
> - **Fix (live, Migration `20260629240000`):** `rpc_get_club_trading_fees` + `rpc_get_club_fan_stats` prüften Platform-Admin per dead `top_role='Admin'` (0 Match) → seit S462 sichtbar inkonsistent (v2 erlaubt Platform-Admin, Sibling RAISEt). Beide je 1 Guard-Zeile auf kanonische `platform_admins` (wie v2/get_club_balance/UI). Body byte-treu, club_admins-Branch unverändert → rein permissiv. 3-Rollen-Smoke bewies reparierten Branch (platform-admin ohne club-Row jetzt ok). Reviewer **CONCERNS** = nur Scope-Out, Slice selbst mergeable.
> - **🔴 D-37 (Reviewer-Catch, PRIORISIERT, §3 Money) — der eigentliche Fund:** 3 RPCs nutzen `top_role='Admin'` als **ALLEINIGES** Gate (kein club_admins-Fallback) → bei 0-Match komplett **TOT/unzugänglich**: **`grant_founding_pass`** (`20260614170000:33`, MONEY/Kill-Switch), **`admin_grant_wildcards`** (`20260428120500:321`, MINTING), **`cancel_event_entries`** (`20260321:451`). Anders als D-36 = **Total-Lockout-Risiko**. **Erst verifizieren:** ist `profiles.top_role='Admin'`=0 global (= live tot)? Speziell `grant_founding_pass`: wie werden Founding-Pässe heute vergeben — anderer Pfad (RPC orphan) ODER tot (Feature kaputt)? Fix-Richtung `platform_admins`.
> - **Proof:** post-apply uses_platform_admins=true/still_top_role=false beide + `remaining_toprole_in_family=0` + 3-Rollen-Smoke + Body-Anker + tsc 0 + club.test 79/79. Proof `463-d36-sibling-guard.txt`. Knowledge errors-db **S463** (Gate-Topologie: SOLE-gate=Lockout vs Sekundär=Override-Verlust). Disease-Register: D-36→geheilt, **D-37** neu (🔴).
> - **⏭️ NÄCHSTES (CTO-Empfehlung): D-37 verifizieren** (1 Query: ist top_role='Admin'=0 global + sind die 3 RPCs live callable?) → bei Bestätigung Heal-Slice auf `platform_admins`. Danach W0-Rest (Recon-RPCs admin-only · anon-Hygiene · Policy/Index) · W5 (D-23/24/25/26) · Dead-GC D-14/15/16 · INV-19/32/33 P2.
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-29 (Teil 19) — D-35 v2 Admin-Guard live (Slice 462): get_club_dashboard_stats_v2 club_admin/platform_admin + REVOKE anon.**
> - **CEO Anil:** „Komplett: REVOKE anon + Admin-Guard". §3. Faktenbasierte Live-Recon VOR Bau (read-only).
> - **Fix (live, Migration `20260629230000`):** v2 war ohne Guard + anon-granted → jeder anon/authenticated las Club-IPO-Umsatz + Top-Fan-PII (user_id/holdings_count) fremder Clubs. Guard byte-exakt aus kanonischer Familie `get_club_balance` (`v_caller IS NULL→auth_required` + `club_admins(p_club_id)` OR `platform_admins`, sonst RAISE) + `REVOKE anon, PUBLIC`. Body byte-treu (PATCH-AUDIT).
> - **Recon-Fund (verhinderte Regression):** zwei Platform-Admin-Muster — kanonisch = `platform_admins`-Tabelle (22 RPCs), die 2 Stats-Siblings nutzen dead `top_role='Admin'` (0 Match). v2 spiegelt die kanonische → echte Platform-Admins bleiben berechtigt (blinde Sibling-Kopie hätte sie ausgesperrt). UI leitet Platform-Admin ebenfalls aus platform_admins ab (kein S347-Drift, Reviewer-verifiziert).
> - **Proof:** pre-apply force-rollback 3 Rollen (nonadmin reject / club-admin ok / platform-admin ok via platform_admins, pa_is_clubadmin=false) + post-apply (anon=FALSE, auth/service=TRUE, Guard+Body intakt) + Live-Re-Confirm + tsc 0 + club.test 79/79 + db-invariants unverändert 3. Reviewer **PASS**. Proof `462-d35-admin-guard.txt`. Knowledge errors-db **S462**. Disease-Register: D-35→geheilt, **D-36** neu.
> - **🚩 D-36 (Reviewer „priorisieren"):** die 2 Stats-Siblings (`rpc_get_club_trading_fees`/`rpc_get_club_fan_stats`) tragen den dead `top_role`-Branch → seit 462 sichtbar inkonsistent im Revenue-Tab (v2 erlaubt Platform-Admin, Sibling RAISEt). Fix = beide auf `platform_admins` (wie v2/get_club_balance).
> - **⏭️ NÄCHSTES (TEIL B, CEO-Wahl):** **W0-Rest** (**D-36** Sibling-Guard-Konsistenz [klein, Reviewer-priorisiert] · 2 Recon-RPCs admin-only · anon-REVOKE-Hygiene-Batch · 81 permissive Policies + 26 unused + 51 FK-Index) · **W5** Konsistenz (D-23/24/25/26) · **Dead-GC-Rest** D-14/15/16 (Money/CEO) · **INV-19/32/33** P2 (1 XS-Slice).
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-29 (Teil 18) — D-12 Dead-RPC GC live (Slice 461): DROP get_club_dashboard_stats(text) v1.**
> - **CEO Anil:** „mach D-12". §3/§0-Subtraktion. Faktenbasierte Live-Recon VOR DROP (read-only): 3-Wege-Caller-Enum + pg_depend.
> - **Fix (live, Migration `20260629220000`):** `DROP FUNCTION IF EXISTS public.get_club_dashboard_stats(text)` — toter v1 (by-name, 0 Caller app/DB/cron, SECDEF + anon-granted, gab RLS-umgehend per-User user_id/holdings_count, per club_name enumerierbar). Live-Pfad `get_club_dashboard_stats_v2(uuid)` (`club.ts:503`) unberührt. `pg_depend`=0 → kein CASCADE; plain DROP ging live durch = Dependent-Beweis.
> - **⚠️ EHRLICHER SCOPE (Reviewer-Catch):** DROP entfernt toten v1-Pfad + by-name-Enumeration + anon-SECDEF-Surface −1 — **NICHT** die Kern-PII-Exposure: **v2 ist ebenfalls anon-granted + identische Shape** inkl. user_id/holdings_count (Audit `007:132-133`) → **D-35** (v2-anon-Grant-Entscheid: Club-Dashboard öffentlich gewollt? sonst REVOKE anon). Kein „anon-Leak geschlossen".
> - **Proof:** pre-drop force-rollback (v1 1→0, v2-Survivor=1) + post-apply (v1 weg, v2 lebt, v2-Call ok) + db-invariants unverändert 3 (keine neue) + tsc 0 + club.test.ts 79/79. Reviewer **PASS**. Proof `461-d12-drop.txt`. Knowledge errors-db **S461**. Disease-Register: D-12→geheilt, **D-35** neu. MASTERPLAN W0 reconciled.
> - **⏭️ NÄCHSTES (TEIL B, CEO-Wahl):** **W0-Rest** (**D-35** v2-anon-Grant · 2 audit-RPCs admin-only · anon-REVOKE-Hygiene-Batch [9 Trigger + ~10 Kalkulatoren + 3 Leaderboard-RPCs] · 81 permissive Policies + 26 unused + 51 FK-Index) · **W5** Konsistenz (D-23/24/25/26) · **Dead-GC-Rest** D-14/15/16 (Money/CEO) · **INV-19/32/33** P2 (1 XS-Slice).
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-29 (Teil 17) — INV-31 Security-Fix GEHEILT live (Slice 460): REVOKE no_guard SECDEF-RPCs.**
> - **CEO Anil:** „INV-31 jetzt, REVOKE-only" (§3). Faktenbasierte Live-Triage VOR Bau (read-only DB): die einzige live-rote *Security*-Invariante.
> - **Fix (live, Migration `20260629210000`):** `REVOKE EXECUTE … FROM authenticated, anon, PUBLIC` auf `calculate_fan_rank(uuid,uuid)` + `refund_wildcards_on_leave(uuid,uuid)` — 2 no_guard SECDEF-RPCs (identity-spoof-Klasse). REVOKE-only, kein Body-Rewrite (null S156-Risiko am 5k-Body). Beide ohne legitimen direkten authenticated-Caller (Cron/Batch/Trigger = service_role/SECDEF-Owner; Client-Service `recalculateFanRank` tot; `refund_wildcards_on_leave` = toter Orphan 0 Caller). Schließt: `calculate_fan_rank` Info-Leak (Holdings-Count/Abo-Tier via fremde p_user_id) + `refund_wildcards_on_leave` Self-Repeat-Wildcard-Farm (cross-user war schon durch inneren earn_wildcards-Guard blockiert).
> - **Root-Cause (Reviewer-Catch):** Slice 251 (`20260428120500`) ließ den AR-27-Guard (`20260414200000`) für genau diese RPC beim Per-Liga-Rewrite still fallen (S156-Silent-Revert; 4/5 Geschwister behielten ihn, ~2 Mon. latent) → INV-31 als **laufender** Invariant fing es.
> - **Proof:** auth/anon EXECUTE→FALSE beide, service_role→TRUE beide, `needs_fix`=0, force-rollback Owner-Call (ok=true), db-invariants **4→3 failed** (INV-31 grün, INV-19/32/33 unverändert), tsc 0. Reviewer **PASS** („ein Senior merged das"). Proof `460-inv31-revoke.txt`. Knowledge errors-db **S460**. Disease-Register: INV-31→geheilt, **D-34** (toter non-idempotenter Orphan grant-dicht; Re-Arm bei service_role-Verdrahtung → Dedup/DROP).
> - **🟡 REST-INV noch rot (3, alle pre-existing P2, NICHT Scope 460):** INV-19 (treasury_ledger Cron-Only-RLS → Whitelist-Eintrag) · INV-32 (club_fan_rank_thresholds/liga_reward_config public-read → EXPECTED_PUBLIC) · INV-33 (Dev-Seed-Konto aaaaaaaa-0005 wallet-drift −30000).
> - **⏭️ NÄCHSTES (TEIL B, CEO-Wahl):** **W0-Rest** (27 anon-SECDEF Hygiene-Batch + **D-12** toter `get_club_dashboard_stats` v1 DROP, anon-PII) · **W5** Konsistenz-Batch (D-23/24/25/26) · **Dead-GC-Rest** D-14/15/16 (Money/CEO) · **INV-19/32/33** P2 Test-Ehrlichkeit (1 XS-Slice).
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-29 (Teil 16) — INV-XS Doppel-Fix (Slice 459): INV-22 + INV-18 Snapshot-Sync.**
> - **CEO Anil:** INV-XS-Wahl (nach 457/458). XS, kein Money-Verhalten.
> - **Fix:** 2 pre-existing db-invariants-Drifts (S330/S359-„5.-Sync-Punkt") auf Live-Realität: `success_fee` (CSF-Engine S330) in `ALL_CREDIT_TX_TYPES` (activityHelpers+i18n waren schon komplett) + events.status `cancelled`(S399)/events.type `user`(S396) in INV-18-Snapshot. 3 1-Zeilen-Edits.
> - **Proof:** db-invariants isoliert **6→4 failed** (INV-18+22 rot→grün); tsc 0. self-review PASS. Proof `459-inv-sync.txt`.
> - **🟡 REST-INV noch rot (4, alle pre-existing, NICHT Scope 459):** INV-31 (calculate_fan_rank/refund_wildcards_on_leave no_guard = **W0-Security**) · INV-19 (club/platform_treasury_ledger RLS-an/0-Policy = Cron-Only-Pattern → Whitelist-Eintrag) · INV-32 (club_fan_rank_thresholds/liga_reward_config qual=true → EXPECTED_PUBLIC-Eintrag) · INV-33 (Dev-Account wallet/tx-drift −30000).
> - **⏭️ NÄCHSTES (TEIL B, CEO-Wahl):** **W0** DB-Security (INV-31 no_guard + 28 anon-SECDEF + D-12 DROP) · **W5** Konsistenz-Batch (D-23/24/25/26) · **Dead-GC-Rest** D-14/15/16 (Money/CEO).
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-29 (Teil 15) — Dead-Feature-GC-Batch GEHEILT live (Slice 458): D-13 + D-10.**
> - **CEO Anil:** Dead-GC-Batch-Wahl (nach D-11/457) → D-13 (season_reset_scores) + D-10 (2. Mission-System), EINE gebündelte Verifikation.
> - **Fix (live, Migration `20260629200000`):** reine Subtraktion (§0) — 5 DROPs: `season_reset_scores()` (D-13, verwaiste Reset-RPC, 4-Wege-Caller-Check pg_proc+pg_cron+src+ACL alle negativ, lebender Zwilling `soft_reset_season` bleibt) + `claim_scout_mission_reward`/`submit_scout_mission` + `user_scout_missions`(0)/`scout_mission_definitions`(5) (D-10, 0 Render). Frontend-Cleanup: `scoutMissions.ts` gelöscht + misc/index/keys/db-invariants gescrubbt. **`qk.missions.scout` BEHALTEN** (geteilt mit lebendem `useMissionHints`), nur `.progress` raus. Lebendes `mission_definitions`(30)/`user_missions`(4397) distinkt + unberührt.
> - **Reviewer-Catch (wertvoll):** tote i18n-Keys (6×: scoutMissions/scoutMissionReward/RewardBody DE+TR) blieben zurück — in keinem src/-grep sichtbar. Im Slice nachgezogen; VOR Entfernen DB-Check `notifications`=0 (toter RPC emittierte nie → keine dynamische Auflösung). **Lehre → errors-infra S457/S458:** Dead-Feature-GC hat i18n + DB-Objekte als eigene Streich-Achsen (i18n-grep messages/ + Notif-Key-DB-Check + Caller-Enum inkl. pg_cron + ACL + force-rollback-Smoke + Survivor-Gegenprobe).
> - **Proof:** force-rollback-Smoke (5 DROPs fehlerfrei, Survivor da); post-apply AC1/AC2; tsc 0; **db-invariants identische Failure-Menge vor/nach (6 INV pre-existing, 0 scout_mission)** = 0 Regression; grep src/+messages/ = 0 Refs; JSON valide DE/TR 63/63. Proof `458-dead-feature-gc.txt`, Review `458-review.md` (Reviewer „ein Senior merged das"). Disease-Register **D-13 + D-10 → geheilt** (dup-registry D-10-Zeile entfernt).
> - **⏭️ NÄCHSTES (TEIL B, CEO-Wahl):** **W0** DB-Security-Batch (28 anon-SECDEF + INV-31-no_guard calculate_fan_rank/refund_wildcards_on_leave) · **W5** Konsistenz-Batch (D-23 Geld-Formatter/D-24 Wording/D-25 Auth-i18n/D-26 Club-Logos) · **Dead-GC-Rest** D-14/15/16 (Ad-Revenue/Creator-Fund, Money/CEO) · **INV-XS** success_fee/events-Snapshot · K6/K7 (TEIL-A LOW).
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-29 (Teil 14) — D-11 Dead-Scoring-Modell GEHEILT live (Slice 457) + D-17 final bewusste-zwei.**
> - **CEO Anil:** W2-Wahl „Path-2 + D-11 GC" → nach Recon-Beratung **„Projektion behalten"** (Path-2 verworfen) + D-11-GC freigegeben.
> - **Fix (live, Migration `20260629190000`):** reine Subtraktion (§0) — totes 3./4./5. Scoring-Modell gedroppt: `bescout_scores` (0 Rows) + `score_events` (0 Rows) + `award_score_points()` (0 Caller, schreibt nur in die 2 toten Tabellen, ACL ohne anon). D87-Recon bewies tot: pg_proc-Writer-Enum (S453) + repo-weiter Grep (nur Cron-Step-Label-Strings = FP) + keine Views/inbound-FK/Trigger. Keine CASCADE nötig. Schnitt-Regel-Scrub: gamification.md + 2× db-invariants.test.ts (EXPECTED_PUBLIC/SENSITIVE).
> - **Path-2 (user_stats-Score-Spalten droppen) = CEO VERWORFEN:** Korrektheit ist seit S454 da (drift-sichere Projektion via Trigger, register-gesegnet bewusste-zwei wie players-Aggregat). Voll-Drop hätte Level/Rank/`profiles.level`/Notification-Maschine umgebaut für 0 Korrektheits-Gewinn → Risiko ohne Nutzen. **D-17 = final bewusste-zwei, kein offenes Residual mehr.**
> - **Proof:** pre-apply force-rollback-Smoke (DROP fehlerfrei, 3 Objekte im Tx weg, scout_scores/user_stats/score_history Survivor-Gegenprobe da, RAISE-Rollback); post-apply AC1 beide NULL + AC2 fn_count=0 + AC3 lebende Tabellen da; tsc 0. **vitest: mein Change 0 Regression** (0 Erwähnung der gedroppten Objekte in der gesamten Suite; die 5-6 Live-DB-Invariant-Failures = pre-existing W0-Security/Daten-Drift/Flakiness — INV-32 nutzt meine editierte Map + bestätigt sie korrekt). Proof `457-dead-scoring-gc.txt`, Review `457-review.md` (Reviewer „ein Senior merged das so").
> - **🟡 Beim vitest-Lauf aufgefallen (pre-existing, NICHT Scoring, getrennt zu behandeln):** INV-31 `calculate_fan_rank`/`refund_wildcards_on_leave` no_guard (= W0-Security) · INV-18 events-Snapshot-Drift (cancelled/user) · INV-22 `success_fee` fehlt in `ALL_CREDIT_TX_TYPES` (UI-raw-string-Risiko) · INV-33 Dev-Account-wallet-drift −30000 · INV-19 club/platform_treasury_ledger Cron-Only-RLS. → eigene XS-Slices.
> - **⏭️ NÄCHSTES (TEIL B, CEO-Wahl):** **W0** DB-Security-Batch (28 anon-SECDEF + INV-31-no_guard-RPCs) · **W5** Konsistenz-Batch (D-23 Geld-Formatter/D-24 Wording/D-25 Auth-i18n/D-26 Club-Logos, klein+hoch-sichtbar) · K6/K7 (TEIL-A LOW). **Dead-Feature-GC-Geschwister offen:** D-10 (scout_missions), D-13 (season_reset_scores), D-14/15/16 (Ad-Revenue/Creator-Fund).
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-29 (Teil 13) — D-02b Concurrency-Race GEHEILT live (Slice 456) + D-20 CEO-Entscheid.**
> - **CEO Anil:** „d-02b machen" + „D-20 behalten".
> - **Fix (live, Migration `20260629180000`):** `rpc_save_lineup` Verfügbarkeits-Check (Starter+Bench) las `holdings` ohne `FOR UPDATE` → cross-event Over-Commit-Race (2 concurrent Saves, gleiche Karte, verschiedene Events → beide locken). 1 additiver Block C: upfront `FOR UPDATE` auf alle beteiligten holdings-Rows (`unnest(v_all_slots || v_bench_uids)`, `ORDER BY player_id` = deadlock-frei) VOR den Checks. Single-Writer-Rendezvous (rpc_save_lineup einziger Lock-Writer) → serialisiert; READ COMMITTED re-read → korrekter Reject. Byte-true Patch via `replace()`, self-verify, idempotent (D-02b-Marker-Guard). Reviewer **PASS** („a senior would merge this").
> - **Proof:** force-rollback (Happy-Path 8 Locks unverändert, A+B+C koexistieren, FOR UPDATE=1); post-apply functiondef-Counts + SECDEF/proconfig=null/Grants(anon kein EXECUTE) bewahrt; Index `holdings_user_id_player_id_key` UNIQUE = sortierte Lock-Order. Proof `456-holdings-row-lock.txt`, Review `456-review.md`. Knowledge errors-db **S456** (TOCTOU Child-INSERT → Parent-FOR-UPDATE).
> - **D-20 (Bench/Auto-Sub Wide-Column):** CEO = **BEHALTEN** (aktives Feature; D-02/D-02b gehärtet). Rest-Hygiene (`slot_att3`-Nutzung, Orphan-Typ `Lineup`) bleibt offen, kein Feature-Rückbau.
> - **⏭️ NÄCHSTES (TEIL B, CEO-Wahl):** **W0** DB-Security-Batch (28 anon-SECDEF; Triage: keine anon-Geld-Mutation, 3 echte Items D-12/Audit-RPCs/Hygiene) · **W2 Path-2** (user_stats-Score-Spalten-Drop) + **D-11** (totes bescout_scores) = 454-Residuals · K6/K7 (TEIL-A LOW).
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-29 (Teil 12) — D-02 Bench-Geld-Leck GEHEILT live (Slice 455).**
> - **CEO-Wahl Anil:** „D-02 fertigbauen" → force-rollback-Smoke + Reviewer + CEO-Apply (§3) freigegeben.
> - **Fix (live, Migration `20260629170000`):** `rpc_save_lineup` (25k-Money-RPC) lockte nur 12 Starter; Bench (`v_bench_uids`) validiert aber nie in `holding_locks` + nie cross-event geprüft → Bench-Karte in N Events wiederverwendbar (Auto-Sub-Reward-Leck). 2 additive Blöcke spiegeln Starter-Logik 1:1, Starter byte-treu: (A) Bench cross-event-Verfügbarkeit → reject `insufficient_sc_bench`; (B) Bench-Lock-INSERT (qty `v_min_sc`, ON CONFLICT DO NOTHING). Methode = byte-true Patch aus Live-`pg_get_functiondef` via `replace()` an 2 eindeutigen Ankern, self-verify, idempotent (S156). **Latent geschlossen** (holding_locks=0 live). FE `useEventActions.ts` Toast gefixt.
> - **Proof:** force-rollback (1-2-2-2, 7+7 disjunkt + 1 geteilte Bench): A=ok/8 Locks inkl. Bench, B geteilte Bench→`insufficient_sc_bench`/0 Locks, Re-Save idempotent/8; post-apply functiondef-Counts (Block A=1, B=1, Starter-INSERT=1, Starter-err=1) + SECDEF/proconfig=null/Grants(anon kein EXECUTE) bewahrt; tsc 0. Proof `455-bench-locks.txt`, Review `455-review.md`.
> - **Completeness (S453 Writer-Enum):** `rpc_save_lineup` einziger Lock-INSERT-Writer; alle 5 Teardown-Pfade löschen per `event_id` → Bench-Locks erzeugen keine Waisen.
> - **Reviewer (CONCERNS, kein Blocker):** FE-Switch Exact-Match verfehlte `insufficient_sc_bench` (gefixt) + vererbter TOCTOU-Concurrency-Race (kein FOR UPDATE, Starter+Bench) → **D-02b** getrackt. Knowledge errors-frontend **S393-Erw.(S455)**.
> - **⏭️ NÄCHSTES (TEIL B, CEO-Wahl):** **W0** DB-Security-Batch (28 anon-SECDEF; Triage: keine anon-Geld-Mutation, 3 kleine echte Items D-12/Audit-RPCs/Hygiene) · **D-02b** Concurrency-Race (FOR UPDATE Starter+Bench) · **W2 Path-2** (user_stats-Score-Spalten-Drop) + **D-11** (totes bescout_scores) = 454-Residuals · K6/K7 (TEIL-A LOW).
>
> ---
>
> **🟡 SESSION-CLOSE 2026-06-29 (Teil 11) — D-02 Bench-Geld-Leck: Recon + Fix-Design KOMPLETT, Build VERTAGT (Slice 455, Checkpoint).**
> - **CEO-Wahl Anil:** „weiter mit D-02". Recon live (D87) → **D-02 bestätigt real + LATENT** (Bench-Feature unbenutzt, `holding_locks`=0 live; Leck aktiviert sich erst bei Bench-Nutzung).
> - **Bug (verifiziert):** `rpc_save_lineup` (25k-Money-RPC) — `v_all_slots` (Z.37-41) = `v_slot_keys` (Z.5) = exakt **12 Starter**, kein Bench. Cross-Event-Verfügbarkeits-Check (Z.365-377, `FOR v_i IN 1..12`) + Lock-INSERT (Z.436-438, `unnest(v_all_slots)`) decken **nur Starter** ab. Bench (`v_bench_uids`) wird validiert (Position/Holdings/Dup/overlap) aber **NIE in `holding_locks`** → dieselbe Bench-Karte in N gleichzeitigen Events → Auto-Sub punktet überall = Reward-Leck.
> - **Fix steht (Spec `worklog/specs/455-d02-bench-holding-locks.md`):** 2 **additive** Blöcke, spiegeln Starter-Logik, Starter-Pfad byte-treu: (A) Bench-Cross-Event-Verfügbarkeits-Check nach Z.377 (`FOREACH v_bench_uids` → `holdings − SUM(locks WHERE event_id != p_event_id) < v_min_sc` → reject `insufficient_sc_bench`). (B) Bench-Lock-INSERT nach Z.438 (`unnest(v_bench_uids)` → holding_locks, qty `v_min_sc`, `ON CONFLICT DO NOTHING`). Open-Q: Bench-Lock-qty `v_min_sc` vs `1` (CTO-Detail).
> - **BUILD bewusst VERTAGT** (§1 „caution over speed"): byte-treuer CREATE OR REPLACE eines 25k-Money-RPC nach 3 Money-Slices am Session-Ende = Fehler-Risiko auf kritischstem Code; D-02 latent = nicht dringend. **Nächste Session zuerst:** Voll-Def `rpc_save_lineup` ziehen → 2 Blöcke an Z.377/438 → force-rollback Money-Smoke (Bench-Lock + cross-event-reject) → Reviewer → CEO-Apply. ACs/Edges/Pre-Mortem in Spec 455.
> - **⏭️ DANACH (TEIL B, CEO-Wahl):** W0 DB-Security-Batch · W2 Path-2 (user_stats-Score-Spalten droppen) + D-11 (totes bescout_scores) = 454-Residuals · K6/K7 (TEIL-A LOW).
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-29 (Teil 10) — D-17 Ranking-SSOT GEHEILT live (Slice 454). TEIL B Welle W2-Konsolidierung.**
> - **CEO-Wahl Anil:** „weiter mit D-17" → Modell-Entscheid **„A — scout_scores = eine Quelle"** + Live-Apply (§3) freigegeben.
> - **Bug (D87 Live):** `scout_scores` (trader/manager/analyst, KANONISCH, geld-gekoppelt via close_monthly_liga+airdrop) ↔ `user_stats` (trading/manager/scout) berechneten dieselben Dims mit verschiedenen Formeln → **70/70 Overlap-User divergent** (manager 778 vs 418; user sah 2 verschiedene Punktzahlen: /rankings=scout_scores vs Community/Club=user_stats).
> - **Fix (live, Migration `20260629160000`):** user_stats-Scores = **kept-fresh Projektion** von scout_scores. (1) Score-Spalten smallint→integer (Overflow-Edge, scout uncapped). (2) `refresh_user_stats` liest scout_scores statt eigener gedeckelter Formel (Rest byte-treu + `fn_compute_user_tier`-Helper). (3) `trg_scout_scores_project_user_stats` (AFTER INS/UPD OF scores ON scout_scores) projiziert sofort → Drift unmöglich (legitimer Denorm-mit-Trigger). (4) Backfill 70 Rows + rank. **scout_scores/award_dimension_score/Geld-Reader = 0 Edits.**
> - **Reviewer-Catch (Cold-Context, HIGH — wieder wertvoll):** Backfill hätte `trg_sync_level` (AFTER UPD OF total_score → profiles.level + „Aufstieg!"-Notification) 70× gefeuert → Level-Rescale + **irreversibler Notification-Spam** (total_score capped→uncapped, 70/70 wechseln Level). Gefixt: Backfill geguarded (`DISABLE/ENABLE trg_sync_level`, profiles.level still+konsistent rescaled). Guard-Proof: notif_delta=0.
> - **Apply-Story:** v1 FAIL `0A000` (trg_sync_level `UPDATE OF total_score` blockt ALTER TYPE) → atomar zurückgerollt → v2 DROP/recreate Trigger um den ALTER (Dependency-Check vorab: nur dieser Trigger). Post-apply: **divergence_live=0 · integer · projection_trg propagiert live (778→788) · level_inconsistent=0**; vitest 79/79. Proof `454-*.txt`, Review `454-review.md`.
> - **Knowledge:** errors-db **S454** (Werte-Skala-Flip → Downstream-Trigger/Reader mit-auditieren · Backfill-Notif-Guard · ALTER-TYPE-Trigger-Dep). Disease-Register **D-17 → geheilt** (dup-registry geheilt).
> - **🟡 Residual (getrackt → später):** **Path 2** = Surfaces (social/club/mentor) direkt auf scout_scores + user_stats-Score-Spalten droppen (physische statt projizierte SSOT) · **D-11** = totes `bescout_scores`/`award_score_points`/`score_events` löschen · tier-Schwellen-Tuning auf scout-Skala · #2 rank-lag (self-heal, akzeptiert) · #3 Badge/Rang-Display konvergiert auf scout-Skala (= gewollt, Live-Render-Check post-Deploy).
> - **⏭️ NÄCHSTES (TEIL B, CEO-Wahl):** **D-02** Bench-Geld-Leak (M, Money — Bank-Karten umgehen holding_locks) · **W0** DB-Security-Batch · **W2 Path-2** Score-Spalten-Drop + **D-11** Dead-GC (454-Residuals) · K6/K7 (TEIL-A LOW) offen.
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-29 (Teil 9) — D-01 Scoring-Landmine GEHEILT live (Slice 453). TEIL B gestartet.**
> - **CEO-Wahl Anil:** nach K2-Epic → „Jetzt TEIL B, D-01" (TEIL-A-Rest K6 types-split→W6 / K7 Archiv→später Sweep, beide LOW). Live-Apply explizit freigegeben (§3).
> - **Bug (D87 Live, DB skzjfhvgccaeplydsunz):** `cron_process_gameweek` Step4 + `admin_resync_gw_scores` schrieben altes GW-Modell `(player_id,gameweek,score) ON CONFLICT (player_id,gameweek)` gegen die von 419/D113 gedroppte UNIQUE (jetzt `(player_id,fixture_id)`; fixture_id+league_id NOT NULL) → **42P10 + NOT-NULL beim 1. echten Spieltag** (Off-Season maskiert). BEFORE live bewiesen: `admin_resync_gw_scores(26)`→42P10.
> - **Fix (live applied, Migration `20260629140000`):** beide INSERTs exakt auf die korrekte, verdrahtete `sync_fixture_scores` gespiegelt (+fixture_id +league_id, ON CONFLICT (player_id,fixture_id) DO UPDATE, +player_id-Guard). Rest byte-treu (PATCH-AUDIT). `sync_fixture_scores` UNANGETASTET.
> - **Proof:** force-rollback GW26 (alle 7 Ligen) 2805 fresh/idempotent/0-null-FK; post-apply pg_get_functiondef fixture_now=t/stale=f/secdef+search_path erhalten; live `admin_resync_gw_scores(99)`→success/synced_count=0; vitest 81/81. Proof `proofs/453-*.txt`, Review `reviews/453-review.md`.
> - **Reviewer-Catch (Cold-Context = wertvoll):** mein Conflict-ILIKE-Grep „genau 2 stale" war strukturell unvollständig → **Writer-Enumeration** (`pg_proc.prosrc ~ 'INSERT INTO player_gameweek_scores'`) bewies 3 Writer; `admin_import_gameweek_stats` delegiert an `sync_fixture_scores` (safe). Lehre → errors-db.md **S453** (Writer-Enum statt File-/Conflict-Grep bei UNIQUE-Flip).
> - **🟡 Residual (§0 getrackt → dup-registry D-01b):** 3-Wege-Score-Write-Dup (cron Step4 / admin_resync / sync_fixture_scores = identischer INSERT 3×; auth-Kontext-Diff blockt naive Delegation) → **W2 Score-SSOT 1 Helper**.
> - **⏭️ NÄCHSTES (TEIL B, CEO-Wahl):** D-17 Ranking-Konsolidierung (scout_scores↔user_stats, L) · D-02 Bench-Geld-Leak (M) · W0 DB-Security · W2 Score-SSOT-Helper (453-Residual). TEIL-A-Rest K6/K7 (LOW) weiter offen.
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-29 (Teil 8) — K2.6 Memory-Modell + K2.2c beta-Docs KOMPLETT (Slice 452) → K2-EPIC „die EINE Wissens-Heimat" KOMPLETT.**
> - **CEO-Entscheid Anil:** Richtung = „TEIL A erst zu Ende" (vor TEIL B); K2.6-Modell = „Split nach Job + stale Dups weg" (moderat).
> - **Smoking-Gun (verifiziert):** Harness Auto-Memory (`~/.claude/projects/.../memory/`, machine-local, NICHT git) trug **stale Mai-Stubs** der live+versionierten in-repo-Files: `decisions.md` 332 Z./0 D-Einträge vs in-repo **4360/D117** · `session-handoff` Stand **2026-05-06** vs heute · `patterns` 840 vs 1685 · `ceo-approval-matrix` fehlte. = Drift-Falle R1/R4 auf Meta-Ebene.
> - **Modell (jetzt SSOT):** Harness Auto-Memory = **dünne Auto-Lade-Schicht** (Identität/Feedback/Status-Pointer) · in-repo `memory/` = **versionierte SSOT** (decisions D117/session-handoff/patterns/ceo-matrix/learnings, von CLAUDE.md 15×/8× referenziert) · `docs/knowledge/` = durables Domänen-Wissen.
> - **Ausgeführt:** (A) 6 stale Harness-Stubs `rm` (decisions/session-handoff/patterns/project_bescout_liga/beta-test-results/beta-testplan), echtes Auto-Memory intakt; Harness-`MEMORY.md` neu = ehrlich + Pointer-basiert (stale April-„Project"-Sektion [Slice 170!] → SSOT-Pointer, 5 pre-existing dangling + tote wiki/-Ref geheilt). (B) `memory/_HOME.md` + `.obsidian/` git-rm (Obsidian-Browse-Lack tot, cortex-index existierte ohnehin nicht). (C) 8 verwaiste beta-Test-Ops git-rm.
> - **KEEP verifiziert (NICHT pauschal — Verifikation fing es):** `beta-rollback-runbook`+`beta-sentry-alerts-runbook` (INDEX-geroutet aktiv) + **`beta-exit-criteria` RESTAURIERT** (= Input des VERDRAHTETEN `beta:metrics`-Scripts package.json:48; „alle non-INDEX = cruft"-Klassifizierung war falsch). gitignored PII `beta-tester-list` stehen gelassen (kein git-Recovery).
> - **Consumer geheilt (Schnitt-Regel):** `auditor.md:121` + `backlog.md` dangling geschlossen; `decisions.md` (append-only D5-Historie, erzählt ironisch GENAU dies) unangetastet. Gates: **knowledge:check HARD 0**, 0 dangling live, AC1-AC7 ✅. Proof `452-memory-split.txt` · Review `452-review.md` (self-review PASS).
> - **🟡 NEUE Residuals (getrackt, Schnitt-Regel — nicht in moderater Scope):** (1) **beta-metrics Dead-Tooling** (`scripts/beta-metrics.mjs`+`beta:metrics`+`beta-exit-criteria`) = verdrahtet ABER Beta abgebrochen → retire-oder-für-Launch-Metriken-repurposen **[CEO/Cleanup]**. (2) `memory/backlog.md` = stale April-Relikt (Stand 2026-04-22, voll superseded) → GC-Kandidat. (3) `autodream` dormant-Agent + `wiki-*` (nicht verdrahtet, Inputs schon weg) → „retire autodream" = Agent-Registry-Urteil. (4) `memory/errors.md` (harness 889 vs in-repo 158 divergent) → Merge→common-errors.
> - **⏭️ OFFEN = TEIL-A-Rest (beide LOW):** **K6** `src/types/index.ts` (2329 Z. Mono-File) nach Domäne splitten (Barrel-Pattern, tsc-Zwang) · **K7** `log.md`<Slice 400 + `decisions.md`<D100 → `_archive/` (Lade-Last; Vorsicht audit:knowledge INDEX-Range-Gate). **DANN TEIL B** (CEO-Wahl): D-01 🔴 42P10-Scoring-Landmine · D-17 Ranking-Konsolidierung · W0 DB-Security.
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-29 (Teil 7) — K2.5 Anker-Ref-Umbiegung KOMPLETT (Slice 451).**
> - **Recon-Befund: niedriger-Risiko als befürchtet** — durable Wissen ist schon kanonisch (decisions D104-D117 + treasury/fantasy). 23 Anker: 0 K-pure · 9 W (bleiben als Evidenz) · 13 S · 1 T. Map: `worklog/notes/k2.5-anchor-redirect-recon.md` (→ K2.6-GC).
> - **CEO-Entscheid: disease-register Option B** — bleibt tool-gekoppelt in `worklog/notes` (Move verworfen: operatives Living-Register + audit:knowledge-Gate-Churn). MASTERPLAN:64 annotiert.
> - **6 gelöscht** (git=Archiv): process-elite-prep · k2.3/k2.4-recon · 348-pro-stand · transactions-spec · bescout-liga-spec. docs/plans 5→3 (jarvis-cortex×2 → K2.6-defer, scout-card-spec = D100-Evidenz bleibt).
> - **Echter Drift gefixt:** `348-pro-stand` (superseded → `mock2pro-plan`) an 4 Live-Stellen (`workflow.md:245`-REGEL · `treasury.md:207` · `.husky/pre-commit:35` · `TODO.md:13`) + bescout-liga Spec-Row + 2 Provenance-Kommentare. **append-only decisions.md UNANGETASTET** (ADR-Evidenz 357/365/scout-card/workflow-ideal/E0-welle2 behalten → Pointer valid).
> - Gates: knowledge:check HARD 0 · audit:dup 0 Reg · **grep 0 live dangling**. **Reviewer PASS** (independent repo-grep bestätigt 0 dangling, append-only geschützt; 3 NIT/INFO). Proof `proofs/451-k2.5-anchor-redirect.txt` · Review `reviews/451-review.md`.
> - **⏭️ OFFEN K2 = K2.6 + K2.2c:** **K2.6** Memory-Modell [CEO] (`memory/`-Vault vs Auto-`MEMORY.md`; Prior-Art `E0-welle2` + `jarvis-cortex`×2 + `workflow-ideal-prep` [dangling intra-ref→GC] warten dafür) · **K2.2c** beta-Docs (12). Plan-SSOT: MASTERPLAN K2. **Parallel (CEO-Wahl):** Mock→Pro D-01 (🔴 42P10) · D-02 · D-17 · W0 DB-Security.
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-29 (Teil 6) — K2.4 wiki/-Konsolidierung KOMPLETT (Slice 450, wiki/ 21→0).**
> - **Wellen A-E** (Muster K2.3 harvest→canon-check→delete): **A** 8 Competitor-Files → 🆕`research/competitors.md` (Sorare-first; Canon-Heilung „Fee-Burn"→zirkulär D96, Credits/$SCOUT→D99) · **B** early-feedback → `gtm-strategy.md` · **C** scout-launch+business-model → `legal-classification.md` §6/§6.2 (Malta-vs-Litauen, Outsourcing, CASP-„keine-Lizenz"=CONTESTED; stale ~3K-Malta/Süper-Lig-Shift NICHT geerntet) · **D** 7 Produkt-Dubletten gelöscht · **E** 3 Infra + 4 READMEs + 1 Hook entdrahtet.
> - **Headline-Korrektheit:** `docs/knowledge/INDEX.md` (Routing-SSOT) zeigte auf 7 root-`wiki/`-Files als Kanon → der „SSOT" routete in den Orphan-Tree. Aufgelöst. **autodream-Kopplung verifiziert Non-Issue** (zielt auf `memory/wiki-*`, nicht root-`wiki/`). Reviewer **PASS** (grep-verifiziert 0/13 Stale geleakt; 3 NIT/LOW geheilt). knowledge:check HARD 0 · audit:dup 0 Reg · 0 live dangling. Proof `proofs/450-wiki-consolidation.txt` · Review `reviews/450-review.md`.
> - **⏭️ OFFEN K2 = K2.5 + K2.6 + K2.2c:** **K2.5** 18 Plan-Anker + `disease-register` → `knowledge` MIT Ref-Umbiegung (decisions/INDEX/treasury/handoff — höchstes Risiko, kanonische Schicht) · **K2.6** Memory-Modell [CEO] · **K2.2c** beta-Docs (12). Plan-SSOT: `MASTERPLAN.md` K2.
> - **🟡 Folge-Smell (klein):** knowledge:check flaggt 5 domain-Files SOFT verify-drift (treasury/fantasy/missions/reward-ranking/cross-domain-map) → kleiner Re-Verify-Pass, damit behaltenes Wissen ehrlich bleibt. **Parallel offen (CEO-Wahl, NICHT TEIL A):** Mock→Pro **D-01** (🔴 latent 42P10, bricht 1. echten Spieltag) · D-02 · D-17 · W0 DB-Security (Detail: `disease-register.md` + Teil-5 unten).
>
> ---
>
> **🟢 SESSION-CLOSE 2026-06-29 (Teil 5) — K2.3 docs-root-Konsolidierung KOMPLETT (Wellen D+E, Slices 448+449).**
> - **448 (D):** Gamification/Scaling-Harvest → 🆕`lessons/gamification-design-principles.md` (5 Design-Regeln + Verhaltensökonomie + Ticket-/Cosmetics-Balancing + Mystery-Box-Legal + „entworfen-nicht-gebaut") + 🆕`research/scaling.md` + Amazon-FOMO→`gtm-strategy` + 2 INDEX. 3 Quell-Docs weg. Reviewer PASS — Soll-Ist-Caveat geheilt (Design „Engagement→Tickets, nie Credits" widerspricht gebauter Engine die noch Credits mintet via `claim_mission_reward`/Streak/`claim_score_road` → markiert + Pointer reward-ranking §3).
> - **449 (E):** `COMPONENTS` + `player-card-system` **gelöscht (kein Harvest)** — Faktencheck (Code live): driftende Dubletten, KEINE heimatlosen Quellen. Registry-Wahrheit = CLAUDE.md §6 + Code-Barrel-Exports; Card-System lebt im Code (`PlayerKPIs` index.tsx:533 + `PlayerDisplay` variant `compact|card`). git=Archiv, KEIN Rettungs-File (würde neuen Drift schaffen). Self-review (Ops-Spur).
> - **→ docs/ root 18 → 0. K2.3 KOMPLETT (A-E).** knowledge:check HARD 0, audit:dup 0 Regression über beide Slices.
>
> **⏭️ OFFEN K2 = K2.4 + K2.5 + K2.6 (+ K2.2c):** K2.4 `wiki/` ✅ DONE (Slice 450 — s. Teil-6 oben) · K2.5 18 Plan-Anker (13 notes + 5 plans) + `disease-register` → `knowledge` MIT Ref-Umbiegung in decisions/INDEX/treasury/handoff (höchstes Risiko, kanonische Schicht) · K2.6 Memory-Modell [CEO] (`memory/`-Vault 1.3MB vs Auto-`MEMORY.md`) · K2.2c `beta-*`-Docs-Urteil (12, referenziert in auditor/errors-infra). Plan-SSOT: `MASTERPLAN.md` K2.
> **DANN K2.4 wiki/→knowledge · K2.5 Anker-Ref-Umbiegung · K2.6 Memory-Modell [CEO].**
> **🟡 Offene CEO-/Folge-Punkte (klein, nicht dringend):** (1) `success_fee_platform_bps` (BeScout-CSF-Schnitt 0-30 %, legal-classification §5.3; treasury.md realisiert ihn NICHT, CSF 100 % Holder) → CEO-Entscheid. (2) Smell `product-map.md:55` Polls 70/30 vs kanonisch 80/20 (`polls.md`/356) → XS-Slice. (3) Soll-Ist-Gap „Engagement-Rewards minten Credits statt Tickets-only" (jetzt in gamification-design-principles markiert, Phase-1-tolerierbar D99).
> **Parallel offen (CEO-Wahl, NICHT TEIL A) — diese Session gemeldet, volle Liste `worklog/notes/disease-register.md`:** Mock→Pro **D-01** (latenter `42P10`-Scoring-Bug, bricht 1. echten Spieltag) · **D-02** (Bench-Karten-Geld-Leak) · **D-17** (scout_scores↔user_stats divergent sichtbar) · W0 DB-Security (28 anon-SECDEF).
>
> ---
>
> **🟢 (vorige Welle) SESSION-CLOSE 2026-06-29 — TEIL A META-CLEANUP Welle 1 (Slices 439-443).** Workflow-Test bestanden (5 Durchläufe, jeder `.husky/pre-commit`-Gate grün: compliance/i18n/tsc/7 Audits; Ops-Lane-Routing korrekt; **2 faktenbasierte Plan-Korrekturen** — K1-Anker-Fund + K2.2-Müll-Korrektur). **~270 Dateien / >18.000 Z. / ~3 MB Akkretion weg, 6× gepusht, `main`==`origin` (`cf207c34`).**
> - **439 K1:** tote Tracker-Dubletten (root `session-handoff`/`docs/TODO`/`docs/WORKFLOW`) + 8 verwaiste notes. **439-Fund:** die ~13 übrigen notes sind LEBENDE Anker (decisions/INDEX/treasury) → K2.5, nicht Löschung.
> - **440 K4:** 16 root-Müll-Files (3× 0-Byte Heredoc-Reste, qa-Snapshots/Logs, dumps) + `.gitignore`-Prävention.
> - **441 K3:** `docs/plans` 147→5 (142 historische Specs gelöscht, git=Archiv [CEO]; 5 Anker → K2.5; `bes*.json`-Perf → MASTERPLAN W6).
> - **442 K2.1+K2.2:** `.agents/skills` (85 stale) + `bencium`-Repo (verwaister gitlink) + leeres `semantisch/` → EINE Skill-Heimat (`.claude/skills` 18).
> - **443 K2.2b:** 4 verbrauchte Multi-Liga-Backfill-Scripts + 5 Daten (`debug-payload` 220K + rollback) + `test.rtf` (CTO-Entscheid, Anil delegiert; −11.817 Z.).
>
> **K2-EPIC = die EINE Wissens-Heimat (6 Wellen, Plan in `MASTERPLAN.md` K2). OFFEN — die schwerere Hälfte (alles Urteil/Migration/CEO):**
> - **K2.3** docs-root Dubletten: `Context_Pack_v8`+`final-report-v3` = klar veraltet (löschen); **`SYSTEM-DESIGN-v2`+`gamification-v4-FINAL` = „FINAL/verbindlich"-betitelt, git 24. Juni → MIGRATIONS-Urteil** (Inhalt gegen `docs/knowledge` prüfen, NICHT blind löschen).
> - **K2.4** `wiki/` (21, inkl. Sorare-Competitor-Analysen) → `docs/knowledge/research`+`domain` (autodream-Agent pflegt wiki → Kopplung beachten).
> - **K2.5** 18 Plan-Anker (13 notes + 5 plans) + `disease-register` → `docs/knowledge` MIT Ref-Umbiegung in decisions/INDEX/treasury/handoff (kanonische Schicht, höchstes Risiko).
> - **K2.6** Memory-Modell [CEO]: `memory/`-Vault (1.3MB, Obsidian, getrackt) vs Auto-Memory (`MEMORY.md`) → 1 Modell.
> - **K2.2c** `beta-*`-Docs (12, Beta abgebrochen D111 aber in auditor/errors-infra/beta-metrics referenziert) → Urteil.
>
> **EINSTIEG NÄCHSTE SESSION:** `MASTERPLAN.md` K2-Wellen-Plan + dieser Anker. **Parallel offen (NICHT TEIL A, CEO-Wahl):** Mock→Pro **D-01** (latenter `42P10`-Scoring-Bug, §3, bricht 1. echten Spieltag) · W0 DB-Security · Produkt-Pivot Sorare-Ziel.
>
> **Engine-Fundament (Vorsessions):** Voll-Audit `wf_82fc04e4-733` → §0 Anti-Akkretions-Engine (432/D116) · MASTERPLAN=Plan-SSOT (433) · `audit:dup`+`disease-register` (434/D117). Werkzeug-Elite 436-438. Detail in `log.md`.
>
> ---
>
> **🟢🟢🟢 (Feature-Stand, PAUSIERT) — GW-LIFECYCLE-PER-LIGA-FORK KOMPLETT: Slices 427+428+429 DONE, committed+gepusht (`7ad622a4`), `main`==`origin/main`, `active.md`=idle. D115. Decision-Log D1–D115.**
> CEO-Entscheid Anil (diese Session, 4 Forks): **„GW = Per-Liga-Konzept, alle 3"** + Sequenz **Expand/Contract** + finalize **„Score≠Advance"**. Recon-Artefakt: `worklog/notes/gameweek-engine-recon.md` (Live-`pg_get_functiondef` D87; Money-Pfad `score_event` war schon liga-korrekt → die Schuld war Integrität/Klarheit, kein Geld-Bug).
> - **427 (C, M, Reviewer PASS, `aeaaae4e`):** `getFullGameweekStatus(leagueId)` + `useClubEventsData(clubId, leagueId)` liga-gefiltert + Loop `1..max_gameweeks` statt `1..38`. Fixt Phantom-GW 35-38 bei 34-Wochen-Ligen (BL/2BL/SL) + **latenten 1000-Cap** (`.select()` ohne range, 2438 Fixtures global; per-Liga 380<1000). Events-Liga-Filter via Club-in-Liga (`events.league_id` ist 209/210 NULL). Display-only/money-neutral. 6 neue Tests.
> - **428 (A, L, Reviewer PASS, `3d95d9f9`, Money-NAH — Expand-Phase):** `leagues.active_gameweek` = SSOT. `set_active_gameweek`-RPC **leagues-only** (kein `UPDATE clubs`) + Guard `>38`→`>COALESCE(max_gameweeks,38)` + `no_league`-RAISE; PATCH-AUDIT byte-treu (auth/club_admins-Guards + SECURITY DEFINER erhalten), ACL `{authenticated,service_role}`, **Force-Rollback Round-Trip: leagues=12, clubs frozen=38**. Cron `gameweek-sync` `get_active_gw` liest leagues + beide Advance-Stellen leagues-only (clubsToProcess={id}=alle Liga-Clubs). `getActiveGameweek`→resolve club→league (non-throw erhalten). Obsoleter `gameweek-drift.js`-Audit gelöscht + package.json + nightly-audit.yml entdrahtet. Migration `20260628120000`. **🚩 OFFEN: 428b** = `ALTER TABLE clubs DROP COLUMN active_gameweek` — **bewusst deferred (Anil Expand/Contract), erst NACH verifiziertem Vercel-Deploy** (DB-Migration wirkt sofort, deployter Cron-Code lag't → Drop-vor-Deploy bräche den nächsten Cron-Lauf). Spalte aktuell frozen+unread (kein Runtime-Reader, Reviewer-verifiziert). 428b-Restscope: DROP + DbClub-Type + 3 club.ts-Selects + 2 Seed-Scripts (`verify-squads`/`import-league` insert `active_gameweek:1`) + schema-contracts.test:265.
> - **429 (B, M, Reviewer PASS, `7ad622a4`, Money-NEUTRAL):** manueller `finalizeGameweek`/`simulateGameweekFlow` entkoppelt — scored + klont nur, ruft `setActiveGameweek` NICHT mehr (entfernt einen Advance-Write, `scoreEvent`-Minting unberührt). **Bug:** seit 428 rückte ein Club-Finalize via leagues-weiten RPC die GANZE Liga vor → überspringt un-gescorte Events anderer Liga-Clubs (Bundesliga 2 Clubs live) = verwaiste Rewards. Liga-Advance besitzen jetzt nur Cron + explizite AdminSettings-Aktion. AdminGameweeksTab re-fetcht `getActiveGameweek` (DB-Wahrheit) statt nextGameweek-Sprung. i18n `finalizeStep3` DE+TR truthful. Test invertiert (`not.toHaveBeenCalled`).
> - **Wissen verdrahtet:** D115 (decisions.md + INDEX D1–D115) · `.claude/rules/fantasy.md` Spieltag-Lifecycle (GW per-Liga + „advance pfad-abhängig: manueller Finalize score-only, Advance=Cron+AdminSettings").
> - **➡️ DIREKT-START NÄCHSTE SESSION (Post-Deploy, Anil-Wahl):** (a) **428b DROP** — sobald Vercel-Deploy von `7ad622a4` live ist (verifizieren z.B. via bescout.net AdminGameweeksTab BL zeigt 1..34): `ALTER TABLE clubs DROP COLUMN active_gameweek` + DbClub-Type + 3 club.ts-Selects + 2 Seed-Scripts + schema-contracts.test bereinigen (eigener S-Slice, grep-gestützt, S280-Removal-Achsen). (b) **427 AC-06 Live-Screenshot** (AdminGameweeksTab BL = 1..34, jarvis-qa). DANN **(1) Ranking-Konsolidierung** scout_scores↔user_stats [CEO-Quelle-Entscheid] ODER **(2) Welle 3** (Events/Aufstellung, Lineup-Datenmodell-Fork, Money/CEO). Money-Wellen = selbst (§3) + Live-functiondef vor Spec (D87) + Zero-Sum.
> - **CTO-autonome Folge-Smells (klein, optional):** Player-Domain `getClub(player.club)`-Freitext-Card-Identitäts-Cluster (PlayerHero/PlayerRow/TradingCardFrame, gleiche 6,6 %-Klasse wie 422-425) · `nextGw>38`-Hardcode in `createNextGameweekEvents:234` (gleiche 38-Klasse wie 427/428-Guard).
>
> ---
>
> **📜 Ältere Stände (Welle 1 + Welle 2 Detail, Abend 1-10 = Slices 416-426 + e2e-Walk) → vollständig in `worklog/log.md`.** Alle DONE+gepusht, im GW-Fork-Block oben + MASTERPLAN-Wellen-Tabelle zusammengefasst. (Stand-SSOT-Regel Slice 430: laufende Prosa nicht stapeln — Historie lebt in log.md.)

## ⏩ STAND 2026-06-27 (Teil 2) — ZUERST LESEN
**WELLE 1.4 KOMPLETT. 2 weitere Slices geliefert+gepusht (`main`==`origin/main`, zuletzt `ce6ad0bd`), `active.md`=idle:**
- **410** [Money/CEO] Club-Treasury-Ledger Quellen-Labels: Trigger `trg_trades_book_club_treasury` buchte JEDEN trades-INSERT pauschal `trade_fee` → 3-Wege-Discriminator (`ipo_id`→`ipo_fee`, `sell/buy_order_id`→`trade_fee`, sonst alle-NULL=P2P→`p2p_fee`). **Geldneutral** (get_club_balance bucketet alle 3 in `v_trade_fees`), kein FE/i18n-Change (UI `KNOWN_LEDGER_TYPES`+i18n DE/TR vorab vorhanden = klassischer „Teil-Konsolidierung"-Smell). force-rollback Zero-Sum + ACL erhalten, Reviewer PASS. Commit `98d6ecb6`.
- **411** [Doc] 1.4d Buy-Limit-Doc: stale `featureFlags.ts`-Kommentar geheilt → live **0 offene Buy-Orders** (41 hist. cancelled+refunded), **`SUM(wallets.locked_balance)=0` global** (Buy-Seite escrow-sauber); Fork-B (D112) im Flag verankert. Commit `277124a3`.
- **WELLE 1.4 = 407 Fee + 408 Vokabular + 409 Escrow + 410 Labels + 411 Buy-Doc — ALLE DONE.**

**✅ CEO-ENTSCHEID RESOLVED (Anil 2026-06-27):** Die 249.800 cents (4 Wallets) historischer buy-Offer-Refund → **STEHEN LASSEN** (Phase-1-Spielgeld D99 + Launch-Reset; RPC-Fix 409 stoppt künftige Leaks). Kein Refund-Slice.

**➡️ NÄCHSTER (Anil-Wahl, Welle 1 Trading bis auf evtl. Rest durch):** (a) **Welle 2 Spieltag/Scoring** [Money] — nächste Domäne, größter Mock→Pro-Brocken (Scores an GW-Nummer statt Fixture-gebunden, Datenmodell-Integrität; `mock2pro-plan.md` Welle 2) · (b) 1.5/1.6 Trading-Rest falls noch offen. CTO-Empfehlung: **Welle 2 starten** (Domäne für Domäne). Money-Wellen = selbst (§3) + Live-`pg_get_functiondef` VOR Spec (D87) + Zero-Sum.

**Offene Smell-Notiz (nicht gefixt, für später):** `get_club_balance` lumpt den IPO-85%-Erlös in den `trade_fees`-Bucket + i18n `ipo_fee`=„Erstverkauf-Gebühr" — „Gebühr" vs „Erlös" ist Wording/Bucket-Frage (Compliance/CEO), bewusst Scope-Out von 410.

## ⏩ STAND 2026-06-27 (Teil 3) — Welle 1 e2e-Vollständigkeit (Anil: 1.5+1.6 schließen → dann Live-Walk)
**Faktencheck gg. `mock2pro-plan.md`: Welle 1 war NICHT e2e-vollständig.** 1.1-1.4 ✅, aber **1.5 (MEDIUM-Cluster) + 1.6 (MEDIUM) offen**. Anil-Auftrag: erst 1.5+1.6 schließen, dann 1 zusammenhängender Live-e2e-Walk als Beweis.
- ✅ **412 (1.5b+1.5f) DONE** (`ac51aab2`): Offers-Tab Roh-Key/Roh-Error-Leaks (useOffersState 5× + OffersTab 2×) → übersetzt/`showError`; `idempotency_pending`→`idempotencyPending` (+i18n DE/TR). Geldneutral, tsc 0, self-review PASS.
- ✅ **413 (1.5a/c/d/e) DONE** (`80720552`) [Money/CEO]: die zwei Markt-Kauf-RPCs (`buy_player_sc` Markt/auto-cheapest ↔ `buy_from_order` gewählte Order) waren über 4 Dim gedriftet → vereinheitlicht: (d) Menge-zu-viel = **ABLEHNEN** (Anil-Entscheid; buy_player_sc war still-kappen) · (a) tier-Rate-Limit (buy_from_order war hart 20) · (c) fee_config created_at DESC (war club_id NULLS LAST) · (e) price_change_24h beide (buy_player_sc setzte es nicht; v_player +last_price). PATCH-AUDIT byte-treu, force-rollback Zero-Sum=0 beide (AC1 reject + AC2 price_change=-33.33 + buy_from_order fee_bps=600), Reviewer PASS, ACL erhalten. fee_config live=1 Row → 1.5c geldneutral.
- **→ WELLE 1.5 KOMPLETT.**
- ✅ **414 (1.6 OrderDepthView, Markt-Tab) DONE** (`9b7eb094`): `if (o.is_own) continue;` in askLevels+bidLevels. Wird in `TransferListSection` (Markt-Tab) gerendert.
- ✅ **415 (1.6 OrderbookSummary, Player-Detail) DONE + LIVE-VERIFIED** (`7e9afcfc`): `marketSells = sellOrders.filter(!is_own)` für bestAsk/askVol/Depth/Empty-State. **Live bestätigt (jarvis@Douglas): „BESTER ASK 200" (eigene Order) ist weg** (Widget versteckt sich bei own-only). **Lehre:** der Live-Walk deckte auf, dass 414 die FALSCHE Surface fixte (Markt-Tab ≠ Player-Detail) — Best-Ask wird an **mehreren** Stellen gerechnet (von-allem-N). Statische Verifikation hätte das NIE gefangen.
- **🟡 OFFENE 1.6-FOLGE-SURFACES (vom Live-Walk gefunden, eigene Slices):** (1) Player-Detail-Sektion „Marktplatz · sofort kaufbar" listet weiter EIGENE Order als kaufbar (`buy_from_order` lehnt „Eigene Order kaufen nicht möglich" ab → RPC-guarded, KEIN Geld-Bug, UX-Papercut). (2) Bid-Seite own-exclusion (`OfferWithDetails` hat kein `is_own` → Type/Service-Change). (3) PlayerHero `bestBid` (`TradingTab:126`).
- **1.5(b)-Rest:** „BSD"-/`'Max 20 Trades/24h'`-Prosa IN Money-RPC-Bodies = intern (User sieht via mapErrorToKey nie roh) → Hygiene, optional (413-Reviewer-INFO).
- **➡️ NÄCHSTES = der eigentliche Live-e2e-Walk** (IPO-Kauf → Markt-Kauf → Sell-Order → P2P-Gebot → annehmen → stornieren) auf bescout.net = Proof „Trading läuft vollständig" (Login `jarvis-qa@bescout.net`/`JarvisQA2026!`). Eingeloggt-Stand: jarvis ~12.397 CR, 29 Cards. Deploy von 412/414/415 ist LIVE. Davor/dabei optional die 1.6-Folge-Surfaces in 1 gebündelten Slice schließen.

---

### 📦 (vorige) STAND 2026-06-27 Teil 1 — Slices 406-409 (Referenz)
**Welle 1 Trading Härtung — 4 Money/UI-Slices (`2817e4cd`):**
- **406** Club-Treasury Single-Source (Counter-Orphan `treasury_balance_cents` raus + DROP; 3× Zero-Sum; S406).
- **407** P2P-Fee = 6 % wie Markt (3,5/1,5/1; fee_config+accept_offer+UI+Docs; Zero-Sum).
- **408** Trading-Vokabular „Markt sofort kaufbar" vs „Kaufgebote" (P2P) + tote Sektion 6 raus (DE+TR Live PASS).
- **409** P2P-Offer Escrow-Robustheit — Doppelbelastung + Geld-Leak über 4 Stellen gefixt (4× Zero-Sum diff=0; S409 + trading.md Escrow-Pattern).
- **D112** Orderbuch-Architektur = Fork B (orders+offers beide behalten, getrennt härten). Karte `worklog/notes/406b-orderbook-offers-map.md`.

---

## 🚀 NORDSTERN: E-MOCK2PRO (Beta ABGEBROCHEN, 2026-06-26, D111)
**Anil-Pivot: Beta gestoppt (zu viele Fehler, nichts lief vernünftig zusammen). „Nichts ist heilig" → ganze Codebase auf Profi-/Sorare-Niveau glattziehen, Domäne für Domäne. Liga + Feature-Bau pausiert. Sommerloch = Tiefenarbeit-Fenster. Re-Launch erst NACH dem Programm.**

**✅ Diese Session fertig:** Bestandsaufnahme **aller 7 Domänen** (Trading · Spieltag/Scoring · Events/Aufstellung · Follow · Geld/State · Performance · Design) → `worklog/notes/mock2pro-audit.md`. **Finaler 7-Wellen-Plan** → `worklog/notes/mock2pro-plan.md` (Priorisierung Anil: **Domäne für Domäne komplett**). Programm-Memory: [[project-mock2pro-program]]. Decision: **D111**.

**3 Grund-Ursachen (alle 11 Beta-Schmerzen führen darauf):** (1) Teil-Konsolidierung „von allem zwei" · (2) Datenmodelle ohne erzwungene Integrität (Aufstellung 16 Spalten / Scores an GW-Nummer statt Fixture) · (3) Client-only-Architektur (Cold-Start). **Fundament ist solide — KEIN Neubau**, nur Durchsetzung „eine Quelle" + 2 Datenmodell-Fixes + 1 Architektur-Hebel.

**Wellen-Reihenfolge (Anil, Domäne für Domäne):** 1 Trading → 2 Spieltag/Scoring → 3 Events/Aufstellung → 4 Follow → 5 Geld/State → 6 Performance → 7 Design. CEO-Gabelungen offen: Lineup-Datenmodell + Entry/Lineup-Entkopplung (Welle 3). Money-Wellen = selbst (§3) + Live-`pg_get_functiondef` VOR Spec (D87) + Zero-Sum.

**Welle-1+2-Fortschritt (KOMPLETT, 403-429):** Detail → GW-Fork-Block oben + `worklog/log.md` + MASTERPLAN-Wellen-Tabelle. D112 (Orderbuch Fork B) · D113 (Scores fixture-bound) · D114 (Synergie) · D115 (GW per-Liga). **Geseedet PERMANENT (NICHT aufräumen):** [404] Tiren-Order `bc63d013` (rem 4) · [405] jarvis-Order Douglas @200 CR `96d3ce14` (OPEN rem 1) + bot031 @300 CR `9405452f` (filled), jarvis hält 4 Douglas, Floor Douglas 200 CR.

**Status: idle, main==origin/main.** Vor Start: `git status --short --branch && git log --oneline -8`. Audit-Churn gitignored. Diesen Handoff IMMER zuerst lesen. **Teaching-Mode durchgehend (1-3 Sätze Klartext VOR Tools). Nie verfrüht „bereit/launch-ready" ([[feedback_no_premature_ready]]). Schlecht gelöste Patterns proaktiv melden ([[feedback_report_design_smells]]).**

---

### 📦 (vorige) Session 2026-06-26 (Abend) — e2e-Audit + Slice 401/402/D109/D110 (Referenz)
**Status war: idle — e2e-Durchsetzungs-Audit + Slice 401 + 402 + D109 + D110, alle gepusht (zuletzt `b4a10eb1`).**

## 🎯 SESSION 2026-06-26 (Abend) — e2e-Durchsetzungs-Audit + RAUS real bewiesen
**Anil-Frage „alles seit Mock→Pro wirklich e2e durchgesetzt?" → systematisch beantwortet.**

### ✅ e2e-Durchsetzungs-Audit (Slice 401, Methode = D110)
- 4 parallele Verifikations-Agents prüften ALLE Slices 329–400 gegen Live-DB + Code + i18n (jede Behauptung mit Evidenz). **Kernbefund: neue Geld-/Feature-Maschine ist e2e VERKABELT — keine Build-without-Wire-Löcher.** Befund-SSOT: `worklog/notes/401-e2e-enforcement-audit.md`.
- **3 echte Funde behandelt:** (1) Code-Drift — Slice-400-„restlos" war 1 tsc-unsichtbare Fläche zu kurz (`AdminEventFeesSection.tsx:20` toter `creator`-Key) → entfernt. (2) Stale-Tracker-Fakten — `referral_reward` „ohne RPC" (FALSCH, feuert real) + Research „dormant" (lebt) → s7-Tracker korrigiert, reconciled 354→401. (3) alle offenen Punkte in 6 Tracker verankert.

### ✅ Treasury-RAUS e2e REAL bewiesen (Slice 402, Money/CEO)
- Der EINZIGE substantielle Gap aus dem Audit: RAUS-Kanäle (376/377/378) waren bewiesen-korrekt aber NIE real gelaufen (0 Ledger-Rows). **`close_monthly_liga('2026-05-01')` live ausgeführt** (CEO-approved): `total_paid 3.575.000 cents`, **Zero-Sum** (Topf 50.018.397→46.443.397 = Σ 15 liga_reward-Tx = 1 echte `monthly_liga`-Debit-Row), 15 winners + 515 snapshots. **Mai 2026 idempotent-gesperrt (permanent — NICHT aufräumen).** Proof `402-raus-liga-payout.txt`. RPC byte-identisch zur 376-Baseline (kein Code-Change).
- **⏳ analog real noch offen (niedrig):** 1× echter `bescout`/`special`-Event-Settle (377/378) — braucht ein prized Event das live durchläuft.

### ✅ Reward-Smells geprüft → D109 (CEO bewusst akzeptiert, KEIN Code-Fix)
- Live-Lauf zeigte 2 Reward-Smells: (a) Top-3 fix nach Rang ohne Mindest-Delta>0; (b) `overall`-Dim dupliziert Einzel-Dims (Mehrfach-Kassieren). **Anil-Entscheid: beide Status quo** (Rang-Reward + overall-Mehrkampf bleiben).
- **CTO-Befund (faktenbasiert):** der hässliche analyst-Negativ-Payout (alle 128 negativ, Geld für −20) ist **KEIN Reward-Bug, sondern Mock-Daten-Artefakt** — `scout_scores.season_start_analyst` uniform 500 geseedet, echte Scores 450–480. → **S7/Launch-Reset-Daten-Punkt**, verschwindet beim echten Saison-Reset.

## ➡️ NÄCHSTER: (C) S7 Mock→Pro (Anils Eröffnungsanliegen) ODER Event-Backlog
**Geld-Maschine-Stand:** E3 Plattform-Treasury KOMPLETT (REIN 5/5 + RAUS 3/3, Monats-Liga jetzt **real durchflossen**). E5 Event-Modell KOMPLETT bis 400.
- **(C) S7 Mock→Pro** — jetzt mit scharfer Audit-Evidenz (`s7-phase3-remaining.md` Block-2/3 präzisiert): **3 TOTER-CODE-Kandidaten** (aktivieren/löschen, CEO pro Stück): Creator-Fund+Ad-Revenue-Share (`creatorFund.ts`/`adRevenueShare.ts`, Calc ohne Distribution/Cron) · Wildcard-Earn-Economy (`earn_/spend_wildcards`, 0 Consumer) · Club-Missionen (`mission_definitions` 0 Rows). **2 Konsolidierungen:** scout_scores↔user_stats · club_votes↔community_polls. **+ Daten-Punkt** `season_start_analyst`-Reset. Vorschlag-Start: Creator-Fund+Ad-Revenue (größter Brocken) kartieren → CEO-Entscheid.
- **Event-Backlog:** E-5 Ticket-Events (M, Equipment-Gewinn — Anil muss „Equipment" definieren) · E-6 Creator/Sponsor-Flow (L, Money/CEO) · E-7-Rest Freiform-Reward-Editor (XS-S).
- **Treasury-Rest (niedrig):** bescout/special-Event-Settle real beweisen (s.o.).
- Anker: `worklog/notes/401-e2e-enforcement-audit.md` · `s7-phase3-remaining.md` · `event-creator-liga-epic.md` · `decisions.md` D104-D110.

---

## 📦 (vorige) Slices 399/400 — Referenz
- **Slice 400** (`3899c289`): E-7 creator-Drift restlos über 11 Flächen entfernt + DB-DELETE `event_fee_config('creator')` + `chk_event_type` verengt (401 schloss die 12. tsc-unsichtbare Fläche). Predictions = KEIN Smell.
- **Slice 399** (`ea27cfe3`): E-4b Teil 2 — User-Events end-to-end nutzbar (Discovery + F2/F3 + Cancel-UI + Admin-Gebühr + min_entries), Live AC1-AC6 PASS. Geseedet (permanent): User-Event `7052f7d7` (GW34) + Cancel-Test `fe8d43b2` (GW35).

---

## (vorige) ✅ Slice 397 E-4b Teil 1 DONE (2026-06-26, Money-nah) — LIVE bewiesen
- **Verkabelt den toten E-4a-Geldkern:** echter Builder (`CreateEventModal`) → `create_user_event` via Service `createUserEvent` + Hook `useCreateUserEvent` (S371). 3 CEO-Entscheide: Credit-Eintritt entkoppelt+sichtbar (`type==='user'`), jeder User darf erstellen, Split 397/398. Typ-Union `'user'` (5 Lookups), errorMessages 11 Codes, i18n DE/TR.
- **Live-Verify (bescout.net, ali):** Event erstellt, ali −5000 / Topf +5000 (Zero-Sum, `event_create_fee`), Header 11.000→10.950 sofort (S371), entry_fee=1000 cents (kein ×100-Bug), Badge „Community". Reviewer PASS. Proof `397-service-test.txt`.
- **🚩 3 PRE-EXISTING Funde (NICHT 397, eigene Slices):** **F1 [MEDIUM, GLOBAL] BenchRow.tsx 9 fehlende `fantasy.bench*`-Keys** (de+tr) → 95 MISSING_MESSAGE + **Roh-Key-Leak in der UI**, trifft JEDES Event mit Lineup-Bench (seit Feat 195d) → schneller Fix-Slice 18 Strings. **F2/F3 [LOW]** EventCard/Detail-Kosten-Meta zeigt `{ticket_cost} Tickets` währungsunabhängig (scout→falsch „1000 Tickets") → 398.

## ✅ Slice 398 F1-Quickfix DONE (2026-06-26, `fbf1e094`) — bench-i18n
- 9 fehlende `fantasy.bench*`-Keys × DE+TR ergänzt → globaler Roh-Key-Leak im Lineup-Builder behoben. **Live-verifiziert:** EventDetail-Bench rendert „TW"/„Ersatz 1-3", Console-Errors **95 → 0**. XS, self-review.

## (erledigt in 399) ~~E-4b Teil 2~~ → s. Resume-Anker oben (Slice 399 DONE).
- Geseedetes Live-Artefakt (permanent, NICHT aufräumen): User-Event `7052f7d7-9baf-4714-8665-ffc31ef88f34` (ali, GW34, jetzt `running`) + Topf-Einträge `event_create_fee`.

---

## (vorige) ✅ Slice 396 E-4a DONE (2026-06-26, Money/CEO) — Modell V3 (Anil-Korrektur beim BUILD)
- **Modell V3 (D108 korrigiert):** Anil verwarf beim BUILD den Seed/Start-Pot („Schrott"). Gebaut: **kein Seed** · Ersteller zahlt NUR die Erstell-Gebühr (50 Cr, admin via `set_user_event_create_fee`) → Topf · **Pot = Σ Teilnehmer-Eintritte** (`event_fee_config('user')=0/0`, kein Schnitt) · BeScout verdient nur über die Gebühr · Ersteller spielt mit = zahlt Eintritt.
- **Gebaut (4 Migrationen):** `create_user_event` + `cancel_user_event` + `set_user_event_create_fee` + `score_event` user-Zweig (Pot=Σ Eintritte, charge, FLOOR-Rest→Topf) + `rpc_save_lineup` Wildcard-COALESCE-Fix (380-Vormerkung erledigt) + Schema (events.type+'user', min_entries, `platform_event_config`, scout_events_enabled=true). **3 latente Pre-existing-Bugs mitgefixt:** `event_entry_lock`+`fantasy_reward` fehlten im tx-CHECK, `chk_event_type` brauchte 'user' (nie in Prod gefeuert).
- **Beweis:** force-rollback AC1-AC11 + Rest→Topf + Idempotenz, **Zero-Sum diff=0** in 3 Configs; PATCH-AUDIT (3 Trigger md5 unverändert, non-user byte-identisch); AR-44 ACL sauber; tsc+vitest 1662 grün. Reviewer **PASS** (`worklog/reviews/396-review.md`). Proof `worklog/proofs/396-money-smoke.txt`.
- **Keine geseedeten Live-Artefakte** (alle Smokes BEGIN…RAISE=Rollback; Topf live unverändert).

## ➡️ NÄCHSTER: E-4b (Builder-UI) ODER Backlog (Anil-Wahl)
- **E-4b (M, UI — entkoppelt von Money, kann FE-Agent):** `CreateEventModal` entmocken → ruft `create_user_event` (Service+Hook neu) · Cancel-UI → `cancel_user_event` · Admin-Gebühr-Slider → `set_user_event_create_fee` · **EventType-UI-Union-Kaskade** (`DbEvent.type`+`EventType`+'user' → zieht `EventScopeBadge.TYPE_CONFIG` + `EventCategoryCards`-Record + `helpers.getTypeStyle` nach, tsc-Zwang) · **JoinConfirmDialog** Money-Branch (hinter `PAID_FANTASY_ENABLED` versteckt → für Credits-Eintritt sichtbar machen) · öffentliche Discovery + Live-Pot-Vorschau · **`mapErrorToKey` für neue Reject-Codes** (auth_uid_mismatch/insufficient_balance/min_gt_max/… sonst generic-Toast, S393) · Cache-Invalidierung (`['events']`+`['wallet']`+`/api/events?bust=1`) in den neuen Hooks · `min_entries` in die 3 expliziten Select-Listen (`events.queries.ts:25,38,126`) + `DbEvent`-Type · orphan `event_fee_config('creator')`-Cleanup. Impact-Detail: `worklog/impact/396-user-events-money-core.md`.
- **Offene LOW aus Review (deferred, money-neutral):** cancelled User-Event ohne `scored_at` ist von `score_event` re-betretbar (0 entries/lineups → kein Geld) → optional „terminal status guard in score_event".
- Anker: `worklog/notes/event-creator-liga-epic.md` (E-4/E-5/E-6/E-7) + `decisions.md` D108 V3.

## ✅ Vorige Session (2026-06-26) — 395 DONE + E-4-Alignment
- **Slice 395 DONE** (`cf973238`/`dddff999`): Lineup-Reject-Coverage komplett (22 restliche `rpc_save_lineup`-Codes regel-spezifisch DE/TR, Reviewer PASS). rpc_save_lineup-Reject-Coverage damit komplett (nur dynamischer Toast-Kontext bleibt Folge-Slice via Throw-Refactor `lineups.mutations.ts:62`).
- **E-4-Alignment komplett** → D108 + Epic-Update + Spec 396. (393/394 davor DONE, E-3-Regelsatz komplett.)
- **Bekannt SOFT (Nightly, kein Blocker, NICHT echter Drift):** `audit:knowledge:check` flaggt `missions.md`/`reward-ranking.md` verify-drift — Artefakt der Datums-Heuristik (neue Migrationen berühren diese Domänen nicht; `verified-against` bewusst nicht blind gebumpt, §1).

## 🎯 SESSION-CLOSE 2026-06-26 (spät, sauber) — E-3-Regelsatz KOMPLETT

**4 Slices komplett geliefert + gepusht** (389 mv_max, 390 mv_min+max_pos, 391 nationality_iso, **392 nation_in+max_per_nation**) — alle Reviewer PASS, force-rollback grün, Knowledge verdrahtet, main == origin/main, working tree clean. **Letzter HEAD = `ed8e8019`.**
- **DISTILL geprüft:** alle Lehren = Code-Patterns/Feature (BIGINT-Overflow, GENERATED-Spalte zero-drift, TS↔SQL-Drift, **Array-Regel-Zweig mit CONTINUE vor numeric guard**) → in `errors-db.md` S389/S390/S391/**S392** + `fantasy.md` (Regeln 4/5/6/**7/8**) verdrahtet. **Kein neuer `D<n>`** (alles in D104/D107-Scope; die Picker-Quelle „kuratiert statt DB-distinct" ist ein CEO-Produkt-Detail, in Spec/Epic festgehalten, kein Strategiewechsel). Arbeitsweise-Memory aktiv: [[feedback_report_design_smells]].
- **➡️ NÄCHSTE SESSION = der gebündelte Playwright-Durchlauf** (s. Resume-Anker oben, Z.28-31) ODER E-4. Beides offen, Anil-Wahl.

## 📦 (vorige Session) — E-3-Regel-Erweiterungen 386/387/388

**Diese Session (2026-06-26) — 3 Slices + UI-Verify, alle gepusht, CI grün. HEAD = `6b7330da`.**
- **✅ Slice 386 (`aa8f695a`):** E-3 **Alters-Fenster** (`age_min`/`age_max`, Starter+Bank, fail-closed bei age NULL). **Fundament-Fix:** Wert-Bound von global `1..11` (385-Bug) auf **pro Regeltyp** gezogen. 15/15 force-rollback, Reviewer PASS, **AC-13 UI-live PASS** (beide Builder).
- **✅ Slice 387 (`1b894543`):** Compliance-Fix `kazanılır`→`elde edilir` (MASAK-Verstoß aus Slice 374, CI war seit 374 rot). wording-compliance 9/9 grün.
- **✅ Slice 388 (`7cabc155`):** E-3 **Min-pro-Position** (`min_per_position`, Formations-Steuerung — CEO Min statt Max). Zählt **Starter nach `players.position`** (Startelf-Slots server-seitig NICHT positions-validiert → ATT-Spieler im DEF-Slot zählt als ATT). Positions-geschlüsselte Regel `{type,position,value}`, LineupRule→Union. 13/13 force-rollback, Reviewer PASS, **AC-13 UI-live PASS** (beide Builder).
- **➡️ NÄCHSTER = E-3-Regel-Erweiterung `nation_in`/max-pro-Nation** (Daten: nationality 95,5%, 168 Länder; mehr UI = Multi-Select) **ODER `mv_max_eur`** (Underdog; MV 86,4%, **Null-Edge entscheiden** = fail-closed vs durchlassen) **ODER `max_per_position`** (trivial, Spiegel von 388) **ODER E-4 User-Events** (L, Money/CEO). Muster = 386/388 (Validator-Branch + JSONB-Serialisierung, kein Schema-Change). Money-nah → Live-functiondef VOR Spec (D87), force-rollback-Smoke, Reviewer-Pflicht.
- **Daten-Check (verifiziert 2026-06-26):** players.age 99,4% · nationality 95,5% · market_value_eur 86,4% · position 100% — alle Folge-Regeln baubar.
- **Scope-Divergenz merken (fantasy.md/errors-db S388):** min_per_own_club + min_per_position = **Starter-only** (Komposition); age = **Starter+Bank** (Eignung).

---

## (vorige) HIER ANKNÜPFEN — E-3-Regel-Erweiterungen ODER E-4 (Anil-Wahl)
- **✅ Slice 385 DONE (`107282d1`):** D107 Topf 2. `events.lineup_rules` (jsonb) + generischer Validator in `rpc_save_lineup` (Weg B: fail-closed bei unbekanntem type, Wert-Bounds 1..11 mit Regex-Guard VOR `::INT`-Cast, läuft VOR INSERT+Wildcard-Move) + Pilot-Regel `min_per_own_club` (feste Zahl, CEO-Entscheid Anil — deckt sich mit `max_per_club`). Read (3 Selects+`*`+DbEvent+FantasyEvent+Mapper+`LineupRule`-Type), Write (createEvent+EDITABLE_FIELDS 26→27/25→26+Klon+minPerOwnClub-Serialisierung), Builder-Input beide Admins, Toast+i18n DE/TR. Migration `20260625220000`. Knowledge fantasy.md (Bedingungs-Tabelle + Zwei-Töpfe-Note). Reviewer 3 NIT (kosmetisch/Scope-Out, `385-review.md`).
- **✅ AC-12 UI post-Deploy ERLEDIGT (2026-06-25):** Club-Admin-Builder (`/club/sakaryaspor/admin`→Events→Neues Event) live verifiziert via browser_evaluate — Label „Min. Spieler vom eigenen Verein" rendert (i18n `t()` aufgelöst), **kein MISSING_MESSAGE / Raw-Key-Leak** (S333), Input `type=number min1 max11 inputMode=numeric placeholder="Keine Regel"`, 0 Console-Errors. Platform-Builder = identische Komponente, Label DE-hardcoded (MISSING_MESSAGE strukturell unmöglich). → **Slice 385 AC-1..AC-12 ALLE PASS, voll-DONE.** (Headless: Klick-Overlay + Screenshot-Quirk → DOM-Evaluate als konklusiver Beweis; PNGs gitignored.)
- **➡️ NÄCHSTER SLICE = E-3-Regel-Erweiterungen** (je winziger Folge-Slice, KEIN Schema-Change dank JSONB — nur neuer CASE-Zweig im Validator + Builder-Feld + Toast-i18n): `age_max`/`age_min`/Alters-Fenster · `nation_in`/max-pro-Nation · `mv_max_eur` (Underdog) · `position_quota`. **VOR Bau: Daten-Check** — Alter/Geburtsdatum + Nationalität müssen auf `players` verfügbar sein (`market_value_eur` existiert); sonst Scraper/Spalte-Slice zuerst. ODER **E-4 User-Events** (L, Money/CEO). Money-nah → Live-functiondef VOR Spec (D87), force-rollback-Smoke, Reviewer-Pflicht. Pattern-Vorbild = Slice 385 (Validator-Block-Mechanik + JSONB-Serialisierung im Form).
- Anker: `worklog/notes/event-creator-liga-epic.md` §3b/§5 (E-3-Block) + `decisions.md` **D107**.

## ✅ Diese Session (2026-06-25 spät) — D107 festgehalten + E-3 Türsteher (384) DONE
- **NEUE ARCHITEKTUR D107 (`memory/decisions.md` + `event-creator-liga-epic.md` §3b, INDEX-Range D1–D107):** Event-Bedingungen = **zwei Töpfe**. (1) **Eintritts-Türsteher** (wer darf rein: Follower/Fan-Rang/Abo/Stufe) = **feste Spalten** in `rpc_lock_event_entry`. (2) **Aufstellungs-Regeln** (welche Karten ins Lineup: Alter/Nation/min-vom-Verein/Marktwert/Position) = **JSONB `lineup_rules`-Regel-Liste** (Weg B, EIN generischer Validator in `rpc_save_lineup`, neue Regel = kein Schema-Change). Creator-zentrierter Builder + Echtzeit-Treffer-Anzeige. Anil-Wunsch „einfach aber mächtig, wildeste Kombinationen". Anil hat Weg B + Claude-Ideen (MV-Deckel, Positions-Quote, Alters-Fenster, max-pro-Nation) freigegeben.
- **✅ Slice 384 DONE (`7bf23383`+`f56019c2`):** E-3 **Türsteher** (Topf 1). `events.requires_follow` (BOOLEAN) + `events.min_fan_rank_tier` (TEXT, 6-Tier-CHECK) + 2 Gate-Blöcke in `rpc_lock_event_entry` (Spiegel Poll-356), nur bei club_id, fail-closed, VOR Geld. PATCH-AUDIT 8/8, force-rollback Money-Smoke AC1-AC7 (kein Geld bei Reject), UI-live beide Builder (0 Console-Errors, kein MISSING_MESSAGE), Reviewer PASS (2 NIT bewusst nicht geheilt — s. `384-review.md`). Migration `20260625210000`. **Nebenwissen:** Follow-INSERT triggert `club_followers_recalc_fan_rank` (S345) → erzeugt fan_rankings-Zeile (im Smoke berücksichtigt).

> _(Stale-Anker „E-3 Regel-Listen-Fundament" entfernt — das ist Slice 385, jetzt DONE; aktueller Anker steht oben unter „HIER ANKNÜPFEN — E-3-Regel-Erweiterungen ODER E-4".)_

**✅ AC11 (UI Playwright post-Deploy) ERLEDIGT (2026-06-25):** Liga-Tab live verifiziert — „Pro-Liga-Rewards"-Card rendert alle 7 Ligen (Default 1000/500/250), neuer „Monat abschließen"-Text, 0 Console-Errors (kein MISSING_MESSAGE). Write-Pfad `set_liga_reward_config` live bewiesen (Bundesliga #1→2000 gespeichert, „(Default)" verschwand, Test-Zeile danach gelöscht). Proof `383-money-smoke.txt` §E + `383-admin-liga-rewards.png`. → **Slice 383 voll-DONE, AC1-AC12 alle PASS.** (Winner-Liga-Badge erst sichtbar nach erstem echten Monatsabschluss — kein offener Punkt.)

### ✅ Diese Session (2026-06-25) — E-2b (383) DONE
- **✅ E-2b DONE — Slice 383:** Pro-Liga-Payout. `close_monthly_liga` CREATE OR REPLACE (gegen Live-Baseline D87): globaler 4-Dim-Block byte-identisch (Konstanten 500k/250k/100k + overall-Median + Idempotenz, PATCH-AUDIT S356), NEU Pro-Liga-Manager-LOOP NACH global / VOR Coverage — Ranking = exakt `rpc_get_season_ranking`-Aggregat (Display==Payout), nur manager-Dim (trader/analyst global). **CEO-Entscheid (AskUserQuestion):** (1) **zusätzlich** zum globalen Payout (Doppel-Payout gewollt), (2) Beträge **pro Liga einzeln**, (3) Default **100k/50k/25k cents** (→ D106 Umsetzung dokumentiert).
  - Schema additiv: Config-Tabelle `liga_reward_config` (league_id×rank1/2/3 cents, CHECK monoton ≥0, fehlend=Default, RLS 4 Ops) + `league_id` auf `monthly_liga_snapshots/_winners` + UNIQUE **`NULLS NOT DISTINCT`** (globale NULL-Idempotenz erhalten). Globaler Winner-Insert auf `league_id IS NULL` eingeschränkt (S383-Pattern).
  - RPCs: `get_liga_reward_config` (Helper) + `set_liga_reward_config` (platform_admin-Gate, AR-44) + `get_monthly_liga_winners` DROP+CREATE additiv `league_id`/`league_name`. Frontend: Service/Hooks + AdminLigaTab Reward-Editor + Winner-Liga-Badge (Admin DE-hardcoded, S196-exempt).
  - **EIN zero-sum Debit** deckt global+pro-Liga; Coverage-Check VOR Lock; Idempotenz erhalten. Reviewer **PASS** (3 NIT). Money-Smoke AC1-AC10 force-rollback PASS (Zero-Sum pot_delta=debit=total_paid=3.675.000; AC5 Display==Payout; AC7 Config wirkt; AC8 insufficient_treasury→0 Persistenz). Migration `20260625200000`. Proof `383-money-smoke.txt`. Knowledge errors-db **S383**.
  - **Keine geseedeten Live-Artefakte** (Smokes BEGIN…ROLLBACK; Topf live unverändert).

### ✅ Diese Session (2026-06-25) — E-2a (381) + E-1b (382) gebaut, beide DONE
- **✅ E-2a DONE — Slice 381** (`0532cc21`+`f6dfa18c`): BeScout-Saison Begriffs-Umzug (user-facing „Liga"→„BeScout-Saison": `rankings.title`, `fantasy.seasonBadge` EventCard-Badge, `profile.scoutCardSeasonLabel`; DB-Spalten unverändert, D105) + **Pro-Liga-Ranglisten-Anzeige**. Neue read-only RPC `rpc_get_season_ranking` (SEC DEFINER, JSONB, anon-gesperrt) + Service `getSeasonRanking` (throw) + Hook `useSeasonRanking` + Widget `LeagueSeasonLeaderboard` (Umschalter Gesamt/Pro Liga, `useLeagueScope`-SSOT). KEINE Payout-Änderung. Reviewer PASS (2 NIT). **UI LIVE PASS** (DE „BeScout-Saison"/TR „BeScout Sezonu", Mobile 393px, Gesamt-Board=30, Pro-Liga Bundesliga=312/268/240, leere Liga=Empty). Migration `20260625190000`. Knowledge: `bescout-liga.md` Update-Block.
  - **Geseedetes Demo-Event (permanent, NICHT aufräumen):** `96946116-1651-4fd2-aa65-76afa07f5832` (Bundesliga, is_liga_event, ended, prize_pool=0 → money-neutral, Topf unberührt 50.003.397). 3 Lineups jarvisqa 312 / bot001 268 / bot002 240. **Seed-Lehre:** Demo-Lineups brauchen echte Spieler-Slots ODER total_score NACH dem Scoring-Cron nachsetzen (Cron nullt scorelose Lineups; scored_at-gegated → hält).
- **✅ E-1b DONE — Slice 382** (`6ec80cdf`+`5879ade1`): Lineup-Picker-Liga-Vorfilter (zeigt nur Liga-Spieler + Hinweis „Nur {Liga}-Spieler", spiegelt `rpc_save_lineup`-Gate exakt via `clubId→clubs.league_id`, fail-closed, Starter+Bank) + Club-Admin-Liga-Picker (alle Ligen + Offen, CEO). Neues `FantasyEvent.boundLeagueId` (= `events.league_id`, getrennt von Vereins-`leagueId`). Reviewer REWORK→GEHEILT (S333: leagueBinding-Keys nach `admin`-Namespace verschoben). **Club-Admin-Select LIVE PASS** (Label „Liga-Bindung", kein MISSING_MESSAGE, 7 Ligen+Offen). Picker-Filter = Reviewer-Logik-verifiziert (Live-Walk braucht offenes liga-gebundenes Event + Multi-Liga-Holdings = Folge-Verify offen).
  - **🔴 2 latente Bugs nebenbei gefixt:** (a) **S200** — Events-Read-Query (`events.queries.ts`, 3 Selects) zog `league_id` nicht → `boundLeagueId` immer null → Filter inaktiv; ergänzt. (b) **Pre-existing CI-Rot aus 380** — `EDITABLE_FIELDS`-Count-Assertions (upcoming 23→24, registering 22→23) seit `league_id`-Addition stale (CI rot, nur in CI sichtbar); nachgezogen.
- **Offene Folge-Slices:** **E-2b** (jetzt, s.o.) · **E-1b-Picker-Live-Walk** (Logik abgesichert) · **E-4-Vormerkung (380-Review):** Track-F-Wildcard-Lookup `club_id→clubs.league_id`; bei künftigen vereinslosen Events auf `COALESCE(events.league_id, club→league)` umstellen (heute kein Treffer).
- **Keine geseedeten Live-Artefakte aus 380** (Smoke war BEGIN…ROLLBACK).

## ✅ E3 Plattform-Topf — REIN komplett (5/5) + RAUS 3/3
- **REIN (Fees, voller Auffang 100% D98, je Zero-Sum live):** Trading 358 · IPO 360 · Polls 363 · Research 364 · Bounty 365 (+P2P).
- **RAUS (Escrow/Debit aus Topf, Zero-Sum, `score_event`/`close_monthly_liga` minten nicht mehr netto):** Monats-Liga 376 · **BeScout-Events 377** · **special-Events 378**.
- **Event-Geldquellen:** club ✅ bescout ✅ special ✅ | **sponsor** (Deposit-Pfad fehlt = eigener größerer Slice) / **creator** (Phase 4) minten weiter.
- **Money-Muster (Pflicht künftige RAUS):** Live-`pg_get_functiondef` VOR Spec (D87) · Escrow-Trigger-zentrisch · inline Deckungs-Check unter Singleton-Row-Lock (`book_platform_treasury` hat KEINEN Negativ-Guard) · D103 Hard-Gate (`RAISE` bei Unterdeckung) · Refund-source/Halter nach `OLD.type` (S377) · force-rollback-Smokes · Reviewer-Pflicht. Quelle: treasury.md §7/§10 + errors-db.md S377.

### ✅ Diese Session (2026-06-25 Nachmittag/Abend) — 377 + 378 + ALLE Reste erledigt
- **377** (`26b15576`): BeScout-Events (`type='bescout'`) aus Topf. 3 Event-Trigger (escrow BEFORE INSERT / settle BEFORE UPDATE OF status / resync BEFORE UPDATE OF prize_pool,type) um `type='bescout'`→`platform_treasury`-Zweig erweitert. CEO-Entscheid (AskUserQuestion): **Escrow-bei-Erstellung** (Spiegel 331), `score_event` unangetastet. Zwei-Treasury-Resync (type-Switch club↔bescout). 8/8 force-rollback PASS, Reviewer PASS. Proof `377-money-smoke.txt`.
- **378** (`f5db42b9`): special-Events (`type='special'`) aus Topf — platform-Zweig auf `type IN ('bescout','special')`, eigene Ledger-source `special_event` (CHECK-Widen + AdminTreasuryTab-Label + i18n DE „Sonder-Event"/TR „Özel Etkinlik"), Refund-source nach Halter `OLD.type`. bescout-Regression-safe (source-CASE, AC-06 empirisch). 9/9 force-rollback PASS, Reviewer PASS. Proof `378-money-smoke.txt`.
- **🔑 Credentials entsperrt (`cc7eb8f9`):** `ali@test.bescout.de` Passwort → **`123456`** (SQL-bcrypt) + zu `platform_admins` (superadmin). **Live-Login gegen GoTrue verifiziert.** Ein Login = Plattform-Admin (`/bescout-admin`) **UND** Sakaryaspor-Club-Admin. Echte Anil-Konten (`djembo31@gmx.de`/`bescout@gmx.de`) unangetastet. **Gate-Wahrheit:** `/bescout-admin` = `platform_admins`-Mitgliedschaft (NICHT `top_role='Admin'`). Details + Reset-Rezept: memory `reference_qa_test_credentials`.
- **Rest #1 Topf-Card-Visual (357) ✅:** Treasury-Card live gerendert (Saldo 500.032,97 Credits, REIN/RAUS/Kontoauszug). Proof `worklog/proofs/357-topf-card-de.png` (lokal, PNGs gitignored).
- **Rest #2 Bounty-Approval-UI (370) ✅:** E2E live — ali approved jarvis-Submission im Club-Admin-UI (`/club/sakaryaspor/admin`→Aufträge→Prüfen→Genehmigen). bounty→completed, submitter +1900 (95%), **Topf +100 source `bounty`**, ali-Wallet unverändert (Escrow), Zero-Sum. Proof `worklog/proofs/370-bounty-ui-approve.txt`.
- **Rest #3 U-1 (371):** war schon VOLL-DONE (AC1/AC2 live PASS `26245d48`), stale „OFFEN"-Vermerk reconciled.

### ✅ 2 neue Funde — BEIDE ERLEDIGT (Session 2026-06-25 spät)
- **✅ Slice 379 (`ff9a238e`):** `credit_tickets` 400 „post_create". Live-Fund = DREI unabhängig gedriftete Gate-Flächen (credit_tickets-Allowlist + spend_tickets-Allowlist + CHECK `ticket_transactions_source_check`) auf 16-Wert-Union (RPC-Legacy ∪ TS TicketSource) gezogen. Mitgefangen: research_publish/research_rating (still 400) + chip_refund (war RPC-erlaubt, scheiterte am CHECK). AC1-AC5 live PASS. Knowledge errors-db.md **S379**. Migration `20260625160000`.
- **✅ Slice 379b (`54b90a15`):** Bounty-Review-Wallet-Hinweis. Live-RPC `approve_bounty_submission` (D87): Admin-Wallet wird NUR bei `!is_user_bounty && !treasury_escrowed` belastet (TODO-Notiz war ungenau). Hinweis-Gate exakt darauf + `treasury_escrowed` zu Type+Service-Selects. 3-Zweig-Test PASS, tsc 0. Kein Money-Seam (Settle-Trigger flippt escrowed bei completed). Scope-Out: neutraler „aus dem Topf gedeckt"-Text = optionaler Folge-Slice (bräuchte DE+TR).

### Geseedete Live-Artefakte (permanent, NICHT aufräumen — E2E-Beweis)
- **378-Bounty-UI:** Sakaryaspor-Bounty `723397eb-5ba2-4b3e-abeb-cb82f682b57e` = completed; jarvis-Submission `6615b41e-8720-461d-8095-397c835f23cd` = approved (+1900); Topf-Eintrag `bounty:100`. Topf live **50.003.397 cents**.
- Actor-IDs: ali `aaaaaaaa-0005-4000-a000-000000000005` (Plattform+Club-Admin) · jarvis-qa `535bbcaf-f33c-4c66-8861-b15cbff2e136` (Manager) · Project `skzjfhvgccaeplydsunz`.

### 📌 Frühere Anker (Referenz, bei Bedarf)

### ✅ Diese Session (2026-06-24 spät) — 371 + 372 DONE
- **371 ✅ VOLL-DONE** (`26245d48`): Live-Playwright AC1/AC2 PASS — Header zeigt nach Poll-Vote (11.708,27→11.698,27) + Research-Unlock (→11.688,27) SOFORT −10 CR ohne Reload, DB-reconciled. Pattern S371 in errors-frontend.md.
- **372 ✅ VOLL-DONE** (`4a7c868f` Fix + `264d4ac5` LOG): BuyModal-Hänger „Saldo wird aktualisiert…" gefixt (E4-Rest C / war 368c-F3). **Root-Cause war NICHT „Tippen vs +/−" (Timing-Artefakt)**, sondern: `useIsBalanceFresh` zeitbasiert (`<30s`) + Modal-Open triggert keinen Wallet-Refetch (Query schon via TopBar gemountet, `staleTime:0`) → stale bleibt für immer stale → Button dauerhaft disabled. Fix: `useWallet.refetch` exponiert + BuyForm-`useEffect`-Self-Heal bei `balanceStale`. Money byte-identisch. Reviewer PASS. **Live Vorher/Nachher bewiesen** (Tiren-Modal: 43s+ stuck → ~3s Self-Heal) + echter Buy reconciled. Pattern S372 → errors-frontend.md.

### Geseedete Live-Artefakte (permanent, NICHT aufräumen — E2E-Beweis)
- **Topf-Ledger (append-only):** Stand zuletzt + 372-Buy = letzter Eintrag `trading:35` (Tiren-Buy). 370-Bestand: bounty 50 · ipo 500 · poll 400+200 · research 400+200 · trading 1512+35.
- **371-VERIFY (consumed):** Poll `4415ed77…` (jarvis voted, Option A), Research `90a1bcbc…` (jarvis unlocked). 370er: Polls `d8737497…`/`c39609f3…`, Research `42ea702d…`/`ef06557d…`, Bounty `ee25724d…` (alle nailoku).
- **372-Buy:** jarvis-qa hält jetzt **1× Muhammed Tiren** (`05f7a1a2-e70b-4327-accd-5f90f84d6f7e`); dessen 10-CR-Order (`17b3842d…`, @bot001) ist **filled**. Verbleibende kaufbare Sell-Orders: Sarıcalı `886d0013…` @125 · Crociata `157a1a78…` @550.
- **3 offene IPOs** (Hatayspor, `kede5`): Rakhim `e4784b96…` @50 · Yiğit `b51dd4be…` @100 · Muhammed Gönülaçar `8f715d63…` @125.
- Actor-IDs: jarvis-qa `535bbcaf-f33c-4c66-8861-b15cbff2e136` (~11.678 CR nach 372-Buy) · nailoku `b6c51aae-d950-4009-b68d-f1c93efa5fcf` · kede5 (Admin) `3c580b9e-1cf0-4c14-8f9e-e0ce1bb46f9f`. Project-ID `skzjfhvgccaeplydsunz`. Login `jarvis-qa@bescout.net` / `JarvisQA2026!`.

### 🔑 Seed-Rezept (wiederverwendbar für ③ Poll / ④ Research / ⑤ Bounty) — codifiziert in `.claude/rules/testing.md`
Money-RPC via Supabase-MCP `execute_sql` callen + `auth.uid()`-Guard umgehen durch JWT-sub-Impersonation in DERSELBEN Transaktion:
```sql
SELECT set_config('request.jwt.claim.sub','<acting_user_uuid>', true);
SELECT <money_rpc>(<acting_user_uuid>, …);  -- guard sieht auth.uid()=acting_user
```
Mehrere Acting-User im `DO $$ … $$`-Block (PERFORM set_config + INSERT INTO temp). Playwright gegen bescout.net, Login `jarvis-qa@bescout.net` / `JarvisQA2026!` (oft schon eingeloggt).

---
## 📦 Ältere Anker (368-Serie alle DONE + E3/Sessions — Referenz, bei Bedarf)

**Slice 368e DONE (D101, committet):** Markteintritt-Modell. Erster IPO = eingefrorener Eintritt (`players.ipo_price`, set-once-Trigger `trg_set_initial_listing` setzt beide Spalten); spätere IPOs = aktueller IPO-Preis (live aus aktiver `ipos`-Row). Trigger `trg_sync_player_ipo_price` ENTFERNT. Daten repariert (MV>0 → MV/10; MV=0 + aktive-IPO unangetastet; IPO-lose `ilp=NULL` Sentinel-Restore). Reader → eine Quelle `prices.ipoPrice`; Portfolio-% → `avg_buy_price`. Toter `getFirstIpoPrice`-Pfad weg. Money byte-identisch (Display-only, D87). Reviewer CONCERNS→MEDIUM-Sentinel-Burn geheilt. **OFFEN: post-Deploy Playwright** (RewardsTab „Dein Einstieg" == TradingTab „Markteintritt" == PriceChart-Linie; PlayerIPOCard aktueller IPO-Preis unverändert; ≥2 Spieler DE+TR). **DROP `initial_listing_price` = eigener Folge-Slice** (Reader=0, Type+Mapper ruhend). Migration `20260624200000`.

### Älterer Anker (368c, DONE):

**E4 = Money-Modell-Glattzug + Mock→Pro-Härtung (D99). Plan-Anker `worklog/notes/366-e4-money-model-cleanup-epic.md`.** Stand:
- ✅ **Schritt 1 — D99 ratifiziert** (`b52e8b09`): Naming **„Credits"** jetzt · Einheit **1 Credit = 100 cents** · Phasen **1/2/3** · Pricing **1 Card = MV/1.000 Credits**. SSOT = **D99**.
- ✅ **Schritt 2 — Doc-Glattzug** (Slice 366, `eba47650`): ~40+ Stellen + Skills auf D99; `grep $SCOUT|BSD messages/` = 0.
- ✅ **Schritt 3 / T-3 — Slice 367 Diamond-Hands** (`7b650a4f`): Rename „Treuer Sammler" + Hold-Logik aus `holdings.created_at` + Konfetti-Gate. Reviewer PASS.

### 🔑 NEU diese Session (2026-06-24): Slice 368 KOMPLETT REFRAMED — alte Prämisse war FALSCH
**Die Handoff-Annahme „368 = ipo_price auf MV/10 nachziehen" ist VERWORFEN.** Anil-Klärung deckte auf: `ipo_price` ist **NICHT** an den MV gekoppelt — es ist der **Preis, den der Verein beim Erstverkauf festlegt** (orientiert sich am MV, darf abweichen, danach eingefroren). Der MV ist nur **Referenz**. „ipo_price auf MV/10 zwingen" wäre der Fehler, nicht der Fix (genau das tat Slice 114 im April).

**→ Festgehalten als `D100` (`memory/decisions.md`) — supersedes D99 Punkt 4.** Das Wertmodell = **vier getrennte Zahlen**, die nie verschmelzen dürfen:
1. **Erstverkaufspreis/Eintritts-Anker** (`ipo_price`) = Vereinspreis, MV-entkoppelt, eingefroren. Bezugspunkt der Preisentwicklung.
2. **Aktueller Marktpreis** (Orderbuch/`last_price`/`floor_price`) = Angebot/Nachfrage.
3. **Marktwert-Referenz** (`market_value_eur`) = Transfermarkt, Cron-aktualisiert, NUR Kontext.
4. **CSF** = im Reward, aus MV-Wachstum, auf richtiger Basis erklären.

**Schlüssel-Funde aus der Live-Discovery (NICHT neu investigieren):**
- `buy_player_sc` kauft über das **Orderbuch** (niedrigste offene Sell-Order, `v_order.price`), NICHT über ipo/floor/last → die 4 Zahlen sind heute fast nur **Anzeige-Werte** = geringes Money-Risiko.
- 96/3.935 Spieler haben `ipo_price ≠ MV/10` — **0 mit aktiver IPO, 0 mit offener Order** → per D100 **KEIN Bug, kein Daten-UPDATE**.
- Echter historischer Vereins-Eintrittspreis ist durch Slice 114 überschrieben (in `initial_listing_price` nur unzuverlässig erhalten) → **nicht rekonstruierbar**. Anzeige-Anker bestehender Spieler = **`ipos.price` der Erst-IPO, sonst „—"** (Anil-Entscheid).
- `floor_price` wird user-facing IMMER als „günstigstes Angebot" gelabelt — auch wenn `recalc_floor_price` ihn aus dem **letzten Verkaufspreis** ableitet (keine offene Order). Quelle nie sichtbar; Labels uneinheitlich („Floor"/„Marktpreis"/„Markt Floor"). = die irreführende Stelle.
- ipoPrice & MV stehen im `RewardsTab.tsx:60-83` verwechselbar nebeneinander („Dein Einstieg" Cr | „Aktueller Marktwert" €).

✅ **368a DONE** (`b6b63c67`): Kanon festgehalten — D100 + INDEX-Range D1–D100 + `treasury.md §1b` + `.claude/rules/trading.md`-Korrektur (alte „Fix=MV/10"-To-Do raus). Reviewer PASS, kein Code/kein Daten-UPDATE. **Spec der ganzen Serie: `docs/plans/2026-06-24-scout-card-value-model-spec.md`.**

✅ **368b DONE** (`17306c09`): RewardsTab-Anzeige-Wahrheit. „Dein Einstieg" liest jetzt echten **Erst-IPO-Preis** (`ipos.price`, frühestes Row) via neuem `getFirstIpoPrice`+`useFirstIpoPrice` statt `players.ipo_price` (Slice-114-vergiftet); kein IPO → **„—" nur im Einstieg-Feld** (MV+Meilensteine bleiben — Anil-Entscheid). +2 InfoTooltips (MV-Referenz vs. Eintritts-Anker). **CSF-Tooltips DE+TR von € → Credits** (user-facing € verboten). Reviewer **PASS** (2 LOW, #1 Service-Test gefixt). tsc 0, 133 Tests. Spec `worklog/specs/368b-scout-card-display-truth.md`. **✅ Visueller Proof live verifiziert** (Owusu Kwabena bescout.net Mobile 393px: „Dein Einstieg" = **461 CR** = echte Erst-IPO statt alt 400; MV 400K€ separat; Meilensteine in CR ohne €; `worklog/proofs/368b-rewardstab-with-ipo.png`).

✅ **368c DONE** (Reviewer PASS, 3 LOW): Floor manipulationssicher + transparent. CEO-Entscheid (Anil): symmetrisches Preis-Band **min=Anker÷3, max=Anker×3** → neue `get_price_floor = get_price_cap/9`; `place_sell_order` lehnt Lowball mit `minPriceExceeded` ab (Live-Smoke: 100<333 reject, 333/500 pass, 4000 maxCap). Schon vorhandener Schutz live-bestätigt (Selbst-Handel/Reziprok-Ping-Pong/20-24h/10-h/Cap/Club-Admin). `PlayerHero.floorSource` → Sublabel quellen-ehrlich (offene Order→„Günstigstes Angebot"/keine→„Letzter Verkauf"). Alle Floor-Labels user-facing → „Marktpreis"/„Piyasa Fiyatı". Money-Pfad (buy/Fees/Topf) byte-identisch. AR-44-Fix: get_price_floor anon REVOKEd. **AC7 Playwright-Sublabel offen post-Deploy.** Sybil-Ring (3+ Accounts) = bewusst eigener späterer Slice (braucht Identitäts-Signale, Phase-2).

### ✅ Diese Session (2026-06-24 nachmittag): E2E-Trading-Härtung + Preis-Wahrheit
- **368c live-verifiziert** (jarvis-qa, bescout.net): Preis-Band reject/pass, Floor-Quelle-Sublabel beide Richtungen, Buy-Orderbuch (günstigste zuerst, Floor-Bewegung), Sell-Lifecycle, P2P-Offer — alle PASS. Funde in `worklog/notes/368c-e2e-trading-findings.md`.
- **368d DONE** (BuyModal „Gesamt"-Wahrheit, Reviewer PASS): Menge/Preis an aktive Order gebunden, 3×11=33-Lüge weg. Money-Flow unberührt. (committet diese Session.)
- **🔴 ANIL-FLAGGED PREIS-BUG + DATEN-FIX:** 500K-Spieler zeigte 10–11 statt 500. Ursache: kaputte Seed-Preise + **drei** driftende „Einstiegs"-Spalten (`ipo_price`/`ipos.price`/`initial_listing_price`). Sofort-Fix (CEO-approved „grobe Ausreißer"): **19 Spieler → MV/1000** (ipo+ipos+last+floor), Douglas live = 500 ✅. **Overreach (offengelegt):** `initial_listing_price` 2964 Zeilen → MV/1000 (war breit kaputt) → 648 Mismatches.
- **← NÄCHSTER: Slice 368e — Einstiegspreis-SSOT** (`worklog/specs/368e-entry-price-ssot.md`, Anil: „Strukturproblem grundsätzlich angehen"). `ipo_price` = EINE Quelle; alle 3 Spalten angleichen + UI-Reader (TradingTab/RewardsTab/useManagerData) umstellen + `initial_listing_price` deprecaten + Re-Drift-Guard. **Spec wartet auf Approval. Offene Anil-Qs (§7):** Portfolio-Basis (ipo vs avg_buy_price), DROP-Timing, RewardsTab-368b-Umkehr bestätigen. **/impact (17 Reader) vor BUILD. Money → Reviewer Pflicht.**
- **Danach (gestapelt):** 369 `/api/push→500` beim Order-Fill (live bestätigt) · 368-Label-Rest (F1/F2 + ~11 „Floor"-Keys + 2 hardcoded, `368c-e2e-trading-findings.md`) · F3 BuyModal getippte-Menge-Hänger · 370 E2E ②–⑤.
- **Residual QA-State:** jarvisqa hält 3 Douglas-Cards, Douglas last/floor=500. Orderbuch/Offers aufgeräumt.

**367-Follow-ups (non-blocking, aus Reviewer):** F#1 „ohne zu verkaufen"-Semantik — Teilverkauf resettet `created_at` NICHT (nur Full-Sell auf qty=0) → mit Anil klären ob Description entschärfen. F#2 Regression-Tests für Hold-Logik (Buy→kein Unlock / 31d→Unlock). F#3 DPC-Mastery-Leaderboard (`mastery.ts`) zeigt weiter geseedetes `hold_days`-Mock → eigener Mock→Pro-Slice.

**Geseedete Live-Artefakte (E2E ①, permanent):** demo-admin 4 Cards Douglas Willian, jarvis 1 Card, 1 Trade-Tx, Pot 35 Cents (source 'trading').

## ✅ E3 „Fees REIN" KOMPLETT (5/5 + P2P) — Trading 358 · IPO 360 · Polls 363 · Research 364 · Bounty 365
> Alle Plattform-Fee-Ströme fließen real in den BeScout-Topf (voller Auffang 100 %, D98, je Zero-Sum live bewiesen). Topf live bei 35 Cents.

## ➡️ DANACH (zurückgestellt): E3 Slice 3 — Monats-Liga e2e (erster RAUS-Kanal)
- `close_monthly_liga` zahlt Rewards per `debit` aus dem Topf (statt Minting) + Deckungs-Check + Idempotenz. Lebt heute, mintet 34.000/Mt, 0 Snapshots. UI: Live-Standing + Cron + `overall`-Median-Fix. Preflight `357-preflight-monthly-leaderboard.md`. Plan `358-platform-treasury-epic.md`. Money-Muster: Live-`pg_get_functiondef` VOR Spec (D87).

## ✅ SESSION 2026-06-24 — Slice 357 E3-1 Topf-Fundament (Money, CEO-Scope)
- **Slice 357** — Plattform-Treasury Topf-Fundament. Mirror Club-Treasury 329 minus tenant-id, Single-Pot. Tabellen + 3 RPCs + Append-only-Trigger (329 wiederverwendet) + RLS 0-Policies + Service +2 Fn + AdminTreasuryTab-Card + i18n DE+TR. **Topf live bei 0, kein Backfill.**
- **Money-Smoke grün:** Buchungskette 1000/1500/1200 (kein Race), append/delete/bad-source/no-auth alle geblockt, RLS/Grants verifiziert. Reviewer **PASS** (2 NIT accepted). 9 Service-Tests grün. Proofs `worklog/proofs/357-*`.
- **DISTILL D97** (ARCHITECTURE): Topf-Saldo = SUM-on-read (Variante A, kohärent mit Club-Treasury) statt gecachter Saldo (B); Revisit B bei Millionen Ledger-Zeilen (Lock-Row existiert → lokaler Umstieg). CEO-approved.
- **Offen:** UI-Card Playwright-Verify gegen bescout.net **nach Deploy** (Vercel baut von main) — noch nicht abgenommen.

## ✅ SESSION 2026-06-23 (Abend) — Slice 356 Exklusive Treue-Umfragen + Money-Heal
- **Slice 356** — Exklusive Treue-Umfragen (`community_polls.min_fan_rank_tier`-Tor): create-Param (nur source='club'), Vote-Guard VOR Wallet (fail-closed), Service `viewer_locked` pro Poll/Betrachter (multi-club), Card-Schloss-Teaser + Create-Selector, i18n DE+TR. Silent-Fail-Fix: `castCommunityPollVote` wirft jetzt bei !success (vorher false-success-Toast). → **Polls-Roadmap KOMPLETT** ((c) Abo-Early-Access von Anil gestrichen).
- **🔴 Live-Money-Heal (Reviewer-Fund, Anil-approved):** Poll-Fee lief seit Slice 343 fälschlich **70/30** statt CEO-approved **80/20** (343 rekonstruierte Body aus `slice_336`-Datei statt Live → 337-Patch still revertiert). Zurück auf 80/20, live-verifiziert (creator_share=800 bei cost=1000). Pattern → errors-db.md (PATCH-AUDIT muss **Konstanten** prüfen, nicht nur Präsenz).
- **Reviewer:** REWORK→geheilt (`worklog/reviews/356-review.md`). **Proof:** `356-rpc.txt` + `356-money-smoke.txt` (Reject→Wallet unverändert; Pass→80/20) + 27 vitest.
- **Prozess:** TR-i18n-Abnahme-Regel (`feedback_tr_i18n_validation`) auf Anil-Wunsch entfernt — TR-Strings nicht mehr vor Commit zeigen.
- DISTILL geprüft: Learnings in errors-db.md (Konstanten-Audit) + polls.md (Feature). Kein neuer `D<n>` nötig (Bug-Fix-/Feature-Klasse, kein Strategiewechsel).

## ✅ SESSION 2026-06-23 (Fortsetzung) — Workflow-Effizienz + 349-Heilung
- **Slice 352** — Workflow-Effizienz #1+#2+#3: `ship-status-gate.sh` log.md-Injection 5→1; Ops/Tooling-Slice-Spur in `workflow.md`; **`errors-frontend.md` → Navigator (78 Z., always-loaded) + `errors-frontend-detail.md` (on-demand, non-matching glob)**. Anil-Alignment: path-scopen verworfen (.tsx-Kollaps = Safety-Regression).
- **Slice 353** — `errors-db.md` (787→73) + `errors-infra.md` (538→66) gleiche Navigator-Mechanik (2 Parallel-Agents). **DISTILL D95** (Navigator+Detail-Architektur). 3 Domains: ~90% weniger always-loaded Context/Edit, 0 Pattern-Verlust.
- **Slice 354** — **349 Live-Verify fand Prod-Bug + gefixt:** Club-Fan-Board „Treueste Fans" war im **Error-State** — `getClubFanLeaderboard` Embed `profiles!inner` ohne FK `fan_rankings→profiles` (FK ging nur auf auth.users). Fix = additiver FK→profiles (Migration `20260623210000`, kanonisch=scout_scores), 0 src/-Änderung, Re-Verify 38 Fans live PASS. **349 jetzt voll-DONE.** Plus **Stale-Tracker-Prävention** (s.u.).

## 🛡️ STALE-TRACKER-KLASSE ABGESTELLT (Slice 354 — Anil-Auftrag)
- **Ursache:** Epic-Sub-Tracker (`s7-phase3-remaining.md`, `348-pro-stand-roadmap.md`) werden von KEINEM Close-Out-Ritual angefasst → driften (348/349 waren nicht abgehakt).
- **Fix (3-teilig):** (1) `.husky/pre-commit` `[TRACKER-RECONCILE]`-Reminder feuert bei „neuer ## NNN in log.md gestaged" (non-blocking, weil semantisch); (2) `workflow.md` LOG-Step „Tracker-Kopplung"; (3) `s7-phase3-remaining.md` Stand-Quellen-Header + `reconciled-through-slice: 354`.
- **Heißt für nächste Session:** beim Slice-LOG erinnert der Hook an MASTERPLAN/TODO/s7-Tracker — reconcilen, nicht ignorieren (außer reine Doku/Meta-Slices).

## 🎯 NÄCHSTER TRACK (Anil-Wahl, frei fortsetzbar)
- **(A) Polls-Reste:** exklusive Treue-Umfragen (`min_fan_rank`) · Abo-Early-Access (kleine Money-Slices).
- **(C) S7-Aufräumen** (Block-SSOT `worklog/s7-phase3-remaining.md`): Monthly-Liga-Board (tot) · `scout_scores`↔`user_stats`-Konsolidierung · Dormant-Hygiene (Research/Voting/Creator-Fund/Wildcard) · Bridges (46). ⛔ `players.club` blockiert (API-Football-Key — Anil-Action).

## 📦 ÄLTERE SESSION 2026-06-23 (Vormittag) — 348/350/351
- **Slice 348** — `csf_multiplier` komplett raus (Code+RPC+Spalte), 0 Money-Effekt (liquidate_player proportional_v3 seit 330).
- **Slice 350** — CI-grün + Push-Fix (D94: Pre-Push=schneller Gate, volle Tests=CI). **Slice 351** — Knowledge-Coupling-Gate (D45).

## ⚙️ NEUE WORKFLOW-REALITÄT (D94 — wichtig!)
- **Push geht wieder normal** (kein `--no-verify` nötig). Falls ein Push doch mal „failed to push some refs" zeigt ohne `remote:`-Meldung: das ist der Transport-Bruch — `git push --no-verify` als Notfall, dann Pre-Push-Hook-Laufzeit prüfen.
- **Pre-Push prüft nur noch `audit:silent-fail:check`** (~5s). Volle Tests laufen in CI (test-job). Ein echter Testfehler erscheint jetzt in CI (~2,5 min + Mail = echtes Signal), nicht mehr lokal vor Push. Bei money-/komplexen Slices ggf. `CI=true pnpm exec vitest run` bewusst lokal fahren vor Push.
- **Bei neuem Silent-Fail-HIGH/MEDIUM:** `.audit-baseline.json` bewusst nachziehen (Report-Diff: neuer echter Bug fixen vs. bestehend re-baseline), sonst CI rot bei JEDEM Push. Pattern in `errors-infra.md` (Slice 350).

## ✅ ZULETZT FERTIG: FRE-5 / Slice 347 (Club-konfigurierbare Fan-Rang-Schwellen, Money-nah)
- Neue Tabelle `club_fan_rank_thresholds` (1 Zeile/Club, monotoner CHECK, 4-Op-RLS Writes-nur-via-RPC). Fehlende Zeile = Plattform-Default 10/25/40/55/70.
- `calculate_fan_rank`-Rewrite gegen **Live-Baseline (D87)** — nur Tier-CASE liest Config; alle Patches erhalten (Follow +5, ELO, csf). Helper `get_club_fan_rank_thresholds` (Default-Single-Source). Write-RPC `set_club_fan_rank_thresholds` (Club-Admin ODER `top_role='Admin'`-Gate, Validierung, **Sofort-Recalc aller Club-Fans** = Money-Tally-Frische).
- Frontend: AdminFansTab Config-UI (5 Inputs, Live-Validierung), FanRankLadder dynamische Schwellen, `getFanRankByScore` entfernt. Service get/set + DEFAULT. i18n DE+TR (9 Keys, namespace-geprüft).
- **Schutz-Grenze:** Gewicht-Mapping Tier→Faktor bleibt GLOBAL (Club verschiebt nur, wer qualifiziert).
- Reviewer PASS (Finding #1 Platform-Admin-Gate gefixt). Proof: Backend AC1-AC8 live + UI-Playwright AC9/AC10 (0 Console-Errors). `worklog/proofs/347-thresholds-smoke.txt`, `e2e/qa-347-fanrank-thresholds.ts`.
- **NÄCHSTES Money-Stück = Anil-Wahl:** Polls-Reste (b exklusive Treue-Umfragen · c Abo-Early-Access) ODER neuer Treasury/REIN-Block. NICHT Airdrop (Coin-Phase). Backlog: csf_multiplier-Removal (D93) · recalculateFanRank swallow→throw.

## ✅ ZULETZT FERTIG: FAN-REWARD-ENGINE FRE-1/2/3 (2026-06-18) — Plan = **D93**
„E1" im MASTERPLAN = ganzes Money-Epic; die Fan-Reward-Engine ist ein Teil davon, Schritte = **FRE-1…FRE-5**.
- **FRE-1 / Slice 344** (`4afd47e6`+`6e53a770`): Fan-Rang-**Leiter sichtbar** + Perk-Katalog (`fanRankPerks.ts`, Mirror Poll-Gewicht 343). Reine UI. Liegt auf Club-Page Tab **„Mehr"** (RevealSection). Live-Proof bescout.net.
- **FRE-2 / Slice 345** (`027b4cdf`): **Follow zählt** (+5 in `calculate_fan_rank`, monoton, cap 100) + Trigger `club_followers_recalc_fan_rank` (best-effort, sofort-Recalc). Money-nah (Fan-Rang→Poll-Gewicht); Abo-Floor (D92) live intakt. Force-rollback-Smoke grün.
- **FRE-3 / Slice 346** (`d3c4f561`): **Exklusive Vereins-Beiträge** ab Fan-Stufe + gesperrte Vorschau (🔒). **RLS-SELECT-Policy auf `posts` ersetzt** (war `USING(true)`) → Fan-Rang-Lese-Gate; `get_club_news_teasers` (SECURITY DEFINER) maskiert content. Neu: `fan_rank_tier_rank(text)` (Mirror FAN_RANK_TIERS), `posts.min_fan_rank_tier`. Kein Content-Leak (Row-Hide + Maskierung), Live-RLS-Smoke grün, Community-Feed + Club-Page post-Deploy regress-frei. Feature **ruhend** bis erste exklusive News (0 club_news live).

## 🎯 NÄCHSTER ARBEITSBLOCK
- ✅ **Erledigt diese Session:** 349 Live-Verify (+ Prod-FK-Bug gefixt, 354) UND alle 3 Workflow-Effizienz-Tracks (352/353). → aktueller offener Stand steht oben unter „🎯 NÄCHSTER TRACK" (Polls-Reste ODER S7-Aufräumen).
- **Slice 351 Gate aktiv:** Knowledge-Content ändern → `updated:`=heute Pflicht; neue `D<n>` → INDEX-Range mitziehen (sonst pre-commit blockt).
- **FRE-4 Airdrop bleibt deferred** (echte-Coin-/CASP-Phase, D93). Nicht resurrecten.
- Quellen: Treasury-WIE `docs/knowledge/domain/treasury.md`; Polls-WIE `docs/knowledge/domain/polls.md`; Score/Fan-Rank-WIE `docs/knowledge/domain/reward-ranking.md`. Pre-Push/CI-Realität: **D94** + `errors-infra.md` (Slice 350).

## 🧮 FAN-RANG-MECHANIK (kurz, für nächste Polls-/csf_multiplier-Slices) — Quelle: live `calculate_fan_rank`
- total_score 0–100 = event×0,30 + dpc×0,25 + abo×0,20 + community×0,15 + streak×0,10, +ELO-Boost (Login-Streak), **+5 Follow (FRE-2)**, cap 100.
- Tier-Schwellen sind seit **FRE-5 / Slice 347 club-konfigurierbar** (`club_fan_rank_thresholds`), Default: Stammgast 10 · Ultra 25 · Legende 40 · Ehrenmitglied 55 · Vereinsikone 70. Tier-Lineal DB-seitig = `fan_rank_tier_rank(text)` (0..5).
- **Recalc-Latenz:** Event-Scoring/Cron + (Un)Follow-Trigger + Schwellen-Save-Recalc (FRE-5). Weiterhin KEIN Trigger auf Abo/Holdings. Bei neuem money-/zugangs-relevantem Gate → recalc-on-read oder Recalc-on-save prüfen (D92-Familie).

## 🔧 BACKLOG (aus FRE-Reviews, je eigener kleiner Slice)
- **csf_multiplier raus** aus `calculate_fan_rank` (D83/D93) — kein Money-Effekt (gedeckelt/wirkungslos).
- Teaser-RPC `get_club_news_teasers` oberes LIMIT-Cap (`LEAST(...,50)`) — 346-NIT#3.
- `posts`-INSERT-Policy `club_admins`-Härtung (Nicht-Admin kann club_news mit fremder club_id einfügen) — pre-existing, 346-Scope-Out.
- cross-user Batch-Notify ohne locale → DE für alle (342-NIT#1, seit 336).
- TR-i18n-Unidiomatik (kein Commit-Blocker; nur Compliance hart).

**Muster:** Money-nah/Schema → **/impact + Live-functiondef ZUERST (D87)**. UI/Service → Mobile 393px + DE/TR namespace-aware (333-Falle: Live-Render-Console auf MISSING_MESSAGE prüfen). Reviewer-Pflicht. Pre-Push fährt VOLLE vitest-Suite (~6 min). **TR-Genauigkeit kein Commit-Blocker** (nur Compliance hart). **Teaching-Mode DURCHGEHEND + EINFACH — jede Antwort an Anil startet mit 1-3 Sätzen Klartext VOR Tools, keine Abkürzungs-/Tabellen-Wände, bei Zögern STOPP+erklären** (`feedback_teaching_mode`, 4× gemahnt). **Abhängige FE-Arbeit NICHT in Worktree-Agent dispatchen bevor Backend committed ist** (FRE-3-Lehre: Agent blockte, weil uncommitted Service nicht im Worktree).

## 💰 Money-SSOTs — NIE neu erarbeiten
- **D83** → `docs/knowledge/domain/treasury.md` (WIE Treasury) · **D86** → `docs/knowledge/domain/polls.md` (WIE Polls). `memory/decisions.md` = WARUM. INDEX.md routet via `consult_when`.
- Grundgrößen: 1 $SCOUT = 1 Cent · 1 SC = MV/100.000 € · Fee-Split Polls 20/80.
- **`calculate_fan_rank`-Body lebt NUR live** — `20260330_streak_benefits_rpcs.sql` ist stale, NIE als Baseline (errors-db.md PATCH-AUDIT, FRE-2-Lehre).

## ⚠️ STOLPERFALLEN
1. **API-Football-Key gesperrt** — blockiert players.club + Live-Scores (Engine braucht ihn NICHT).
2. **Audit-Churn** (`worklog/audits/*`) — NIE committen. **session-handoff.md** = committen OK.
3. **RLS posts SELECT** ist seit 346 ein Fan-Rang-Gate (war `USING(true)`) — bei künftigen posts-Read-Änderungen beachten: öffentliche Beiträge = `min_fan_rank_tier IS NULL`-Zweig.

> Crash-Recovery-Blöcke 2026-06-23 (3×) entfernt — Recovery erfolgreich in Folge-Session, Phase-A-Hygiene committet.


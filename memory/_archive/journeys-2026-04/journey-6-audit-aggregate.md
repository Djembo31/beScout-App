---
name: Journey 6 — Aggregated Findings (Profile + Public + Following + Timeline)
description: Round-1 Audit-Findings fuer J6 Beta-Readiness. Read-only, keine Code-Changes. Frontend/Backend/Business kombiniert in einem Pass via CTO-Audit.
type: project
status: ready-for-healer
created: 2026-04-14
---

# Journey #6 — Aggregated Findings (Profile + Public + Following + Timeline)

**Total: 28 Findings — 3 CRITICAL + 9 HIGH + 11 MEDIUM + 5 LOW**

Scope: `/profile` Own + `/profile/[handle]` Public + Follow-Flow + Timeline-Tab + Settings

**Verteilung:**
- Frontend: 1C + 3H + 5M + 3L  (12)
- Backend: 1C + 3H + 2M + 1L  (7)
- Business: 1C + 3H + 4M + 1L  (9)

---

## AKUT — 1 LIVE-BROKEN CRITICAL + 2 CONTRACT-DRIFT CRITICAL

### J6B-01 CRITICAL — holdings RLS blockt Public Profile TraderTab (Silent-Empty)

**Beweis:**
```sql
-- Live Policy (2026-04-14)
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'holdings';
-- Result: holdings_select | SELECT | (auth.uid() = user_id) ONLY
```

**Code-Pfad:**
- `src/components/profile/hooks/useProfileData.ts:87` `getHoldings(targetUserId)` — wenn targetUserId != auth.uid() → RLS returns 0 rows, kein Fehler.
- Reducer-Chain: `portfolioValueCents = 0`, `portfolioCostCents = 0`, `portfolioPnlPct = 0`, `totalDpcs = 0`, `winRate = 0%`
- `TraderTab.tsx:142` `isEmpty = holdings.length === 0 && recentTrades.length === 0` → Public-Profile TraderTab zeigt IMMER `traderEmptyPublic` Empty-State solange keine trades (mit `trades.RLS=true` gehen die durch).
- Fuer User mit trades, aber ohne holdings (seltene Edge-Case weil RLS blockt) → `TraderTab.tsx:218` **"Top Holdings"-Card verschwindet komplett**. StatCell "Portfolio Value", "DPC Count" zeigt 0 — **stimmt NICHT mit `userStats.portfolio_value_cents` ueberein** das von `refresh_user_stats()` kommt und authoritative Werte hat.

**Impact:**
- Public Profile Trader-Tab ist **funktional degradiert**: 4 von 6 StatCells zeigen 0 obwohl userStats-Wert kennt
- TopHoldings-Liste (Kernfeature des Trader-Tabs) **fuer fremde User immer unsichtbar**
- Beta-User werden "leere" Public-Profile sehen und nicht verstehen warum
- `userStats.portfolio_value_cents` wird ueber `refresh_user_stats()` server-seitig berechnet (public-lesbar via user_stats). Aber Client rechnet zusätzlich `portfolioCostCents` aus `holdings` → wenn 0, dann PnL-Karte rendered with `—`

**Fix-Owner:** Backend RLS + TraderTab isSelf-guard.
- **Option A (Privacy-First):** Lass RLS wie ist. `getHoldings()` NICHT auf public-profile aufrufen. `useProfileData` skippt Holdings wenn `!isSelf`, und `TraderTab` zeigt fuer Public "TopHoldings nicht oeffentlich" Label.
- **Option B (Transparency):** Neue Policy `holdings_select_public` mit Whitelist `(quantity > 0)` — Top-Holdings sind signal. Cost/PnL bleiben private (nur `quantity * floor_price` = value, `avg_buy_price` muss verschleiert werden).
- → **AR-50** (CEO-Decision, analog AR-14 J3 Privacy vs Transparency).

### J6B-02 CRITICAL — SECURITY DEFINER RPCs ohne REVOKE-Template (J6-Scope, Migration-Regel-Verletzung)

**Beweis:**
```sql
-- Live 2026-04-14
SELECT proname, has_function_privilege('anon', oid, 'EXECUTE') AS anon_exec
FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND prosecdef = true
AND proname IN ('follow_user','unfollow_user','rpc_get_user_social_stats','refresh_my_stats');
-- Result: follow_user=YES, unfollow_user=YES, rpc_get_user_social_stats=YES, refresh_my_stats=YES
```

**Analyse:**
- **follow_user**: Hat `auth.uid() IS DISTINCT FROM p_follower_id` Guard — sicher, aber verstoesst gegen Template-Pflicht (AR-44, `database.md`).
- **unfollow_user**: Gleicher Guard. Gleiche Verletzung.
- **rpc_get_user_social_stats**: Hat `IF auth.uid() IS NULL` Guard. Aber SECURITY DEFINER + anon-EXECUTE = mglw. lesbar ohne Session → Test with SET ROLE anon könnte trotzdem Daten returnen, muss verifiziert werden.
- **refresh_my_stats**: Hat Guard. Gleiche Verletzung.

**Impact:**
- 4 RPCs verstoeßen gegen AR-44 Template-Pflicht (Post-J4 common-errors.md Regel).
- Risiko: Bei naechstem `CREATE OR REPLACE FUNCTION` werden Privilegien resettet auf Default (PUBLIC grant) — siehe AR-44 Audit-Command.
- Analog-Pattern wie J4-AR-27 (earn_wildcards Live-Exploit).

**Fix-Owner:** Backend Migration mit REVOKE/GRANT-Block pro RPC. → **AR-51** (4 RPCs Template-Sweep, CEO-Approval fuer Security-Migration).

### J6B-03 CRITICAL — `getCreatorFund.getMyPayouts` Error-Swallowing (`return []`)

**Beweis:** `src/lib/services/creatorFund.ts:28-41`
```typescript
export async function getMyPayouts(userId: string): Promise<DbCreatorFundPayout[]> {
  const { data, error } = await supabase.from('creator_fund_payouts')...
  if (error) {
    console.error('[CreatorFund] getMyPayouts failed:', error);
    return [];  // ← ANTI-PATTERN per common-errors.md (2026-04-13)
  }
  return (data ?? []) as DbCreatorFundPayout[];
}
```

**Impact:**
- Nach Service-Error-Hardening Sweep (J1-J4) sind 117 Services gehärtet.
- `creatorFund.ts` wurde **verpasst**. Direct violation of common-errors.md "Service Error-Swallowing" rule.
- UI (`AnalystTab.tsx:137-142`) zeigt `null` creatorPayouts → Creator-Fund Card bleibt versteckt. Aber kein Retry → User denkt "habe keine Payouts bekommen" statt "Netzwerkfehler".

**Fix-Owner:** Backend — throw instead of return []. → FIX-01 (autonom).

---

## Cross-Audit Overlaps (Frontend x Backend x Business)

| Bug | FE | BE | Business |
|-----|----|----|----------|
| "Portfolio"/"Portföy" Wording | J6F-02 | — | J6Biz-01 |
| "Trader" Rolle | J6F-03 (ScoreProgress) | — | J6Biz-02 |
| "Gewinn"/"Kazan*" Vocab | J6F-07 (wonLabel unused) | — | J6Biz-03 |
| Deposit-Button Phase 1 | J6F-04 | — | J6Biz-04 |
| Follow-Notification DE-hardcoded | — | J6B-04 | J6Biz-05 |
| Realtime-Gap Follower Count | J6F-05 | J6B-05 | — |
| Handle Availability Race | J6F-06 | — | — |
| RPCs ohne REVOKE | — | J6B-02 | — |

---

## Autonome Beta-Gates (Healer jetzt, kein CEO)

### Group A — P0 Production-Fixes (Error-Swallowing + Contract)

| ID | Severity | File | Fix | Ursprung |
|----|----------|------|-----|----------|
| FIX-01 | CRITICAL | `src/lib/services/creatorFund.ts:36-39` | `return []` → `throw new Error(error.message)` analog J1-J4 Pattern | J6B-03 |
| FIX-02 | HIGH | `src/lib/services/social.ts:52` | Hardcoded DE `'Neuer Follower'` → entweder `notifications.createNotification` i18n-Key-Pattern oder Body in User-Locale rendern via Push-Receiver. Interim: Key in messages → Server-seitiger Lookup via `profile.language` | J6B-04 |
| FIX-03 | HIGH | `src/components/profile/hooks/useProfileData.ts:87` | Skip `getHoldings` wenn `!isSelf` (Private-by-Default, matching RLS). Passe `TraderTab` so an dass `holdings.length === 0 && !isSelf` als "nicht oeffentlich"-Label rendert, nicht als "traderEmptyPublic" | J6B-01 (autonom-Teil) |
| FIX-04 | HIGH | `src/components/profile/ProfileView.tsx:127` | `Button variant="gold">depositBtn</Button>` → `variant="outline" disabled tooltip="Phase 3"` ODER komplett raus (Einzahlen ist in Phase 1 irrefuehrend, Wording "Einzahlen"/"Yatır" bleibt compliance-Red-Flag) | J6F-04 + J6Biz-04 |

### Group B — Compliance-Wording (Kapitalmarkt-Glossar AR-17)

| ID | Severity | Keys/File | Fix | Ursprung |
|----|----------|-----------|-----|----------|
| FIX-05 | HIGH | `messages/de.json`+`tr.json` profile.portfolio/portfolioOverview/portfolioValue | `Portfolio`/`Portföy` → `Sammlung`/`Koleksiyon` ODER `Kader`/`Kadro`. 7 Keys DE + 7 Keys TR, plus TraderTab-Render | J6Biz-01 |
| FIX-06 | HIGH | `profile.tabTrader`/`dimensionTrader`/`traderScore` | `Trader` → `Sammler`/`Koleksiyoncu` per business.md Rule. Plus TraderTab-Heading | J6Biz-02 |
| FIX-07 | HIGH | `profile.winRate` (DE `Win Rate`, TR `Kazanma Oranı`) | "Kazanmak" → "başarı/erfolgreiche Trades" (aber Erfolg selbst auch Red-Flag...). Alternativ: "Profit-Rate" → "Hit-Rate" (bereits bekannter Kontext). Tr: "İsabet Oranı" analog Analyst | J6Biz-03 |
| FIX-08 | MEDIUM | `profile.wonLabel` (DE `Gewonnen`, TR `Kazanılan`) | Unused-Key: entweder loeschen oder auf `Erhalten`/`Alınan` aendern (profile.earned ist frei). Dead-code | J6F-07 |
| FIX-09 | MEDIUM | `profile.strengthTaktischerInvestor` | Key-Name leakt "Investor" aber Value ("Taktischer Händler") ist safe. → Key renaming post-Beta (low-impact), currently OK | J6Biz-06 |

### Group C — i18n + Data Consistency

| ID | Severity | File | Fix | Ursprung |
|----|----------|------|-----|----------|
| FIX-10 | MEDIUM | `src/components/profile/AnalystTab.tsx:416-418` | `toLocaleDateString('de-DE', ...)` → `useLocale()` + dynamisches dateLocale (analog TimelineTab). TR-User sieht aktuell "DE" Datum im Creator Fund Payouts | J6F-01 |
| FIX-11 | MEDIUM | `src/components/profile/TraderTab.tsx:257` `fmtScout(centsToBsd(valueCents))` + `:313` | `fmtScout` + `centsToBsd` mix ist potenzielle Präzisionsquelle — konsolidieren auf `formatScout(valueCents)` analog TimelineTab. Locale-unspezifisch | J6F-08 |
| FIX-12 | MEDIUM | `src/components/profile/__tests__/ProfileView.test.tsx` + hooks | Test-Coverage: Derzeit nur Service-Mocks. Hinzufuegen: Public Profile flow (isSelf=false + holdings-empty Fall), Follow-Toggle Optimistic-Revert on Error | J6F-09 |
| FIX-13 | LOW | `src/components/profile/ScoutCard.tsx:180` | `BeScout Liga` hardcoded — kein i18n-Key | J6F-10 |
| FIX-14 | LOW | `src/components/profile/TraderTab.tsx:341` + AnalystTab-Grid | "SCs" / "Credits" / "Tickets" Einheit-Strings hardcoded. Analog J5-AR FIX-14 sweep | J6F-11 |
| FIX-15 | LOW | `src/components/profile/FollowListModal.tsx:73-86` | toggleFollow ignoriert Error state completely — setToggling(null) laeuft trotz Error. Keine User-Feedback bei Netzwerkfehler. Add toast-on-error | J6F-12 |

**Total autonome Fixes: 15** (1 CRITICAL + 6 HIGH + 5 MEDIUM + 3 LOW)

**Healer-Strategie:**
- **Healer A (P0 Service-Fixes):** FIX-01 (throw), FIX-02 (i18n notification), FIX-03 (skip holdings for public), FIX-04 (deposit button) — ~1.5h
- **Healer B (Compliance-Wording Sweep):** FIX-05 + FIX-06 + FIX-07 (Portfolio + Trader + winRate) — ~1.5h
- **Healer C (Polish + i18n):** FIX-08 bis FIX-15 — ~1h

---

## CEO-Approval-Triggers (siehe analog `journey-N-ceo-approvals-needed.md`)

**4 CEO-Approval-Items:**

| ID | Trigger | Severity | Item | Empfehlung |
|----|---------|----------|------|------------|
| **AR-50** | Architektur-Lock-In + Privacy | CRITICAL | Public Profile TraderTab Data-Strategie: (A) Private-by-Default — holdings immer privat, kein cross-user-Read (aktuell-Stand fixiert, UI-copy anpassen) vs (B) Public-Transparency — neue `holdings_select_public` Policy mit Whitelist (`quantity > 0`, avg_buy_price gesperrt). Impact auf Trader-Identitaet. | **A** (analog AR-14 J3 Privacy-Lockdown) — Trader-Identitaet via `userStats.portfolio_value_cents` (gesamt-Wert) reicht |
| **AR-51** | External Systems + Security + Template-Pflicht | HIGH | 4 SECURITY DEFINER RPCs ohne REVOKE-Block (follow_user, unfollow_user, rpc_get_user_social_stats, refresh_my_stats). Body-Guards schuetzen vs Exploit, aber **Template-Regel** `database.md` verletzt. Migration-Sweep analog J4 AR-27. | **A** — Migration mit REVOKE/GRANT-Block. Template-konform |
| **AR-52** | Compliance-Wording + App-Store | HIGH | **Systemic Wording-Sweep Profile-Bereich**: Portfolio/Portföy (7+7 Keys), Trader/Kazan* (6+4 Keys), Deposit-Button (Phase 3 regulatorisch). Reviewed und CEO-approved Token-Set aus business.md AR-17 Glossar wird nicht flaechendeckend durchgesetzt. | **A** — Healer-B-Group zieht's durch, CEO sieht final-Diff |
| **AR-53** | External Systems (Realtime) | MEDIUM | `user_follows` + `user_stats` + `scout_scores` NICHT in `supabase_realtime` publication. Follower-Count / Tier-Promotion updaten nicht live. Aktuell nur activity_log + notifications realtime. Pilot-UX-Gap. | **B** — Realtime auf `user_stats` (Rank-Change) + `user_follows` hinzufuegen. `scout_scores` low-priority (100 Hits pro Tag max) |

---

## VERIFIED OK (Live 2026-04-14)

| Check | Beweis |
|-------|--------|
| Handle-Validation + RESERVED_HANDLES | `profiles.ts:11-21` 20 Handles blockiert, regex `/^[a-z0-9_]{3,20}$/` + blocklist |
| Handle-Availability Debounce 500ms | `settings/page.tsx:124` |
| user_follows RLS ALL Ops (SELECT/INSERT/DELETE) | Policies live: `Anyone can read follows` + `Users can follow others` + `Users can unfollow` |
| activity_log Feed-RLS (follows-gated) | `Users read feed activity of followed users` Policy mit action-Whitelist |
| activity_log own-RLS | `Users read own logs` auth.uid() = user_id |
| activity_log REPLICA IDENTITY FULL | `relreplident='f'` + in Publication |
| notifications in Publication | live |
| follow_user auth.uid() Guard | `IF auth.uid() IS DISTINCT FROM p_follower_id THEN RAISE` |
| unfollow_user auth.uid() Guard | gleicher Guard |
| rpc_get_user_social_stats Guard | `IF auth.uid() IS NULL` Guard |
| refresh_my_stats Auth-Wrapper | `PERFORM refresh_user_stats(v_uid)` nur bei auth.uid() |
| transactions_select_own only (nach AR-14) | `AR-14 2026-04-14 Privacy-Lockdown` wirksam, keine public_types policy mehr |
| wallets private (`auth.uid() = user_id`) | balance leakt nicht |
| holdings private (`auth.uid() = user_id`) | same |
| creator_fund_payouts private (`cfp_select_own`) | matches isSelf-Gate in AnalystTab |
| notification_preferences own | `Users see own prefs` + update own |
| Suspense + Loading-States | `page.tsx` + `[handle]/page.tsx` Suspense + ProfileSkeleton + loading guard |
| 404/Not-Found | `[handle]/page.tsx:79` + dedicated `not-found.tsx` + error.tsx |
| Own-Handle Redirect auf Public-Page | `[handle]/page.tsx:29-32` redirects zu /profile |
| ProfileView Error-State | ErrorState component + retry callback |
| Follow Optimistic Update + Underflow-Guard | `useProfileData.ts:171` `Math.max(0, c - 1)` |
| Cancellation Token Pattern | `[handle]/page.tsx:34 + useProfileData.ts:78` |
| Deep-Link Tab-Param | `initialTab` prop + `isValidTab` guard |
| i18n Profile Namespace Balanced | 270 Keys DE + 270 Keys TR, 0 missing |
| PlayerPhoto + L5-Tokens nur via Registry | keine direkten imports in Profile |
| Modal open=true/false | FollowListModal + Delete-Modal korrekt |
| Settings Avatar-Upload 2MB Limit | `settings/page.tsx:176` `if (file.size > 2 * 1024 * 1024)` |
| Settings Language-Change Cookie + Reload | `bescout-locale` Cookie + `window.location.reload()` |
| Push Subscription lazy-import | `pushSubscription` nur wenn aufgerufen |
| Danger-Zone Info-Only (Phase 1) | Delete-Account zeigt Modal mit "understood", keine Action |

---

## LEARNINGS (Drafts)

1. **Privacy-by-Default RLS leakt via UI-Fallback** — `holdings_select` ist own-only (korrekt), aber `useProfileData` ruft `getHoldings(targetUserId)` un-conditionell auf. TraderTab-Fallbacks (cost=0, pnl=0) maskieren den echten Bug. **Neuer Pattern:** wenn RLS `auth.uid() = user_id` → Service/Hook muss `isSelf`-Guard tragen, nicht vertrauen dass RLS silent-filtert. (J6B-01) → common-errors.md Update: "RLS-blockierter Query muss client-side-gated sein, sonst silent-empty Bug"

2. **SECURITY DEFINER Template-Drift propagiert ueber J-Journeys** — J1/J2/J3/J4/J5/J6 alle haben RPC-Gruppen ohne REVOKE-Block. Body-Guards schuetzen meist, aber Template-Regel (AR-44) wird systematisch verletzt. Ein **CI-Lint** ueber `grep 'CREATE OR REPLACE FUNCTION' migrations/ | xargs grep -L 'REVOKE EXECUTE'` sollte bei Beta-Gate laufen. (J6B-02)

3. **Service-Error-Swallowing Sweep war unvollstaendig** — Trotz 117 Service-Fixes in J1-J4 ist `creatorFund.ts` durchgerutscht. **Full-grep Pattern:** `grep -rn 'if (error) {' src/lib/services/` + prüfen ob return null/[]. J5-J6 haben noch `return []`-Rueckfaelle. (J6B-03)

4. **Compliance-Wording lebt in Render-Layer, nicht Datenquelle** — `profile.portfolio = "Portföy"` wurde NIE gesweept trotz business.md J3-AR-17 (Journey #3 Kapitalmarkt-Glossar) + J4 AR-32. Grep-pattern muss in CI: `grep -E "Portfolio|Portföy|Trader|Händler|Gewinn|Kazan" messages/*.json`. (J6Biz-01/02/03)

5. **Realtime-Gap Follow-System** — 25 active users haben 102 feedable activity_log rows, aber user_follows nicht in Realtime-Publication → Follower-Count kann um Minuten veraltet sein. Migration-Plan: `ALTER PUBLICATION supabase_realtime ADD TABLE user_follows, user_stats`. (J6B-05)

6. **Hardcoded DE Notifications fuer Cross-Locale-User** — `social.ts:52` 'Neuer Follower' wird an TR-User geschickt. Push-Payload-Layer braucht user-locale-Lookup oder i18n-Keys als payload (Client-side Render). (J6B-04)

7. **Deposit-Button als Dark-Pattern in Phase 1** — UI zeigt "Einzahlen" Knopf, aber Phase 1 ist pre-CASP (kein On-Ramp). User erwartet Zahlungsfluss, kommt nicht. Knopf entweder disabled mit Tooltip "Bald verfuegbar" oder komplett weg. CEO-Decision (analog Feature-Flags in J4). (J6F-04 + J6Biz-04)

8. **Dead i18n-Keys bleiben im Build** — `wonLabel` ist definiert in DE+TR aber nirgendwo gerendert. Build-Size-Impact minimal, aber pattern: Jeder ungenutzte Key ist Compliance-Surface ohne Review. CI-Check: `grep -rn 't(.wonLabel' src/` → 0 → red flag. (J6F-07)

---

## Recommended Healer-Strategie

**Parallel 3 Worktrees:**
- **Healer A (P0 Service-Fixes):** FIX-01 creatorFund throw, FIX-02 follow-notification i18n, FIX-03 holdings-gate, FIX-04 deposit-button — ~1.5h
- **Healer B (Compliance-Wording Sweep J6-Profile):** FIX-05 Portfolio/Portföy, FIX-06 Trader/Kazan, FIX-07 winRate, FIX-08 wonLabel — ~1.5h
- **Healer C (Polish):** FIX-09 bis FIX-15 (locale-date + icon-unit-strings + BeScout-Liga-key + follow-error-toast + AnalystTab date-locale) — ~1h

**CEO-Approvals (4 Items):** AR-50 Privacy-Strategie Public-Profile (**A empfohlen**, matcht J3-AR-14 Precedent), AR-51 Template-Sweep 4 RPCs (**A** autonom-fixable by Backend-Healer wenn approved), AR-52 Wording-Sweep (**A** Healer-B), AR-53 Realtime-Add (**B** autonom fix post-approval).

**Reviewer-Pass nach Healer-Phase** — speziell auf:
- Contract-Propagation (useProfileData signature falls isSelf-Gate geändert)
- i18n-Key-Leak via Service-Errors (creatorFund.throw → AnalystTab-Handling)
- Mobile 393px Layout-Erhalt post-deposit-remove
- TR-Wording-Review mit Anil BEFORE commit (feedback_tr_i18n_validation.md Regel)

**J6 ist kleiner als J3 (62) + J4 (71) + J5 (35), aehnlich J2 (49).** Scope-begruendet (Profile ist weniger compliance-heavy als Trading/Fantasy). Aber die **3 CRITICALs** sind alle echte Beta-Gate-Blocker (silent-empty UI + Template-Regel + Error-Swallow).

**4 CEO-Approvals weniger als J3+J4 (je 15-16). Analog J5 (8) → leaner Scope.** Empfohlen: AR-50..53 in einer 30-min CEO-Session parallel zum Healer-Kickoff.

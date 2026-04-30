# Slice 268 — Cold-Start Cache-Mirror für Wallet+Tickets (Slice-265-done-right)

**Status:** SPEC · **Größe:** M · **Slice-Type:** UI (Hook + Provider) · **Scope:** CTO autonom (kein Money-Path-Mutation, kein RLS, kein DB) · **Datum:** 2026-04-30

---

## 1. Problem Statement

**Anil-Quote (Beta-Day-3, post-Slice-267-Heal):** *"empfehlung"* → C3 done right approved. Original Beta-Day-2-Symptom besteht weiter: *"erst nach refresh kommen budget und rest"* — wallet+tickets erscheinen erst 4-9s nach Page-Mount auf Mobile-Safari Cold-Start (Auth-SDK-Warmup-Bottleneck).

**Audit (Slice 267 Phase 1):** wallet+tickets sind in `QueryProvider.tsx` `USER_SCOPED_DOMAINS`-Liste deny-listed → werden NIEMALS persistiert → jeder Cold-Start startet bei Null. Mobile-Safari Connection-Pool-Limit (~6 parallel HTTPS) verschärft Latenz im Auth-SDK-Warmup-Fenster.

**Wer ist betroffen:** alle Cold-Start-User. Tester ohne warm-localStorage-Cache (3rd Tester `cloud` iPhone iOS 18.7 + Anil's Inkognito-Tab-Tests). 3-4× pro Tester-Session ist Anil's Beta-Frust-Trigger.

**Slice 265 hat das Problem schon angegriffen — aber broke Page-Render:** `initialData` mit `initialDataUpdatedAt: 0` + `enabled: !!userId` Race + Single-Slot-Storage ohne UID-Keying. Slice 265 ist Lehrgeld bereits gezahlt — diese Spec sammelt die Verbote als harte Constraints.

## 2. Lösungs-Design

**WAS:** wallet+tickets in eigene UID-keyed localStorage-Slots mirroren. Beim Mount: synchron lesen → `placeholderData` → instant Render. Background-Refetch läuft IMMER (`staleTime: 0`). Nach erfolgreichem Fetch: schreibe zurück in localStorage.

**WARUM:** wallet/tickets sind höchstvolatil + user-scoped + sicherheitskritisch. TanStack Persist-Cache (Slice 261) ist deny-listed (richtig so) — aber das Symptom „erscheint erst nach Refresh" bleibt. Eigener UID-keyed Mirror umgeht Persist-Cache komplett, mit Slice-260-User-Switch-Clear-Garantien.

**Datenfluss:**
```
Cold-Start Mobile-Safari (kein localStorage):
  T=0   Mount → useWallet liest bs_wallet_<uid> → null → placeholderData=undefined
  T=0   useQuery feuert (enabled: !!userId)
  T=4-9s SDK-Warmup, then user resolved
  T=9s+ Wallet-Response → setQueryData → onSuccess: lsSet bs_wallet_<uid>
  
Warm-Cache (lsHas bs_wallet_<uid>):
  T=0   Mount → useWallet liest bs_wallet_<uid> → cached → placeholderData=cached
  T=0   useQuery feuert mit placeholderData → INSTANT Render der cached Werte
  T=0   Background fetch läuft parallel
  T=Resolve onSuccess → lsSet, falls anders als cached
```

**Architektur (3 neue Stellen):**

1. **Helper-Module `src/lib/utils/cachedQuery.ts`** — DRY-Layer für UID-keyed Read/Write/Clear:
```ts
export function readCached<T>(key: string, uid: string): T | undefined;
export function writeCached(key: string, uid: string, data: unknown): void;
export function clearCachedAllSlots(): void;  // für User-Switch + SIGNED_OUT
```

2. **`useWallet.ts` + `tickets.ts` Hooks** — `placeholderData` aus localStorage + onSuccess-write:
```ts
const placeholder = useMemo(() => userId ? readCached<DbWallet>('bs_wallet', userId) : undefined, [userId]);
const query = useQuery<DbWallet | null, Error>({
  queryKey: walletQueryKey(userId),
  queryFn: async () => {
    const data = await getWallet(userId);
    if (data && userId) writeCached('bs_wallet', userId, data);
    return data;
  },
  enabled: !!userId,
  placeholderData: placeholder,  // synchroner Wert, wird im UI gerendert während fetch läuft
  staleTime: 0,                  // Refetch immer, Cache-Wert ist "potentially stale"
});
```

3. **`AuthProvider.tsx` User-Switch-Detect-Block erweitern** — beim Switch ALLE cached Slots clearen, nicht nur `bs_user`/`bs_profile`:
```ts
// Slice 260 Block + Slice 268 erweitert:
if (cachedUserId && cachedUserId !== u.id) {
  lsClear();              // existing: bs_user, bs_profile, bs_platform_role, bs_club_admin
  clearCachedAllSlots();  // neu: bs_wallet_*, bs_tickets_* (alle UIDs)
  queryClient.clear();
}
```

**Schlüssel-Design:** UID-keyed (`bs_wallet_<uid>`) statt single-slot (`bs_wallet`). Falls clearCachedAllSlots() race-bedingt fehlschlägt, sieht User-B trotzdem nicht User-A's Daten weil Key nicht matcht.

**Origin-Scope-Hinweis (Reviewer-Find):** `bs_wallet_*|bs_tickets_*` Prefix-Filter ist origin-scoped sicher auf bescout.net (Single-Domain). Falls je Subdomain-App entsteht (z.B. `admin.bescout.net`), Prefix-Konflikt prüfen — aktuell nicht im Scope.

**`staleTime: 0` ist GEWOLLTE Verhaltens-Änderung (Reviewer Finding #1):**
Existing `useWallet` hat `WALLET_STALE_TIME_MS = 30_000`. Slice 268 setzt es auf `0`. Begründung:
- TanStack v5: `placeholderData` setzt `dataUpdatedAt=0` bis echter Fetch durchläuft.
- `useIsBalanceFresh()` prüft `dataUpdatedAt === 0` → returnt `false` während placeholderData rendert.
- BuyModal-Confirm-Button bleibt **disabled** bis Real-Data ankommt — Money-Path geschützt.
- Trade-off: ~1-2 zusätzliche Wallet-RPCs pro Mobile-Safari-Session-Switch (Window-Focus + Re-Mount triggern Refetch). Acceptable, da Cold-Start-UX-Pain höher gewichtet ist.

**`clearCachedAllSlots`-Synchronicity in `clearUserState` (Reviewer Finding #2):**
SIGNED_OUT-Pfad in `AuthProvider.tsx:284-310` ruft `lsClear()` synchron + `setTimeout(queryClient.clear, 0)`. `clearCachedAllSlots()` MUSS **synchron** neben `lsClear()` laufen — NICHT im setTimeout. Sonst Race wenn User-B sofort SIGNED_IN feuert (gleicher Frame): User-B's Render würde User-A's Slot-Daten lesen bevor Clear durchläuft.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/lib/utils/cachedQuery.ts` | NEU | DRY Helper für UID-keyed lsGet/lsSet/lsClear (read/write/clearAllSlots) |
| `src/lib/utils/__tests__/cachedQuery.test.ts` | NEU | Unit-Tests Helper (happy/empty/korrupt/quota/user-switch) |
| `src/lib/hooks/useWallet.ts` | EDIT | `placeholderData` + onSuccess-write |
| `src/lib/queries/tickets.ts` | EDIT | `placeholderData` + onSuccess-write |
| `src/components/providers/AuthProvider.tsx` | EDIT | User-Switch-Block + SIGNED_OUT-Block erweitert um clearCachedAllSlots |
| `src/components/providers/__tests__/AuthProvider.test.tsx` | EDIT | Test User-Switch ruft clearCachedAllSlots |

**Verboten (Slice 265 Lehre — Reste-Vermeidung):**
- ❌ KEIN Touch von `TopBar.tsx` oder `(app)/layout.tsx` (Slice 265 hat dort versucht und Page-Render gebrochen)
- ❌ KEIN `initialData` mit `initialDataUpdatedAt: 0` (markiert als fresh → kein refetch → User sieht stale)
- ❌ KEIN single-slot localStorage `bs_wallet` (User-Switch-Race)
- ❌ KEIN `staleTime > 0` (refetch muss immer laufen)
- ❌ KEIN read-on-mount in useState-Initializer (SSR-Hydration-Mismatch)

## 4. Code-Reading-Liste (Pflicht VOR BUILD)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/lib/hooks/useWallet.ts:1-148` | Existing Wallet-Hook | aktuelle queryFn signatur, walletQueryKey-Helper, isLoading-Semantik |
| `src/lib/queries/tickets.ts:10-17` | Existing Tickets-Hook | useUserTickets-Signature, qk.tickets.balance-Key |
| `src/components/providers/AuthProvider.tsx:33-60` | localStorage helpers (lsGet/lsSet/lsClear) | Pattern für JSON-Serialization, try-catch, Quota-Handling |
| `src/components/providers/AuthProvider.tsx:312-360` | onAuthStateChange + User-Switch-Detect-Block | wo clearCachedAllSlots einfügen, Reihenfolge mit setUser |
| `src/components/providers/AuthProvider.tsx:284-310` | clearUserState (SIGNED_OUT) | wo clearCachedAllSlots im SIGNED_OUT-Pfad einfügen |
| `.claude/rules/errors-frontend.md` "Map/Set-typed React-Query-Data" | Slice 267 Lehre | warum kein Map-typed-data im Cache, mein Storage muss Plain-Object sein |
| `.claude/rules/common-errors.md` §1 Silent-Fails | Helper-Robustness | localStorage quota/parse errors müssen silent observability haben (nicht silent return) |
| TanStack Query v5 Docs `placeholderData` | API-Korrektheit | placeholderData vs initialData Unterschied (Slice 265 Bug-Quelle) |
| TanStack Query v5 Docs `staleTime: 0` | Refetch-Garantie | staleTime=0 + placeholderData = always-refetch + initial-render-aus-cache |
| Slice 260 (`AuthProvider.tsx` Slice 260 Block) | User-Switch-Detect-Pattern | Vorbild — gleiche Stelle wird erweitert |

**Mindest M=6, hier 10. ✓**

## 5. Pattern-References

- `decisions.md` D43 (Auth-Hydration-Race) — kein Map-typed-data; wallet ist Plain-Object DbWallet
- `errors-frontend.md` "Map/Set-typed React-Query-Data + Persist/SSR" (Slice 267) — Storage darf nur Plain-Objects, kein Map/Set
- `common-errors.md` §1 Silent-Fails — Helper braucht observability bei quota/parse-error (NICHT silent return)
- Slice 260 User-Switch-Detect-Block (`AuthProvider.tsx`) — Vorbild für clearCachedAllSlots-Aufruf
- Slice 265 (REVERTED) — Anti-Pattern: `initialData` + single-slot-storage + TopBar-Touch
- TanStack Query v5: `placeholderData` semantic = "synchroner UI-Wert während fetch läuft", nicht als 'fresh' markiert; Refetch geht immer

## 6. Acceptance Criteria

```
AC-01: [HAPPY-COLD-MOBILE-SAFARI] Cold-Start auf Mobile-Safari mit warm-cache
  VERIFY: Login einmalig durchführen (lsSet wallet/tickets passiert nach Fetch). Tab schließen, neuer Tab → bescout.net
  EXPECTED: Wallet+Tickets-Pills zeigen Werte INSTANT (<200ms), kein Skeleton-Pulse
  FAIL IF: Skeleton-Pulse für >500ms / Werte falsch (User-Switch-Bug) / Console-Error

AC-02: [HAPPY-COLD-NO-CACHE] Kompletter First-Visit ohne localStorage
  VERIFY: DevTools → Application → Clear site data, Hard-Refresh
  EXPECTED: Skeleton-Pulse während 4-9s SDK-Warmup, dann Wallet+Tickets erscheinen normal nach Auth
  FAIL IF: Crash / endloses Skeleton / falsche Werte

AC-03: [USER-SWITCH] User-A logout → User-B login (gleicher Browser, gleicher Tab)
  VERIFY: User-A login + Wallet sichtbar + logout. User-B login mit anderem Account.
  EXPECTED: User-B sieht User-B's Wallet/Tickets, NIEMALS User-A's Werte (auch nicht für 1 Frame)
  FAIL IF: User-B sieht für ein Frame User-A's Wallet — Cross-User-Pollution kritisch

AC-04: [LOGOUT-CLEAR-SYNC] SIGNED_OUT-Event clear cached Slots SYNCHRON
  VERIFY: Login + Wallet sichtbar. DevTools localStorage zeigt bs_wallet_<uid>. Logout-Klick.
  EXPECTED: bs_wallet_<uid> + bs_tickets_<uid> entfernt SOFORT (synchron neben lsClear), queryClient.clear() darf im setTimeout(0) bleiben
  FAIL IF: Cached Slots überleben Logout / clearCachedAllSlots im setTimeout statt synchron / Race-Window für SIGNED_OUT→SIGNED_IN-Same-Frame

AC-05: [KORRUPT-JSON] Korrupte localStorage-Daten dürfen App nicht crashen
  VERIFY: DevTools Console: `localStorage.setItem('bs_wallet_<uid>', 'NICHT_JSON_GARBAGE')`. Refresh.
  EXPECTED: App rendert normal, Wallet zeigt Skeleton, fetched fresh, App stabil
  FAIL IF: Crash / Error-Boundary triggert / TypeError im Stack

AC-06: [QUOTA-EXCEEDED] localStorage voll dürfen App nicht crashen
  VERIFY: DevTools simuliere quota-exceeded (oder fülle localStorage manuell mit großem String). Login.
  EXPECTED: writeCached Quota-Error wird logged via logSilentCatch, App rendert weiter, kein Mirror aber funktional
  FAIL IF: Crash beim Login

AC-07: [STALETIME-REFETCH] placeholderData markiert NICHT als fresh
  VERIFY: Fast-Refresh oder TanStack-DevTools beobachten queries
  EXPECTED: Bei Re-Mount/Window-Focus läuft Refetch immer, placeholderData ist nur initial-Render
  FAIL IF: Query bleibt "stale=false" obwohl Daten aus localStorage kommen — Slice 265 Bug-Quelle

AC-08: [NO-TOPBAR-TOUCH] TopBar.tsx + (app)/layout.tsx unverändert
  VERIFY: git diff src/components/layout/TopBar.tsx + git diff "src/app/(app)/layout.tsx"
  EXPECTED: 0 Änderungen — Component-Isolation strikt (Slice 265 Anti-Pattern)
  FAIL IF: Touch dieser Files

AC-09: [BUYMODAL-FRESHNESS-INTACT] Money-Path geschützt trotz placeholderData
  VERIFY: Vitest-Test in src/components/player/detail/__tests__/BuyModal.test.tsx (oder neuer useWallet-Test):
    Mock useQuery mit { data: undefined, placeholderData: {balance: 99999}, dataUpdatedAt: 0, isFetching: true }
    Render BuyModal → Confirm-Button MUSS disabled sein (useIsBalanceFresh returnt false)
    Mock-Update: { data: realWallet, dataUpdatedAt: Date.now(), isFetching: false }
    Re-Render → Confirm-Button MUSS enabled
  EXPECTED: Tests PASS — placeholderData zeigt UI-Wert aber blockiert Money-Action bis Real-Data
  FAIL IF: Confirm-Button enabled nur durch placeholderData (Money-Path-Bug — Slice 265 Bug-Klasse)
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | useWallet | userId=undefined (anon) | enabled=false | placeholder=undefined, query disabled | useMemo gated auf `userId ? read : undefined` |
| 2 | useWallet | localStorage hat User-A's Wallet, aber Session ist User-B | UID-keyed Slot mismatch | placeholder=undefined (User-B's Slot leer) | UID-Keyed-Storage `bs_wallet_<uid>` |
| 3 | useWallet | placeholder loaded, query feuert, User-Switch passiert | onSuccess feuert nach User-Switch | clearCachedAllSlots läuft via onAuthStateChange-Handler vor next render | Reihenfolge in AuthProvider: clearCachedAllSlots VOR setUser |
| 4 | cachedQuery.read | JSON.parse throws (korruptes JSON) | malformed string in slot | return undefined + logSilentCatch | try/catch mit observability |
| 5 | cachedQuery.write | localStorage quota exceeded | DOMException QuotaExceededError | catch + logSilentCatch + return (no throw) | try/catch fail-open |
| 6 | cachedQuery.clearAllSlots | localStorage hat 50 keys mit bs_wallet_*, bs_tickets_* | iterate alle keys | alle bs_wallet_* + bs_tickets_* removed | Object.keys-Iter + filter prefix |
| 7 | AuthProvider | SIGNED_OUT-Event mit cached User-A Slots | clearUserState | clearCachedAllSlots läuft nach lsClear() | Block erweitert |
| 8 | AuthProvider | Tab-Crash → reopen → cachedUserId stale → User-Switch-Detect | lsGet liefert User-A's id, session-User ist B | clearCachedAllSlots läuft VOR setUser(u) | Reihenfolge in onAuthStateChange |
| 9 | useWallet | placeholder hat Wert X, fetch returnt Y (Wallet-Update zwischen Sessions) | placeholder.balance=1000, fetched=1500 | UI rendert kurz 1000, dann 1500 (kein Flicker weil placeholderData → data nahtlos) | TanStack v5 placeholderData transition ist optimistisch glatt |
| 10 | SSR | Next.js Server-Render | typeof window === 'undefined' | placeholder=undefined, kein crash | Helper-Funktion typeof-window-check |
| 11 | AuthProvider | SIGNED_OUT → SIGNED_IN (User-B) im selben Frame | clearUserState läuft, dann sofort onAuthStateChange mit u.id=B | clearCachedAllSlots synchron in clearUserState neben lsClear (NICHT im setTimeout) — User-B sieht 0 Slots, fetched fresh | AC-04 + Reviewer-Find #2 |
| 12 | useWallet | Hook unmount mid-fetch (z.B. SPA-Navigation) | queryFn läuft fire-and-forget weiter, writeCached schreibt für unmounted Hook | Acceptable: queryClient hält Reference, kein Memory-Leak. LS-Slot bleibt für nächsten Mount valide | dokumentiert, kein Code-Aufwand |

## 8. Self-Verification Commands

```bash
# Pflicht jeder Slice:
npx tsc --noEmit
npx vitest run src/lib/utils/__tests__/cachedQuery.test.ts \
              src/components/providers/__tests__/AuthProvider.test.tsx \
              src/lib/hooks/__tests__/useWallet.test.ts 2>/dev/null \
              src/lib/queries/__tests__/tickets.test.ts 2>/dev/null

# Slice-spezifisch:
grep -rn "TopBar\|(app)/layout" src/lib/utils/cachedQuery.ts src/lib/hooks/useWallet.ts src/lib/queries/tickets.ts \
  # erwartet: 0 Treffer (Component-Isolation)

grep -rn "initialData\b" src/lib/hooks/useWallet.ts src/lib/queries/tickets.ts \
  # erwartet: 0 Treffer (Slice 265 Anti-Pattern verboten)

grep -rn "bs_wallet_\|bs_tickets_" src/ --include="*.ts" --include="*.tsx" \
  # erwartet: nur in cachedQuery.ts + Hooks (UID-keyed Storage Pattern)

# Live-Verify auf bescout.net post-Deploy (Anil's Pflicht):
# 1. Inkognito + Hard-Refresh + Login → DevTools localStorage zeigt bs_wallet_<uid>
# 2. Tab schließen, neuer Tab → INSTANT Wallet/Tickets sichtbar (<200ms)
# 3. Logout → bs_wallet_<uid> entfernt
# 4. User-Switch (User-A logout, User-B login im selben Tab) → keine User-A-Werte für User-B sichtbar
# 5. Sentry-Tab 30s offen halten — 0 neue Errors erwartet
```

## 9. Open-Questions

**Pflicht-Klärung:** keine — C3 done right ist klar specifiziert, alle Constraints aus Slice-265-Lehre eingebrannt.

**Autonom-Zone (CTO):**
- Naming: `cachedQuery.ts` vs `localStorageMirror.ts` (Naming nicht performance-kritisch)
- Test-Strategie-Detail: ob jeder Edge-Case eigener Test oder kombiniert
- Ob useMemo `placeholder` oder Inline-Computation (perf-egal)

**Nicht-Autonom-Zone:**
- Money-Path-Decisions (keine — Mirror ist read-only-Display, kein Mutation)
- Wording-Drift business.md (keine — kein User-facing Text)
- Wenn User-Switch-Race auftritt: Anil-Sofort-Eskalation

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Helper-Module | `npx vitest run cachedQuery.test.ts` Output → `worklog/proofs/268-cached-query-tests.txt` |
| Hook-Edits | `npx vitest run useWallet.test.ts tickets.test.ts AuthProvider.test.tsx` → `worklog/proofs/268-hooks-tests.txt` |
| Live-Verify | Anil's Mobile-Safari Inkognito Test post-Deploy + DevTools localStorage Screenshot → `worklog/proofs/268-mobile-cold-start.png` (manuelle Anil-Action, ich rendere die Anweisung) |
| Component-Isolation | `git diff --stat src/components/layout/TopBar.tsx "src/app/(app)/layout.tsx"` → 0 Lines → `worklog/proofs/268-no-topbar-touch.txt` |

## 11. Scope-Out

- **profile-Mirror:** kein scope (profile ist schon in localStorage via Slice 260 `bs_profile`)
- **followedClubs-Mirror:** kein scope (ClubProvider hat eigene initClubCache-Logik)
- **fixtureDeadlines-Mirror:** kein scope (Slice 267 hat Map-Layer-4-Filter + defensive reconstruction)
- **notifications-Mirror:** kein scope (Realtime-driven, würde stale werden)
- **RSC Auth-Hydrate (C2):** post-Beta-Backlog falls C3 nicht reicht → Slice 269
- **Generischer Persist-Cache-Refactor:** kein scope (würde Slice 261 architektur ändern, riskant in Beta)

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT skipped (kein DB/RPC, additiv in 5 Files)
     → REVIEWER VOR BUILD (Slice-265+266-Lehre — Reviewer-Agent prüft Spec auf Anti-Pattern-Vermeidung)
     → BUILD (5 Files: 1 NEU Helper + 1 NEU Test + 3 EDIT Hooks/Provider)
     → REVIEWER POST-BUILD (Slice 211 D50 Pflicht)
     → PROVE (vitest + Anil's Mobile-Safari Live-Verify)
     → LOG + Knowledge-Capture (`patterns.md` "Cold-Start UID-keyed Mirror Pattern")
```

**IMPACT-Skip-Begründung:** Helper + Hook-Augmentations sind additiv (placeholderData ist optional Field, queryFn-Augmentation ist Internal). User-Switch-Block ist additive Erweiterung im AuthProvider. Kein DB/RPC/Service-API-Change. Keine Cross-Domain.

**REVIEWER VOR BUILD:** Slice-265+266-Lehre — wir lassen Reviewer-Agent ZUERST die Spec prüfen, bevor Code geschrieben wird. Spec-Drift-im-Drift-Heal-Anti-Pattern (errors-infra.md Slice 234) wird so vermieden.

## 13. Pre-Mortem

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | User-Switch-Race: cachedUserId-Block läuft NACH setUser → User-B sieht für 1 Render User-A's Wallet | MED | KRITISCH (Cross-User-Pollution) | Reihenfolge AuthProvider: `if (cachedUserId !== u.id) { lsClear + clearCachedAllSlots + queryClient.clear }` läuft VOR setUser(u). Test AC-03. | AC-03 manuell + AuthProvider-Test |
| 2 | placeholderData markiert query als 'fresh' → kein refetch (Slice 265 Bug-Klasse) | LOW | mittel | Doc-Read TanStack v5: `placeholderData` ≠ `initialData`. placeholderData NICHT als data persistiert, query bleibt "fetching". Test AC-07. | TanStack DevTools beobachten |
| 3 | localStorage Quota Exceeded crashed App | LOW | mittel | try/catch in writeCached fail-open + logSilentCatch | AC-06 |
| 4 | Korrupte JSON crashed App | LOW | mittel | try/catch in readCached, return undefined + logSilentCatch | AC-05 |
| 5 | clearCachedAllSlots iteriert ALLE localStorage-keys → langsam wenn 100+ Keys | sehr LOW | niedrig | Object.keys() ist O(n) lokaler Read, max 50ms bei 1000 keys | Performance-acceptable |
| 6 | SSR-Mismatch: localStorage-Read im useState init crashed Server-Render | LOW | hoch | Helper-Pattern `if (typeof window === 'undefined') return undefined`. Plus useState init NIEMALS lesen — nur in useEffect/useMemo (Slice 260 Pattern). | TSC + `next build` smoke |
| 7 | Reviewer übersieht Slice-265-Anti-Pattern in Spec → BUILD bricht erneut Page-Render | MED | hoch | Reviewer-Agent VOR BUILD (nicht nach), Briefing-Prompt explizit Slice-265-Anti-Patterns als pflicht-check | Reviewer schreibt Verdict in worklog/reviews/268-spec-review.md |
| 8 | Wallet-Update zwischen Mount und Refetch zeigt stale Werte für 1-3s | sehr LOW | niedrig | placeholderData ist gewollt-stale, refetch läuft sofort, transition ist <2s acceptable | by-design Trade-off |

## Compliance-Check (Money-Path-relevant)

- ✅ Wallet-Mirror ist READ-ONLY-Display. Mutationen laufen NIE über localStorage — alle Money-Mutations via `useSafeIdempotentMutation` + RPC + onSuccess `setWalletBalance(queryClient, ...)`. localStorage ist niemals Source-of-Truth.
- ✅ Bei Money-Mutation rebuild der Cache via onSuccess-setQueryData (existing Pattern in `setWalletBalance`). Mirror folgt automatisch via queryFn-onSuccess.
- ✅ Kein User-facing Text → keine business.md-Compliance.
- ✅ Cross-User-Pollution-Schutz via UID-keyed Slots + 3-Layer-Clear (lsClear + clearCachedAllSlots + queryClient.clear).

## TR-Wording-Vorab

Keine i18n-Strings in dieser Slice. Skip.

## Open Risiko

Hauptrisiko ist **Pre-Mortem #1** (User-Switch-Race). Mitigation strikt: Reihenfolge in `AuthProvider.onAuthStateChange` MUSS `clearCachedAllSlots VOR setUser(u)` sein — sonst feuert ein Render mit neuem User aber altem Cache. Test AC-03 ist Pflicht-PASS bevor Commit. Reviewer-Agent VOR BUILD prüft das nochmal.

Sekundärrisiko **Pre-Mortem #7** (Reviewer-übersieht-Anti-Pattern): mitigated durch explizites Briefing mit Slice-265-Code-Diff als Anti-Pattern-Reference.

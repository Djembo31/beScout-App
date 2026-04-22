# State-Sync Architecture Audit — 2026-04-23

**Trigger:** User-Report Club-Follow "zeigt mal 0, mal 4 Scouts, Unfollow/Follow syncht nicht, mehrfach aufgerufen, mehrere Stellen".

**Scope:** Nicht Race-Conditions (das ist Slice 150). Dieser Audit analysiert **State-Drift zwischen parallelen Source-of-Truth-Layern** — das Phaenomen das Anil beschreibt ("unprofessionell"). 

**Ausgangsfrage:** Wo ueberall hat BeScout das gleiche Pattern wie Club-Follow (2 parallele Systeme mit divergierender Wahrheit)?

---

## Executive Summary

**Das Kernproblem:** BeScout hat **fuenf parallele State-Layer** fuer dieselben Daten, ohne klare Ownership. Jede Mutation muss alle Layer konsistent updaten — passiert fast nirgends.

```
Layer 1  Server (Supabase Row, einzige echte Wahrheit)
         │
Layer 2  Service-Result (z.B. toggleFollowClub() Rueckgabe)
         │
Layer 3  React Query Cache (Key + TTL)
         │
Layer 4  Provider-State (ClubProvider.followedClubs, WalletProvider.balanceCents)
         │
Layer 5  Lokaler Component-State (useState localFollowing, setFollowerCount)
```

Jede Mutation-Site ruft 2-4 Layer auf, meist in willkuerlicher Reihenfolge. Ergebnis: alle paar Sekunden "blinzelt" ein Layer auf einen Stale-Wert, animiert dorthin, und korrigiert sich.

**Zahlen:**
- **37 Files** rufen `invalidateQueries` auf
- **14 Call-Sites** rufen `setQueryData` auf
- **8 Features** haben "Optimistic + Query + Provider"-Trio (fuehrt zu Drift)
- **2 Provider** (`ClubProvider`, `WalletProvider`) duplizieren Query-Cache-Daten als eigener State
- **0 Konvention** fuer Reihenfolge `setState / setQueryData / invalidate / refreshProfile`
- **Nur 1 Clean-Pattern** im ganzen Codebase: `useUpdateNotificationPreferences` (React-Query v5 Standard-Pattern mit `onMutate` + Context-Rollback + `onSettled`)

---

## Die 5 Anti-Pattern-Klassen

### Klasse A — **Dual-State-Drift** (schlimmstes Pattern)

Lokaler State + Query-Cache + Provider halten parallel dasselbe. Keine Sync-Garantie.

**Signatur:**
```ts
const [localFoo, setLocalFoo] = useState(...);         // Layer 5
const { data: queryFoo } = useFoo();                   // Layer 3
const { foo: providerFoo } = useContext(FooContext);   // Layer 4
const effectiveFoo = localFoo ?? queryFoo ?? providerFoo;  // race!
```

**Wo:**
| File | Symptom |
|------|---------|
| `components/club/hooks/useClubActions.ts` | Follower-Count: `localFollowerDelta` + `useClubFollowerCount` + `ClubProvider.followedClubs` → 3 Quellen. **User-reported Bug.** |
| `components/providers/ClubProvider.tsx` | `followedClubs[]` als State dupliziert Query-Cache. `toggleFollow` updated beide, `useClubActions.handleFollow` umgeht den Provider. |
| `components/profile/hooks/useProfileData.ts:48-49` | `setFollowerCount(c => c ± 1)` lokal neben `useFollowerCount` Query (social.ts:109). Divergiert bei cross-Tab-Aktivitaet. |
| `components/player/detail/hooks/usePlayerTrading.ts` | 15 useState + 3 useRef + WalletProvider.balanceCents + mehrere Query-Keys. `optimisticallyAddHolding` synthetisiert Holding mit `id: "optimistic-..."` — bleibt stehen wenn invalidate failed. |
| `components/providers/WalletProvider.tsx` | `balanceCents` als State + sessionStorage + `refreshBalance()` Round-Trip. Trades rufen manuell `setBalanceCents(result.new_balance)` + `refreshBalance()` parallel → zweiter Fetch ueberschreibt Optimistic. |

**User-sichtbare Symptome:** UI blinzelt, Zahlen springen, Follow-Button zeigt falschen Zustand, Balance-Anzeige kurz 0.

---

### Klasse B — **Invalidate-Race** (zweit-schlimmstes)

`setQueryData(optimistic)` + `invalidateQueries()` parallel → invalidate triggert refetch → pgBouncer-Read-After-Write-Transient liefert Stale → Optimistic wird ueberschrieben.

**Signatur:**
```ts
await mutateService();
queryClient.setQueryData(key, optimistic);
queryClient.invalidateQueries({ queryKey: key });   // refetcht gleich wieder
```

**Wo:**
| File | Action | Problem |
|------|--------|---------|
| `features/market/hooks/useWatchlistActions.ts:45-48` | Watchlist toggle | `setQueryData(opt-${id})` + `finally invalidateQueries` → User sieht 23505-Duplicates wenn refetch vor DB-Commit. Kommentar bestaetigt: "FIX-18 (J10)". Symptom wurde verlagert, nicht geloest. |
| `features/fantasy/hooks/useEventActions.ts:94-114` | joinEvent | `setQueryData(joinedIds)` + `invalidateQueries(tickets, usage, holdings)` parallel + `fetch('/api/events?bust=1')` fire-and-forget — 4 async-Pfade gleichzeitig. |
| `components/player/detail/hooks/usePlayerTrading.ts:181-182` | Buy | `optimisticallyAddHolding` + `invalidateAfterTrade` + `refreshBalance()` → 3 async parallel → WalletProvider-Drift moeglich. |
| `components/community/hooks/useCommunityActions.ts:40-66` | votePost | `setQueryData(upvotes/downvotes++)` dann nach Service `setQueryData(result.upvotes/downvotes)`. Zwischendrin springt die Zahl falls Server andere Werte liefert. |

**User-sichtbare Symptome:** Zahl springt von 5 → 6 → 5 → 6 (Optimistic → Stale-Refetch → Optimistic → Real-Refetch).

---

### Klasse C — **Zwei-Provider-Pattern**

Provider + Query-Cache halten dieselben Daten. Provider wurde gebaut bevor React Query da war. Beide werden noch gepflegt. Jede Mutation muss beide updaten — passiert oft nicht.

**Wo:**
| Provider | Dupliziert | Konsequenz |
|----------|-----------|------------|
| `ClubProvider.followedClubs[]` | `useUserFollowedClubs` Query + `useClubFollowerCount` + `useIsFollowingClub` | Club-Page Follow-Button updated nur Query-Cache, Provider bleibt stehen → Sidebar/Switcher-Bar drift. **User-reported Bug.** |
| `WalletProvider.balanceCents` | Could be `useWallet()` Query mit staleTime 30s | Manual `refreshBalance()` nach jeder Mutation noetig. 3 Retry-Strategies + Visibility-Refetch + SessionStorage-Backup = 207 Zeilen fuer 1 Zahl. |
| `FantasyStore` (Zustand) | `useEvents` + `useJoinedIds` + Query-Keys `qk.events.*` | `closeEvent()` aus Zustand parallel zu Query-Invalidate. |

**User-sichtbare Symptome:** "Eine Stelle zeigt mich als Follower, eine andere nicht." (exakt Anils Report)

---

### Klasse D — **Animation auf volatile Daten**

`useCountUp(data, duration)` auf Daten die von Optimistic/Stale/Real drei Werte durchlaufen. Jede Aenderung startet neue Animation.

**Signatur:**
```ts
const { data } = useQuery(...);    // kann 3× hintereinander wechseln
const count = useCountUp(data);    // animiert jedes Mal 600ms
```

**Wo:**
| File | Zeile | Folge |
|------|-------|-------|
| `components/club/ClubHero.tsx:63-65` | `useCountUp(followerCount, 600)` + `useCountUp(totalVolume24h, 800)` + `useCountUp(playerCount, 500)` | Bei Follow-Mutation: 0 → optimistic-4 → invalidate → stale-0 → refetch → real-4. User sieht 2-3 Animations-Zyklen. |
| `components/club/ClubStatsBar.tsx:44-45` | gleicher Wert (`followerCount`) in separatem `useCountUp` | Zweite Animation laeuft parallel mit anderem Start-Punkt → Desync zwischen Hero und StatsBar auf demselben Screen. |

**User-sichtbare Symptome:** "Mal 0, mal 4 scouts" — genau wie gemeldet.

---

### Klasse E — **Fire-and-Forget Side-Effects**

Nach Mutation: mehrere `import(...)` + `.catch(console.error)` parallel. Kein Error-Handling, kein Retry, keine Reihenfolge-Garantie.

**Signatur:**
```ts
await mutateService();
import('@/lib/services/missions').then(({ trigger }) => trigger(...)).catch(console.error);
import('@/lib/services/activityLog').then(({ log }) => log(...)).catch(console.error);
fetch('/api/events?bust=1').catch(console.error);
queryClient.invalidateQueries({ queryKey: ... });
```

**Wo:**
| File | Side-Effects parallel |
|------|----------------------|
| `features/fantasy/hooks/useEventActions.ts:117-124` | Missions + ActivityLog + Cache-Bust + 4 Invalidates |
| `features/fantasy/hooks/useEventActions.ts:199-205` | 2 dynamic imports parallel zum Invalidate |
| `components/club/sections/MembershipSection.tsx:37` | Nur Toast, keine Invalidates — Abo erscheint nicht in `useClubSubscription` bis TTL ablauft |
| `components/community/TipButton.tsx:92-96` | 3 Invalidates + refreshBalance + logActivity — in 5 Zeilen, keine Order-Garantie |

**User-sichtbare Symptome:** Mission-Toast erscheint nach Event-Join manchmal nicht, Activity-Log fehlt sporadisch, Cache-Bust schlaegt fehl weil dynamic-import late arrives.

---

## Betroffene Features — Vollstaendige Liste

Sortiert nach User-Impact × Money-Risk.

### Tier 1: MONEY-CRITICAL (sofort betroffen bei jedem Click)

| # | Feature | Anti-Pattern | Files | User-Bug |
|---|---------|--------------|-------|----------|
| 1 | **Trading Buy/Sell** (Market + IPO) | A + B + E | `usePlayerTrading.ts`, `features/market/mutations/trading.ts`, `features/market/hooks/useTradeActions.ts` | Balance blinzelt, Holdings erscheinen doppelt, Floor-Price lagged |
| 2 | **Membership Subscribe** | nur Klasse A (kein optimistic) | `MembershipSection.tsx` | Abo-Status lagged ~60s. Kein Optimistic, nichts. Slice 150 flaggt zusaetzlich Double-Submit. |
| 3 | **Tips senden** | E | `TipButton.tsx` | Balance refresh + 3 Invalidates parallel |
| 4 | **Offers erstellen/akzeptieren** | B | `usePlayerTrading.ts:260-290` | Offers-Liste drift |
| 5 | **Research unlock/rate** | B | `useCommunityActions.ts:213-249` | "bezahlt aber nicht unlocked" Phase |

### Tier 2: HIGH-VISIBILITY (Haupt-UX, User-sichtbar)

| # | Feature | Anti-Pattern | Files | User-Bug |
|---|---------|--------------|-------|----------|
| 6 | **Club Follow/Unfollow** | A + C + D | `useClubActions.ts`, `ClubProvider.tsx`, `social.ts`, `ClubHero.tsx`, `ClubStatsBar.tsx` | **Aktueller Anil-Report** |
| 7 | **User Follow/Unfollow** | A | `useProfileData.ts:48-49, 160-180` | Follower-Count in ProfileView divergiert zu Social-Stats-Hook |
| 8 | **Watchlist toggle** | B | `useWatchlistActions.ts`, `WatchlistView.tsx` | `opt-${id}` Duplikate-Risiko |
| 9 | **Fantasy Event Join/Leave** | B + C + E | `useEventActions.ts`, `FantasyStore` | Participant-Count springt, Ticket-Balance laggt |
| 10 | **Community Votes (Post/Poll)** | A + B | `useCommunityActions.ts:35-73, 251-282` | Upvote/Downvote zahl springt |
| 11 | **Lineup Save** | E | `useLineupSave.ts`, `useEventActions.ts:134-209` | Wildcard-Balance + club-invalidates parallel |

### Tier 3: BACKGROUND (seltener gesehen, aber gleiche Bugs)

| # | Feature | Anti-Pattern | Files |
|---|---------|--------------|-------|
| 12 | **Predictions create** | Klein (nur useMutation) | `predictions.ts:68-80` — sauber, Referenz |
| 13 | **Notification Preferences** | **Clean-Pattern** | `notifications.ts` — einzige richtige Umsetzung |
| 14 | **Club Challenges claim** | Unklar | `clubChallenges.ts` — zu pruefen |
| 15 | **Mystery Box open** | A | `EquipmentPicker.tsx` — ticket-balance invalidate |
| 16 | **Fan Wishes** | A | `FanWishModal.tsx` |
| 17 | **Bounty submit/approve** | A + B + E | `useCommunityActions.ts:192-211`, `ClubAdmin` |
| 18 | **Onboarding Club-Follow** | A (umgeht `ClubProvider`) | `app/(auth)/onboarding/page.tsx` |

---

## Architektur-Empfehlung: Target State

**Prinzip:** **Query-Cache ist einzige Wahrheit. Provider/lokaler State nur fuer UI-only-Zeug (Modal-Open, Active-Tab).**

### Regel 1 — Mutations via `useSafeMutation` (bereits gebaut, Slice 151a)

```ts
const mut = useSafeMutation({
  mutationFn: ...,
  onMutate: async (vars) => {
    await qc.cancelQueries({ queryKey });   // Cancel in-flight
    const prev = qc.getQueryData(queryKey); // Snapshot
    qc.setQueryData(queryKey, optimistic);  // Apply optimistic
    return { prev };                         // Rollback-Context
  },
  onError: (_err, _vars, ctx) => {
    qc.setQueryData(queryKey, ctx.prev);    // Rollback
  },
  onSettled: () => {
    qc.invalidateQueries({ queryKey });     // Reconcile
  },
});
```

Das ist der React-Query-v5-Standard. `useUpdateNotificationPreferences` macht's genau so. Alle 18 Features mueessen diese Form haben.

### Regel 2 — Provider nur fuer App-State, nie fuer Server-Daten

- **Behalten:** `AuthProvider.user`, `ToastProvider`, `FantasyStore.activeEvent` (Modal-State)
- **Aufloesen:** `ClubProvider.followedClubs` → `useFollowedClubs()` Query + `setQueryData` nach Toggle
- **Aufloesen:** `WalletProvider.balanceCents` → `useWallet()` Query mit `staleTime: 0` + `setQueryData(new_balance)` nach RPC-Response

### Regel 3 — `useCountUp` nur auf stable Data

```ts
// Schlecht:
const count = useCountUp(followerCount, 600);   // animiert jedes Query-Update

// Gut:
const stableCount = useDeferredValue(followerCount);  // React throttlet
const count = useCountUp(stableCount, 600);
// ODER: useCountUp direkt im Pending-State deaktivieren.
```

### Regel 4 — Keine Fire-and-Forget Parallel-Side-Effects

```ts
// Schlecht:
await mutate();
import('missions').then(...).catch(...);
import('activityLog').then(...).catch(...);
fetch('/api/bust').catch(...);
qc.invalidateQueries(...);

// Gut: in RPC buendeln ODER sequenziell im mutationFn
mutationFn: async (vars) => {
  const result = await mutateRpc(vars);       // Eine DB-Transaction erledigt alles:
  return result;                               //  Mission-Progress, Activity-Log,
}                                              //  Counter-Increment — atomar.
```

### Regel 5 — Animation optional, Data-Correctness pflicht

UseCountUp auf Follower-Count ist pure Dekoration. Bei volatilen Daten: Feature weg oder auf Mutations-Intervall pausieren.

---

## Cleanup-Plan (Slice-Serie)

**Phase 1 — Primitive + Pilot (bereits Slice 151a/b in Arbeit)**
- ✅ 151a: `useSafeMutation` Primitive
- 🟡 151b: Pilot-Migration Club-Follow mit `useSafeMutation` — **aber Klasse C (Provider-Duplication) nicht geloest**
- **Neu vorgeschlagen 151b-RESET:** Club-Follow nutzt `useSafeMutation` **und** `ClubProvider.followedClubs` wird ersetzt durch `useFollowedClubs` Query. Alle 20 Consumer migrieren.

**Phase 2 — Money-Paths (Slice 152-155)**
- 152: `WalletProvider` → `useWallet` Query migrieren (207 LOC → ~40 LOC)
- 153: `usePlayerTrading.ts` refactor — useSafeMutation fuer Buy/Sell/Offers, `optimisticallyAddHolding` in `onMutate`, keine parallelen useStates mehr
- 154: `MembershipSection` auf useSafeMutation + Optimistic
- 155: `useTradeActions.ts` + `TipButton.tsx` (Tier 1)

**Phase 3 — UX-Hotspots (Slice 156-158)**
- 156: `useEventActions.ts` + `FantasyStore` Cleanup, Side-Effects in RPC buendeln
- 157: `useWatchlistActions.ts` — opt-id Pattern durch onMutate/onSettled ersetzen
- 158: `useCommunityActions.ts` — Votes/Polls/Bounties auf useSafeMutation

**Phase 4 — Profile + Rest (Slice 159-161)**
- 159: `useProfileData.ts` — Follower/Following auf Query + setQueryData, parallele useStates raus
- 160: Onboarding Club-Follow via ClubProvider oder Query (nicht eigener Pfad)
- 161: ESLint-Rule + D18 in common-errors.md — verbietet `const [localFoo, ...] = useState()` + `useQuery(sameFoo)` im gleichen File

**Erwartete Runtime:** 10-12 Sessions. Jede Slice `useSafeMutation` Pattern + konsolidiert State-Layer + hat Test + Screenshot-Proof.

---

## Konkurrenzvergleich — was "professionell" heisst

Vergleichbare Produkte die das richtig machen:
- **Sorare** (genau unsere Peer-Gruppe): React Query als einzige Source-of-Truth, keine dupliziereden Provider. Follow-Button ist `setQueryData` + Optimistic + Rollback. Kein useState fuer Count.
- **Linear** (UI-Excellence-Referenz): Jede Mutation ist `useSafeMutation`-Aequivalent (ihre Sync-Engine ist anders aber Pattern identisch). Keine Animation auf volatile Daten.
- **Vercel Dashboard**: Server-Daten NUR in SWR/React-Query. Provider ausschliesslich fuer UI-State.

BeScout hat historisch gewachsene Provider (pre-React-Query-Zeit, ~2024). Der Audit beweist: der Weg nach vorne ist Provider-Reduktion, nicht -Wachstum.

---

## Nachste Entscheidung — CEO

**Frage an Anil:**

Welche Reihenfolge bevorzugst du?

- **Option X — Business-first** (meine Empfehlung): Money-Paths zuerst. Slice 151b-RESET (Club-Follow) ueberspringen, direkt Phase 2 (WalletProvider + Trading). Trading-Bugs sind strategisch wichtiger als Follow-UX.
- **Option Y — UX-first** (Anil's heutiger Pain-Point): 151b-RESET sofort. Dann Phase 2-4 sequenziell. Dauert 10-12 Sessions, Trading-Bugs bleiben.
- **Option Z — Hybrid**: 151b-RESET (User-Report fixen) → dann Phase 2 Money. Dann stop fuer Beta-Test-Runde, dann Phase 3-4 post-Beta.

Ich empfehle **Z**. Follow-Button ist billig zu fixen (~1 Session) und du kriegst sofort eine professionelle Referenz-Implementation die alle anderen Slices folgen koennen. Dann Money, dann Rest.

Wie willst du weiter?

# 015 — Logout Cache-Clear Flow-Trace

Ersatz fuer Playwright-E2E: Grace-Period-Expire + Token-Expire sind ohne Supabase-Auth-Event-Harness schwer reproduzierbar. Dieses Dokument trace jeden relevanten Auth-State-Uebergang anhand des Codes und zeigt, welche Cache-Clear-Entscheidung vorher vs nachher getroffen wurde.

**Relevantes File:** `src/components/providers/AuthProvider.tsx`
**Code-Pfade:** `onAuthStateChange`-Callback (L261-L300) ruft `clearUserState(event)` (L235-L257).

---

## Uebersicht — wer ruft `clearUserState(event)` mit welchem `event`?

| Trigger | event-Wert | Aufruf-Branch | Vor 015 | Nach 015 |
|---------|------------|---------------|---------|----------|
| Explicit Logout (SideNav button → signOut) | `'SIGNED_OUT'` | L282: `else if (event === 'SIGNED_OUT')` | clear() | clear() |
| Stale-Session-Recovery (onboarding FK-Error → signOut) | `'SIGNED_OUT'` | L282 | clear() | clear() |
| Grace-Period-Expire (cached user, INITIAL_SESSION=null, 3s Timeout abgelaufen) | `'INITIAL_SESSION'` | L288 setTimeout callback → `clearUserState(event)` | **kein clear** | clear() |
| Silent session-loss (kein cached user, session=null, kein SIGNED_OUT) | diverse (INITIAL_SESSION, TOKEN_REFRESHED mit session=null, USER_UPDATED mit user=null) | L295: `else { clearUserState(event); }` | **kein clear** | clear() |
| TOKEN_REFRESHED mit session.user vorhanden | — | L272: `if (event === 'TOKEN_REFRESHED')` → `invalidateQueries()` | invalidate (kein clearUserState) | invalidate (unveraendert) |
| SIGNED_IN | — | L277: `if (event === 'SIGNED_IN')` → loadProfile + logActivity | kein clearUserState | kein clearUserState |

---

## Szenario-Traces

### Szenario 1 — Explicit Logout (SideNav button)

**Trigger:** User klickt Logout-Button in SideNav → Confirm → `handleLogout()`.

```
SideNav.tsx:57-60:
  handleLogout = async () => {
    await signOut();                   // supabase.auth.signOut()
    router.push('/login');
  }

Supabase intern clears local session → feuert onAuthStateChange('SIGNED_OUT', null).

AuthProvider.tsx:261-300 Callback:
  event = 'SIGNED_OUT'
  u = null
  L282: else if (event === 'SIGNED_OUT') → clearUserState('SIGNED_OUT')

clearUserState(event='SIGNED_OUT'):
  L245: setUser(null)
  L250: ssClear()
  L252-254 VORHER:
    if (event === 'SIGNED_OUT') {
      setTimeout(() => queryClient.clear(), 0);   ✓ CLEAR
    }
  L252-254 NACHHER:
    setTimeout(() => queryClient.clear(), 0);     ✓ CLEAR (unveraendert)
```

**Ergebnis:** Identisch. Cache wird gecleart.

---

### Szenario 2 — Stale-Session-Recovery (onboarding)

**Trigger:** User hat Session-Token aber Profil wurde DB-seitig geloescht. Auf Onboarding beim Create-Profile FK-Error → Recovery:

```
onboarding/page.tsx:209-212:
  if (msg.includes('foreign key') || msg.includes('fkey')) {
    await signOut();                   // → SIGNED_OUT
    router.replace('/login');
    return;
  }
```

Wie Szenario 1 — Cache-Clear laeuft vor+nach. Identisch.

---

### Szenario 3 — Grace-Period-Expire (kritischer Fall)

**Trigger:** Silent-Token-Expire. User hat `SS_USER` in sessionStorage. App-Load → INITIAL_SESSION feuert mit null weil Refresh-Token expired.

```
AuthProvider.tsx:211-221 Hydrate:
  cachedUser = { id: 'user1' }, cachedProfile = { ... }
  setLoading(false)  // UI zeigt User 1 sofort

AuthProvider.tsx:261-300 onAuthStateChange:
  event = 'INITIAL_SESSION'
  session = null → u = null
  L282: event !== 'SIGNED_OUT'
  L285: hadCachedUser=true && !initialDone
    → graceTimer = setTimeout(..., 3000)  // 3s Grace
    → initialDone=true, return

3 Sekunden spaeter (User 1 kann in dieser Zeit nicht refresht werden):
  L288-291:
    graceTimer callback:
      console.warn('Grace period expired')
      clearUserState('INITIAL_SESSION')    ← event !== 'SIGNED_OUT'

clearUserState(event='INITIAL_SESSION'):
  setUser(null), ssClear()
  L252-254 VORHER:
    if (event === 'SIGNED_OUT') → FALSE → kein clear    ✗ BUG
    React Query Cache von User 1 bleibt im Memory.
  L252-254 NACHHER:
    setTimeout(() => queryClient.clear(), 0);            ✓ CLEAR
```

**Folge-Szenario:** User 2 loggt im selben Tab ein:

```
onAuthStateChange:
  event = 'SIGNED_IN', session.user = { id: 'user2' }
  L267: if (u) → setUser(u), ssSet(SS_USER, u)
  L271: await loadProfile(u.id)
  Jetzt laufen alle Query-Hooks mit user2-ID.

VORHER (Bug):
  queryClient hat noch Keys von user1 (z.B. ['wallet', 'user1-id'], ['holdings', ...]).
  Neue Query-Hooks mit user2-ID fragen [qk.wallet(user2-id)] — kein Cache-Hit.
  ABER: Query-Hooks ohne user-id im Key (z.B. Markt-Queries die RLS-gefiltert sind)
  zeigen gecachte Antworten aus User 1 Perspective. Stale-Data-Leak.

NACHHER:
  Cache ist leer → alle Queries fetch fresh → keine Leak.
```

**Ergebnis:** Bug gefixt. Der kritische Pfad.

---

### Szenario 4 — Silent session-loss ohne cached user

**Trigger:** Browser-Tab geoeffnet, keine Session, auch kein sessionStorage-Cache (Fresh Tab).

```
AuthProvider.tsx Hydrate:
  cachedUser = null → hadCachedUser=false
  setLoading(true) (kein Cache-Hit)

onAuthStateChange:
  event = 'INITIAL_SESSION', session = null → u = null
  L282: event !== 'SIGNED_OUT'
  L285: !hadCachedUser → branch skipped
  L295: else { clearUserState(event); }

clearUserState(event='INITIAL_SESSION'):
  VORHER: kein clear (event !== 'SIGNED_OUT')
  NACHHER: clear

Auswirkung: Beim Fresh-Boot ist Cache ohnehin leer → queryClient.clear() ist no-op. Safe.
```

**Ergebnis:** Keine Verhaltensaenderung (Cache war schon leer).

---

### Szenario 5 — TOKEN_REFRESHED mit valid session

**Trigger:** Token hat sich automatisch erneuert.

```
onAuthStateChange:
  event = 'TOKEN_REFRESHED', session.user = { id: 'user1' } → u != null
  L267: if (u) {
    setUser(u)
    ssSet(SS_USER, u)
    await loadProfile(u.id)
    L272-275: if (event === 'TOKEN_REFRESHED') {
      queryClient.invalidateQueries();
    }
  }

clearUserState wird NICHT aufgerufen. Unveraendert.
```

**Ergebnis:** Unveraendert. Kein `clear()`, nur `invalidateQueries()` (beabsichtigt — Queries sollen re-fetchen mit neuem Token, aber optimistische Updates bleiben).

---

### Szenario 6 — Admin-Revoke mit aktiver Session

**Trigger:** Admin revoket User-Session via Supabase Dashboard oder Edge-Function. Supabase-Realtime-Auth-Channel feuert SIGNED_OUT-Event im Client.

```
onAuthStateChange:
  event = 'SIGNED_OUT', session = null
  → wie Szenario 1 → clearUserState('SIGNED_OUT') → clear()
```

**Ergebnis:** Unveraendert. Cache wird gecleart.

---

## Summary

| Szenario | Vor 015 | Nach 015 | Bug? |
|----------|---------|----------|------|
| 1. Explicit Logout | clear | clear | — |
| 2. Stale-Session-Recovery (signOut) | clear | clear | — |
| 3. Grace-Period-Expire | **kein clear** | clear | **FIX** |
| 4. Silent session-loss ohne cached user | kein clear (no-op, Cache leer) | clear (no-op) | no-op |
| 5. TOKEN_REFRESHED valid | invalidate | invalidate | — |
| 6. Admin-Revoke | clear | clear | — |

**Tatsaechlicher Fix:** Szenario 3. Alles andere entweder unveraendert oder no-op-sicher.

## Verifikation

- `npx tsc --noEmit` → clean (0 Bytes Output, siehe `015-tsc.txt`)
- `npx vitest run src/lib/__tests__/auth/ src/lib/__tests__/db-invariants.test.ts` → 38/38 gruen (siehe `015-tests.txt`)
- `git diff src/components/providers/AuthProvider.tsx` → 5 Zeilen geaendert (siehe `015-diff.txt`)

# Test-Mock-Realismus Audit (Slice 270d Lesson)

**Datum:** 2026-05-05 Abend
**Trigger:** active.md Self-Audit Item 4 — „Test-Mocks zu naiv — simulieren keinen 1000-row-Cap; grüne Tests trotz live-broken Service".

## Problem-Beschreibung

Slice 270 + 270d v1 + 270d v2 — alle drei Iterationen hatten **grüne Tests** in `fixtures.test.ts`, aber 270d v1 war live-broken. Der Bug (PostgREST RPC-Cap) konnte vom Test-Mock nicht gefangen werden, weil:

1. Mock `.rpc()`-Builder akzeptiert `.range(0, 99999)` als chainable und gibt komplette Daten zurück.
2. Echtes PostgREST-Backend ignoriert `.range()` bei RPCs (Slice 270d Discovery) und cappt bei 1000.
3. Test setzt z.B. 5 Test-Rows → Mock liefert 5 → Test grün → real-world 1500 Rows mit 1000-Cap → live-broken.

## Mock-Realismus-Lücken (current state, src/test/mocks/supabase.ts)

| Methode | Mock-Verhalten | Realität (PostgREST) | Gap |
|---------|---------------|---------------------|-----|
| `.from().select()` ohne `.range()` | Liefert alle Test-Daten | Cappt bei 1000 | ❌ |
| `.from().select().limit(N>1000)` | Liefert alle Test-Daten | Cappt bei 1000 | ❌ |
| `.rpc()` mit `.range()` | Akzeptiert silent | Range wird IGNORIERT | ❌ |
| `.rpc()` mit `.limit()` | Akzeptiert silent | Limit wird IGNORIERT (TABLE-Set), 1000-Cap greift | ❌ |
| `.in('col', ids)` mit ids.length > 100 | Akzeptiert silent | URL-Limit ~14KB → silent fail | ❌ |

## Lösungs-Optionen

### Option A: Realistischer Mock (rejected)

```ts
// Pseudo: Mock cappt automatisch
function createQueryBuilder(table) {
  builder.then = (resolve) => {
    const data = getResponse(_queues, table);
    // Simulate PostgREST cap
    if (!builder._rangeApplied && Array.isArray(data) && data.length > 1000) {
      resolve({ data: data.slice(0, 1000), error: null });
    } else {
      resolve({ data, error: null });
    }
  };
}
```

**Verworfen weil:**
- Bestehende Tests setzen typisch <100 Rows — kein Effekt sichtbar.
- Tests die >1000 Rows setzen sind selten und intentional (Test-Doubles für realistische Liste).
- Simulation würde 100+ Test-Files refactoren ohne klaren Nutzen.

### Option B: Lint-Rule (`silent-fail-audit` erweitern) — gewählt

`scripts/silent-fail-audit.sh` hat bereits Pattern „PostgREST 1000-row cap MONEY-CRITICAL". Erweiterung:

```bash
# Pattern G NEU: RPC mit .range()/.limit() — sind diese effektiv?
grep -rnE "\.rpc\(['\"][^'\"]+['\"]\)\.\s*\.?(range|limit)\(" src/lib/services/ src/features/*/services/
```

Treffer würden manuell gegen DB-Smoke validiert (Cap effektiv? oder wirkungslos?). Slice 270d v1 wäre damit aufgefallen.

### Option C: DB-Smoke-Pflicht für aggregat-RPCs (Spec-Quality-Gate) — gewählt

Erweitere `.claude/rules/workflow.md` Section 1 SPEC um:
- **DB-Smoke-Verify-Pflicht bei RPC-Aggregat-Refactor**: vor BUILD `EXPLAIN (ANALYZE) <rpc>;` zeigen + Network-Header `content-range` post-Deploy verifizieren.

Slice 270d hatte die richtige Verify-Methode (DOM-Audit auf Live), aber zu spät — erst NACH Push. Spec-Sektion „Self-Verification Commands" sollte das pre-BUILD spezifizieren.

## Empfehlung

**Option B + Option C kombinieren**, NICHT Option A.

**Action-Items für Slice 272+ (Polish, post-Beta):**
1. `scripts/silent-fail-audit.sh` Pattern G hinzufügen (`.rpc().range/limit/`)
2. Slice 270 Discovery in workflow.md SPEC-Sektion explizit als pre-BUILD-Gate verankern
3. Mock-Simulation NICHT machen — falsche Komplexität

## Status-Quo

Tests bleiben naiv. Echte Cap-Bugs werden gefangen via:
- DB-Smoke pre-BUILD (Spec-Pflicht)
- Live-Verify post-Deploy (Network-Header oder DOM-Audit)
- silent-fail-audit Lint-Rule (Pattern A)

Slice 270d Lesson ist bereits in errors-db.md §1 promoted. Ein Mock-Refactor würde keine zusätzliche Bug-Klasse fangen.

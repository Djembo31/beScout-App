---
name: impact
description: "Cross-cutting impact analysis. Finds ALL code paths affected by a change to prevent RPC parity bugs and missing side-effects. Use before any change to RPCs, DB schemas, services, or trading logic."
argument-hint: "<what you're changing, e.g. 'buy_from_order fee split'>"
user-invocable: true
---

# /impact — Cross-Cutting Impact Analysis

Before ANY code change to shared entities, find ALL related code paths that need the same change.
This skill exists because RPC parity bugs are our #1 recurring issue.

## When to Use

ALWAYS before:
- Changing a database table or column
- Modifying an RPC function
- Adding/changing side-effects (missions, achievements, notifications)
- Changing fee calculations or splits
- Adding a new CHECK constraint value
- Modifying a service function signature

## Process

### Step 1: Identify the Entity
What is being changed? (Table, RPC, Service Function, Type, Component)

### Step 2: Find ALL Code Paths

**Database Layer:**
```bash
# Find all RPCs touching this table
grep -r "table_name" supabase/migrations/ --include="*.sql" -l
```

**Service Layer:**
```bash
# Find all services calling these RPCs
grep -r "rpc_name\|table_name" src/lib/services/ -l
```

**Query/Hook Layer:**
```bash
# Find all hooks using these services
grep -r "service_function" src/lib/queries/ -l
```

**Component Layer:**
```bash
# Find all components using these hooks/services
grep -r "hook_name\|service_function" src/components/ -l
```

**Type Layer:**
```bash
# Find all types for this entity
grep -r "TypeName" src/types/ -l
```

### Step 3: Check Side-Effect Parity

For EACH found code path, check:

| Side-Effect | Search Pattern | Required? |
|-------------|---------------|-----------|
| Mission Tracking | `triggerMissionProgress` | Bei allen Trade-Aktionen |
| Achievement Check | `checkAndUnlockAchievements` | Bei allen Trade-Aktionen |
| Notifications | `insertNotification` / Supabase insert | Bei User-sichtbaren Aktionen |
| Activity Log | `insertActivityLog` / Supabase insert | Bei ALLEN Aktionen (Audit) |
| Stats Refresh | `refreshUserStats` | Bei Score-Aenderungen |
| Cache Invalidation | `invalidateQueries` / `invalidateTradeData` | Bei ALLEN Writes |

### Step 4: Check Constraints

```bash
# Find CHECK constraints for affected columns
grep -r "CHECK\|check" supabase/migrations/ --include="*.sql" | grep "column_name"
```

### Step 5: Check Fee Parity (wenn Trading betroffen)

These 4 functions MUST have identical fee logic:
1. `buy_player_dpc` (Market Buy)
2. `buy_from_order` (Order Book)
3. `buy_from_ipo` (IPO)
4. `accept_offer` (P2P Offer)

Check: Platform Fee, PBT Fee, Club Fee, Subscription Discount

## Output: Impact Manifest

```markdown
## Impact Manifest: [Change Description]
### Generated: [Date]

### Betroffene Code-Pfade
| Layer | File | Function/Component | Beziehung |
|-------|------|--------------------|-----------|
| DB | migration_xyz.sql | rpc_name() | Primaer |
| Service | services/trading.ts | buyPlayer() | Aufrufer |
| Hook | queries/trading.ts | useTrading() | Consumer |
| UI | components/market/... | BuyButton | UI-Trigger |

### Side-Effects Paritaet
| Code-Pfad | Missions | Achievements | Notify | ActivityLog | Cache |
|-----------|----------|--------------|--------|-------------|-------|
| buyPlayer | YES | YES | YES | YES | YES |
| buyFromOrder | YES | YES | YES | **MISSING** | YES |

### CHECK Constraints
| Column | Constraint | Valid Values | Affected? |
|--------|-----------|-------------|-----------|

### Fee Parity (wenn Trading)
| Function | Platform | PBT | Club | Discount |
|----------|----------|-----|------|----------|

### Risk: HIGH / MEDIUM / LOW
[Reasoning]

### Action Items
- [ ] [Konkret was geaendert werden muss, mit File:Line]
```

## KRITISCH

- LIEBER ZU VIEL als zu wenig listen
- Bei 4+ betroffenen Code-Pfaden: Risk = HIGH
- Bei fehlenden Side-Effects: SOFORT als Action Item markieren
- Output MUSS actionable sein — keine vagen Hinweise

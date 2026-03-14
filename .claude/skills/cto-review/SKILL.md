---
name: cto-review
description: "Deep code review against full project knowledge (1M context). Replaces manual review by checking against 100+ known errors, 30+ patterns, and all project conventions. Use after implementation or before merge."
argument-hint: "<file path, commit range, or 'last changes'>"
user-invocable: true
---

# /cto-review — Full Project Knowledge Review

Reviews code against the COMPLETE BeScout knowledge base.
With 1M context, we load EVERYTHING. No excuses for known errors.

## Pre-Load (ALLES laden — 1M erlaubt es)

1. `.claude/rules/common-errors.md` — Top Fehlerquellen
2. Betroffene Domain-Rules (trading.md, fantasy.md, etc.)
3. `memory/errors.md` — 100+ dokumentierte Fehler (Grep nach relevanten Kategorien)
4. `memory/patterns.md` — 30+ etablierte Patterns (Grep nach relevanten Kategorien)
5. Alle geaenderten Files VOLLSTAENDIG lesen

## Review Checkliste

### 1. Known Error Patterns
Durchlaufe JEDE Kategorie aus common-errors.md:
- [ ] DB Column Names korrekt? (`first_name`/`last_name`, `side` nicht `type`, etc.)
- [ ] CHECK Constraints beachtet? (Richtige Werte, richtige Gross/Kleinschreibung)
- [ ] Kein `::TEXT` auf UUID?
- [ ] Hooks vor early returns?
- [ ] Kein `[...new Set()]`?
- [ ] Modal hat `open` prop?
- [ ] PlayerPhoto Props: `first`/`last`/`pos`?
- [ ] Kein dynamisches Tailwind (`border-[${var}]`)?

### 2. RPC Parity (wenn Backend betroffen)
- [ ] Alle parallelen Trade-Pfade konsistent?
- [ ] Fee-Splits korrekt und vollstaendig (Platform + PBT + Club)?
- [ ] Advisory Locks bei Wallet-Deductions?
- [ ] auth.uid() Guards auf SECURITY DEFINER RPCs?
- [ ] REVOKE FROM PUBLIC, authenticated, anon?

### 3. Side-Effects Komplett (wenn Trade/Action betroffen)
- [ ] Mission Tracking (`triggerMissionProgress`) mit `result.success` Guard?
- [ ] Achievement Checks (`checkAndUnlockAchievements`)?
- [ ] Notifications inserted?
- [ ] Activity Log inserted (IMMER, auch bei Failure)?
- [ ] Cache invalidiert (`invalidateTradeData`, `invalidateQueries`)?
- [ ] Stats refreshed?

### 4. Service Layer Architecture
- [ ] Keine direkten Supabase-Calls aus Components?
- [ ] Component → Service → Supabase Kette eingehalten?
- [ ] RPC-Ergebnisse null-gecheckt VOR Cast?
- [ ] Error Handling: mindestens `console.error`, kein leeres `.catch(() => {})`?

### 5. Type Safety
- [ ] Kein `any`?
- [ ] Keine unsicheren Casts ohne `as unknown as Type`?
- [ ] Null Guards auf optionale Zahlen (`?? 0`)?
- [ ] `Array.from(new Set())` statt `[...new Set()]`?
- [ ] FK Join Cast Pattern: `row.clubs as unknown as DbClub`?

### 6. UI Quality (wenn Components betroffen)
- [ ] Mobile-First 360px responsive?
- [ ] Alle States: Loading → Empty → Error → Success → Disabled?
- [ ] Loading Guard VOR Empty Guard?
- [ ] Touch targets min 44px?
- [ ] aria-labels auf interaktiven Elementen?
- [ ] `tabular-nums` / `font-mono` auf Zahlen?
- [ ] Deutsche Labels, englische Variablen?
- [ ] Bestehende Components wiederverwendet (nicht neu gebaut)?
- [ ] Loader2 aus lucide-react (kein custom Spinner)?

### 7. i18n
- [ ] Alle user-facing Strings in `messages/{locale}.json`?
- [ ] Keys in snake_case?
- [ ] DE + TR vorhanden?

### 8. Performance
- [ ] Tab-gated Queries (`enabled: tab === 'x'`)?
- [ ] Kein `staleTime: 0`?
- [ ] `keepPreviousData` auf Listen-Queries?
- [ ] Keine N+1 Queries?
- [ ] Heavy Components lazy-loaded?

### 9. Security
- [ ] Keine client-kontrollierten Booleans als Security Gates?
- [ ] Server-seitige Validierung (nicht nur Client)?
- [ ] Auth Guards auf geschuetzte Routen?
- [ ] Keine Secrets in Client-Code?

## Output Format

```markdown
## CTO Review: [Scope]
### Date: [YYYY-MM-DD]

### Verdict: PASS | CONCERNS | REWORK | FAIL

### Findings
| # | Severity | Category | File:Line | Issue | Fix |
|---|----------|----------|-----------|-------|-----|
| 1 | CRITICAL | RPC Parity | trading.ts:142 | Missing club fee credit | Add treasury update |

### Checklist Coverage
- Known Errors: [N] checked, [M] found
- RPC Parity: checked / N/A
- Side-Effects: checked / N/A
- Service Layer: checked
- Type Safety: checked
- UI Quality: checked / N/A
- i18n: checked / N/A
- Performance: checked
- Security: checked

### Positive
- [Was gut gemacht wurde]

### Summary
[1-2 Saetze]
```

## Verdict-Regeln

| Verdict | Kriterium | Aktion |
|---------|-----------|--------|
| **PASS** | 0 Issues oder nur Nitpicks | Merge erlaubt |
| **CONCERNS** | 1-3 LOW/MEDIUM Issues | Merge erlaubt, Issues als Follow-up |
| **REWORK** | 1+ CRITICAL oder 3+ MEDIUM | Fix VOR Merge (healer Agent) |
| **FAIL** | Security, Architecture, Data Loss Risk | Manuelles Review + Redesign |

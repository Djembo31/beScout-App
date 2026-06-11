---
name: silent-fail-audit
description: Scannt Code auf stille-Fehler-Patterns die silent-undefined/silent-skip/error-swallow verursachen. Nutze proaktiv 1x pro Woche ODER nach /impact für Money/Data-Code. Findet bekannte Bug-Klassen (PostgREST .in() >400, .select() 1000-cap, error-swallow, hart-codierte State-Checks).
---

# /silent-fail-audit — Scan für stille Fehler

10+ Tage Erfahrung: Silent-Fails sind die teuersten Bugs (tagelang unentdeckt).

## Automatisierter Scan

```bash
npx tsx scripts/silent-fail-audit.ts
```

Script prüft 6 Patterns, schreibt `worklog/audits/silent-fail-YYYY-MM-DD.md`.

## 6 Scan-Patterns (manuell verifizierbar)

### 1. `.in()` ohne Chunking
```bash
grep -rn "\\.in(" src/ scripts/ | grep -v "CHUNK\\|batch\\|\\.slice"
```
**Bug:** PostgREST URL-Limit ~14KB → silent undefined ab ~400 UUIDs. Fix: chunk in 100er.

### 2. `.select()` ohne .range()/.limit() auf grossen Tabellen
```bash
grep -rn "\\.from('.*')\\s*\\.\\s*select" src/app/api/ src/lib/ | grep -v "\\.range\\|\\.limit(\\|\\.eq\\|\\.single\\|\\.maybeSingle"
```
**Bug:** PostgREST 1000-row-Cap. players=4556+, clubs=140+. Money-Critical bei /api/players.

### 3. Silent catch (leerer catch-block)
```bash
grep -rn -A1 "catch.*{" src/ | grep -B1 "^\\s*}" | grep -v "throw\\|console\\.error\\|return\\|logger"
```
**Bug:** Errors verschwinden, User sieht falschen/keinen Zustand.

### 4. Error-swallow ohne throw
```bash
grep -rn "if (error)" src/lib/services/ | grep -v "throw"
```
**Bug:** React Query cached null als SUCCESS. UI zeigt Empty-State für 30s.

### 5. Destructuring ohne error
```bash
grep -rn "const { data } = await supabase" src/lib/services/
```
**Bug:** Worst case — Error komplett unsichtbar. 117 Fixes in 61 Services (2026-04-13).

### 6. Hart-codierte State-Checks (nach Parameter-Erweiterung)
```bash
grep -rn "'transfermarkt_stale'" scripts/ | grep -v "const\\|mvSource\\|default"
grep -rn "'transfermarkt_verified'" scripts/ | grep -v "const\\|mvSource\\|default"
```
**Bug:** Script-Flag erweitert, State-Check vergessen → silent skip. Phase-B Hot-Fix.

## Output-Artefakt

`worklog/audits/silent-fail-YYYY-MM-DD.md`:
```
# Silent-Fail-Audit YYYY-MM-DD

## Pattern 1: .in() ohne Chunking (3 findings)
- src/lib/services/X.ts:42 — ids array from getHoldings, >100
- scripts/Y.ts:88
- src/app/api/Z/route.ts:15

## Pattern 2: .select() ohne .range() (2 findings)
...

## Pattern 3-6: ...

## Total Risk: HIGH/MEDIUM/LOW
## Priority Fixes:
1. ...
2. ...
```

## Cadence

- **Wöchentlich** (Mo morgen): Full-Scan
- **Ad-hoc** nach Impact-Check bei Money/Data-Touching Slices
- **Nach Script-Flag-Erweiterung**: Pattern 6 zwingend

## Historische Bug-Klassen (Prevention-Target)

| Slice | Pattern | Cost |
|-------|---------|------|
| 082 | .in() > 400 silent undefined | 1 Tag Debug |
| 079b | /api/players 1000-cap Money-Critical | **9 Holdings unsichtbar** |
| 078 | Full-Scan 1000-cap | Gold-Push 2 Tage verloren |
| 2026-04-13 | 117 Error-swallow Fixes | — |
| Phase-B | Hart-codierter State-Check | 3h Debug |

Ziel: Pattern-Liste wächst, nie dass gleicher Pattern 2x schmerzhaft wird.

# DB i18n Schema Extension Pattern

> Quelle: J7-AR-54 Missions title_tr, J11 Equipment name_de/name_tr, Phase 3 Achievement label_tr
> Konsolidiert: AutoDream v3 Run #11 (2026-04-15)

## Problem

Neue Sprachen (TR) werden als nullable Column `*_tr` neben bestehenden DE-Columns ergaenzt.
Ohne systematisches Vorgehen entstehen:
- 13+ direkte `.name_de`-Zugriffe im JSX statt locale-awarer Resolver
- TR-User sehen ausschliesslich DE-Strings (silent, kein Crash)
- `useMissionHints` als INDIRECT Consumer der Type-Extension wird vergessen

## Regelwerk

### 1. DB-Type mit `_de`/_tr-Pair → zwingend Helper-Fn

```typescript
// BAD: 13 direkte Zugriffe
<div>{def.name_de}</div>

// GOOD: 1 Helper, 13 Call-Sites sauber
function resolveEquipmentName(def: DbEquipmentDefinition, locale: string): string {
  return (locale === 'tr' ? def.name_tr : def.name_de) ?? def.name_de ?? def.name_key
}
```

Helper-File-Location: neben den Components die ihn brauchen (Display-Concern, nicht Service-Layer).

### 2. Helper neben Type-Def deklarieren

Im `types/index.ts` oder per-Domain `[domain]Names.ts` Helper-File.
Lint-Regel empfohlen: `no-restricted-syntax` auf `.name_de` / `.name_tr` in JSX/TSX.

### 3. Grid-Wrapper resolven EINMAL, reichen als displayName-Prop durch

```typescript
// Grid-Wrapper (einmalig resolver call):
const displayName = resolveEquipmentName(def, locale)
return <EquipmentCard displayName={displayName} def={def} />
```

Keine doppelten Resolver-Calls in Child-Components.

### 4. i18n-Key als Backfill-Quelle nutzen

Vor neuem TR-Backfill `messages/tr.json` greppen — vorhandene i18n-Keys ersetzen Uebersetzungs-Approval-Runden.
Pattern bestaetigt: AR-54 missions, J11 equipment, Phase 3 achievements (3x).

### 5. Indirect Consumer Audit (PFLICHT)

Nach Type-Erweiterung nicht nur Direct-Consumer (MissionBanner), sondern ALLE:
```bash
grep -rn "definition\.title\|mission\.title" src/  # Indirect: useMissionHints, etc.
grep -rn "def\.name_de\|def\.name_tr" src/          # Direct locale access
```

## Audit-Signal

`grep -rn '\.name_de\|\.name_tr\|\.label_de\|\.label_tr\|\.description_de\|\.description_tr\|\.title_de\|\.title_tr' src/` → alle Treffer brauchen Helper-Resolver.

## Betroffene Tabellen (Stand 2026-04-14)

| Table | Columns | Helper |
|-------|---------|--------|
| equipment_definitions | name_de/name_tr/description_de/description_tr | resolveEquipmentName |
| mission_definitions | title/title_tr/description/description_tr | resolveMissionTitle |
| achievement_definitions | label_tr/description_tr | resolveAchievementLabel |

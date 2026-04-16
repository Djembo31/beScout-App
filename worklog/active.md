# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
started: —
```

## Aktuelle Aufgabe

Keine aktive Arbeit.

Starte mit: `/ship new "Kurzbeschreibung der Aufgabe"`.

## Stage-Legende

- **PICK**: Aufgabe definiert, noch nicht spezifiziert
- **SPEC**: Spec wird geschrieben (`worklog/specs/NNN-title.md`)
- **IMPACT**: Consumer-Analyse laeuft (`worklog/impact/NNN-title.md`)
- **BUILD**: Code wird geschrieben
- **PROVE**: Nachweis wird erzeugt (Screenshot, Query, Test)
- **LOG**: Eintrag in `log.md` + Commit
- **DONE**: Slice abgeschlossen, bereit fuer naechsten

## Regeln

1. **Nur EIN aktiver Slice gleichzeitig.** Wechsel = aktuellen pausieren ODER abschliessen.
2. **Keine Stage-Skips.** Wenn eine Stage nicht zutrifft (z.B. IMPACT bei reinem UI-Fix): explizit als `skipped (Grund)` vermerken, nicht weglassen.
3. **Proof ist Pflicht.** Kein `DONE` ohne `proof:` Pfad zu Artefakt.

## Historie

Alle abgeschlossenen Slices → `worklog/log.md`.

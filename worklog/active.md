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

1. **Nur EIN aktiver Slice gleichzeitig.**
2. **Keine Stage-Skips.** `skipped (Grund)` wenn nicht zutreffend.
3. **Proof ist Pflicht.** Kein `DONE` ohne Artefakt.

## Historie

Alle abgeschlossenen Slices → `worklog/log.md`.

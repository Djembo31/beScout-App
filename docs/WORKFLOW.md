# BeScout - Workflow & Zusammenarbeit

> Wie wir am effektivsten zusammenarbeiten.

---

## Setup: Claude Code + Antigravity

### CLAUDE.md (Pflicht!)
Die Datei `CLAUDE.md` im Projekt-Root wird von Claude Code **automatisch** bei jedem Start gelesen. Sie gibt Claude sofort den vollen Kontext. Ohne diese Datei fängt Claude jedes Mal bei Null an.

```
bescout-app/
├── CLAUDE.md          ← Claude liest das automatisch
├── docs/
│   ├── ROADMAP.md     ← Gesamtplan
│   ├── TODO.md        ← Aktuelle Tasks
│   ├── ARCHITECTURE.md ← Technische Entscheidungen
│   └── COMPONENTS.md  ← Component Library
├── src/
│   └── ...
```

### So startest du eine Session

```bash
# 1. Öffne das Projekt
cd bescout-app

# 2. Starte Claude Code
claude

# 3. Claude liest automatisch CLAUDE.md und weiß Bescheid

# 4. Gib einen klaren Task:
> "Nächster Task aus TODO.md: Market Page auf shared PlayerDisplay umstellen"
```

---

## Goldene Regeln

### 1. Eine Sache pro Session
Nicht: "Mach alles fertig"
Sondern: "Stelle die Market Page Transfer-Liste auf PlayerDisplay detailed um"

### 2. Kontext mitgeben
Nicht: "Mach die Seite besser"
Sondern: "Die Player Detail Page (/player/[id]) zeigt nur Grundinfos. Füge einen Preis-Chart und Order Book hinzu, wie auf der Market Page"

### 3. Referenz benennen
Nicht: "Design es schön"
Sondern: "Nimm das Design der Transferliste auf der Market Page als Referenz"

### 4. Nach jeder Session: TODO.md aktualisieren
Am Ende jeder Session Claude bitten:
> "Aktualisiere TODO.md mit dem was wir heute geschafft haben"

### 5. Vor großen Änderungen: Backup
```bash
# Bevor Claude eine Page komplett umbaut
cp src/app/market/page.tsx src/app/market/page.tsx.backup
```

---

## Task-Formulierung (Beispiele)

### ❌ Schlecht
- "Mach die App fertig"
- "Verbessere alles"
- "Bau mal was Schönes"

### ✅ Gut
- "Öffne TODO.md und arbeite den nächsten P0-Task ab"
- "Stelle die Market Page PlayerCardGrid auf den shared PlayerDisplay detailed um. Referenz: Die Props in COMPONENTS.md"
- "Die Fantasy Page ist 2.773 Zeilen. Extrahiere den LineupBuilder in eine eigene Datei unter components/fantasy/LineupBuilder.tsx"
- "Erstelle die Player Detail Page mit: Stats-Übersicht, Preis-Chart (7d/30d), Order Book, PBT Treasury. Referenz: Market Page Design"

---

## Session-Arten

### Quick Fix (5-10 Min)
- Bug fixen
- Styling anpassen
- Kleine Component-Änderung

### Feature Session (30-60 Min)
- Neue Page/Section bauen
- Component extrahieren und umstellen
- Komplexe UI implementieren

### Architektur Session (60+ Min)
- Refactoring einer ganzen Page
- Neues System einführen (State Management, etc.)
- Backend-Schema designen

---

## Datei-Übergabe

### Von Claude.ai → lokales Projekt
Claude.ai generiert Dateien als Download. So überträgst du sie:

```bash
# Datei an die richtige Stelle kopieren
cp ~/Downloads/PlayerRow.tsx src/components/player/PlayerRow.tsx
cp ~/Downloads/page.tsx src/app/page.tsx

# Prüfen ob es kompiliert
npm run dev
```

### Von Claude Code → direkt im Projekt
Claude Code bearbeitet Dateien direkt. Kein Kopieren nötig.

```bash
# Claude Code kann direkt:
claude "Ersetze in src/app/market/page.tsx den lokalen PlayerCardGrid durch PlayerDisplay"
```

---

## Wenn etwas schiefgeht

### Build Error nach Claude-Änderung
```bash
# 1. Fehler lesen
npm run dev

# 2. Screenshot oder Fehlertext an Claude geben
# 3. Claude fixt es
```

### Zu viel geändert, will zurück
```bash
# Git Restore (wenn du Git nutzt)
git checkout -- src/app/market/page.tsx

# Oder Backup wiederherstellen
cp src/app/market/page.tsx.backup src/app/market/page.tsx
```

### Claude hat Kontext verloren
```
> "Lies CLAUDE.md und docs/TODO.md. Wo waren wir stehen geblieben?"
```

---

## Empfohlener Git-Workflow

```bash
# Initialisierung (einmalig)
cd bescout-app
git init
git add .
git commit -m "Initial: MVP Frontend"

# Vor jeder Claude-Session
git add . && git commit -m "Before: [was du vorhast]"

# Nach erfolgreicher Session
git add . && git commit -m "Feature: [was gemacht wurde]"

# Wenn etwas kaputt ist
git stash  # oder git checkout -- .
```

---

## Checkliste: Neue Session starten

- [ ] `CLAUDE.md` ist aktuell im Projekt-Root
- [ ] `docs/TODO.md` zeigt aktuelle Tasks
- [ ] Git committed (Backup-Punkt)
- [ ] Klarer Task formuliert
- [ ] Referenz-Seite/Component benannt (wenn relevant)

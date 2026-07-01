# Surface-Audit-Register (TEIL C — Page-by-Page E2E-Glättung)

> **Erstellt 2026-07-01 (CEO Anil).** SSOT für die Oberflächen-Wahrheit + Intent-Abnahme, Seite für Seite.
> **Zweck:** jede Seite tut nachweislich, was der CEO will — korrekt, in allen Zuständen — BEVOR User kommen.
> **Schwester des `disease-register.md`** (das = Code/DB-Struktur; dieses = gerenderte Oberfläche + Intent).
> **Regel:** eine Seite ist „✅ abgenommen" erst nach **CEO-Live-Abnahme**. Kein verfrühtes „ready".

## Das Ritual pro Seite
1. **Zeigen & Ausrichten** — CTO zeigt Ist + Daten dahinter; CEO sagt Soll → Soll-Zustand hier notiert.
2. **Abgleichen** — Ist vs Soll + 7 Linsen, gegen Live-DB → Funde hier (A/B, Prio).
3. **Glätten (e2e)** — SHIP-Loop bis Ist == Soll.
4. **Abnahme** — CEO sieht live → ✅.

## Die 7 Linsen (pro Seite)
① Daten-Wahrheit · ② Verhalten & Freshness · ③ Money/Zero-Sum · ④ Berechtigung & Leak · ⑤ Sprache & Compliance · ⑥ A11y & Mobile · ⑦ Design-Kohärenz

## 5 Abdeckungs-Achsen (Varianten pro Seite)
7 Ligen · DE/TR · Rollen (Gast/Fan/Club-Admin/Platform-Admin/Creator) · mobil+Desktop · Neu-User↔Power-User

## Fund-Klassen
- **A** = Anzeige-/Verhalten-Bug → Code-Fix pro Seite (SHIP-Slice).
- **B** = Daten-Inhalt/Frische → global an der Quelle + Launch-Reset (NICHT pro Seite einzeln jagen).

---

## Seiten-Inventar + Status

Legende: ⬜ offen · 🔄 in Arbeit · ✅ CEO-abgenommen

### Einstieg (User-Akquise-kritisch — zuerst)
| Seite | Route | Status | Soll notiert? | offene Funde |
|-------|-------|--------|---------------|--------------|
| Welcome/Landing | `/welcome` (+ `/`?) | ⬜ | – | – |
| Register/Login | `/login` | ⬜ | – | – |
| Onboarding | `/onboarding` | 🔄 **← START** | – | – |

### Kern-Loop
| Seite | Route | Status | Soll notiert? | offene Funde |
|-------|-------|--------|---------------|--------------|
| Home | `/` (eingeloggt) | ⬜ | – | – |
| Markt/Trading | `/market` | ⬜ | – | Pilot: IPO-Anzeige korrekt; Daten sparse (Klasse B) |
| Player-Detail | `/player/[id]` | ⬜ | – | Pilot: „9 Fans"=Holder-Mislabel (A, klein); Buy-Modal ok |
| Spieltag | `/fantasy` | ⬜ | – | – |
| Club | `/club/[slug]` | ⬜ | – | Pilot: „3700 Karten" erfunden (A🔴), „0 Fans" falsch (A🟠), GW33 stale (B/A🔴), Spieler 0-bepreist (B) |
| Community | `/community` | ⬜ | – | – |
| Profil | `/profile/[handle]` | ⬜ | – | – |

### Rest (später)
| Seite | Route | Status |
|-------|-------|--------|
| Rankings | `/rankings` | ⬜ |
| Missionen | `/missions` | ⬜ |
| Inventar | `/inventory` | ⬜ |
| Club-Admin (12 Tabs) | `/club/[slug]/admin` | ⬜ |
| Platform-Admin (~18 Tabs) | `/bescout-admin` | ⬜ |

---

## Globale Klasse-B-Funde (einmal an der Quelle, nicht pro Seite)
> Daten-/Frische-Themen, die viele Seiten auf einmal betreffen. Fix = Pipeline/Daten + Launch-Reset.

| # | Fund | betroffene Seiten | Status |
|---|------|-------------------|--------|
| B-1 | **Eingefrorene Mock-Saison:** `leagues.active_gameweek` vorgeschoben, aber Fixtures vergangener GW nie „finished"/gescort → „nächstes Spiel" zeigt vergangenen Spieltag. Systemisch alle 7 Ligen (PL: 21 stale, frühestes GW31; Süper Lig GW33 etc.). Trades/Preis-Historie ~3,5 Mon. alt. | Club · Player-Detail · Markt · Spieltag · Home | ⬜ offen (Entscheid: settlen vs. sauberer Launch-Reset) |
| B-2 | **Clubs unbepreist:** Top-Clubs (Gala 40/40) haben `floor_price=0`, kein IPO → Markt fast leer (nur 1 Club aktive IPOs). | Club · Markt · Player-Detail | ⬜ offen (Launch-Content-Frage) |
| B-3 | **„Karten im Umlauf" = Flat-Mock** (Spieler×100) statt echter Holdings (real oft 0). | Club (evtl. weitere) | ⬜ offen |

---

## Wording-Konsistenz-Funde (Linse ⑦, Klasse A)
| # | Fund | Seiten | Status |
|---|------|--------|--------|
| W-1 | **„Fans" mehrdeutig/falsch verwendet:** Club-Seite „0 Fans" (DB 5) · Player-Detail „9 Fans" = 9 Holder (Spieler haben keine Fans). Ein Begriff, mehrere falsche Bedeutungen. | Club · Player-Detail | ⬜ offen |

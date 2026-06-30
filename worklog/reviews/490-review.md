# Slice 490 Review — CLS-Fix Startseite (dashboardReady-Gate)

**Reviewer:** Cold-Context reviewer-agent · **Date:** 2026-07-01 · **time-spent:** ~22 min

## Verdict: PASS

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | LOW (measure) | `page.tsx:139` HomeStoryHeader | **Primärer Rest-CLS-Kandidat, NICHT gegatet.** `heroMode` flippt `cta-new`→`scout`/`manager` + CTA-Banner (`!loading && holdingsCount===0`) sobald holdings laden. Hero = oberstes Element → Höhenänderung verschiebt alles darunter. | In PROVE messen. Falls Rest-CLS >0,1: heroMode/CTA-Banner ebenfalls auf `dashboardReady` ODER `min-h` am Hero. **Kein Blocker** (Spec scoped Residual auf „erst messen"). |
| 2 | LOW (measure) | `page.tsx:177/227/232` | Einseitige Insertion nach Load (ScoutCardStats null→Karte; OnboardingChecklist h-72 + MissionHintList h-28 eingefügt → schiebt Divider+2-Spalten runter). | Messen; bei Bedarf Platz-Reservierung. Konsistent mit Scope-Out. |
| 3 | INFO | `useHomeData.ts` dashboardReady | Dashboard-ERROR → loading=false → ready=true → holdings=[] → Bestandsnutzer sieht Neu-User-Layout. Kein Infinite-Skeleton, **keine Regression** (altes Verhalten identisch). | ✅ Kommentar ergänzt (Error-Fallback bewusst dokumentiert). |

## Kritisch geprüft (verifiziert)
- **Onboarding-Korrektheit PASS:** echter Neu-User (uid present, holdings leer) → nach Load IntroCard + OnboardingChecklist + WelcomeBonus + NewUserTip rendern weiter. Flow nicht gebrochen.
- **Linchpin verifiziert:** Fix greift NUR dank S472-Server-Seed — `layout.tsx` seedet `initialUser` via getServerUser → AuthProvider `useState(initialUser)`, `loading=false` für authed → uid ab Frame 1 → `useHomeDashboard` (`enabled:!!userId`) ab Frame 1 enabled → `dashboardLoading=true` → `dashboardReady=false` → personalisierte Blöcke ab Frame 1 ausgeblendet → kein Neu-User-Flash. SSR==Client-First-Render bei dashboardReady=false → kein Hydration-Mismatch.
- **dashboardReady korrekt (disabled query):** v5 isLoading = isPending && isFetching = true && false = false → ready=true → kein Infinite-Skeleton.
- **isNewUser settelt mit Dashboard, nicht miniPlayers:** `holdings.length` aus `dashboard?.holdings`; miniPlayers-Join beeinflusst nur `floor` → kein zweiter Flash.
- **Stationärer (geladener) Zustand byte-identisch** zum Vorher (jede Bedingung nur um `dashboardReady &&` erweitert; nach Load ready=true) → null Regression in Reihenfolge/Sichtbarkeit.
- **§0/§1 sauber:** dashboardReady aus vorhandenem dashboardLoading, keine neue Query, kein Duplikat. 2 Files, type-safe, Hooks-Reihenfolge unberührt.

## One-Line
Chirurgisch korrekt, eliminiert nachweislich den dominanten bidirektionalen ~440px-Swap; <0,1-Ziel hängt an der Residual-Messung (Hero heroMode-Flip), die laut Plan Teil von PROVE ist → PASS.

## Knowledge-Draft (→ errors-frontend.md, post-PROVE)
Layout-Fork `isX = data.length===0` (new/existing) MUSS an ein `ready`-Flag aus `isLoading` der speisenden Query gekoppelt sein — sonst rendert der „leer"-Default-Fork während des Ladens + swappt = CLS. Voraussetzung: UID/Auth-State beim First-Render present (S472-Server-Seed), sonst uid=null-Frame → enabled:false → isLoading=false → ready=true → Default-Fork flasht trotzdem. Verwandt S283.

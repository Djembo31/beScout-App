# Frontend Journal: J3 Healer B — Multi-League Liga-Logos

## Gestartet: 2026-04-14

### Verstaendnis
- Was: 5 FIX-Items (FIX-08..12) aus Journey #3 — LeagueBadge auf TradingCardFrame Front+Back, PlayerHero, TransferListSection. Plus Props-Propagation.
- Betroffene Files:
  - `src/components/player/detail/TradingCardFrame.tsx` (Front TopBar + Back Label)
  - `src/components/player/detail/PlayerHero.tsx` (Sekundaer-Zeile + Props-Propagation)
  - `src/features/market/components/marktplatz/TransferListSection.tsx` (Inline LeagueBadge)
  - `src/app/(app)/player/[id]/PlayerContent.tsx` (nicht direkt — player-Objekt wird via Hero-Prop durchgereicht, TradingCardFrame bekommt Props via Hero)
- Risiken:
  - TradingCardFrame Front TopBar ist auf 240px Breite: Club-Logo + Flag/Age + Pos-Pill — bei 3-elementiger Layout muss LeagueBadge Platz sparen
  - PlayerIdentity shared Component aendern = grosses Impact. Wir wahlen Option (b) inline.
  - LeagueBadge Import-Pfad: `@/components/ui/LeagueBadge` (verifiziert ueber Grep)
  - LeagueBadge Props: `logoUrl`, `name`, `short`, `size ('xs'|'sm')`, `className`. Alle Consumer nutzen `{logoUrl, name, short, size}` (aus PlayerIPOCard/BestandRow kopiert)

### Entscheidungen
| # | Entscheidung | Warum |
|---|---|---|
| 1 | LeagueBadge Props: `name`, `short`, `logoUrl` (optional) — siehe `LeagueBadge.tsx:7-13` | Prop-Struktur der Komponente (nicht raten) |
| 2 | TradingCardFrame Front: LeagueBadge zwischen ClubLogo und FlagAge mit `size="xs"` (leaner) | TopBar hat nur 240px Breite |
| 3 | TradingCardFrame Back: dezent unter `scoutCardData`-Label, kein Prominenz-Rahmen | Liga-Context soll Informationshinweis geben, nicht dominanter Header |
| 4 | PlayerHero: LeagueBadge zwischen Flag und Position (also direkt nach Country-Flag, vor `·` Position) | Liga + Flag = Geografie + League-Kontext gruppiert |
| 5 | TransferListSection: Option (b) inline — LeagueBadge nach PlayerIdentity mit `className="hidden sm:inline-flex"` | Shared `PlayerIdentity` Change = Impact-weit, riskant. Option (b) safer. |
| 6 | FIX-12 Props-Propagation: In PlayerHero werden `league`, `leagueShort`, `leagueLogoUrl` als neue Props auf TradingCardFrame durchgereicht | PlayerHero bekommt `player`-Objekt und kann direkt dessen Liga-Felder binden |

### Fortschritt
- [x] FIX-08: TradingCardFrame Front TopBar — LeagueBadge
- [x] FIX-09: TradingCardFrame Back — Liga-Header-Zeile
- [x] FIX-10: PlayerHero — LeagueBadge in Sekundaer-Zeile
- [x] FIX-11: TransferListSection — LeagueBadge inline
- [x] FIX-12: Props-Propagation — PlayerHero reicht an TradingCardFrame
- [x] tsc --noEmit clean
- [x] Vitest TradingCardFrame Tests bleiben gruen (21/21)
- [x] Vitest broader scope 111/111 gruen
- [x] Git commit `feat(beta): J3 FIX-08..12 Multi-League Liga-Logos auf TradingCardFrame + PlayerHero + TransferListSection` (10df6cf)

### Runden-Log
**Runde 1 (one-shot):** Alle 5 Fixes in einer Runde durchgezogen.
- TradingCardFrame: Import LeagueBadge + Props erweitern + Inner-Func-Sig + Front TopBar umbauen (Club+League-Gruppe links, `flex-wrap`/`min-w-0`/`shrink-0` fuer Mobile 393px) + Back Liga-Header unter `scoutCardData`-Label
- PlayerHero: LeagueBadge-Import + inline Render zwischen CountryFlag und `·` Position + Props-Durchreichung an TradingCardFrame
- TransferListSection: Import + inline `<LeagueBadge>` nach PlayerIdentity mit `hidden sm:inline-flex` (Mobile space-saving)

**Verify-Pass:**
- `npx tsc --noEmit` → clean (kein Output)
- `npx vitest run src/components/player/detail/ src/features/market/components/marktplatz/` → 15 files / 111 tests gruen
- Grep leagueLogoUrl: TradingCardFrame=5, PlayerHero=2, TransferListSection=1 (alle erwartet)
- `git diff --stat`: 3 source files (exakt Scope)

**Design-Entscheidungen waehrend Code:**
- FIX-08 TopBar-Layout umgestellt: statt 3er-Flex-Justify-Between nun 3-Gruppen mit `gap-2` und per-Gruppe `shrink-0` — LeagueBadge logisch zum Club gruppiert (Club+Liga-Kontext).
- FIX-09 Liga-Zeile dezent (`text-[8px] text-white/40`) — soll informativ sein, nicht dominieren. Kein eigener Rahmen, nur Abstand zum MetricGrid ueber `mb-2`.
- FIX-11 Option (b) gewaehlt (inline) — kein PlayerIdentity-Impact-Change. Safer PR, impact-radius = 0.

**Circuit Breaker: nicht ausgeloest.** Keine Fehlschlaege in Runde 1.

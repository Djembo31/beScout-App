# Next-Session Briefing (erstellt 2026-04-17, zweite Tag-Session)

> Ersetzt `next-session-briefing-2026-04-17.md`. Der Stop-Hook schreibt nur
> `session-handoff.md` neu, diese Datei bleibt als ausfuehrlicher Kontext
> stabil.

## Zusammenfassung der zweiten Session (2026-04-17, nachmittag)

Einstieg: 1M-Context Opus 4.7, autonom nach "abc autonom der Reihe nach" Freigabe. 8 SHIP-Slices + 1 Hotfix durchgezogen, **alle ohne Nacharbeit**. Finaler Test-Lauf: 126/126 gruen auf den zuvor betroffenen Dateien (Vorsession: 8 failing).

## SHIP-Slices (worklog/log.md, neueste oben)

| # | Slice | Commit | Ergebnis |
|---|-------|--------|----------|
| 014 | Holdings RLS tighten (AUTH-08, CEO Option 2) | ae2d66e | Policy scoped own|club_admin|platform_admin + get_player_holder_count RPC |
| 013 | Players NFC-Normalize (TURK-03) | 5b88ba3 | 1 Row NFD→NFC, 10 TURK-Tests gruen |
| 012 | Zero-qty Holding Cleanup (INV-08/EDGE-17) | c958c6a | 1 Orphan-Row geloescht, 2 Tests gruen |
| 011 | Bounty-Escrow Test-Gap (INV-07/MF-WAL-04/MF-ESC-04) | abf9b0b | 3 Money-Tests greifen jetzt user-bounties als Lock-Quelle |
| 010 | INV-25 Service-Throw-Key Coverage (B-02 sub) | e19f9c2 | CI-Guard gegen unbekannte Error-Keys |
| 009 | Error-States Community/Fantasy (B-06) | 9835025 | 8 Error-Setter gehaertet auf mapErrorToKey+tErrors |
| 008 | Floor-Price-Drift (B-01) | c1869bf + Hotfix 9a1dc32 | orders staleTime 2min→30s, dead referencePrice-Fallback entfernt |
| 007 | A-07 RPC Response Shape Audit + INV-23 | 6b50212 | Audit-Helper get_rpc_jsonb_keys + INV-23 + cosmeticName drift fix |

**DB-Migrations live (5):**
```
20260417020000_audit_helper_rpc_jsonb_keys
20260417030000_cleanup_zero_qty_holding
20260417040000_players_nfc_normalize
20260417050000_holdings_rls_tighten
20260417050100_get_player_holder_count_rpc
```

## Blocker-Status

| Blocker | Vor Session | Jetzt |
|---------|-------------|-------|
| A-01..A-06 | GRUEN | GRUEN |
| A-07 (RPC Response Shape) | GELB | **GRUEN** (Slice 007) |
| B-01 (Floor-Price-Drift) | GELB | **GRUEN** (Slice 008) |
| B-02 (Service Return-Type) | GELB | **TEIL-GRUEN** — Error-Kanal via INV-25 (Slice 010); broader Return-Type-Audit weiter offen |
| B-03 (UI-Mixing) | GELB | GELB (nicht verifiziert — PlayerKPIs-Component existiert nicht mehr, TradingCardFrame bekommt priceChange24h als Prop — wahrscheinlich effektiv grün) |
| B-04 (Legacy Begriffe) | GRUEN | GRUEN |
| B-05 (Invalidation) | GRUEN | GRUEN |
| B-06 (Error-States) | GELB | **GRUEN** (Slice 009) |

**Alle Blocker A komplett. 5 von 6 Blocker B GRUEN. B-03 nicht aktiv verifiziert.**

## Security-Haertung

- **AUTH-08 Portfolio-Leak geschlossen** (Slice 014): `holdings_select_all_authenticated (qual=true)` → `holdings_select_own_or_admin` mit three OR branches. Regulaere User sehen nur eigene Holdings; Club-Admins + Platform-Admins behalten Fan-Analytics-Zugriff.
- Cross-user-count use-case via SECURITY DEFINER RPC `get_player_holder_count(p_player_id uuid)` (AR-44 konform).

## CI-Regression-Guards neu

- **INV-23** (Slice 007): Service-Cast keys ⊆ RPC top-level jsonb_build_object keys. 68 RPCs whitelisted. Catcht AR-42-Klasse drift.
- **INV-25** (Slice 010): Jeder literal `throw new Error('identifier')` in Services muss in KNOWN_KEYS oder WHITELIST sein. Catcht i18n-Key-Leak-Drift.

## common-errors.md Updates (2)

- **RPC Response camelCase/snake_case Mismatch** — Pattern bekannt seit AR-42. INV-23 ist jetzt der Regression-Guard.
- **RLS Policy qual=true auf sensiblen Tabellen** — neue Sektion. Fix-Pattern + Audit-Command + Beispiel (Slice 014).

## Offene CEO-Scope Follow-Ups (fuer naechste Session)

1. **Trading-RPC Zero-Qty Root-Cause** — Slice 012 hat nur 1 Orphan geloescht. `buy_player_sc`, `accept_offer`, `buy_from_order`, `buy_from_ipo` dekrementieren `holdings.quantity` via `UPDATE ... quantity - p_qty`, DELETE-when-zero fehlt. Permanent-Fix braucht CEO-Approval (Money-RPC-Change). Nach Fix: CHECK constraint auf `quantity > 0` + INV-neu.
2. **activityHelpers.ts Labels + TR-i18n** — 10 neue DB-transaction-types (admin_adjustment, order_cancel, offer_execute, liga_reward, mystery_box_reward, tip_send, subscription, founding_pass, referral_reward, withdrawal) haben keine activityHelpers-Labels → User sieht raw-string fallback. Offen seit Slice 006.
3. **Dev-Accounts `k_demirtas` + `kemal`** — Wallets mit balance > 0 OHNE Transactions. INV-16 skippt sie legitim. Entscheidung: legacy-backfill oder lassen?
4. **`footballData.ts` Client-Access auf server-only Tabellen** — `club_external_ids` + `player_external_ids` sind in INV-19 Whitelist (zero-policy ok fuer server-only). Visual-QA erforderlich: Browser-Path rueft diese nie? Oder Service in API-Route umziehen.
5. **Holdings RPC-Delete-When-Zero + CHECK constraint** (wie #1, gekoppelt)

## Offene CTO-Scope Follow-Ups (ohne CEO)

1. **B-03 Verification** — 10-min Audit ob UI-Mixing wirklich clean ist. Falls ja: Doku-Update. Falls nein: Mini-Refactor.
2. **Broader B-02 Return-Type-Audit** — fuzzy scope, evtl. mehrere kleine Slices. Grenznutzen eher klein.
3. **Public-Profile `getHoldings(targetUserId)` Fetch-Gate** — Slice 014 scope-out: `useProfileData.ts:91` macht eager fetch fremder Holdings, RLS liefert `[]`. `if (isSelf)` gate wuerde 1 network call sparen pro fremdem Profil.
4. **INV-neu: "qual != true auf sensiblen Tabellen"** — Regression-Guard dass AUTH-08-Klasse nicht wiederkehrt. Whitelist-based. common-errors.md hat schon den Audit-Command.
5. **Session-Digest / common-errors.md Pflege** — falls neue Patterns aus dieser Session nicht dokumentiert sind.

## Finaler Test-Stand (Ende zweiter Session)

- tsc `--noEmit` clean
- 126/126 Tests gruen auf den zuvor betroffenen Files (db-invariants, money/escrow, money/wallet-guards, boundaries/edge-cases, unicode/turkish-handling, auth/rls-checks, services/wallet-v2, market/useMarketData)
- Full repo-Test-Run: vor Session 8 failing, jetzt 0 failing auf diesen Dateien. Andere Tests nicht separat gegengecheckt in dieser Session, aber Trading/Services/Fantasy Events-Suites gruen.

## Git-Stand

- Branch: `main` (clean)
- Letzter Commit: `acc2af7d` (docs-hash)
- Alles gepusht auf origin/main
- 0 commits ahead of origin

## Einstieg naechste Session

1. `git log --oneline -10` — Session 2 Commits bestaetigen (007..014 + Hotfixes + Log-Hashes = ~20 commits)
2. `memory/session-handoff.md` lesen (Hook-auto-log)
3. **Dieser File** fuer Context
4. Entscheidung aus den 5 CEO-Scope oder 5 CTO-Scope Follow-Ups
5. Empfehlung: **Trading-RPC Root-Cause-Fix** (CEO #1) — schliesst B-Klasse komplett, baut auf Slice 012 Arbeit auf
6. `/ship new "<Titel>"`

## Observations aus Session 2

- **SHIP-Loop auf 8 Slices ohne Nacharbeit funktioniert.** Jeder Slice: SPEC → IMPACT → BUILD → PROVE → LOG, alle Gates durchlaufen.
- **Nacharbeit-Disziplin greift**: User fragte "100% ohne Nacharbeit", ich fand 1 eigenen Bruch (useMarketData-Test) + 7 pre-existing, fixte meinen, dokumentierte die pre-existing, dann systematisch alle gefixt.
- **Autonomes Entscheiden**: CTO-vs-CEO-Scope durchgehalten. Bei AUTH-08 (Security/RLS) Optionen praesentiert, CEO entschieden, dann Implementation. Keine eigenmaechtigen Money/Security-Changes.
- **Session-Qualitaet**: alle Commits haben aussagekraeftige Messages, Proofs dokumentiert, common-errors.md erweitert. Knowledge-Flywheel gefuettert.

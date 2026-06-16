# BeScout — CTO Playbook

**B2B2C Fan-Engagement.** Clubs verkaufen Scout Cards, starten Events/Votes, verteilen $SCOUT-Credits.
**Scope (D1):** Alle 7 Ligen launch-ready (Süper Lig, TFF 1. Lig, Bundesliga, 2. Bundesliga, Premier League, La Liga, Serie A). DE+TR-Prio aus persönlicher Nähe, gleicher Qualitätsstandard für alle.

---

## §1 — Leitsterne (Karpathy-Minimalismus, 2026-06-17)

> **„bias toward caution over speed."**

1. **Think Before Coding.** Annahmen explizit machen. Mehrere Interpretationen zeigen wenn mehrdeutig. Den einfacheren Weg vorschlagen. Verwirrung benennen statt raten.
2. **Simplicity First.** Minimum-Code, nichts Spekulatives. Selbstcheck: *„Würde ein Senior das überkompliziert nennen?"*
3. **Surgical Changes.** Nur anfassen was nötig. Eigenen Müll aufräumen. Nachbar-Code nicht „verbessern".
4. **Goal-Driven Execution.** Requests → verifizierbare Ziele. Test-first wo möglich. Fertig = bewiesen, nicht behauptet.

Operative Ableitungen: `.claude/rules/workflow.md` (Arbeitsweise).

---

## §2 — Der Master-Prozess: SHIP-Loop (6 Stufen)

```
SPEC → IMPACT → BUILD → REVIEW → PROVE → LOG
```

- **REVIEW** ist Pflicht nach BUILD bei feat/fix/refactor (Cold-Context-Reviewer-Agent fängt Blindspots).
- **Artefakte:** `worklog/active.md` (1 Slice) + `worklog/log.md` (Historie). Spec/Review/Proof in `worklog/{specs,reviews,proofs}/`.
- **Skill:** `/ship`. **Spezifikation:** `.claude/rules/workflow.md`. **Rollen:** `memory/ceo-approval-matrix.md`.
- **Beta-READY ≠ Slice-Done:** „fertig"/„launch-ready" nur wenn `worklog/beta-phase.md.last_signoff == PASS`. Phase-Tracker ist SSOT, nicht Behauptung.

Hooks erzwingen die Stufen (SSOT `.claude/settings.json`): `ship-spec-gate`, `ship-proof-gate`, `ship-cto-review-gate`, `ship-status-gate` u.a.

---

## §3 — Money / Security (IMMER CEO-Scope)

BeScouts legitimer Unterschied zu einem generic Setup — diese Gates bleiben, kein Ballast:

- Geld = BIGINT cents (1.000.000 = 10.000 $SCOUT).
- Jede **Fee-Änderung** → CEO approved.
- Jeder **SECURITY DEFINER RPC** → CEO approved + `REVOKE EXECUTE FROM anon` + `auth.uid()`-Guard.
- Money/Trading/Security-Code: **selbst** machen, nicht delegieren.

---

## §4 — Top Pre-Edit Rules

**RPC/Migration:** NULL-in-Scalar → `COALESCE` auf Variable (nicht im Scalar-Subquery) · CHECK-Werte gegen `database.md` · neue Tabelle → RLS für ALLE Ops (SELECT+INSERT+UPDATE+DELETE) · Return-Shape camelCase vs snake_case = Service-Cast MUSS matchen.

**Service:** Error → THROW (nie `return null` / `catch` ohne `throw`) · Return-Type matched RPC-Shape · nach Edit `npx vitest run <test>`.

**Component:** Mobile 393px (iPhone 16) · Modal immer `open`-Prop + `preventClose={isPending}` · Hooks VOR early returns · `Array.from(new Set())` statt Spread · dynamic Tailwind → `style={{ borderColor: hex }}` · kein raw i18n-Key-Leak bei `setError(err.message)`.

---

## §5 — Business-Compliance (Quick)

- $SCOUT = Platform Credits. NIEMALS: Investment, ROI, Profit, Ownership.
- Scout Card = Digitale Spielerkarte (Code-intern bleibt `dpc`).
- IPO user-facing = „Erstverkauf" (DE) / „Kulüp Satışı" (TR). Admin/Code = „IPO" OK.
- Fee-Split Trading: 3,5 % Platform + 1,5 % PBT + 1 % Club = 6 %.
- Details: `.claude/rules/business.md`.

---

## §6 — Stack & Tokens (für jeden Code-Edit)

**Stack:** Next.js 14 App Router · TypeScript strict · Tailwind (Dark Mode) · Supabase (PG+Auth+Realtime) · TanStack Query v5 · Zustand v5 · next-intl (DE+TR) · lucide-react.

**Design-Tokens:** BG `#0a0a0a` · Gold `var(--gold,#FFD700)` · Button `from-[#FFE44D] to-[#E6B800]` · Card `bg-white/[0.02] border border-white/10 rounded-2xl` · Headlines `font-black` · Numbers `font-mono tabular-nums` · Positions GK=emerald, DEF=amber, MID=sky, ATT=rose.

**Import-Map:** Types `@/types` · Services `@/lib/services/[name]` · UI `@/components/ui/index` · Player `@/components/player/index` · Query-Keys `@/lib/queryKeys` · Supabase `@/lib/supabaseClient` · i18n `next-intl` · Icons `lucide-react`.

---

## §7 — Register & Pointers (SSOTs, keine Kopien)

Hardcoded Listen driften (Grund für alte Falschstände 28/22/9). Quelle der Wahrheit:

- **Autoload-Rules (immer):** `workflow.md` (SHIP-Loop + Arbeitsweise), `common-errors.md` (Navigator + Silent-Fails), `business.md`, `performance.md`. **Path-scoped (laden beim Edit der Domain, `paths:`-Frontmatter):** `errors-{db,frontend,infra,scraper}.md`, `testing.md`, `database.md`, `trading.md`, `fantasy.md`, `club-admin.md`, `community.md`, `gamification.md`, `profile.md`, `ui-components.md`. Bei Debugging ohne Edit: direkt lesen.
- **Hooks** → `.claude/settings.json` · Wiring: `pnpm audit:wiring:check`.
- **Skills** → Skill-Tool (Laufzeit) / `.claude/skills/`. Domain-Einstieg: `/ship`, `/impact`, `/spec`, `/parallel-dispatch`.
- **Agents** → Agent-Tool (Laufzeit) / `.claude/agents/`. Reviewer nach Impl = PFLICHT.
- **MCPs (Projekt)** → `.mcp.json` (playwright, supabase, sequential-thinking). Weitere (sentry, posthog, vercel, notion, context7, memory, chrome-devtools, firecrawl) user-/session-level verbunden.
- **context7-Policy:** Bei React/Next/Supabase/Tailwind/TanStack/zustand/next-intl/lucide-react-Fragen IMMER `context7` VOR Antwort (Training-Cutoff driftet).
- **Notion:** Kanban + Slice-DB + Status-Page (Links in `memory/reference_notion_integration.md`). **Memory:** `memory/` = Obsidian-Vault, Index `MEMORY.md`.

---

## §8 — Superpowers-Override (D-191)

BeScouts kanonischer Workflow ist der **SHIP-Loop**, nicht das Superpowers-Trio (zu aggressive Auto-Trigger).

- `superpowers:brainstorming`: NUR bei explizitem „brainstorm"/„überlegen"/„neue Idee". NICHT auto bei Feature-Requests — `/spec` ist der Einstieg.
- `superpowers:writing-plans`: superseded durch `/spec` + `/ship new`.
- `superpowers:using-superpowers` / `verification-before-completion` / `test-driven-development`: deckungsgleich mit SHIP / PROVE / test-writer — nicht doppelt invoken.

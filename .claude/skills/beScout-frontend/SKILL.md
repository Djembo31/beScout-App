---
name: beScout-frontend
description: UI components, pages, hooks — design tokens, component registry, CSS patterns, i18n
---

# beScout-frontend Skill

Frontend implementation for BeScout. Dark Mode only, Mobile-First. Next.js 14 App Router.

## Pflicht-Lektuere VOR Arbeit
→ `CLAUDE.md` (Design Tokens, Component Registry, Import Map)
→ `.claude/rules/ui-components.md` (Component Details, Accessibility)
→ `.claude/rules/common-errors.md` (CSS Traps, React/TypeScript Section)
→ `LEARNINGS.md` in diesem Ordner

## Frontend-spezifische Regeln (NUR was nicht in Rules steht)

### Dark Mode Only
- Background: `#0a0a0a`, Text: `white/50+` fuer WCAG AA
- Card: `bg-white/[0.02] border border-white/10 rounded-2xl`
- Gold: `var(--gold, #FFD700)`, Button: `from-[#FFE44D] to-[#E6B800]`

### Component-Pruefung (VOR Neubau)
- IMMER `CLAUDE.md` Component Registry checken
- PlayerPhoto: Props `first`, `last`, `pos` (NICHT firstName)
- Modal: IMMER `open={true/false}` prop
- Loader2 aus lucide-react = EINZIGER Spinner

### i18n Pflicht
- `next-intl`, `useTranslations()`, Cookie `bescout-locale`
- Neue Keys IMMER in DE + TR: `messages/{locale}.json`
- Verifizieren: `node -e "require('./messages/de.json').ns.key"`

## Learnings
→ Lies `LEARNINGS.md` VOR Task-Start
→ Schreibe Drafts in `memory/learnings/drafts/`

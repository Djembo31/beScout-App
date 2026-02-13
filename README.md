# BeScout App - MVP Starter

Ein vollständiges, lauffähiges Next.js Projekt für die BeScout Trading Platform.

## 🚀 Quick Start

```bash
# 1. Dependencies installieren
npm install

# 2. Development Server starten
npm run dev

# 3. Browser öffnen
open http://localhost:3000
```

## 📁 Projektstruktur

```
bescout-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root Layout mit AppShell
│   │   ├── page.tsx            # Home (Dashboard)
│   │   ├── market/page.tsx     # Transfermarkt
│   │   ├── player/[id]/page.tsx # Player Detail
│   │   ├── fantasy/page.tsx    # Fantasy Contests
│   │   ├── community/page.tsx  # Scout Zone
│   │   ├── profile/page.tsx    # User Profile
│   │   └── club/page.tsx       # Club Page
│   │
│   ├── components/
│   │   ├── layout/             # SideNav, TopBar
│   │   ├── ui/                 # Button, Card, Modal, etc.
│   │   └── player/             # PlayerCard, PositionBadge, etc.
│   │
│   ├── types/
│   │   └── index.ts            # Alle TypeScript Types
│   │
│   └── lib/
│       ├── utils.ts            # Utility Functions
│       ├── nav.ts              # Navigation Config
│       └── mock-data.ts        # Mock Data
│
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.mjs
```

## 🎯 Enthaltene Features

### Pages
- ✅ **Home** - Dashboard mit Portfolio, Trending Players, Fantasy, Votes
- ✅ **Market** - Transferliste mit Suche & Filter
- ✅ **Player Detail** - Vollständige Player-Ansicht mit Buy Widget
- ✅ **Fantasy** - Contest Lobby & Lineup Builder (UI)
- ✅ **Community** - Research Feed mit Paywalls
- ✅ **Profile** - User Dashboard & Portfolio
- ✅ **Club** - Club Page mit Votes & Players

### Components
- ✅ **SideNav** - Collapsible Sidebar mit Wallet
- ✅ **TopBar** - Header mit Search & User
- ✅ **PlayerCard** - Grid View für Players
- ✅ **PositionBadge** - GK/DEF/MID/ATT Badges
- ✅ **ScoreCircle** - L5/L15 Performance
- ✅ **Button, Card, Modal, Chip** - UI Components

### Design System
- ✅ Gold (#FFD700) als Primärfarbe
- ✅ Position-spezifische Farben
- ✅ Outfit + Space Mono Fonts
- ✅ Dark Theme mit Glow Effects

## 📊 Code Stats

| Bereich | Zeilen |
|---------|--------|
| Pages | ~2.500 |
| Components | ~800 |
| Types | ~200 |
| Utils/Config | ~400 |
| **Total** | **~4.000** |

## 🔜 Nächste Schritte

### Session 2: Vollständige Pages
- [ ] Market Page komplett (Offers, MySquad)
- [ ] Player Detail komplett (alle Tabs)
- [ ] Fantasy Lineup Builder

### Session 3: Supabase Integration
- [ ] Database Schema
- [ ] Auth (Login/Register)
- [ ] API Routes

### Session 4: Trading Engine
- [ ] Buy/Sell Logic
- [ ] Offer System
- [ ] Wallet Integration

### Session 5: Polish
- [ ] Error Handling
- [ ] Loading States
- [ ] Responsive Fixes

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **State:** React useState (später Zustand)
- **Backend:** Mock Data (später Supabase)

## 📝 Commands

```bash
npm run dev       # Development Server
npm run build     # Production Build
npm run start     # Production Server
npm run lint      # ESLint Check
npm run type-check # TypeScript Check
```

---

**Erstellt für BeScout MVP** 🚀

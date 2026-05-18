# Ganak — Spiritual Practice Tracker

A beautiful, mobile-first progressive web app for tracking your daily Japa (mantra chanting) practice, managing group chanting sessions (Chakri Gajar), and monitoring your spiritual progress over time.

---
Open (https://japa-counter-pied.vercel.app/)

## Features

### Japa Counter
- **Full-screen tap to count** — tap anywhere on screen to increment your Japa count
- **Mala tracking** — 1 mala = 108 Jaaps, displayed with progress ring
- **Bilingual UI** — supports Hindi and English via the language toggle in Settings
- **Dropdown menu** — reduce count, set count to a specific value, or reset
- **Daily persistence** — counts are saved per day to Supabase

### Chakri Gajar (Group Chanting System)
A real-time group scheduling and counting system for coordinated Japa sessions.

#### Group Management
- Create a group (admin) or join an existing one with a unique code
- Each group shows **Total Malas** (aggregated across all members, all time)
- Members list with role display (Admin / Member)

#### Scheduling
- Admin creates a schedule via an **IST-aware calendar date picker** (no past dates allowed)
- Events are displayed with Today / Past / Upcoming status badges
- Slots are 3-hour blocks covering a full 24-hour day (8 slots × 3 hours)

#### Slot Booking
- Members book individual hours within a slot
- **Cross-group overlap protection** — you cannot book the same hour in two groups simultaneously
- **Past-hour guard** — hours that have already passed (IST) are greyed out and non-bookable
- Visual status badges: `Live` · `Booked` · `Available` · `Other group` · `Past`

#### Live Indicator (Green Dot Navigation)
- A pulsing green dot appears on the bottom nav when you have an active booking for the current IST hour
- The dot cascades: Nav → Day → Active Slot — guiding you to your session
- Refreshes every 5 minutes automatically (no manual reload needed)

#### Chakri Gajar Counter
- **Full-screen tap to count** — identical UX to the normal Japa counter
- Starts from your previously saved count (loaded from DB on open)
- **Debounced DB writes** — rapid taps batch into a single write after 600ms to prevent race conditions
- **Syncs to global Japa counter** — each tap increments your daily Japa total
- Reduce / Set / Reset all sync both the slot count and the global counter
- **Group Total** — live sum of all members' Jaaps for that session, refreshed every 30 seconds

### Dashboard
- Today's count, weekly streaks, and historical progress charts
- Spiritual milestones and achievement tracking

### Calendar
- Monthly calendar view with daily Japa counts
- Visual indicators for practice consistency

### Settings
- Language toggle (Hindi / English)
- Theme and display preferences
- Account management

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| UI components | shadcn/ui |
| Styling | Tailwind CSS |
| Backend / Auth | Supabase (PostgreSQL + Auth + Realtime) |
| Icons | Lucide React |
| Routing | React Router DOM |

---

## Project Structure

```
src/
├── components/
│   ├── ChakriGajar.tsx          # Orchestrator — state machine & DB interactions
│   ├── ChakriGajarTypes.ts      # Shared types, IST utilities (getISTNow, toDateStr, isPastSlot)
│   ├── ChakriGajarScreensA.tsx  # Home screen, Create/Join group screens
│   ├── ChakriGajarScreensB.tsx  # Group details, Schedule list, Slot booking UI
│   ├── ChakriGajarScreensD.tsx  # Counter screen, Date picker modal, Calendar, Summary
│   ├── Counter.tsx              # Normal Japa counter (full-screen tap)
│   ├── EnhancedDashboard.tsx    # Stats and progress dashboard
│   ├── Calendar.tsx             # Monthly calendar view
│   ├── EnhancedSettings.tsx     # Settings screen
│   ├── BottomNav.tsx            # Navigation bar with green dot indicator
│   └── SplashScreen.tsx         # App launch splash
├── contexts/
│   ├── AuthContext.tsx           # Supabase auth state
│   └── JapaContext.tsx           # Global Japa count, incrementJaaps, setJaaps
├── pages/
│   └── Index.tsx                # Root page — tab management, active-slot check on mount
└── integrations/
    └── supabase/                 # Supabase client and generated types
```

---

## Database Schema (Supabase)

| Table | Purpose |
|---|---|
| `profiles` | User display names |
| `japa_counts` | Daily Japa counts per user |
| `cg_groups` | Chakri Gajar groups |
| `cg_members` | Group membership with roles (`admin` / `member`) |
| `cg_events` | Scheduled chanting days per group |
| `cg_bookings` | Individual hour bookings with `jaaps` count |

**Key constraint:** `cg_bookings` has a unique index on `(user_id, date, hour)` to prevent double-booking across groups.

---

## Time Zone

All scheduling logic uses **India Standard Time (IST / Asia/Kolkata, UTC+5:30)**.

Key utilities in `ChakriGajarTypes.ts`:
```ts
getISTNow()          // Returns current Date in IST
toDateStr(date)      // "YYYY-MM-DD" from any Date
isPastSlot(date, hour, now)  // true if that hour has already passed in IST
```

> **Never use `new Date().toISOString()` for date comparisons** — at midnight IST, UTC is still the previous day.

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9
- A Supabase project with the schema above

### Local Development

```sh
# Clone the repo
git clone <YOUR_GIT_URL>
cd ganak

# Install dependencies
npm install

# Start the dev server
npm run dev
```

### Environment
Create a `.env.local` (or configure via your host) with your Supabase credentials:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Deployment

Open (https://japa-counter-pied.vercel.app/)

---

## Key Design Decisions

- **IST-first** — all `new Date()` calls inside Chakri Gajar have been replaced with `getISTNow()` to avoid UTC midnight edge cases
- **Debounced writes** — counter taps are batched (600ms) to avoid race conditions on rapid input
- **Green dot lifecycle** — checked on mount via `Index.tsx` `useEffect` (independent of active tab), refreshed every 5 minutes
- **Cross-group booking** — blocks are fetched fresh at booking time (not from stale React state) to prevent conflicts
- **Self-managing counter** — `CgCounterScreen` owns its own DB writes and group-total polling; the orchestrator only passes `bookingId`, `eventId`, and `initialCount`

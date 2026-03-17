# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Away** is an employee holiday, leave & WFH management system hosted at away.storepecker.com. It uses Next.js 14 App Router with MongoDB/Mongoose, NextAuth.js v5 (Google OAuth), Tailwind CSS, and shadcn/ui.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
npm run seed         # Seed DB with policies & holidays (requires MONGODB_URI)
```

## Architecture

### Auth Flow
- Google OAuth via NextAuth.js v5 (`src/lib/auth.ts`)
- Admin emails auto-promoted via `ADMIN_EMAILS` env var in the `signIn` callback
- JWT strategy — role/mongoId stored in token, exposed in session
- Middleware (`src/middleware.ts`) uses `getToken` from `next-auth/jwt` (NOT the `auth` wrapper) to avoid importing mongoose in Edge Runtime

### Roles: `admin` | `manager` | `employee`
- Route protection in middleware: `/admin` requires admin, `/manager` requires manager or admin
- API routes check `session.user.role` for authorization

### Route Groups
- `(auth)` — login page (public)
- `(dashboard)` — all authenticated pages share a sidebar layout

### API Routes
All API routes use `export const dynamic = "force-dynamic"` to prevent build-time DB access. Pattern:
```ts
const session = await auth();
if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
await connectDB();
```

### Data Layer
- `src/lib/db.ts` — Mongoose singleton connection with global cache
- `src/models/` — Mongoose schemas (User, LeavePolicy, WFHPolicy, HolidayCalendar, EmployeeOptionalHoliday, LeaveRequest, WFHRequest)
- `src/lib/validations.ts` — Zod schemas for all input validation

### Client-Side Patterns
- `src/hooks/use-fetch.ts` — Generic GET data fetching with loading/error/refetch
- `src/hooks/use-action.ts` — Mutation hook (POST/PATCH/DELETE) with toast notifications
- `src/components/away/` — App-specific shared components (Logo, Sidebar, MobileNav, PageHeader, DatePicker, LoadingCards, Providers)
- `src/components/ui/` — shadcn/ui primitives

### Key Business Logic
- `src/lib/helpers.ts` — `calculateWorkingDays()` excludes weekends and public holidays from leave day count
- Leave balance checking happens in `POST /api/leave-requests`
- WFH weekly/monthly limits enforced in `POST /api/wfh-requests`
- Slack notifications (`src/lib/slack.ts`) fire asynchronously on request create/approve/reject

### Design System
- Fonts: Outfit (headings), DM Sans (body) — loaded via Google Fonts in globals.css
- Color palette: soft indigo/blue defined as HSL CSS variables
- Animations: `stagger-children` class for card grids, `skeleton` shimmer for loading states

# Away — Time off, sorted.

Employee holiday, leave & WFH management system built for teams. Hosted at [away.storepecker.com](https://away.storepecker.com).

## Features

- **Google OAuth** — Sign in with your company Google account
- **Role-based access** — Admin, Manager, and Employee dashboards
- **Leave management** — Apply for annual, sick, casual, maternity, paternity, unpaid, and comp-off leaves
- **WFH requests** — Submit work-from-home requests with weekly/monthly limits
- **Holiday calendar** — National, company-wide, and optional holidays with selectable quota
- **Unified calendar** — Color-coded monthly view of all holidays, leaves, and WFH days
- **Manager approvals** — Review and approve/reject team requests
- **Admin panel** — Manage users, leave policies, WFH policies, holidays, and export reports
- **Slack notifications** — Automated alerts for request submissions and approvals
- **CSV export** — Download leave usage reports

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Database**: MongoDB + Mongoose
- **Auth**: NextAuth.js v5 with Google OAuth
- **UI**: Tailwind CSS + shadcn/ui + Lucide icons
- **Validation**: Zod (client & server)
- **Notifications**: Slack Webhooks (Block Kit)
- **Fonts**: Outfit (headings) + DM Sans (body)

## Local Setup

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- Google OAuth credentials ([console.cloud.google.com](https://console.cloud.google.com))

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your values (see Environment Variables below)

# Seed the database with initial policies and holidays
npm run seed

# Start development server
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create a `.env.local` file with:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `NEXTAUTH_SECRET` | Random secret for JWT signing (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | App URL (`http://localhost:3000` for dev) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL (optional) |
| `NEXT_PUBLIC_APP_URL` | Public app URL |
| `ADMIN_EMAILS` | Comma-separated admin emails (auto-promoted on sign-in) |

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Navigate to APIs & Services > Credentials
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env.local`

## Seed Script

Populate the database with initial leave policies, WFH policy, and a holiday calendar for the current year:

```bash
npm run seed
```

This creates:
- 6 leave policies (annual: 18 days, sick: 12, casual: 6, maternity: 180, paternity: 15, comp-off: 0)
- WFH policy (2 days/week, 8 days/month)
- Holiday calendar with 10 fixed + 5 optional holidays

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run seed` | Seed database with initial data |

## Deployment

### Deploying to away.storepecker.com

1. Set all environment variables on your hosting platform
2. Update `NEXTAUTH_URL` to `https://away.storepecker.com`
3. Update Google OAuth redirect URI to `https://away.storepecker.com/api/auth/callback/google`
4. Build and deploy:

```bash
npm run build
npm run start
```

For Vercel: connect the repository and configure environment variables in the dashboard.

## Admin Access

Admin emails are controlled via the `ADMIN_EMAILS` environment variable. On each Google sign-in:
- If the email is in `ADMIN_EMAILS`, the user is automatically promoted to admin
- If removed from `ADMIN_EMAILS`, the user is downgraded to employee on next sign-in
- Managers are assigned manually by admins via the User Management panel

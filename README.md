# Ants — Employee Web Portal

A standalone web app for **employees only** — the browser version of the Ants
mobile app. Separate project from the company dashboard, built on the same
stack: React 18 + TypeScript (strict) + Vite + Tailwind + shadcn/ui +
TanStack Query + React Router.

## Run it

```bash
npm install
cp .env.example .env        # point VITE_API_BASE_URL at the backend
npm run dev                 # http://localhost:5173
npm run build               # typecheck + production build
```

## Access

- Same accounts, same `/auth/login`, same JWT as the dashboard and mobile app.
- **Employee-role only.** Managers/owners who sign in land on a "this portal
  is for employees" page pointing them to the company dashboard.
- Access token lives in memory; the refresh token is persisted
  (`ants.portal.refresh_token`) and **rotated** on every refresh. 401s replay
  once after a refresh; a failed refresh signs out.
- A lapsed company plan (402) renders an "ask your company admin" state —
  employees are never routed toward billing.

## What's here (and the behaviors that carry over from mobile)

| Page | Notes |
| --- | --- |
| **Today** `/portal` | Live clock, shift window + countdown, late/on-time badge, check-in (disabled >15 min before shift and after today's report), breaks with a running timer, "This week" summary. Check-in's `sleep_prompt_id` opens a **blocking** sleep dialog — no X, no Escape, answering is the only way out. Check-out rejected for a missing report redirects into checkout mode below. |
| **Reports** `/portal/reports` | Daily/Overtime tabs; same-day `editable_until` badges. |
| **New report** `/portal/reports/new` | Multi-entry, hours+minutes fields. `?forCheckout=1`: actual worked minutes are a hard ceiling, "Today invoice" dialog (credited-hours breakdown), "Nothing to report" hidden, successful submit fires the real check-out. Pending health check-ins replace the form with an answer-first card — the dialog opens in place, nothing typed is lost. |
| **Report detail** | AI pace + reasoning (graceful "Startup tier" message when null), manager comments, same-day edit/delete. |
| **Overtime** `/portal/overtime` | Request (date/start/end/reason) → approval → start. Start is blocked before the planned start time and if the approval was already used (`request_id` matching). Ending REQUIRES the closing summary. Past sessions are paginated (20/page, Load more). |
| **Health** `/portal/health` | Pending reminders open their dialog in place; today's prompt list; weekly averages. Self-only. |
| **Knowledge** `/portal/knowledge` | Knowledge/Sharing tabs + search. Comments (author highlight, "You", clickable links) on Sharing only; must-read acknowledge on Knowledge only. |
| **Leave** `/portal/leave` | Full-day range or partial-day (single date + times), matching the mobile payload. |
| **Notifications** `/portal/notifications` | List + mark-read. Desk-location decision notifications stay visible but are plain text — no click-through (the feature itself isn't in the portal). |
| **Settings** `/portal/settings?tab=…` | Certificates (PDF download), Kudos, Attendance history, Feedback (anonymous toggle always shown, harassment→Owner note). |

## Deliberately not here

No GPS/location tracking of any kind (check-in/out send **no coordinates** —
the backend accepts this), no "working outside today" flow, no desk-location
feature, no notification preferences, no change password, no manager/owner
views. Push notifications don't exist on web; the bell polls every 60s
instead.

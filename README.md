# Ants — Employee Web Portal

A standalone web app for **employees only** — the browser version of the Ants
mobile app. Separate project from the company dashboard, built on the same
stack: React 18 + TypeScript (strict) + Vite + Tailwind + shadcn/ui +
TanStack Query + React Router.

## ⚠️ Structural change since the earlier version of this doc

**This app is no longer single-module.** The earlier version of this README
described every page under a flat `/portal/...` path, as if HR were the only
module an employee could ever land in. That's no longer accurate — a
company can now have more than one module enabled (currently HR and
Warehouse), and this app has a real module-gating layer in front of
everything else:

- **`/launch`** — neutral post-login landing page. Reads the employee's
  enabled modules and redirects accordingly; renders nothing itself.
- **`/home`** — icon-grid module picker, shown when an employee has **2 or
  more** enabled modules to choose between. Zero-module employees see a
  separate empty state instead (`NoModulesPage`).
- **`/entering/:module`** — a branded, ~2.5s "connecting" screen shown after
  picking (or auto-resolving to) a module. This is deliberately the
  **only** place `activeModule` gets set (in a mount effect, not during
  render) — the module-gating logic had a real race-condition bug earlier
  in this project's history from setting that state elsewhere, so don't
  reintroduce a second place that writes it.
- **HR module routes now live under `/ants-office/...`**, not `/portal/...`
  — every route in the table below has been renamed accordingly. If you
  see `/portal/...` referenced anywhere else (old docs, old bookmarks,
  old test scripts), that's stale.
- **Warehouse module routes live under `/ants-warehouse/...`** — currently
  a placeholder page only, not a real feature yet.

Settings → Exit clears the active module and returns to `/home`, so an
employee with multiple modules can switch between them without logging out.

## Run it

```bash
npm install
cp .env.example .env        # point VITE_API_BASE_URL at the backend
npm run dev                 # http://localhost:5173
npm run build               # typecheck + production build
```

> **Deploying to Vercel**: needs a `vercel.json` at the repo root with a
> catch-all rewrite to `index.html` — without it, reloading or directly
> hitting any route besides `/` returns Vercel's own 404 rather than
> letting React Router handle it. Same fix already applied to the other
> two frontends in this project; also confirm Vercel's **Production
> Branch** setting actually matches the branch you're pushing to before
> assuming a deploy picked up a fix.

## Access

- Same accounts, same `/auth/login`, same JWT as the dashboard and mobile app.
- **Employee-role only.** Managers/owners who sign in land on a "this portal
  is for employees" page pointing them to the company dashboard.
- Access token lives in memory; the refresh token is persisted
  (`ants.portal.refresh_token`) and **rotated** on every refresh. 401s replay
  once after a refresh; a failed refresh signs out.
- A lapsed company plan (402) renders an "ask your company admin" state —
  employees are never routed toward billing.

## Language

Unlike the company dashboard's free-choice language switcher, this app
follows a **company-assigns-your-language** model: 5 languages are
registered (`en`/`ja`/`ko`/`zh`/`hi`), and `PortalShell` syncs
`i18n.changeLanguage()` to whatever language value comes back on the
employee's own `/me` record when it resolves — there's no in-portal
language picker for the employee to change it themselves.

## What's here (and the behaviors that carry over from mobile)

> Paths below reflect the current `/ants-office/...` prefix for the HR
> module — see the structural-change note above for why this differs from
> an earlier version of this table.

| Page | Notes |
| --- | --- |
| **Today** `/ants-office` | Live clock, shift window + countdown, late/on-time badge, check-in (disabled >15 min before shift and after today's report), breaks with a running timer, "This week" summary. Check-in's `sleep_prompt_id` opens a **blocking** sleep dialog — no X, no Escape, answering is the only way out. Check-out rejected for a missing report redirects into checkout mode below. |
| **Reports** `/ants-office/reports` | Daily/Overtime tabs; same-day `editable_until` badges. |
| **New report** `/ants-office/reports/new` | Multi-entry, hours+minutes fields. `?forCheckout=1`: actual worked minutes are a hard ceiling, "Today invoice" dialog (credited-hours breakdown), "Nothing to report" hidden, successful submit fires the real check-out. Pending health check-ins replace the form with an answer-first card — the dialog opens in place, nothing typed is lost. |
| **Report detail** | AI pace + reasoning (graceful "Startup tier" message when null), manager comments, same-day edit/delete. |
| **Overtime** `/ants-office/overtime` | Request (date/start/end/reason) → approval → start. Start is blocked before the planned start time and if the approval was already used (`request_id` matching). Ending REQUIRES the closing summary. Past sessions are paginated (20/page, Load more). |
| **Health** `/ants-office/health` | Pending reminders open their dialog in place; today's prompt list; weekly averages. Self-only. |
| **Knowledge** `/ants-office/knowledge` | Knowledge/Sharing tabs + search. Comments (author highlight, "You", clickable links) on Sharing only; must-read acknowledge on Knowledge only. |
| **Leave** `/ants-office/leave` | Full-day range or partial-day (single date + times), matching the mobile payload. |
| **Notifications** `/ants-office/notifications` | List + mark-read. Desk-location decision notifications stay visible but are plain text — no click-through (the feature itself isn't in the portal). |
| **Settings** `/ants-office/settings?tab=…` | Certificates (PDF download), Kudos, Attendance history, Feedback (anonymous toggle always shown, harassment→Owner note). Exit button here is what clears `activeModule` and returns to `/home` (see structural-change note). |
| **Invoices** `/ants-office/invoices/:id` | Not described in the earlier version of this doc — carried over from the routes actually wired (`hrRoutes.tsx`); confirm current behavior directly if documenting this further. |

## Deliberately not here

No GPS/location tracking of any kind (check-in/out send **no coordinates** —
the backend accepts this), no "working outside today" flow, no desk-location
feature, no notification preferences, no change password, no manager/owner
views. Push notifications don't exist on web; the bell polls every 60s
instead.
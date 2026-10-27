# Sales Order Monitoring System (SOMS)

A sales order monitoring system for Harrisons Sabah Sdn Bhd, built for the IT Executive assessment. It helps a sales team follow orders across branches: a dashboard of totals and trends, a searchable order list with filters, and system settings. All order data comes live from the provided read-only mock REST API; nothing is hard-coded.

**Live app:** _Netlify URL to be added after the first deploy_

**Demo account:** on the sign-in page, press **Use demo account**, then **Sign in**. The account is defined in `src/auth/demoAccounts.ts`.

## Brief coverage

| Requirement | Where it is met |
| --- | --- |
| Dashboard: total orders, open/pending, completed (invoiced and delivered), cancelled, total order value | KPI cards on the dashboard (`/app/dashboard`), plus outstanding balance |
| Order listing: SalesId, customer, branch/site, order date, status, amount | Sales orders table (`/app/orders`), with sortable columns and an order detail panel |
| Search, and filters by branch/site and status | Search box, branch filter and status tabs. All three are sent to the API, which does the filtering |
| API integration, no hard-coded dataset | `src/api/client.ts`. Every figure and row comes from the API at run time |
| Loading, empty and error states | Skeleton rows and cards while loading, empty states with a "Clear filters" action, error messages with Retry |
| Responsive layout | Checked from 390px phones to 1920px desktops, in light and dark themes |

## Versions

- **`v1.0.0` (git tag):** the brief's requirements on a single page: KPI summary, order list, search, filters, detail panel, and the loading, empty and error states.
- **`2.0.0` (current):** turns it into a complete system: a sign-in page with a demo account, a workspace with a sidebar, a full dashboard, notifications, system settings and placeholder modules.

## Features

### Sign-in page (`/`)

- The sign-in form sits on a plain panel on the left. On the right, a framed photograph carries one line about the system and the photo credit. On phones the photograph becomes a band above the form.
- The form has work email and password (with show/hide), "Keep me signed in", "Forgot password?", an expired-session notice and a demo account box.
- Signed-out visitors who open an `/app` link are sent here and returned to that link after signing in. The older `/login` link still works.

### Workspace (`/app`)

- **Layout:** a floating, collapsible sidebar grouped into Overview, Sales, Operations and Administration, plus a top bar with global order search, a light/dark toggle, the notification bell and the account menu. On tablets and phones the sidebar becomes a menu that slides in from the left.
- **Dashboard:**
  - Welcome banner: a greeting for the signed-in user and a live clock with the date, in the configured time zone.
  - KPI cards: total orders, open / pending, completed (delivered + invoiced), cancelled, total order value and outstanding balance.
  - Charts: orders by month (stacked by status, switchable between count and value), status breakdown, and open order aging.
  - Lists: needs attention (on hold, pending validation, high value, aged), branch performance, sales by product group, recent orders and top customers.
  - Period and branch filters apply to every widget and are kept in the URL.
- **Sales orders:**
  - The order list with status tabs, debounced search, a branch filter, sortable columns and paging.
  - An order detail panel.
  - CSV export of the current filter. Filters, sort, page and the open order are kept in the URL, so any view can be bookmarked or shared.
- **Notifications:** the bell counts orders on hold, open orders pending validation, high-value open orders and aged open orders. Each item opens the matching list on the dashboard. Which alerts show is set in System settings.
- **System settings** (`/app/settings/:section`):

  | Section | Settings |
  | --- | --- |
  | General | Company name, system name, time zone, date format, currency display (with a live preview) |
  | Appearance | Theme (light, dark, follow system), table density, default sidebar state |
  | Sales orders | Rows per page, default sort, high-value threshold, high-value flag in the table |
  | Branches | Display names for each site code from `/meta`, used across the app |
  | Data and API | Base URL, API key, request timeout, auto-refresh interval, dashboard cache, connection test |
  | Notifications | Which alerts the bell shows, the aged-order threshold |
  | Security | Idle session timeout, allow "Keep me signed in" |
  | System information | Version, environment, API endpoint and version, branch count |

  The page tracks unsaved changes and shows a save bar. It validates every input, warns before you leave with unsaved edits, and can restore defaults per section. Settings are saved in the browser (`localStorage`).
- **Placeholder modules:** Customers, Invoices, Deliveries, Products, Branches, Reports and Users and roles appear in the sidebar marked "Soon". Each opens a placeholder page with links to the available modules.
- **My profile**, and a not-found page for unknown links.

## Tech stack

| Area | Choice |
| --- | --- |
| UI | React 19 + TypeScript |
| Routing | React Router 7 |
| Build / dev server | Vite 8 |
| Styling | Plain CSS with design tokens (light and dark), Poppins (Google Fonts) |
| Charts | Hand-built HTML/SVG, no chart library |
| Imagery | One photograph from Pexels ("Aerial View of Cargo Ship" by Tom Fisk), converted to WebP (`src/assets/login-photo.webp`) |
| Tests | Vitest, Testing Library, jsdom |
| Hosting | Netlify (static files) |

The production app has three runtime dependencies: `react`, `react-dom` and `react-router`.

## Getting started

Requirements: Node.js 22.13 or newer (Vitest and jsdom need it; the build alone runs on Node 20.19 or newer).

Clone this repository, then from the project folder:

```bash
npm install
cp .env.example .env.local   # the API address and the key from the brief
npm run dev                  # http://localhost:5173
```

In the Windows Command Prompt, use `copy .env.example .env.local` instead of `cp`. PowerShell and Git Bash accept `cp`.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Re-run tests on every change |
| `npm run typecheck` | Type-check only |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally (http://localhost:4173) |

### Environment variables

| Name | Required | Default |
| --- | --- | --- |
| `VITE_API_KEY` | Yes, unless entered in System settings | none |
| `VITE_API_BASE_URL` | No | `https://hiring.harrisons.my/api/mock/sales-orders` |

`.env.example` already holds the values from the brief, and `.env.local` is ignored by git. Values entered under System settings > Data and API override these for that browser; leaving a field blank falls back to the build value. Without a key, the app shows "API key is not configured" instead of data.

## Design

- **Palette:** ink navy for the sidebar and the welcome banner, cobalt for actions and links, and a champagne accent for section labels and active states.
- **Status colours:** cobalt (open), teal (delivered), champagne (invoiced) and rose (cancelled). Each theme has its own set, and both were checked for colour-blind separation against their background. Statuses always carry a text label as well.
- **Typography:** Poppins throughout.
- **Photograph:** used on the sign-in page only.

## Architecture

```
 Browser                                        Netlify
 +-------------------------------+              +----------------------+
 | SOMS (React single-page app)  | <----------- | dist/: index.html,   |
 |  screens, filters, charts     |  first visit | one JS and one CSS   |
 |  localStorage / session       |              +----------------------+
 +-------------------------------+
        |  GET + x-assessment-key header
        v
 +---------------------------------------------------+
 | Harrisons mock REST API (read-only)               |
 |  /sales-orders   /sales-orders/meta   /{SalesId}  |
 +---------------------------------------------------+
```

There is no backend of our own. Netlify serves static files, and the browser calls the API directly, which the API allows (CORS).

```
src/
  assets/              login-photo.webp (sign-in background, Pexels)
  api/
    config.ts          runtime API settings (env defaults, overridden from System settings)
    client.ts          fetch wrapper: auth header, timeout, cancellation, error mapping,
                       fetchAllOrders (parallel paging), testConnection
    types.ts           API response types and query model
  auth/
    AuthContext.tsx    demo sign-in, session storage, idle timeout
    RequireAuth.tsx    route guard for /app
    demoAccounts.ts    seed account
  settings/
    defaults.ts        settings model, defaults, load/save with merge
    SettingsContext.tsx  settings provider, theme and density on <html>
  hooks/
    useApi.ts          loads data for a key, cancels stale requests, exposes reload
    useOrderDataset.ts shared, cached copy of all orders for the dashboard and bell
    useUrlState.ts     list query and open order kept in the URL
    useFormat.ts       formatter built from the General settings
    useInterval.ts, useDebouncedValue.ts
  lib/
    analytics.ts       pure aggregations: totals, months, statuses, branches, aging, alerts
    format.ts          currency, dates and month keys in the configured time zone
    query.ts           URL parsing and serialising, pagination window
    csv.ts             CSV building with formula-injection protection
    status.ts          status order and colours
  layouts/             AppLayout, Sidebar, Topbar, navigation model
  components/          shared UI: icons, toasts, popover, form controls, states,
                       orders/ (table, filters, pagination, drawer),
                       dashboard/ (charts, welcome banner)
  pages/               Login (home), Dashboard, Orders, Settings, Profile,
                       Placeholder, NotFound
  styles/              base (tokens), shell, dashboard, settings, public
  test/                API mock, fixtures, render helper, setup
```

**Providers.** `SettingsProvider` loads saved settings and applies the API config during its first render, so the first request already uses it. `AuthProvider` reads the session. `ToastProvider` handles confirmations.

**Two data paths.**

1. *Sales orders page:* `useUrlState` is the single source of truth. Each change produces a new request key, `useApi` aborts the previous request, and the API does the search, filtering, sorting and paging. The previous rows stay on screen, dimmed, while the next page loads.
2. *Dashboard and notifications:* the API has no aggregation endpoint and its `summary` ignores filters. Monthly trends, branch comparison, aging and alerts therefore need every row. `useOrderDataset` pages through the list (100 rows per request, 4 in parallel, 12 requests for the 1,200 orders), keeps one shared copy for the dashboard and the bell, and reuses it for the cache time set in System settings (5 minutes by default). Refresh forces a reload. All aggregation is in `lib/analytics.ts` as pure functions with unit tests.

## API integration notes

- **Endpoints used:**
  - `GET /api/mock/sales-orders`: the list, paging, status tab counts (`summary`), the dashboard dataset and CSV export.
  - `GET /api/mock/sales-orders/meta`: branch and status options, the API status in the sidebar and the connection test.
  - `GET /api/mock/sales-orders/{SalesId}`: the detail panel.
- **Authentication:** every request sends the `x-assessment-key` header. The API also accepts `Authorization: Bearer`, which SOMS does not need. The API allows cross-origin requests, so the browser calls it directly.
- **Server-side work on the list:** `q`, `site`, `status`, `sort`, `order`, `page` and `pageSize` are passed to the API. Nothing is hard-coded.
- **Race conditions:** each request has an `AbortController`. When filters change quickly, older requests are cancelled and their late responses are ignored.
- **Timeouts and errors:** the timeout is configurable (15 seconds by default). Network failures, timeouts, 401/403 (points to the API key setting), 404, 429 and 5xx are mapped to clear messages with a retry action. If a background refresh fails, the last good data stays visible with a warning.
- **Input safety:** values from the URL are validated (page size, sort field and direction) before they reach the API. CSV cells that start with `=`, `+`, `-` or `@` are escaped so spreadsheets do not run them as formulas.
- **Dates and money:** dates use the configured time zone (Malaysia by default), so an order at 20:30 UTC on 30 Sep is counted on 1 Oct. Amounts are in ringgit.
- **API behaviour observed by testing it directly (27 October 2026):**
  - `summary` always describes all 1,200 orders; only `filtered_orders` follows the filters. This is why the dashboard downloads every order instead of reading `summary`.
  - `pageSize` goes up to 100. The API's default sort is `SalesId` ascending; SOMS asks for the newest orders first.
  - `status` and `site` match without regard to capitals.
  - A page past the end returns 200 with an empty `data` list, not an error.
  - `/meta` answers without a key but rejects a wrong key with 401. The list and single-order endpoints need the key.
  - An unknown `SalesId` returns 404.

## Testing

`npm test` runs 66 tests in 7 files:

- **Unit:** formatting in different time zones, date formats and currency styles; the welcome clock and greeting; URL state with configured defaults; pagination window; CSV quoting and formula escaping; every analytics function (totals, month grouping across the UTC day boundary, status order, branch ranking, aging buckets, attention lists, axis scales).
- **API client:** auth header and query parameters, 401 / 404 / 5xx handling, network failure, timeout and cancellation, and the connection test (meta details, rejected key).
- **Sales orders page:** list and status counts, debounced search, branch filter and status tabs, empty state with clear filters, error with retry, stale responses ignored, detail panel open and close with Escape, deep link to a missing order.
- **App:**
  - Sign in: the home page and photo credit, the redirect to sign in, a wrong password, the old `/login` link, demo sign-in returning to the requested page, and sign out.
  - Workspace: dashboard tiles from the full dataset, the welcome banner (greeting, date and live clock), and placeholder modules.
  - Settings: saved values persist after a reload, and an invalid value blocks saving.

Checks beyond the test suite:

- **Type check and build:** `npm run typecheck` and `npm run build` pass with no errors.
- **Browser:** the production build was opened in Microsoft Edge with Playwright at 1920px, 1440px, 820px and 390px, in light and dark themes, across every page and settings section. There were no console errors and no horizontal scrolling. Dropdowns were opened and used to confirm that picking an option still updates the filter and the URL.
- **Data accuracy:** the dashboard's figures were checked against the API itself. The amounts of all 1,200 orders add up to the API's `total_order_value` (998,244.30), and the status counts match `/meta` (420 open, 360 invoiced, 300 delivered, 120 cancelled).
- **API by hand:** the endpoints were called directly from PowerShell, including the cases listed under "API behaviour observed" above.

## Limitations

- **Demo sign-in only:** the assessment has no user API, so the account is checked in the browser against a seed file. A real system would authenticate on a server and issue a session cookie.
- **Settings are per browser:** they are saved in `localStorage`, not shared between users.
- **Key visible in the browser:** the API key is bundled into the front end. That is acceptable for this public, read-only assessment key. A real system would keep it behind a server-side proxy, for example a Netlify Function.
- **Dashboard loads the full list:** this suits 1,200 orders. For a large dataset the aggregation would move to an API endpoint.
- **Read-only:** the API only allows `GET`, so there are no create, edit or delete actions. Modules marked "Soon" are placeholders.

## AI use disclosure

- **Tool:** Claude Code, Anthropic's coding agent, running the Claude Opus 5.5 model, used as a pair programmer throughout.
- **What the AI did:** read the brief, proposed the structure, and wrote the code, styles, tests and this README. It ran the test suite, type check and build after each change, took browser screenshots at several screen sizes to check layouts, and called the API directly to confirm its behaviour.
- **What I did:**
  - Set the requirements and the scope: the brief's requirements first, saved as `v1.0.0`, then the full workspace.
  - Set the UI rules: Poppins throughout, no emoji, no em dashes, and no filler descriptions under headings.
  - Reviewed every version and decided what to keep, change or reject.
- **What I changed or rejected after review:**
  - **Sign-in page:** an early redesign followed a reference site too closely. I rejected it and asked for an original layout that keeps only the mood.
  - **KPI cards:** a version that merged the figures into one dark band was replaced with separate, plain cards. Small line charts inside two cards were replaced with an icon on the right of every card.
  - **Welcome banner:** added at my request with a greeting and the live time and date. I asked for its padding and hierarchy to be reworked, and removed a row of counts that repeated the KPI cards.
  - **Sidebar:** a background photo was removed, and the sidebar was made to float like the sign-in card.
  - **Charts and controls:** the open order aging chart was stretched to fill its card, and dropdown options were restyled with padding and rounded corners.
- **What was verified or corrected:**
  - The AI suggested that "Test connection" might accept a wrong key, because `/meta` answers without one. Testing against the live API showed that `/meta` does reject a wrong key, so the code was kept as it was and two tests now cover this case.
  - Once icons were added, KPI values were cut off on wide screens; the cards were changed to a fixed three-column grid.
  - The dashboard totals were cross-checked against the API's own summary and `/meta` counts (see Testing).

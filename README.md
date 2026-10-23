# Sales Order Monitoring

A responsive web app for monitoring sales orders across branches, built for the Harrisons Sabah Sdn Bhd IT Executive assessment. All data comes live from the provided read-only mock REST API.

**Live app:** _add your deployed URL here_

## Features

- **Dashboard:** total orders, open / pending, completed (invoiced + delivered), cancelled, total order value and average order value, plus a status mix bar. Clicking a status in the legend filters the table.
- **Order listing:** order number (`SalesId`), customer and account, branch / site, order date, status and amount.
- **Search and filtering:** debounced free-text search (order no., customer, account, customer PO, sales taker), branch filter and status filter, all applied server side.
- **Sorting and paging:** sortable columns (order no., branch, date, status, amount), page sizes of 10 / 25 / 50 / 100.
- **Order details:** clicking a row opens a side panel that loads the single-order endpoint and shows amounts, dates, statuses, delivery and notes.
- **Shareable URLs:** filters, sorting, paging and the open order are kept in the query string, so any view can be bookmarked or sent to a colleague.
- **UX states:** skeleton loading, empty results, error with retry, stale-data warning when a refresh fails, and a layout that switches to cards on phones.

## Tech stack

| Area | Choice |
| --- | --- |
| UI | React 19 + TypeScript |
| Build / dev server | Vite |
| Styling | Plain CSS with design tokens, Poppins (Google Fonts) |
| Tests | Vitest, Testing Library, jsdom |
| Hosting | Any static host (Vercel, Netlify, GitHub Pages) |

No UI framework or data-fetching library is used, to keep the code small and easy to explain.

## Getting started

Requirements: Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local   # contains the assessment API URL and key
npm run dev                  # http://localhost:5173
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm test` | Run the test suite once |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |

### Environment variables

| Name | Required | Default |
| --- | --- | --- |
| `VITE_API_KEY` | Yes | none, the app shows a configuration error without it |
| `VITE_API_BASE_URL` | No | `https://hiring.harrisons.my/api/mock/sales-orders` |

## Deployment

**Vercel:** import the Git repository, keep the detected Vite settings (build `npm run build`, output `dist`), add `VITE_API_KEY` under Environment Variables, then deploy.

**Netlify:** build command `npm run build`, publish directory `dist`, add `VITE_API_KEY` in Site settings > Environment variables.

The app is a single page with no client-side routes, so no rewrite rules are needed.

## Architecture

```
src/
  api/
    client.ts        fetch wrapper: auth header, timeout, cancellation, error mapping
    types.ts         API response types and query model
  hooks/
    useApi.ts        loads data for a key, cancels stale requests, exposes reload
    useUrlState.ts   syncs filters, sort, page and open order with the URL
    useDebouncedValue.ts
  lib/
    format.ts        currency (MYR), dates in Malaysia time, numbers
    query.ts         URL parsing and serialising, pagination window
    status.ts        status order and colour mapping
  components/
    Dashboard.tsx    KPI tiles and status mix
    Filters.tsx      search, branch, status, mobile sort
    OrdersTable.tsx  sortable table (cards on mobile)
    Pagination.tsx
    OrderDrawer.tsx  order detail side panel
    States.tsx       loading skeleton, empty and error states
  App.tsx            page composition
```

**Data flow.** `useUrlState` is the single source of truth for the list query. Any change to it produces a new request key, `useApi` aborts the previous request and starts a new one, and the result feeds both the dashboard (from `summary`) and the table (from `data`). While a new page loads, the previous rows stay on screen, dimmed, instead of flashing a blank table.

## API integration notes

- **Endpoints used:**
  - `GET /api/mock/sales-orders` for the list, the dashboard summary and paging.
  - `GET /api/mock/sales-orders/meta` for the branch and status filter options.
  - `GET /api/mock/sales-orders/{SalesId}` for the detail panel.
- **Authentication:** every request sends the `x-assessment-key` header. The API allows cross-origin requests, so the browser calls it directly.
- **Server-side work:** search, filters, sorting and paging are passed to the API as `q`, `site`, `status`, `sort`, `order`, `page` and `pageSize`. The full dataset is never downloaded or hard-coded.
- **One request for two widgets:** the list response already includes `summary`, so the dashboard and table share one call per change.
- **Race conditions:** each request has an `AbortController`. When filters change quickly, older requests are cancelled and their late responses are ignored.
- **Timeouts and errors:** requests time out after 15 seconds. Network failures, timeouts, 401/403, 404, 429 and 5xx responses are mapped to clear messages with a retry action.
- **Input safety:** values read from the URL are validated (page size limited to 10/25/50/100, sort field and direction checked against the API contract) before they reach the API.
- **Dates and money:** dates are shown in Malaysia time (`Asia/Kuala_Lumpur`) and amounts in ringgit (`RM 1,234.50`).

## Testing

`npm test` runs 32 tests:

- **Unit:** currency, date and percentage formatting (including the UTC to Malaysia day rollover), URL parsing and serialising, pagination window.
- **API client:** auth header and query parameters, 401 / 404 / 5xx handling, network failure, timeout, and caller cancellation.
- **Component (App):** dashboard and table render from the API, debounced search, branch and status filters, empty state with clear filters, error state with retry, stale responses ignored, detail panel open/close with Escape, and a deep link to a missing order.

Manual checks were done in a desktop browser (1440px) and at phone width (390px): loading, filtering, sorting, paging, detail panel, no horizontal scrolling on mobile, and the error state with the API blocked.

## Limitations

- **Global dashboard:** the dashboard shows totals for all orders because the API `summary` is not filtered. The filtered count is shown next to the Orders heading.
- **Key visible in the browser:** the API key is bundled into the front end. That is acceptable for this public, read-only assessment key. For a real system the key would sit behind a small server-side proxy.
- **Branch codes only:** branches are shown by site code (A10, B20, ...) because the API does not provide branch names.
- **Read-only:** the API only allows `GET`, so the app has no create, edit or delete actions.
- **No dark mode or offline caching.**

## AI use disclosure

_Edit this section so it reflects exactly what you did._

- **Tool:** Claude Code (Anthropic) was used as a pair programmer to scaffold the project, write components, styles and tests, and draft this README.
- **Verification:** I explored the API by hand first (`/meta`, list, filters, 401, 404, empty results, out-of-range pages) and built the client around the observed behaviour. I ran the test suite, type check and production build, and checked the UI at desktop and phone widths.
- **Changes made after review:** _list anything you changed or rejected_.

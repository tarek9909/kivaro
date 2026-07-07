# Kivaro ERP Frontend

Premium glassmorphism React + Vite app powered by the Kivaro backend API.

## Quick start

```bash
npm install
cp .env.example .env   # then edit if your API is not on https://api.kivaro.vip/api
npm run dev
```

## Scripts

- `npm run dev` - start the Vite dev server.
- `npm run build` - produce the production bundle in `dist/`.
- `npm run preview` - preview the production build locally.
- `npm run check` - fast esbuild-based syntax sweep over `src/`.
- `npm run lint` - ESLint with browser/node globals.

## Stack

- React 19, React Router 7, TanStack Query 5
- Tailwind CSS with a custom glassmorphism design system
- Zustand for the auth/session store
- React Hook Form + Zod for forms and validation (ready to wire)
- React Hot Toast for feedback
- lucide-react icon set

## Project layout

```
src/
  api/                 # API layer (kept; surface audited against backend routes)
  app/                 # App-level wiring: providers, auth store, routes, navigation
  components/
    layout/            # AppShell, Sidebar, Topbar
    ui/                # Reusable primitives (Button, Input, GlassPanel, States)
  pages/               # Route-level views
  styles/              # Global Tailwind layers + tokens
  lib/                 # Tiny utilities (cn, formatters)
```

## Auth & permissions

- The auth store (`src/app/stores/authStore.js`) drives login, logout, hydrate (via `/auth/me`), and exposes `hasPermission` / `hasAnyPermission` helpers.
- `ProtectedRoute` and `PublicOnlyRoute` gate routes; sidebar items hide automatically when the user lacks the required permissions.

## Environment

```
VITE_API_BASE_URL=https://api.kivaro.vip/api
VITE_API_TIMEOUT_MS=30000
```

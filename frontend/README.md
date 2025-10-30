# WiiFit Frontend (React + Vite + TypeScript + Tailwind + shadcn/ui)

This is the frontend template for the WiiFit fitness app.

## Features
- Vite + React + TypeScript
- Tailwind CSS with shadcn/ui design tokens
- Ready for shadcn/ui component generation via `components.json`
- React Router set up; basic App shell with a Button
- Proxy `/api` to your backend (uses VITE_API_URL)

## Quick start (Windows PowerShell)

1) Env (optional)
```powershell
Copy-Item .env.example .env
# Then edit .env to point VITE_API_URL to your backend
```

2) Install deps and start dev
```powershell
cd frontend
npm install
npm run dev
```

It should open on http://localhost:5173

## Tailwind
- Config: `tailwind.config.ts`
- CSS: `src/index.css`

## shadcn/ui
- Config: `components.json`
- Example component: `src/components/ui/button.tsx`

To generate more components (optional):
```powershell
# Install CLI locally or globally
# npx shadcn-ui@latest add card input ...
```

## Routing
- `src/App.tsx` contains a minimal shell and routes.

## API proxy
- `vite.config.ts` proxies `/api` to `VITE_API_URL`.
- Alternatively, use `fetch(import.meta.env.VITE_API_URL + '/api/...')` directly.

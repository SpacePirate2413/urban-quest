# AGENTS.md

## Stack

**Monorepo**: pnpm workspaces  
**Apps**:
- `apps/mobile` — Expo 54 + expo-router (React Native)
- `apps/creator-station` — Vite + React 19 + TailwindCSS 4 + Zustand
- `apps/api` — Fastify 5 + Prisma (SQLite) + Zod

## Code Map

```
apps/
├── api/src/
│   ├── features/{domain}/     # Feature modules (routes, service, handlers)
│   ├── config/                # Env validation
│   └── lib/                   # Shared utilities (prisma client)
├── creator-station/src/
│   ├── pages/{feature}/       # Route-based pages
│   ├── components/            # Reusable UI
│   └── store/                 # Zustand stores
└── mobile/app/
    ├── (tabs)/                # Tab navigator screens
    └── _layout.tsx            # Root layout
packages/                      # Shared packages (future)
```

## Patterns

### API
- **Feature-first**: `features/{name}/{name}.routes.ts`, `{name}.service.ts`
- **Route registration**: `app.register(routes, { prefix: '/api/{name}' })`
- **Auth**: JWT via `@fastify/jwt`, OAuth handlers in `features/users/auth/`
- **Validation**: Zod schemas

### Creator Station
- **State**: Zustand stores in `store/`
- **Routing**: react-router-dom, routes defined in `App.jsx`
- **Styling**: TailwindCSS utility classes

### Mobile
- **Navigation**: expo-router file-based routing
- **Tabs**: `app/(tabs)/` directory
- **Theme**: `src/theme/theme.ts`

## Commands

```bash
pnpm api:dev          # Start API (tsx watch)
pnpm creator:dev      # Start creator-station (Vite)
pnpm mobile:start     # Start Expo dev server
pnpm api:db:studio    # Open Prisma Studio
pnpm api:db:push      # Push schema to DB
```

## Design Opinions

1. **Colocation** — Keep related code together (routes + service + handlers)
2. **Thin routes** — Business logic lives in services, not route handlers
3. **Type safety** — Zod for runtime validation, TypeScript for static
4. **No shared runtime code yet** — Apps are independent; `packages/` reserved for future extraction
5. **Mobile-first auth** — OAuth flows support both web callbacks and mobile token exchange

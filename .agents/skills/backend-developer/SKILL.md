---
name: backend-developer
description: API routes, services, and database work in apps/api. Use when building endpoints or modifying Prisma schema.
---

# When to Use

Invoke when creating or modifying API endpoints, writing database queries, or handling authentication flows.

# Key Decisions

- **Fastify 5 + Zod** — All request/response validation uses Zod schemas
- **Feature folders** — Each domain gets `features/{name}/{name}.routes.ts` + `{name}.service.ts`
- **Thin routes** — Route handlers call services; business logic never lives in route files
- **Human-readable errors** — Error messages tell the user what to do, not what went wrong internally

# Patterns

```typescript
// features/quests/quests.routes.ts
import { questService } from './quests.service';

export async function questRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const quests = await questService.list();
    return reply.send(quests);
  });
}

// Register in app.ts
app.register(questRoutes, { prefix: '/api/quests' });
```

| Task | Location |
|------|----------|
| Add endpoint | `apps/api/src/features/{domain}/{domain}.routes.ts` |
| Add business logic | `apps/api/src/features/{domain}/{domain}.service.ts` |
| Modify schema | `apps/api/prisma/schema.prisma` → run `pnpm api:db:push` |
| Add auth | Use `@fastify/jwt`; see `features/users/auth/` |

# Anti-Patterns

- **Logic in routes** — Extract to service; routes only parse input and call services
- **Generic error messages** — "Something went wrong" helps no one; say what the user should try
- **Deep nesting** — Prefer early returns and flat control flow
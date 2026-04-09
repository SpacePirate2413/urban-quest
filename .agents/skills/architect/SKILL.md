---
name: architect
description: Technical design decisions and cross-cutting concerns. Use when adding new features, integrating apps, or making structural changes.
---

# When to Use

Invoke when a change touches multiple apps, introduces new dependencies, or requires a design decision that affects future work.

# Key Decisions

- **Real data over mocks** — Ask before using fake data; prefer wiring to actual endpoints
- **Colocation** — Related code lives together (routes + service + handlers in same feature folder)
- **No shared runtime yet** — Apps are independent. Share no code between them.
- **SQLite for now** — Prisma with SQLite; migration to Postgres is a future concern, not a current one

# Patterns

| Concern | Pattern | Example |
|---------|---------|---------|
| New API feature | Feature folder in `apps/api/src/features/{name}/` | `features/quests/quests.routes.ts` |
| New page | Route file in `apps/creator-station/src/pages/{feature}/` | `pages/write/QuestEditor.jsx` |
| Shared state | Zustand store in `apps/creator-station/src/store/` | `store/questStore.js` |
| Mobile screen | File in `apps/mobile/app/` using expo-router conventions | `app/(tabs)/explore.tsx` |

# Anti-Patterns

- **Over-documenting** — Skip summaries that repeat the same information; state the decision and move on
- **Technical jargon without trade-offs** — Explain *why* a choice matters in business terms
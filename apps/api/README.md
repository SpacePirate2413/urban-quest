# Urban Quest API

Backend API for Urban Quest, built with Fastify + TypeScript + Prisma + SQLite.

## Setup

1. Copy environment file:
   ```bash
   cp .env.example .env
   ```

2. Configure your `.env` with:
   - `JWT_SECRET` - Generate with `openssl rand -base64 32`
   - Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/)
   - Apple OAuth credentials from [Apple Developer](https://developer.apple.com/)

3. Install dependencies and setup database:
   ```bash
   pnpm install
   pnpm api:db:push
   ```

4. Start development server:
   ```bash
   pnpm api:dev
   ```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm api:dev` | Start dev server with hot reload |
| `pnpm api:build` | Build for production |
| `pnpm api:start` | Start production server |
| `pnpm api:db:push` | Push schema to database |
| `pnpm api:db:studio` | Open Prisma Studio |

## API Endpoints

### Auth
- `GET /api/users/auth/google` - Start Google OAuth flow (web)
- `GET /api/users/auth/apple` - Start Apple OAuth flow (web)
- `POST /api/users/auth/mobile/token` - Exchange mobile OAuth token for JWT

### Users
- `GET /api/users/me` - Get current user (requires auth)
- `PATCH /api/users/me` - Update current user (requires auth)
- `DELETE /api/users/me` - Delete current user (requires auth)

### Health
- `GET /health` - Health check

## Architecture

```
src/
├── config/          # Environment config
├── features/        # Feature modules
│   └── users/       # User domain
│       ├── auth/    # OAuth handlers
│       ├── users.routes.ts
│       └── users.service.ts
├── lib/             # Shared utilities (Prisma client)
└── index.ts         # App entry point
```

## Notes

- SQLite is used for rapid prototyping. Switch to PostgreSQL later by updating `prisma/schema.prisma` and `DATABASE_URL`.
- Geospatial queries (when waypoints are added) will use Haversine calculations in the service layer.

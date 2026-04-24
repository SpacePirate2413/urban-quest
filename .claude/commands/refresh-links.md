# /refresh-links

Start all three apps with the latest code and open their URLs.

## Steps

1. Check which ports are already in use (3001, 5173, 8081).
2. Start any that are not running:
   - `pnpm api:dev` — API on http://localhost:3001
   - `pnpm creator:dev` — Creator Station on http://localhost:5173
   - `pnpm mobile:ios` — Mobile app in the iOS simulator
3. Print the links:
   - **Creator Station (main)**: http://localhost:5173/write
   - **Admin Portal**: http://localhost:5173/admin

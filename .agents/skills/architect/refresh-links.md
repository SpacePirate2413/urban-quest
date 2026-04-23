# Refresh Links

Start all three apps with the latest code and open their URLs.

## Steps

1. Start the API server (if not already running):
   ```bash
   pnpm api:dev
   ```

2. Start creator-station (if not already running):
   ```bash
   pnpm creator:dev
   ```

3. Start mobile and auto-open the iOS simulator:
   ```bash
   pnpm mobile:ios
   ```

4. Open the following links:
   - **Creator Station (main)**: [http://localhost:5173/write](http://localhost:5173/write)
   - **Admin Portal**: [http://localhost:5173/admin](http://localhost:5173/admin)

## Notes

- The API runs on [http://localhost:3001](http://localhost:3001) by default.
- Creator-station uses Vite's default port `5173`.
- `/write` is the creator landing page (the root `/` redirects there).
- `/admin` renders the `AdminDashboard` component and does not require auth.

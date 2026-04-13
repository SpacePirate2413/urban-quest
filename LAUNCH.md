# Urban Quest - Launch Guide

## Quick Start (Development)

### 1. Start the API Server
```bash
cd apps/api
pnpm dev
```
API runs at: http://localhost:3001

### 2. Start Creator Station (Web)
```bash
cd apps/creator-station
pnpm dev
```
Creator Station runs at: http://localhost:5173

### 3. Start Mobile App
```bash
cd apps/mobile
pnpm start
# Press 'i' for iOS simulator or 'a' for Android
```

## All-in-One Command
From the root directory:
```bash
# Terminal 1: API
pnpm api:dev

# Terminal 2: Creator Station
pnpm creator:dev

# Terminal 3: Mobile
pnpm mobile:start
```

---

## Creating Your First Quest

### Step 1: Login to Creator Station
1. Open http://localhost:5173
2. Click "Dev Login" (uses your configured email)
3. You'll see the Writer Dashboard

### Step 2: Create a Quest
1. Click "New Quest" button
2. Fill in quest details:
   - **Title**: Your quest name
   - **Description**: What the quest is about
   - **Genre**: Adventure, Mystery, Thriller, etc.
   - **Price**: $0 for free (ad-supported) or set a price
   - **Narrator Voice**: Choose from 8 AI voices

### Step 3: Add Waypoints
1. Go to "Waypoints" tab
2. Click "Add Waypoint"
3. Set location (lat/lng), name, and description
4. Add photos if desired

### Step 4: Write Scenes
1. Go to "Screenplay" tab
2. Click "Add Scene"
3. Write the narrative script
4. Add a question and choices for branching
5. Link scene to a waypoint

### Step 5: Generate Audio (Optional)
1. In the Audio Studio, select a scene
2. Click "Generate Audio" to create TTS narration
3. Preview and adjust as needed

### Step 6: Publish
1. Review all content
2. Click "Publish Quest"
3. Quest is now live for players!

---

## Playing Quests on Mobile

### Step 1: Login
1. Open the app on your device/simulator
2. Sign in with Apple or Google (or use dev auth)

### Step 2: Discover Quests
1. Go to the "Play" tab
2. Browse the map or list view
3. Use filters to narrow down options

### Step 3: Purchase/Start Quest
1. Tap a quest to see details
2. For paid quests, complete checkout
3. For free quests, tap "Start Quest"

### Step 4: Play!
1. Navigate to the first waypoint
2. Listen to/read the scene narration
3. Answer questions to progress
4. Continue to each waypoint
5. Complete the quest and leave a review!

---

## API Endpoints

### Public
- `GET /api/quests/public` - List published quests
- `GET /api/quests/:id` - Get quest details
- `GET /api/reviews/quest/:questId` - Get quest reviews

### Authenticated
- `POST /api/users/auth/dev` - Dev login (body: { email, name })
- `GET /api/users/me` - Get current user
- `GET /api/quests/my` - Get my quests (writers)
- `POST /api/quests` - Create quest
- `PATCH /api/quests/:id` - Update quest
- `POST /api/quests/:id/publish` - Publish quest
- `POST /api/purchases` - Purchase/start quest
- `POST /api/reviews` - Submit review

---

## Environment Variables

### API (`apps/api/.env`)
```env
NODE_ENV=development
PORT=3001
DATABASE_URL="file:./dev.db"
JWT_SECRET=your-secret-key
DEV_AUTH_BYPASS=true
DEV_AUTH_EMAIL=your@email.com
CORS_ORIGINS=http://localhost:5173,http://localhost:8081
```

### Creator Station (`apps/creator-station/.env`)
```env
VITE_API_URL=http://localhost:3001/api
```

### Mobile (`apps/mobile/.env`)
```env
EXPO_PUBLIC_API_URL=http://localhost:3001/api
```

---

## Database Commands

```bash
# View database in browser
pnpm api:db:studio

# Push schema changes
pnpm api:db:push

# Reset database
rm apps/api/prisma/dev.db
pnpm api:db:push
```

---

## Production Deployment

### API
1. Set up PostgreSQL database
2. Update `DATABASE_URL` to PostgreSQL connection string
3. Change `provider = "sqlite"` to `provider = "postgresql"` in schema.prisma
4. Deploy to Railway, Render, or Fly.io

### Creator Station
1. Build: `pnpm --filter @urban-quest/creator-station build`
2. Deploy `dist/` to Netlify, Vercel, or Cloudflare Pages

### Mobile
1. Configure app.json with your bundle IDs
2. Build with EAS: `eas build --platform all`
3. Submit to App Store and Google Play

---

## Troubleshooting

### API won't start
- Check if port 3001 is in use: `lsof -i :3001`
- Verify DATABASE_URL is correct
- Run `pnpm api:db:push` to ensure schema is synced

### Mobile can't connect to API
- Ensure API is running
- Check EXPO_PUBLIC_API_URL matches your network IP
- For physical devices, use your computer's local IP instead of localhost

### Auth not working
- Verify DEV_AUTH_BYPASS=true in development
- Check JWT_SECRET is set
- Clear browser cookies/app storage and retry

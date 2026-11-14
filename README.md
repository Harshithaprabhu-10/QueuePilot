# QueuePilot

A queue management system for counters, clinics and service desks. Managers create queues, issue numbered tokens, call the next person, and show a live airport-style board to the waiting room.

**Stack:** React + Vite · Tailwind CSS · Node + Express · MongoDB Atlas + Mongoose · JWT + bcrypt · Recharts · Lucide

## Live Demo

- **Frontend:** https://queue-pilot-psi.vercel.app
- **Backend API:** https://queuepilot-kp1u.onrender.com

## 🔐 Demo Login

- **Email:** demo@queuepilot.com
- **Password:** demo1234

## Quick start

You need Node.js 18+ and a free MongoDB Atlas cluster.

### 1. Get your MongoDB Atlas connection string
1. In Atlas: **Database → Connect → Drivers** and copy the `mongodb+srv://…` string.
2. **Network Access → Add IP Address** (use "Allow access from anywhere" for local development).
3. **Database Access** must contain a database user. Replace `<password>` in the string with that user's password.

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env        
```
Open `backend/.env` and set `MONGODB_URI` (your Atlas string) and `JWT_SECRET` (any long random text). Then:
```bash
npm run seed                # Creates Demo data
npm run dev                 # API on http://localhost:500
```

### 3. Frontend (second terminal)
```bash
cd frontend
npm install
npm run dev                 # App on http://localhost:5173
```
Open http://localhost:5173. In development, Vite proxies `/api` to the backend, so no extra config is needed.

### Demo login
After `npm run seed`: **demo@queuepilot.com / demo1234**. It creates two queues with a week of history so the charts have data. Or just click **Create a manager account** on the login page.

### Try the live display
Open **My queues → Display** on any queue (opens `/display/<queueId>`). It needs no login, refreshes every 3 seconds and is meant for a wall screen. Keep it open next to the manager view, then add people and press **Call next**.

## Features
- Manager registration, login, protected routes, logout (JWT, bcrypt-hashed passwords)
- Multiple queues per manager, each with a counter label and token prefix (e.g. `P-014`)
- Add people, auto-generated unique token numbers, position and creation time
- Move tokens up/down, call next, complete, cancel, full token history with filters and pagination
- Dashboard: tokens today, waiting, serving, completed, cancelled, average wait, plus three charts
- Public live display board (dark, airport-departure style)

## Project structure
```
queuepilot/
  backend/
    server.js            Express app + Mongo connection
    models/              User, Queue, Token (Mongoose)
    routes/              auth, queues, tokens, analytics, public
    middleware/          JWT auth, error handling
    scripts/seed.js      Demo data
  frontend/
    src/pages/           Login, Register, Dashboard, Queues, QueueDetail, History, Display
    src/components/      Layout, ProtectedRoute, AuthShell, shared UI
    src/context/         Auth + toast providers
    src/lib/api.js       Single API client used by every page
```

## API reference
All routes are under `/api`. Everything except `/auth/register`, `/auth/login` and `/public/*` needs `Authorization: Bearer <jwt>`.

| Method | Route | Purpose |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | Create account / sign in, returns `{ token, user }` |
| GET | `/auth/me` | Current user |
| GET, POST | `/queues` | List / create queues |
| GET, PATCH, DELETE | `/queues/:id` | Read / update / delete one queue |
| GET, POST | `/queues/:id/tokens` | List waiting+serving tokens (`?status=` to change) / add a person |
| POST | `/queues/:id/call-next` | Move the first waiting token to serving |
| PATCH | `/tokens/:id/move` | Body `{ "direction": "up" \| "down" }` |
| PATCH | `/tokens/:id/complete` | Serving → completed |
| PATCH | `/tokens/:id/cancel` | Waiting or serving → cancelled |
| GET | `/tokens/history` | `?queueId&status&search&page&limit` |
| GET | `/analytics` | Dashboard numbers and chart data, optional `?queueId=` |
| GET | `/public/queues/:id` | Read-only data for the live display |

## Design decisions (good interview talking points)
- **Unique token numbers:** each queue holds a `lastNumber` counter incremented with an atomic `$inc`. A unique compound index on `(queue, number)` is a second safety net.
- **Ordering:** each token has an `order` value (equal to its number when created). Moving up/down swaps `order` with the adjacent waiting token. Position is computed from sort order, so no renumbering is needed.
- **Call next is atomic:** one `findOneAndUpdate` sorted by `order`, so two simultaneous clicks cannot call the same token.
- **Ownership:** every queue query filters by `owner`, and tokens carry the `owner` too, so a manager can never read or change another manager's data (other managers get a 404).
- **Analytics come from real data:** the average wait is `calledAt - createdAt`. The queue-length trend is rebuilt from each token's `createdAt` and `leftWaitingAt`. Daily activity uses created, completed and cancelled timestamps.
- **Public display privacy:** the public endpoint returns only token codes and first names.
- **Polling:** the display polls every 3 seconds, the queue page every 5 and the dashboard every 15. WebSockets would be the next step for true push updates.

## Production build
```bash
cd frontend && npm run build    # outputs frontend/dist
```
Set `VITE_API_URL` to your deployed API's origin before building, and set `CLIENT_URL` in the backend `.env` to the frontend's URL so CORS allows it.

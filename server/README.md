# QuickDine Server

The backend (API) for QuickDine, built with **Node.js, Express, MongoDB (Mongoose) and TypeScript**.
It lives in this `server/` folder, completely separate from the React app in `../src`.

> **Status: Step 1 of 7.** Right now the server has the database connection, the data models,
> a seed script and a health-check endpoint. Login, restaurants, bookings, owner and admin
> endpoints are added in the next steps.

## What you need

- **Node.js 20 or newer** (`node -v` to check)
- A free **MongoDB Atlas** account

## 1. Create your free database (MongoDB Atlas)

1. Sign in at <https://www.mongodb.com/cloud/atlas> and create a **free (M0)** cluster.
2. **Database Access** → *Add New Database User*. Pick a username and a password and remember both.
3. **Network Access** → *Add IP Address*. For development choose *Allow access from anywhere*
   (`0.0.0.0/0`). Tighten this when you deploy.
4. **Database** → *Connect* → *Drivers* → copy the connection string. It looks like
   `mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`
5. Add the database name `quickdine` after `.net/`:
   `…mongodb.net/quickdine?retryWrites=true&w=majority`

> If your password contains special characters such as `@ : / ? # %`, they must be URL-encoded
> (for example `@` becomes `%40`). The easiest fix is to use a password made only of letters and numbers.

## 2. Install and configure

```bash
cd server
npm install
cp .env.example .env        # on Windows PowerShell: copy .env.example .env
```

Open the new `.env` file and fill in:

| Setting | What to put |
|---|---|
| `MONGODB_URI` | The connection string from step 1 (with your real username and password) |
| `JWT_SECRET` | A long random text. Generate one with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `SEED_ADMIN_PASSWORD`, `SEED_OWNER_PASSWORD`, `SEED_USER_PASSWORD` | Passwords (8+ characters) for the demo accounts |

Everything else has a sensible default. **Never commit `.env` or share it**: it holds your secrets.
It is already listed in `.gitignore`.

## 3. Add the demo data

```bash
npm run seed
```

This creates one admin, one demo diner, 8 restaurant owners and your 8 sample restaurants.
It is safe to run again; it only adds what is missing and never overwrites anything.

Demo logins (passwords are the `SEED_*` values from your `.env`):

| Role | Email |
|---|---|
| Admin | `admin@quickdine.example` (or your `SEED_ADMIN_EMAIL`) |
| Diner | `diner@quickdine.example` |
| Owners | `owner001@quickdine.example` … `owner008@quickdine.example` |

To wipe **everything** and start over: `npm run seed:reset` (it asks you to type the database name first).

## 4. Start the server

```bash
npm run dev
```

You should see:

```
✅ MongoDB connected (database: quickdine)
🚀 QuickDine API running at http://localhost:5000/api (development)
```

Check it in your browser or terminal:

```bash
curl http://localhost:5000/api/health
# {"success":true,"status":"ok","database":"connected", ...}
```

`npm run dev` restarts automatically whenever you save a file. Stop it with `Ctrl + C`.

## 5. Look at your data

In Atlas: **Database → Browse Collections → quickdine**. You will see `users`, `restaurants`,
`bookings` and `slotinventories`. Passwords are stored as long scrambled hashes beginning with `$2b$`,
never as readable text.

## Running the checks

| Command | What it does |
|---|---|
| `npm run typecheck` | Checks all TypeScript for mistakes without running anything |
| `npm test` | Runs the automated tests that don't need a database (36 checks) |
| `npm run build` | Compiles TypeScript into the `dist/` folder |
| `npm start` | Runs the compiled server (what a hosting service would use) |

**Tests that use a real database** (12 more for models, plus 8 for the seed script) are skipped unless you
point them at a MongoDB. They create a temporary database named `quickdine_test_…` and delete it afterwards,
so your real data is never touched:

```bash
# macOS / Linux
TEST_MONGODB_URI="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net" npm test

# Windows PowerShell
$env:TEST_MONGODB_URI="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net"; npm test
```

Use the connection string **without** a database name at the end.

## Folder map

```
server/
├── .env.example          Template for your private settings (copy to .env)
├── src/
│   ├── server.ts         Starts everything: connect to database, then listen for requests
│   ├── app.ts            Builds the Express app: security headers, CORS, JSON, routes, errors
│   ├── config/           Settings (env.ts), database connection (db.ts), shared rules (constants.ts)
│   ├── models/           What we store: User, Restaurant, Booking, SlotInventory
│   ├── middleware/       errorHandler.ts (one consistent error format), validate.ts (input checking)
│   ├── utils/            Small helpers: ApiError, slugify, bookingId, zodErrors
│   └── seed/             Demo data + the seed script
└── tests/                Automated checks
```

## Troubleshooting

| You see | Meaning / fix |
|---|---|
| `MONGODB_URI still contains a <placeholder>` | You haven't replaced `<username>`, `<password>`, `<cluster>` in `.env` |
| `Could not connect to MongoDB … ENOTFOUND` | Typo in the cluster address, or no internet |
| `Could not connect to MongoDB … Server selection timed out` | Your IP isn't allowed: Atlas → Network Access |
| `bad auth : authentication failed` | Wrong database username/password (check URL-encoding) |
| `Port 5000 is already in use` | Another program uses it; change `PORT` in `.env` |
| `The seed script needs these values` | Add the `SEED_*` entries to `.env` |

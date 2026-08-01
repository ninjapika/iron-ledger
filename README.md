# Iron Ledger

A private strength, cardio, and program tracker — built for a home setup
with adjustable dumbbells, a barbell, an EZ curl bar, and a resistance band,
with DAREBEE program import and a from-scratch program builder.

This is a single-owner app: whoever signs up first becomes the only account
that can ever exist on a given instance. There's no multi-user support and
none is planned — that's by design.

---

## Part 1 — Try it on your Windows laptop first

You don't need Docker for the app itself here — just for a disposable
Postgres instance. Next.js runs natively so you get hot reload.

### Prerequisites

- **Node.js 22 LTS** — https://nodejs.org (22.6+ is the real minimum; the
  scripts below use `node --env-file`, which needs it)
- **Docker Desktop** — https://www.docker.com/products/docker-desktop/
  (just for Postgres; make sure it's actually running before the next step)

### Setup

Open PowerShell in the project folder:

```powershell
npm install

# Starts a throwaway Postgres container on localhost:5432
docker compose -f docker-compose.dev.yml up -d

# Copy the env template, then open .env and fill in SESSION_SECRET
copy .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# paste that output as SESSION_SECRET= in .env

# Create all the tables
npm run db:push

# Populate the shared exercise catalog (dumbbell/barbell/EZ-bar/band/etc.)
npm run db:seed

# Verify everything actually works end-to-end against the real database
npm run smoke-test
```

`smoke-test` runs about 20 real checks — password hashing, session tokens,
a full signup transaction, workout logging, both program formats, cardio
linked to a program, body metrics, and cascade deletes. If that prints
**"All smoke tests passed."** the data layer is solid.

### Run it

```powershell
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/signup` since no
account exists yet. Fill in the wizard (your dumbbell range, barbell
weight, plates, EZ bar weight — the band defaults to 40–60kg already).

### Things worth actually testing before you deploy

- Log a live workout: add a few exercises, log sets, let the rest timer
  run down and confirm the beep/vibration fires
- Log a completed workout after the fact
- Build a custom program, then start a workout from one of its days
- **DAREBEE import** — this needs a real key. Get a free one at
  https://aistudio.google.com/apikey, put it in `GEMINI_API_KEY` in `.env`,
  restart `npm run dev`, and upload an actual program PDF. Extraction
  quality depends on how the PDF is laid out — if it mis-reads something,
  tell me what it got wrong and I'll adjust the prompt.
- Log a cardio session and a body-metric entry, check they show up on
  the dashboard charts
- Try each theme preset and the auto-rotate toggle in Settings
- Resize the browser down to a phone width — check the bottom nav and
  the "More" sheet

`npm run db:studio` opens Drizzle's Studio UI in the browser if you want to
poke at the raw data directly at any point.

### Resetting local data

```powershell
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
npm run db:push
npm run db:seed
```

---

## Part 2 — Deploying to your Oracle Cloud VPS

This runs as its own Docker Compose project with its own Postgres
container — nothing here shares a process, port, or database with Muskaan
Travels on the same VM.

### 1. Get the code onto the VPS

Copy the whole project folder over (scp, git, whatever you'd normally do),
landing it somewhere like `/opt/iron-ledger`.

### 2. Configure environment

```bash
cd /opt/iron-ledger
cp .env.example .env
nano .env
```

Fill in:
- `POSTGRES_PASSWORD` — a real random value
- `SESSION_SECRET` — `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- `GEMINI_API_KEY` — your key from https://aistudio.google.com/apikey
- Leave `DATABASE_URL` alone — `docker-compose.yml` builds it automatically
  from `POSTGRES_PASSWORD` for the production container

### 3. Build and start

```bash
docker compose up -d --build
docker compose exec app node -e "console.log('container is alive')"
```

The app listens on `127.0.0.1:3101` only — not exposed to the internet
directly. Nginx handles that next.

### 4. Push the schema and seed the catalog

The production image deliberately drops devDependencies (including
drizzle-kit) to stay lean, so run this one-time step from a machine that
has Node + the project's node_modules — your own laptop works, or the VPS
host itself if Node is installed there:

```bash
# Temporarily allow a connection from outside the compose network:
#   add "ports: ['127.0.0.1:5432:5432']" under the postgres service in
#   docker-compose.yml, then `docker compose up -d postgres`
DATABASE_URL="postgresql://iron_ledger:<POSTGRES_PASSWORD>@<vps-ip>:5432/iron_ledger" npx drizzle-kit push
DATABASE_URL="postgresql://iron_ledger:<POSTGRES_PASSWORD>@<vps-ip>:5432/iron_ledger" node --import tsx src/db/seed.ts
# then remove the port mapping again and `docker compose up -d postgres`
```

I've deliberately kept Postgres unpublished in the production compose file
— open the port back up only for this one-time setup, then close it.

### 5. Nginx + subdomain

1. Point a new subdomain (e.g. `tracker.yourdomain.com`) at the VPS in
   Cloudflare, same as you did for Muskaan Travels.
2. Copy `deploy/nginx-iron-ledger.conf` to
   `/etc/nginx/sites-available/iron-ledger.conf` on the VPS, and edit the
   `server_name` line to your real subdomain.
3. `ln -s /etc/nginx/sites-available/iron-ledger.conf /etc/nginx/sites-enabled/`
4. `nginx -t && systemctl reload nginx`
5. `certbot --nginx -d tracker.yourdomain.com` — this rewrites the file to
   add HTTPS. It only touches this one file, not Muskaan Travels' config.

### 6. Sign up

Visit your new subdomain and go through the signup wizard once. After
that, signup is locked — only login works, which is what you want for a
single-owner instance sitting on a public domain.

### Updating later

```bash
cd /opt/iron-ledger
git pull   # or however you sync new code
docker compose up -d --build
```

Schema changes (if I ever hand you an updated `schema.ts`) need
`drizzle-kit push` run again the same way as step 4.

### Backups

Settings → "Export all data (JSON)" gives you a full data dump anytime.
For the database itself:

```bash
docker compose exec postgres pg_dump -U iron_ledger iron_ledger > backup-$(date +%F).sql
```

---

## Project structure, if you want to poke around

```
src/
  app/(auth)/             login, signup
  app/(app)/              dashboard, log, programs, cardio, body, exercises, settings
  app/api/programs/parse  DAREBEE PDF -> Gemini -> structured JSON
  components/             ui primitives, charts, workout/program/cardio/body forms
  lib/actions/            server actions (the actual mutations)
  lib/data/                read-only query helpers for pages
  lib/auth/                password hashing, JWT sessions, current-user helper
  lib/ai/gemini.ts         the DAREBEE PDF parser
  db/schema.ts             the whole data model
scripts/smoke-test.ts      direct DB smoke test, no HTTP needed
deploy/                    Nginx config for the VPS
```

## Known rough edges / good next steps

- DAREBEE import review lets you edit day titles/type and remove bad days,
  but not individual exercise fields yet — worth adding if the AI
  extraction needs frequent per-exercise correction.
- No "sign out other devices" UI yet, though the DB has an audit table
  (`sessions`) ready for it.
- Progressive-overload suggestions ("try 22.5kg today") aren't built —
  mentioned as a nice-to-have earlier, straightforward to add on top of
  the existing 1RM-trend data.

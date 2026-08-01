# Deploying Iron Ledger

This supersedes the old "Part 2" deploy steps (the ones built around
`drizzle-kit push`) — everything below assumes the setup already described
in your server.md: its own Docker Compose project, its own Postgres
container, nothing shared with anything else on the VM. Nginx + subdomain +
HTTPS (server.md's steps 5–6) are unchanged and still apply after step 3
below.

The short version: **first deploy uses `deploy/setup.sh`. Every update after
that uses `deploy/patch.sh`.** Both build the app, run any pending database
migrations, and check the new version is actually healthy before it goes
live — if anything fails at any point, the site keeps running exactly as it
was, with no half-applied state left behind.

## First deploy

```bash
git clone <your-repo-url> /opt/iron-ledger   # or however you prefer to get the code on there
cd /opt/iron-ledger
cp .env.example .env
nano .env   # fill in POSTGRES_PASSWORD, SESSION_SECRET, GEMINI_API_KEY — see .env.example for how

./deploy/setup.sh
```

That builds the image, brings up Postgres, creates the schema, starts the
app, and waits for it to report healthy. From here:

1. Seed the exercise catalog (one-time). The production image drops
   devDependencies (including tsx) to stay lean, so run this from a
   machine with Node + this repo's node_modules — your laptop works, or
   the VPS itself if it has Node installed outside Docker too:
   ```bash
   DATABASE_URL="postgresql://iron_ledger:<POSTGRES_PASSWORD>@<vps-ip>:5432/iron_ledger" node --import tsx src/db/seed.ts
   ```
   Same "temporarily open port 5432, run this, close it again" dance as
   before — see server.md's original step 4 for the exact port-opening
   instructions, they're unchanged.
2. Nginx + subdomain + HTTPS — server.md steps 5–6, unchanged.
3. Visit your subdomain and go through the signup wizard once. Signup locks
   after that, same as before.

## Every update after that: `deploy/patch.sh`

```bash
cd /opt/iron-ledger
deploy/patch.sh
```

This deploys whatever's newest on `origin/main`. To deploy something
specific (a tag, a branch, a particular commit):

```bash
deploy/patch.sh v1.4.0
deploy/patch.sh a1b2c3d
```

What it actually does, in order, stopping immediately if any step fails:

1. **Builds** the new commit into a tagged Docker image
   (`iron-ledger:<sha>`). This alone catches anything that doesn't compile
   or type-check — no database needed for this step at all.
2. **Backs up the database** (a plain `pg_dump`) before touching anything,
   into `deploy/backups/`.
3. **Applies any pending migrations.** Most patches — UI tweaks, new
   features on existing tables — have none, so this is a no-op for those.
   When there is a schema change, it runs once, tracked, non-interactively.
4. **Health-checks the new version** on an internal-only port (3102),
   side-by-side with the still-live old version on the real port (3101).
   The live site is never interrupted by a candidate that turns out to be
   broken.
5. Only if all of that passed: **cuts over** — points the real port at the
   new image and restarts. Checks health once more immediately after; if
   that somehow still fails, it automatically flips back to the previous
   image and reports what happened.

If it stops at step 1 or 2, nothing was ever touched — the site was never
at risk. If it stops at step 3, the live app is untouched but the database
may be partially migrated; the script tells you exactly which backup file
to look at. Steps 4–5 never put a broken version in front of real traffic.

## Rolling back

```bash
deploy/rollback.sh                  # back to whatever was live before the current release
deploy/rollback.sh a1b2c3d          # back to a specific earlier commit
```

This just re-points the running container at a previously-built image and
restarts — no rebuild needed unless that image has since been pruned
locally (kept: the last 5 releases).

Rolling back the **code** never touches the database by itself — a schema
migration isn't automatically undone (that's a much harder problem, and
usually unnecessary since most patches don't touch the schema at all). If a
specific patch's migration really does need undoing, restore the backup
`deploy/patch.sh` took right before running it:

```bash
deploy/rollback.sh a1b2c3d --restore-db deploy/backups/pre-a1b2c3d-20260729120000.sql
```

This asks for an explicit typed confirmation before running, since it
discards any real data logged after that backup.

## Files this adds

```
deploy/setup.sh      first-time deploy
deploy/patch.sh      every update after that
deploy/rollback.sh   undo
deploy/lib.sh        shared helpers, not run directly
deploy/.current-release    the sha currently live (maintained by the scripts)
deploy/.release-history    append-only log of every sha that's been live
deploy/backups/      pg_dump snapshots taken automatically before each migration
scripts/migrate.ts   non-interactive migration runner (drizzle-kit push needs
                     an interactive terminal, which doesn't work from a script)
drizzle/             versioned SQL migrations (replaces ad hoc `drizzle-kit push`)
src/app/api/health    what the scripts above poll to decide "is this working"
```

`docker-compose.yml`'s `app` service now references `image:
iron-ledger:${IMAGE_TAG}` instead of `build: .` — the scripts above manage
building and tagging; compose just runs whichever tag is currently set.

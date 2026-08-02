# How patches for this project get made and applied

This file is context for whoever (human or AI) is asked to change something
in Iron Ledger and turn it into something that can be deployed. Read it
before proposing a change that's meant to reach production.

## The shape of a change request

The maintainer self-hosts this app (Docker Compose, `git`-based deploys —
see `DEPLOY.md`) and typically brings changes as a plain-language request
("the X screen looks wrong", "Y button doesn't do Z") rather than a ticket
with file names. Producing a patch means:

1. **Find the actual file(s).** Don't guess from the request wording alone —
   grep for the visible text/component name, confirm which route renders it
   (check `src/app/**/page.tsx` for the route, trace into the component it
   renders), and read the whole component before editing.
2. **Make the smallest change that fixes the actual thing asked**, not a
   surrounding refactor. If you notice something else that's broken while
   you're in there, mention it — don't fix it unasked in the same patch.
3. **Verify before handing anything back**, every time, no exceptions:
   ```bash
   npx tsc --noEmit
   npx eslint src          # must be clean — `next build` fails the whole
                            # deploy on ANY lint error anywhere in src, not
                            # just the file you touched
   npx next build           # full build; needs a throwaway .env — see below
   ```
   A throwaway `.env` for build verification only (never a real one):
   ```bash
   cat > .env << 'ENVEOF'
   DATABASE_URL="postgresql://iron_ledger:devpassword@localhost:5432/iron_ledger_dev"
   SESSION_SECRET="dGVzdC1zZXNzaW9uLXNlY3JldC1mb3ItYnVpbGQtdmVyaWZpY2F0aW9uLW9ubHk="
   SESSION_DURATION_DAYS=30
   ENVEOF
   npx next build
   rm -f .env tsconfig.tsbuildinfo
   ```
   All 21+ routes should build as `ƒ (Dynamic)` with no live DB needed at
   build time — if the build tries to actually hit a database, something's
   wrong with the change, not the verification setup.

## Producing the patch itself

- Deliver a **`git apply`-compatible unified diff** (`a/... b/...` prefixes),
  not prose describing the change or a narrated list of edits.
- Diff against a **fresh, current copy of the project** — never an old
  upload from earlier in the conversation. Drift between what you diffed
  against and what's actually on the server is the single most common
  failure mode (`error: patch does not apply`, silently, on every file in
  the patch, not just the changed one). If there's any doubt the copy you
  have is current, ask for a fresh export before generating anything.
- **Self-test the patch** before delivering it: apply it to a pristine copy
  of the same baseline you diffed from and confirm it applies cleanly and
  produces the intended result, byte for byte. Don't hand over a patch
  that hasn't been applied and verified at least once already.
- If more than a handful of files changed, or you're not confident the
  diff will apply cleanly (e.g. the baseline is uncertain), give the
  complete fixed file(s) instead of a diff — full-file replacement doesn't
  depend on matching surrounding context and can't fail to apply.

## Applying a patch on the server

```bash
cd /opt/iron-ledger
git status                      # must be clean — deploy/patch.sh refuses
                                 # to run otherwise anyway, so resolve any
                                 # local drift before going further

nano the-patch.patch            # paste the patch content in, save

git apply --check the-patch.patch && git apply the-patch.patch
git diff --stat                 # sanity check: does this match what was
                                 # actually asked for, nothing more?

git add -A
git commit -m "..."
git push                        # origin is GitHub — deploy/patch.sh fetches
                                 # from origin, not from local working state,
                                 # so nothing reaches production without
                                 # this step

deploy/patch.sh
```

`deploy/patch.sh` does a `git fetch` + `git checkout` of whatever's on
`origin/main` and rebuilds from that — it never looks at local uncommitted
edits. A patch sitting applied-but-uncommitted, or committed-but-unpushed,
deploys nothing.

## Things worth knowing before touching this project

- **The Postgres data (all logged workouts, accounts, sessions) lives in a
  Docker-managed named volume**, completely separate from this folder.
  Deleting/recreating the `/opt/iron-ledger` folder is safe for that data —
  `docker compose down -v` is not (that flag deletes the volume). The
  volume's actual name is derived from this directory's name, so keep the
  folder at this exact path if it's ever recreated, or a fresh, empty
  volume gets created instead and the existing data becomes invisible to
  the app (not deleted, just orphaned).
- **Sessions are stored server-side** in a `sessions` table (a hash of the
  token, not the raw thing), so staying logged in across a deploy depends
  on the database volume being intact — not on `.env` matching.
- **Nginx (HTTPS, the public domain) lives outside this repo** and proxies
  to `127.0.0.1:3101`. As long as `docker-compose.yml`'s port mapping
  doesn't change, deploys never need to touch Nginx.
- **Every `.rounded-theme` element also gets a per-theme `clip-path`**
  (see `globals.css`) for some themes' angular cut-corner look. Anything
  absolutely-positioned (dropdowns, popovers, tooltips) rendered *inside*
  one of those elements will get silently clipped the moment it overflows
  the element's box — portal it to `document.body` instead (see
  `ExercisePicker` in `src/components/workout/exercise-picker.tsx` for the
  pattern) rather than relying on `position: absolute` inside a themed
  container.

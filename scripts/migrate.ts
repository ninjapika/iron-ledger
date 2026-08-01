// Applies any pending SQL migrations in ./drizzle, non-interactively.
//
// This exists because `drizzle-kit push` — what the app used during early
// development — always shows an interactive "apply these changes?" prompt,
// even for a plain additive change, with no flag that skips it. That's
// fine by hand, but it can't run unattended from a deploy script. This
// script uses drizzle-orm's own `migrate()` helper instead: it tracks which
// migrations have already been applied (in a `__drizzle_migrations` table
// it manages itself) and only runs whatever's new, with no prompts.
//
// Safe to run any number of times — already-applied migrations are skipped.
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  console.log("Applying pending migrations from ./drizzle ...");
  const startedAt = Date.now();
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log(`Done in ${Date.now() - startedAt}ms.`);

  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

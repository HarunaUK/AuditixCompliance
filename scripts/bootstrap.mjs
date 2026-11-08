/**
 * Boot sequence for a hosted database (Render, Fly, Railway…).
 *
 * The schema is synced with `prisma db push` rather than `migrate deploy`. The
 * schema was evolving through `db push` during development, so the old
 * migration files fell behind it and a fresh deploy created tables without the
 * newer columns (the seed then failed on `Framework.meta`). `db push` compares
 * the live database to `schema.prisma` and adds whatever is missing, which
 * repairs a drifted database instead of refusing to start. It is idempotent, so
 * it runs on every boot. `prisma/migrations` keeps a baseline for deliberate
 * `migrate` workflows.
 *
 * Seeding is not idempotent: `prisma/seed.ts` resets the demo workspaces, so it
 * only runs when the database has no users at all — the first boot against an
 * empty Postgres.
 *
 *   node scripts/bootstrap.mjs && next start
 *
 * The Prisma CLI and tsx are invoked through their package entry points rather
 * than `npx`, which keeps this working on Windows too (no npx.cmd resolution).
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";

function run(args) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
  if (result.error) {
    console.error(`[bootstrap] could not start node:`, result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[bootstrap] ${args.join(" ")} exited with ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

if (!process.env.DATABASE_URL) {
  console.error("[bootstrap] DATABASE_URL is not set — refusing to start.");
  process.exit(1);
}

run([
  "node_modules/prisma/build/index.js",
  "db",
  "push",
  "--skip-generate",
  "--accept-data-loss",
]);

const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient();
let users = 0;
try {
  users = await db.user.count();
} catch (error) {
  console.error("[bootstrap] could not query users:", error.message);
  await db.$disconnect();
  process.exit(1);
}
await db.$disconnect();

if (users === 0) {
  console.log("[bootstrap] empty database — seeding the demo workspace.");
  run(["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"]);
} else {
  console.log(`[bootstrap] ${users} existing users — skipping seed.`);
}

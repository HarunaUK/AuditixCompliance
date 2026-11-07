/**
 * Local supervisor for the Auditix demo.
 *
 * Two independent processes matter here: the Prisma dev Postgres daemon and the
 * Next server. Either one can die, and when the database is gone Next keeps
 * answering while every query stalls on a reconnect — which is what made clicks
 * feel like they hung. This supervisor starts both, waits until a real query
 * succeeds, and brings either one back if it disappears.
 *
 *   node scripts/serve.mjs          production build (fast)
 *   node scripts/serve.mjs --dev    next dev (hot reload, slower)
 */
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const DEV = args.has("--dev");
const ROOT = process.cwd();
const PORT = Number(process.env.AUDITIX_PORT ?? 8077);
const DB_PORT = 51214;
const DB_NAME = "auditix";

const prismaCli = path.join(ROOT, "node_modules", "prisma", "build", "index.js");
const nextCli = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

let app = null;
let stopping = false;
let dbFailures = 0;
let appFailures = 0;

function log(message) {
  console.log(`[auditix] ${message}`);
}

function portOpen(port, timeout = 1200) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

// One long-lived probe client: creating a PrismaClient per probe spun up a fresh
// query engine every ten seconds, which is background CPU churn for no reason.
let probeClient = null;
async function dbResponds() {
  if (!(await portOpen(DB_PORT))) return false;
  try {
    if (!probeClient) {
      const { PrismaClient } = await import("@prisma/client");
      probeClient = new PrismaClient({ log: [] });
    }
    await Promise.race([
      probeClient.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("db probe timeout")), 4000)),
    ]);
    return true;
  } catch {
    // The pool is pinned to a daemon that went away; drop it so we reconnect.
    await probeClient?.$disconnect().catch(() => undefined);
    probeClient = null;
    return false;
  }
}

function startDb() {
  // A wedged daemon still holds the port, so a plain start would fail with
  // EADDRINUSE and leave every query timing out. Stop the registered server
  // first, then hand the fresh one to its own background process: `prisma dev
  // start` keeps Postgres as a child of this process, which is why the database
  // used to die whenever the supervisor restarted.
  log("starting the Prisma dev database");
  spawnSync(process.execPath, [prismaCli, "dev", "stop", DB_NAME], {
    cwd: ROOT,
    stdio: "ignore",
    timeout: 20_000,
  });
  const child = spawn(
    process.execPath,
    [prismaCli, "dev", "-d", "-n", DB_NAME, "-P", String(DB_PORT)],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] },
  );
  child.stdout.on("data", () => {});
  child.stderr.on("data", (chunk) => {
    const text = String(chunk).trim();
    if (text && !text.includes("deprecated")) log(`database: ${text.split("\n")[0]}`);
  });
  child.on("exit", (code) => {
    if (code !== 0 && !stopping) log(`database start command exited (${code ?? "signal"})`);
  });
}

async function ensureDb() {
  if (await dbResponds()) return true;

  // Starting can lose a race with a lock file left by a stopping daemon, so a
  // failed attempt is retried rather than leaving the app without a database.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    startDb();
    const up = await waitFor(() => portOpen(DB_PORT), "the database port", 60_000, 1000);
    if (up && (await waitFor(dbResponds, "a working database connection", 45_000))) return true;
    log(`database did not come up (attempt ${attempt} of 3)`);
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }
  return false;
}

function startApp() {
  if (app && app.exitCode === null) return;
  const command = DEV ? "dev" : "start";
  log(`starting next ${command} on port ${PORT}`);
  app = spawn(process.execPath, [nextCli, command, "-p", String(PORT)], {
    cwd: ROOT,
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, PORT: String(PORT) },
  });
  app.on("exit", (code) => {
    app = null;
    if (!stopping) log(`app process exited (${code ?? "signal"})`);
  });
}

async function appResponds() {
  try {
    const response = await fetch(`http://127.0.0.1:${PORT}/login`, { signal: AbortSignal.timeout(2500) });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * A 200 here means the page server, the Prisma engine and the database are all
 * warm. Without it the first visitor after a restart waits on engine startup.
 */
async function appWarm() {
  try {
    const response = await fetch(`http://127.0.0.1:${PORT}/api/v1/health`, { signal: AbortSignal.timeout(8000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitFor(check, label, timeoutMs, intervalMs = 800) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  log(`timed out waiting for ${label}`);
  return false;
}

async function main() {
  await ensureDb();
  startApp();
  await waitFor(appResponds, "the app", 90_000);
  await waitFor(appWarm, "a warm database from the app", 60_000);

  log("ready on http://127.0.0.1:" + PORT);

  setInterval(async () => {
    if (stopping) return;

    const healthy = await dbResponds();
    dbFailures = healthy ? 0 : dbFailures + 1;
    if (dbFailures >= 1) {
      log("database is not answering queries — bringing it back");
      dbFailures = 0;
      await ensureDb();
      // Re-establish the app's pool before anyone clicks.
      await waitFor(appWarm, "a warm database from the app", 40_000);
      log("database is responding again");
    }

    if (!(await portOpen(PORT))) {
      appFailures += 1;
      if (appFailures >= 2) {
        log("app is not listening — restarting it");
        appFailures = 0;
        startApp();
      }
    } else {
      appFailures = 0;
    }
  }, 10_000);
}

function shutdown(signal) {
  stopping = true;
  log(`received ${signal}, shutting down`);
  app?.kill();
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

main().catch((error) => {
  console.error("[auditix] supervisor failed", error);
  process.exit(1);
});

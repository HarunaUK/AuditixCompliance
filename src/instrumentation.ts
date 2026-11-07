/**
 * Warm the database connection pool when the server starts.
 *
 * The local Prisma Postgres server can take several seconds to accept its first
 * connection after boot. Without this, that cost lands on the first visitor's
 * sign-in. Retry briefly, then give up without blocking server startup.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  void (async () => {
    const { db } = await import("./lib/db");
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        await db.$queryRaw`SELECT 1`;
        return;
      } catch (error) {
        if (attempt === 9) {
          console.error("database_warmup_failed", error);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  })();
}

/**
 * Launch `next start` on a port we resolve ourselves.
 *
 * Hosts pass the listening port through the PORT variable, but some of them
 * define it as an empty string rather than leaving it unset. Next forwards
 * PORT straight into its `-p` flag, so an empty value makes it exit with
 * "value '' from env 'PORT' is invalid". Resolving the number here keeps a
 * blank or missing PORT from taking the service down.
 *
 *   PORT=1000  node scripts/start.mjs   -> 1000
 *   PORT=""    node scripts/start.mjs   -> 8077
 *   (unset)    node scripts/start.mjs   -> 8077
 */
import { spawn } from "node:child_process";
import path from "node:path";

const FALLBACK_PORT = 8077;

function resolvePort() {
  for (const candidate of [process.env.PORT, process.env.AUDITIX_PORT]) {
    const value = Number(String(candidate ?? "").trim());
    if (Number.isInteger(value) && value > 0 && value <= 65535) return value;
  }
  return FALLBACK_PORT;
}

const port = resolvePort();
// Bind every interface. Never use HOSTNAME here: containers (Render included)
// set it to the pod's own hostname, and binding to that name makes the proxy
// unreachable with a 502 even though Next reports "Ready".
const host = process.env.HOST?.trim() || "0.0.0.0";
const nextCli = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

console.log(`[auditix] starting next on ${host}:${port}`);

const child = spawn(process.execPath, [nextCli, "start", "-p", String(port), "-H", host], {
  stdio: "inherit",
  env: { ...process.env, PORT: String(port) },
});

const forward = (signal) => {
  if (!child.killed) child.kill(signal);
};
process.on("SIGTERM", () => forward("SIGTERM"));
process.on("SIGINT", () => forward("SIGINT"));

child.on("exit", (code, signal) => {
  if (signal) {
    console.log(`[auditix] next stopped by ${signal}`);
    process.exit(0);
  }
  process.exit(code ?? 0);
});

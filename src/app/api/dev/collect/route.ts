import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const name = new URL(request.url).searchParams.get("name") ?? "payload";
  const body = await request.text();
  const dir = path.join(process.cwd(), ".data", "ingest");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${name.replaceAll(/[^a-z0-9_-]/gi, "")}.json`), body, "utf8");
  return NextResponse.json({ ok: true, bytes: body.length });
}

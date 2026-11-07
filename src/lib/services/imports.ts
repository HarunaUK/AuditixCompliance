import "server-only";
import { db } from "@/lib/db";
import { recordActivity } from "@/lib/services/activity";
import { normaliseHeader, parseCsv, toRecord } from "@/lib/csv";
import { createPolicy } from "@/lib/services/policies";
import { createRisk } from "@/lib/services/risks";

/**
 * CSV imports for the two registers people keep spreadsheets of.
 *
 * Imported policies land as DRAFT because approval is a human act and must stay
 * in the audit trail. Imported risks are scored from likelihood × impact like
 * any other risk, and invalid rows are reported back instead of being dropped.
 */

export const MAX_IMPORT_ROWS = 300;
const MAX_TEXT_BYTES = 2 * 1024 * 1024;

export type ImportOutcome = { error: string; issues?: string[] } | { imported: number; issues: string[] };

export type ImportActor = { id: string; name: string };

const clean = (value: string | undefined) => (value ?? "").trim();

function readRows(text: string): { header: string[]; body: string[][] } | { error: string } {
  if (text.length > MAX_TEXT_BYTES) return { error: "That file is larger than 2 MB. Split it and try again." };

  const rows = parseCsv(text);
  if (rows.length < 2) return { error: "No data rows found — the first row must be the column headings." };

  const header = rows[0];
  if (!header.map(normaliseHeader).includes("title")) {
    return { error: "The file needs a “Title” column. Download the template to see the expected headings." };
  }

  const body = rows.slice(1);
  if (body.length > MAX_IMPORT_ROWS) {
    return { error: `Import up to ${MAX_IMPORT_ROWS} rows at a time (this file has ${body.length}).` };
  }

  return { header, body };
}

async function memberIdsByEmail(workspaceId: string) {
  const members = await db.workspaceMember.findMany({
    where: { workspaceId },
    select: { userId: true, user: { select: { email: true } } },
  });
  return new Map(members.map((member) => [member.user.email.toLowerCase(), member.userId]));
}

const TREATMENTS = ["MITIGATE", "ACCEPT", "TRANSFER", "AVOID"] as const;
const RISK_STATUSES = ["OPEN", "MONITORING", "MITIGATED", "CLOSED"] as const;

function pick<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export async function importPoliciesCsv(
  workspaceId: string,
  actor: ImportActor,
  text: string,
): Promise<ImportOutcome> {
  const parsed = readRows(text);
  if ("error" in parsed) return { error: parsed.error };

  let imported = 0;
  const issues: string[] = [];

  for (const [index, row] of parsed.body.entries()) {
    const record = toRecord(parsed.header, row);
    const line = index + 2;
    const title = clean(record.get("title")).slice(0, 140);
    const content = clean(record.get("content"));

    if (title.length < 3) {
      issues.push(`Row ${line}: missing a title, skipped.`);
      continue;
    }
    if (content.length < 20) {
      issues.push(`Row ${line} (${title}): needs policy text of at least 20 characters, skipped.`);
      continue;
    }

    try {
      const policy = await createPolicy(workspaceId, actor.id, {
        title,
        category: clean(record.get("category")).slice(0, 60) || "General",
        summary: clean(record.get("summary")).slice(0, 240),
        content: content.slice(0, 80_000),
        reviewDueAt: clean(record.get("reviewdue")),
        controlIds: [],
      });
      await recordActivity({
        workspaceId,
        actor,
        action: "policy.imported",
        entityType: "Policy",
        entityId: policy.id,
        summary: `Imported policy “${policy.title}” from CSV`,
        detail: `${policy.category} · draft v${policy.version}`,
      });
      imported += 1;
    } catch {
      issues.push(`Row ${line} (${title}): could not be saved.`);
    }
  }

  if (imported === 0) return { error: issues[0] ?? "No rows could be imported.", issues: issues.slice(0, 8) };
  return { imported, issues: issues.slice(0, 8) };
}

export async function importRisksCsv(workspaceId: string, actor: ImportActor, text: string): Promise<ImportOutcome> {
  const parsed = readRows(text);
  if ("error" in parsed) return { error: parsed.error };

  const owners = await memberIdsByEmail(workspaceId);
  let imported = 0;
  const issues: string[] = [];

  for (const [index, row] of parsed.body.entries()) {
    const record = toRecord(parsed.header, row);
    const line = index + 2;
    const title = clean(record.get("title")).slice(0, 160);
    const description = clean(record.get("description"));

    if (title.length < 4) {
      issues.push(`Row ${line}: missing a risk title, skipped.`);
      continue;
    }
    if (description.length < 10) {
      issues.push(`Row ${line} (${title}): needs a description of at least 10 characters, skipped.`);
      continue;
    }

    const likelihood = Number(clean(record.get("likelihood")) || 3);
    const impact = Number(clean(record.get("impact")) || 3);
    const validScore =
      Number.isInteger(likelihood) &&
      likelihood >= 1 &&
      likelihood <= 5 &&
      Number.isInteger(impact) &&
      impact >= 1 &&
      impact <= 5;
    if (!validScore) {
      issues.push(`Row ${line} (${title}): likelihood and impact must be whole numbers from 1 to 5, skipped.`);
      continue;
    }

    const treatmentRaw = clean(record.get("treatment")).toUpperCase().replaceAll(" ", "_");
    const statusRaw = clean(record.get("status")).toUpperCase().replaceAll(" ", "_");
    const ownerEmail = clean(record.get("owneremail") || record.get("owner")).toLowerCase();
    const ownerId = (ownerEmail && owners.get(ownerEmail)) || actor.id;

    try {
      const risk = await createRisk(workspaceId, ownerId, {
        title,
        description: description.slice(0, 8_000),
        category: clean(record.get("category")).slice(0, 60) || "General",
        likelihood,
        impact,
        treatment: pick(treatmentRaw, TREATMENTS, "MITIGATE"),
        status: pick(statusRaw, RISK_STATUSES, "OPEN"),
        dueDate: clean(record.get("due")),
        ownerId,
        controlIds: [],
      });
      await recordActivity({
        workspaceId,
        actor,
        action: "risk.imported",
        entityType: "Risk",
        entityId: risk.id,
        summary: `Imported risk “${risk.title}” from CSV`,
        detail: `${risk.category} · score ${risk.score}`,
      });
      imported += 1;
    } catch {
      issues.push(`Row ${line} (${title}): could not be saved.`);
    }
  }

  if (imported === 0) return { error: issues[0] ?? "No rows could be imported.", issues: issues.slice(0, 8) };
  return { imported, issues: issues.slice(0, 8) };
}

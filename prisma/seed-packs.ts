import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const PACKS = [
  {
    key: "iso_42001",
    file: "iso_42001.json",
    name: "ISO/IEC 42001:2023",
    version: "2023",
    description: "AI management system — Annex A controls for the responsible development and use of AI.",
    meta: { short: "ISO 42001", region: "Global", accent: "violet" },
  },
  {
    key: "soc2",
    file: "soc2.json",
    name: "SOC 2 Trust Services Criteria",
    version: "2017 (2022 revisions)",
    description: "AICPA trust services criteria — security, availability, confidentiality, processing integrity and privacy.",
    meta: { short: "SOC 2", region: "United States", accent: "mint" },
  },
  {
    key: "nis2",
    file: "nis2.json",
    name: "NIS2 Directive",
    version: "EU 2022/2555",
    description:
      "Network and Information Security Directive 2 — organisation-facing obligations for essential and important entities: governance, the ten risk-management measures, incident reporting and registration.",
    meta: { short: "NIS2", region: "European Union", accent: "brand" },
  },
  {
    key: "gdpr",
    file: "gdpr.json",
    name: "GDPR",
    version: "EU 2016/679",
    description: "General Data Protection Regulation — obligations for controllers and processors of EU personal data.",
    meta: { short: "GDPR", region: "European Union", accent: "brand" },
  },
];

const SOC2_DOMAINS: Record<string, string> = {
  CC1: "Control environment",
  CC2: "Communication & information",
  CC3: "Risk assessment",
  CC4: "Monitoring activities",
  CC5: "Control activities",
  CC6: "Logical & physical access",
  CC7: "System operations",
  CC8: "Change management",
  CC9: "Risk mitigation",
  A1: "Availability",
  C1: "Confidentiality",
  PI1: "Processing integrity",
  P1: "Privacy",
};

type PackControl = { ref: string; title: string; desc: string; domain?: string; domainLabel?: string; iso?: string[] };

async function main() {
  for (const pack of PACKS) {
    const controls = JSON.parse(
      await readFile(path.join(process.cwd(), "prisma", "frameworks", pack.file), "utf8"),
    ) as PackControl[];
    const framework = await db.framework.upsert({
      where: { key: pack.key },
      update: { name: pack.name, version: pack.version, description: pack.description, meta: pack.meta },
      create: { key: pack.key, name: pack.name, version: pack.version, description: pack.description, meta: pack.meta },
    });
    for (const [index, control] of controls.entries()) {
      const category = control.domainLabel ?? (control.ref.startsWith("GDPR") ? "GDPR articles" : SOC2_DOMAINS[control.ref.split(".")[0]] ?? "General");
      const meta = { domain: control.domain ?? control.ref.split(".")[0], domainLabel: category, iso: control.iso ?? [] };
      await db.frameworkControl.upsert({
        where: { frameworkId_ref: { frameworkId: framework.id, ref: control.ref } },
        update: { title: control.title, description: control.desc, category, sortOrder: index, meta },
        create: { frameworkId: framework.id, ref: control.ref, title: control.title, description: control.desc, category, sortOrder: index, meta },
      });
    }
    console.log(`${pack.key}: ${controls.length} controls`);
  }
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});

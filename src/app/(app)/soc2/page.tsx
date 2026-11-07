import type { Metadata } from "next";
import { RegionOverview } from "@/components/frameworks/region-overview";

export const metadata: Metadata = { title: "SOC 2 overview" };
export const dynamic = "force-dynamic";

export default function Soc2OverviewPage() {
  return (
    <RegionOverview
      eyebrow="SOC 2"
      title="SOC 2 overview"
      description="The AICPA trust services criteria are an attestation framework: an independent auditor tests your controls over a period."
      intro="SOC 2 is not a certificate. Management asserts that controls are designed and operating, and the auditor reports on that assertion. The security criteria are mandatory; availability, confidentiality, processing integrity and privacy are added when they match customer commitments."
      facts={[
        { label: "Criteria", value: "5 categories", hint: "Security is always in scope" },
        { label: "Type I", value: "Point in time", hint: "Design at a single date" },
        { label: "Type II", value: "3–12 months", hint: "Operating effectiveness" },
      ]}
      sections={[
        {
          title: "What the auditor tests",
          body: "Evidence must show both design and operation, with samples across the audit period.",
          points: [
            "Control environment, governance and risk assessment.",
            "Access provisioning, review, removal and privileged access.",
            "Change management, testing and segregation of duties.",
            "Incident response, monitoring, backups and recovery tests.",
            "Vendor due diligence and contractual commitments.",
          ],
        },
        {
          title: "Choosing the scope",
          body: "Define the system boundary before writing controls, or evidence collection will sprawl.",
          points: [
            "Name the system, services, locations and supporting infrastructure.",
            "Map complementary subservice organisations and carve-outs.",
            "Select additional criteria only where customers rely on them.",
            "Agree the observation window with the auditor early.",
          ],
        },
        {
          title: "Running readiness",
          body: "A gap assessment six to eight weeks before the window prevents a failed sample.",
          points: [
            "Walk each criterion against the control pack and mark gaps.",
            "Collect one artifact per control per period, not a folder dump.",
            "Run an access review and a restore test while there is time to fix issues.",
            "Rehearse management assertions and subservice responsibilities.",
          ],
        },
      ]}
      packs={[
        { key: "soc2", label: "SOC 2 criteria", note: "Common criteria plus availability, confidentiality, integrity and privacy" },
        { key: "iso-27001-2022", label: "ISO/IEC 27001", note: "Reuse security control evidence" },
      ]}
    />
  );
}

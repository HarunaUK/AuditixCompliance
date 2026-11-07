import type { Metadata } from "next";
import { RegionOverview } from "@/components/frameworks/region-overview";

export const metadata: Metadata = { title: "Pakistan compliance overview" };
export const dynamic = "force-dynamic";

export default function PakistanOverviewPage() {
  return (
    <RegionOverview
      eyebrow="Pakistan"
      title="Pakistan overview"
      description="PTA cyber-security regulations, the Personal Data Protection Bill and sector frameworks from SBP and SECP."
      intro="Pakistan's regime combines telecom-sector regulation, draft data protection law and financial-sector technology risk rules. Regulators expect documented controls, local incident reporting and evidence of third-party oversight."
      facts={[
        { label: "Telecom", value: "PTA CTDISR", hint: "Cyber security regulations" },
        { label: "Privacy", value: "PDPB", hint: "Personal Data Protection Bill" },
        { label: "Banking", value: "SBP TRM", hint: "Technology risk management" },
      ]}
      sections={[
        {
          title: "PTA CTDISR",
          body: "Licensed telecom operators and service providers must implement a documented cyber security framework.",
          points: [
            "Appoint a security focal person and define responsibilities.",
            "Maintain asset, network and service inventories.",
            "Apply access control, logging, vulnerability management and patching.",
            "Report incidents to PTA within the prescribed timeline.",
          ],
        },
        {
          title: "Data protection",
          body: "The PDPB introduces consent, purpose limitation, security and breach duties for personal data.",
          points: [
            "Record lawful basis and purpose for each processing activity.",
            "Give individuals access, correction and deletion routes.",
            "Apply safeguards to cross-border transfers.",
            "Keep a breach register and notify the regulator where required.",
          ],
        },
        {
          title: "Financial sector",
          body: "SBP technology risk management and SECP guidance add resilience, outsourcing and audit expectations.",
          points: [
            "Board-approved technology risk strategy and tolerance.",
            "Business continuity and recovery testing evidence.",
            "Outsourcing due diligence and exit plans.",
            "Independent audit and remediation tracking.",
          ],
        },
      ]}
      packs={[
        { key: "iso-27001-2022", label: "ISO/IEC 27001", note: "Base control set for PTA, PDPB and SBP mapping" },
        { key: "iso_42001", label: "ISO/IEC 42001", note: "AI governance baseline" },
      ]}
    />
  );
}

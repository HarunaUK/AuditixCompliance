import type { Metadata } from "next";
import { RegionOverview } from "@/components/frameworks/region-overview";

export const metadata: Metadata = { title: "Singapore / APAC overview" };
export const dynamic = "force-dynamic";

export default function ApacOverviewPage() {
  return (
    <RegionOverview
      eyebrow="Singapore / APAC"
      title="APAC overview"
      description="Singapore's Cyber Essentials mark, PDPA and sector TRM requirements, plus Australian Essential Eight — one control set can carry them all."
      intro="APAC regulation is a patchwork: Singapore licenses cybersecurity service providers and protects personal data, Australia prescribes eight mitigation strategies, and sector regulators add their own technology risk rules. Map once and evidence per regime."
      facts={[
        { label: "Singapore", value: "CSA CE", hint: "Cyber Essentials mark" },
        { label: "Privacy", value: "PDPA", hint: "Singapore personal data" },
        { label: "Australia", value: "Essential 8", hint: "Eight mitigation strategies" },
      ]}
      sections={[
        {
          title: "Singapore Cyber Essentials",
          body: "The CSA mark is aimed at organisations starting their security journey and is assessed against five themes.",
          points: [
            "Asset inventory, with owners and business value.",
            "Secure configuration and patch management.",
            "Access control and multi-factor authentication.",
            "Malware protection and regular backups.",
            "Incident response and awareness training.",
          ],
        },
        {
          title: "PDPA and sector rules",
          body: "Privacy duties and technology-risk rules sit alongside the technical baseline.",
          points: [
            "Consent, purpose limitation, retention and access obligations.",
            "Data breach notification to PDPC and affected individuals.",
            "MAS TRM for financial institutions, including cyber resilience testing.",
            "Vendor and cloud arrangements with clear responsibility splits.",
          ],
        },
        {
          title: "Essential Eight discipline",
          body: "Australia's strategies are maturity-scored, so evidence must show the level actually operating.",
          points: [
            "Application control and patch applications within timeframes.",
            "Office macro and user application hardening settings.",
            "Restrict administrative privileges and patch operating systems.",
            "Multi-factor authentication and regular backup testing.",
          ],
        },
      ]}
      packs={[
        { key: "iso-27001-2022", label: "ISO/IEC 27001", note: "Shared evidence for CSA, PDPA and MAS TRM" },
        { key: "iso_42001", label: "ISO/IEC 42001", note: "AI governance for regional AI guidance" },
      ]}
    />
  );
}

import type { Metadata } from "next";
import { RegionOverview } from "@/components/frameworks/region-overview";

export const metadata: Metadata = { title: "Middle East compliance overview" };
export const dynamic = "force-dynamic";

export default function MiddleEastOverviewPage() {
  return (
    <RegionOverview
      eyebrow="Middle East"
      title="Middle East overview"
      description="Sector regulators across the Gulf publish their own security frameworks. Most are control catalogues that map cleanly onto ISO 27001."
      intro="Saudi Arabia and the UAE lead with prescriptive controls and local data obligations. Group security evidence once, then map it to NCA, NESA, SAMA or PDPL expectations rather than running parallel programmes."
      facts={[
        { label: "Saudi Arabia", value: "NCA ECC", hint: "Essential cybersecurity controls" },
        { label: "UAE", value: "NESA / SIA", hint: "UAE IA regulation" },
        { label: "Finance", value: "SAMA CSF", hint: "Sector control framework" },
      ]}
      sections={[
        {
          title: "NCA ECC",
          body: "Saudi Arabia's Essential Cybersecurity Controls apply to organisations operating critical or government-facing services.",
          points: [
            "Governance, risk management and compliance evidence.",
            "Asset, identity, access and privileged-access management.",
            "Network, endpoint, application and data security.",
            "Incident response, business continuity and third-party security.",
          ],
        },
        {
          title: "UAE and data localisation",
          body: "NESA and sector regulators expect a documented ISMS plus UAE-specific data handling.",
          points: [
            "Maintain an asset and data inventory with owners.",
            "Apply UAE PDPL duties for personal data, including cross-border transfers.",
            "Contract and monitor cloud and managed-service providers.",
            "Report incidents through the sector regulator's channel.",
          ],
        },
        {
          title: "Mapping instead of duplicating",
          body: "A single ISO 27001 control set can carry most Gulf framework evidence.",
          points: [
            "Record the regulator reference beside each ISO control.",
            "Keep Arabic and English policy versions where required.",
            "Track local audit findings as corrective actions with owners.",
            "Review regulator updates at least annually.",
          ],
        },
      ]}
      packs={[
        { key: "iso-27001-2022", label: "ISO/IEC 27001", note: "Base control set for NCA, NESA and SAMA mapping" },
        { key: "iso_42001", label: "ISO/IEC 42001", note: "AI governance for regional AI guidance" },
      ]}
    />
  );
}

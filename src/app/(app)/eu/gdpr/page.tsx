import type { Metadata } from "next";
import { RegionOverview } from "@/components/frameworks/region-overview";

export const metadata: Metadata = { title: "GDPR overview" };
export const dynamic = "force-dynamic";

export default function GdprOverviewPage() {
  return (
    <RegionOverview
      eyebrow="EU compliance · GDPR"
      title="GDPR"
      description="The General Data Protection Regulation sets the baseline for processing EU personal data, wherever the organisation is established."
      intro="GDPR is built on principles rather than a fixed control list. Auditors look for evidence that those principles are designed into processing, tested and reviewed — not a one-off policy pack."
      facts={[
        { label: "Articles", value: "99", hint: "Seven principles in Article 5" },
        { label: "Breach clock", value: "72h", hint: "Notify the supervisory authority" },
        { label: "Maximum fine", value: "4% / €20m", hint: "Whichever is higher" },
      ]}
      sections={[
        {
          title: "Principles and lawful basis",
          body: "Every processing activity needs a documented purpose, lawful basis, retention period and owner.",
          points: [
            "Lawful, fair and transparent processing with a recorded Article 6 basis.",
            "Purpose limitation, data minimisation and storage limitation.",
            "Accuracy and integrity controls proportionate to the risk.",
            "Accountability evidence: policies, records, training and decisions.",
          ],
        },
        {
          title: "Individual rights",
          body: "Requests must be findable, fulfilled on time and traceable end to end.",
          points: [
            "Access, rectification, erasure, restriction, portability and objection.",
            "One-month response clock, extendable by two months for complex cases.",
            "Identity verification without collecting more data than necessary.",
            "Processor assistance and sub-processor transparency.",
          ],
        },
        {
          title: "Risk, vendors and transfers",
          body: "High-risk processing and third-country transfers need documented decisions, not boilerplate.",
          points: [
            "DPIAs for profiling, large-scale special-category data and systematic monitoring.",
            "Article 28 processor terms with audit and breach-notification duties.",
            "Transfer impact assessments and valid transfer mechanisms.",
            "Breach register with containment, notification and remediation records.",
          ],
        },
      ]}
      packs={[{ key: "gdpr", label: "GDPR controls", note: "Article-level obligations with owners and evidence" }]}
    />
  );
}

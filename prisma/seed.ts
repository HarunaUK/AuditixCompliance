import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import {
  ActionPriority,
  ActionSource,
  ActionStatus,
  AuditStatus,
  ContextType,
  ControlStatus,
  EvidenceKind,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
  ObjectiveStatus,
  Plan,
  PolicyStatus,
  RiskStatus,
  Role,
  SupplierCriticality,
  SupplierStatus,
  TrainingStatus,
  Treatment,
  type PrismaClient,
} from "@prisma/client";
import { PrismaClient as Client } from "@prisma/client";

const db: PrismaClient = new Client();
const UPLOAD_ROOT = path.join(process.cwd(), ".data", "uploads");
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "auditix@faseel.app";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "auditix-demo-2026";
const LEGACY_EMAILS = ["demo@auditix.local", "priya@auditix.local", "daniel@auditix.local"];
const SLUGS = ["northwind-cloud", "meridian-health"];

const isoControls = [
  ["A.5.1", "Policies for information security", "A set of policies for information security shall be defined, approved by management, published and communicated to employees and relevant external parties.", "Organizational"],
  ["A.5.2", "Information security roles and responsibilities", "Information security roles and responsibilities shall be defined and allocated according to organizational needs.", "Organizational"],
  ["A.5.3", "Segregation of duties", "Conflicting duties and conflicting areas of responsibility shall be segregated.", "Organizational"],
  ["A.5.7", "Threat intelligence", "Information relating to information security threats shall be collected and analysed to produce threat intelligence.", "Organizational"],
  ["A.5.9", "Inventory of information and other associated assets", "An inventory of information and other associated assets, including owners, shall be developed and maintained.", "Organizational"],
  ["A.5.10", "Acceptable use of information and other associated assets", "Rules for the acceptable use and procedures for handling information and other associated assets shall be identified, documented and implemented.", "Organizational"],
  ["A.5.12", "Classification of information", "Information shall be classified according to the information security needs of the organization based on confidentiality, integrity, availability and relevant interested party requirements.", "Organizational"],
  ["A.5.13", "Labelling of information", "Procedures for information labelling shall be developed and implemented in accordance with the information classification scheme adopted by the organization.", "Organizational"],
  ["A.5.15", "Access control", "Rules to control physical and logical access to information and other associated assets shall be established and implemented based on business and information security requirements.", "Organizational"],
  ["A.5.16", "Identity management", "The full life cycle of identities shall be managed.", "Organizational"],
  ["A.5.17", "Authentication information", "Allocation and management of authentication information shall be controlled by a management process, including advising personnel on appropriate handling of authentication information.", "Organizational"],
  ["A.5.18", "Access rights", "Access rights to information and other associated assets shall be provisioned, reviewed, modified and removed in accordance with the organization's topic-specific policy on access control.", "Organizational"],
  ["A.5.19", "Information security in supplier relationships", "Processes and procedures shall be defined and implemented to manage the information security risks associated with the use of supplier products or services.", "Organizational"],
  ["A.5.23", "Information security for use of cloud services", "Processes for acquisition, use, management and exit from cloud services shall be established in accordance with the organization's information security requirements.", "Organizational"],
  ["A.5.24", "Information security incident management planning and preparation", "The organization shall plan and prepare for managing information security incidents by defining, establishing and communicating information security incident management processes, roles and responsibilities.", "Organizational"],
  ["A.5.25", "Assessment and decision on information security events", "The organization shall assess information security events and decide if they are to be categorized as information security incidents.", "Organizational"],
  ["A.5.26", "Response to information security incidents", "Information security incidents shall be responded to in accordance with the documented procedures.", "Organizational"],
  ["A.5.29", "Information security during disruption", "The organization shall plan how to maintain information security at an appropriate level during disruption.", "Organizational"],
  ["A.5.30", "ICT readiness for business continuity", "ICT readiness shall be planned, implemented, maintained and tested based on business continuity objectives and ICT continuity requirements.", "Organizational"],
  ["A.6.1", "Screening", "Background verification checks on all candidates for employment shall be carried out prior to joining the organization and on an ongoing basis.", "People"],
  ["A.6.3", "Information security awareness, education and training", "Personnel of the organization and relevant interested parties shall receive appropriate information security awareness, education and training.", "People"],
  ["A.6.4", "Disciplinary process", "A disciplinary process shall be formalized and communicated to take actions against personnel and other relevant interested parties who have committed an information security policy violation.", "People"],
  ["A.6.5", "Responsibilities after termination or change of employment", "Information security responsibilities and duties that remain valid after termination or change of employment shall be defined, enforced and communicated.", "People"],
  ["A.6.6", "Confidentiality or non-disclosure agreements", "Confidentiality or non-disclosure agreements reflecting the organization's needs for the protection of information shall be identified, documented, reviewed and signed.", "People"],
  ["A.7.1", "Physical security perimeters", "Security perimeters shall be defined and used to protect areas that contain information and other associated assets.", "Physical"],
  ["A.7.2", "Physical entry", "Secure areas shall be protected by appropriate entry controls and access points.", "Physical"],
  ["A.7.4", "Physical security monitoring", "Premises shall be continuously monitored for unauthorized physical access.", "Physical"],
  ["A.7.8", "Equipment siting and protection", "Equipment shall be sited securely and protected.", "Physical"],
  ["A.7.9", "Security of assets off-premises", "Off-site assets shall be protected.", "Physical"],
  ["A.7.10", "Storage media", "Storage media shall be managed through their life cycle of acquisition, use, transportation and disposal in accordance with the organization's classification scheme and handling requirements.", "Physical"],
  ["A.7.14", "Secure disposal or re-use of equipment", "Items of equipment containing storage media shall be verified to ensure that any sensitive data and licensed software has been removed or securely overwritten prior to disposal or re-use.", "Physical"],
  ["A.8.1", "User endpoint devices", "Information stored on, processed by or accessible via user endpoint devices shall be protected.", "Technological"],
  ["A.8.2", "Privileged access rights", "The allocation and use of privileged access rights shall be restricted and managed.", "Technological"],
  ["A.8.5", "Secure authentication", "Secure authentication technologies and procedures shall be implemented based on information access restrictions and the topic-specific policy on access control.", "Technological"],
  ["A.8.7", "Protection against malware", "Protection against malware shall be implemented and supported by appropriate user awareness.", "Technological"],
  ["A.8.8", "Management of technical vulnerabilities", "Information about technical vulnerabilities of information systems in use shall be obtained, the organization's exposure to such vulnerabilities shall be evaluated and appropriate measures shall be taken.", "Technological"],
  ["A.8.9", "Configuration management", "Configurations, including security configurations, of hardware, software, services and networks shall be established, documented, implemented, monitored and reviewed.", "Technological"],
  ["A.8.10", "Information deletion", "Information stored in information systems, devices or in any other storage media shall be deleted when no longer required.", "Technological"],
  ["A.8.11", "Data masking", "Data masking shall be used in accordance with the organization's topic-specific policy on access control and other related topic-specific policies, and business requirements, taking applicable legislation into consideration.", "Technological"],
  ["A.8.13", "Information backup", "Backup copies of information, software and systems shall be maintained and regularly tested in accordance with the agreed topic-specific policy on backup.", "Technological"],
  ["A.8.15", "Logging", "Logs that record activities, exceptions, faults and other relevant events shall be produced, stored, protected and analysed.", "Technological"],
  ["A.8.16", "Monitoring activities", "Networks, systems and applications shall be monitored for anomalous behaviour and appropriate actions taken to evaluate potential information security incidents.", "Technological"],
  ["A.8.20", "Networks security", "Networks and network devices shall be secured, managed and controlled to protect information in systems and applications.", "Technological"],
  ["A.8.24", "Use of cryptography", "Rules for the effective use of cryptography, including cryptographic key management, shall be defined and implemented.", "Technological"],
  ["A.8.25", "Secure development life cycle", "Rules for the secure development of software and systems shall be established and applied.", "Technological"],
  ["A.8.26", "Application security requirements", "Information security requirements shall be identified, specified and approved when developing or acquiring applications.", "Technological"],
  ["A.8.31", "Separation of development, test and production environments", "Development, testing and production environments shall be separated and secured.", "Technological"],
] as const;

const ceControls = [
  ["CE-1", "Firewalls", "Boundary firewalls and host-based firewalls are configured to protect internet-facing services and internal devices.", "Cyber Essentials"],
  ["CE-2", "Secure configuration", "Systems are hardened and unnecessary software, services and accounts are removed or disabled.", "Cyber Essentials"],
  ["CE-3", "User access control", "Access is limited to those who need it, with strong authentication and timely removal of leavers.", "Cyber Essentials"],
  ["CE-4", "Malware protection", "Anti-malware controls are deployed and kept current across endpoints and servers.", "Cyber Essentials"],
  ["CE-5", "Security update management", "Critical patches and security updates are applied within defined timescales.", "Cyber Essentials"],
] as const;

const policySeed = [
  {
    title: "Information Security Policy",
    category: "Governance",
    summary: "The top-level commitment to protecting Northwind information and meeting customer, legal and certification obligations.",
    status: PolicyStatus.APPROVED,
    version: 3,
    reviewDueAt: days(8),
    approvedAt: days(-172),
    refs: ["A.5.1", "A.5.2", "A.5.3"],
    content: `# Information Security Policy

## Purpose
Northwind Cloud Ltd is trusted with customer platform data, source code and identity records. This policy sets the minimum standard for protecting that information and explains how the information security management system (ISMS) is governed.

## Scope
This policy applies to all employees, contractors, consultants and third parties who access Northwind systems, facilities or data, regardless of location or device.

## Policy statements
- Information security is a standing agenda item at the monthly leadership meeting.
- The CTO is the accountable executive for information security; the Head of Security owns the ISMS.
- Risks are recorded, scored and treated using the risk management process. A risk may only be accepted by the CTO.
- All personnel complete security awareness training at onboarding and annually thereafter.
- Security incidents are reported to security@northwind.example within one hour of discovery.
- Customer data is classified, encrypted in transit and at rest, and accessible only under least privilege.

## Roles and responsibilities
**Leadership** approves risk appetite and provides resources. **Control owners** operate controls and retain evidence. **All staff** follow policy and report incidents promptly.

## Review
This policy is reviewed at least annually and after a material change to the business, systems or threat landscape.`,
  },
  {
    title: "Access Control Policy",
    category: "Access",
    summary: "How identities, privileged roles, MFA and access reviews are managed across production and corporate systems.",
    status: PolicyStatus.APPROVED,
    version: 2,
    reviewDueAt: days(25),
    approvedAt: days(-96),
    refs: ["A.5.15", "A.5.16", "A.5.17", "A.5.18", "A.8.2", "A.8.5"],
    content: `# Access Control Policy

## Principle
Access is granted on a least-privilege, need-to-know basis and removed when no longer required. Every human identity must be individually attributable.

## Requirements
1. SSO is mandatory for all workforce accounts. Local accounts are permitted only for break-glass use.
2. MFA is required for email, source control, cloud consoles, production access and the password manager.
3. Privileged access is time-bound, approved by a second administrator and logged.
4. Access reviews run quarterly. Managers confirm or revoke every account and privileged role.
5. Service accounts are owned by a named team, rotated at least every 180 days and excluded from interactive login.
6. Starter, mover and leaver actions are completed within one business day; leavers lose access before their final working day ends.

## Evidence
Quarterly access review exports, MFA enforcement reports and privileged session logs are retained for at least three years.`,
  },
  {
    title: "Acceptable Use Policy",
    category: "People",
    summary: "Expected behaviour for devices, collaboration tools, data handling and remote work.",
    status: PolicyStatus.IN_REVIEW,
    version: 2,
    reviewDueAt: days(14),
    approvedAt: null,
    refs: ["A.5.10", "A.6.3", "A.8.1"],
    content: `# Acceptable Use Policy

Northwind systems exist to deliver the platform and support customers. Use of those systems must be lawful, professional and consistent with the information security policy.

- Only approved SaaS tools may hold customer data.
- Company data may be stored on managed devices and approved cloud services only.
- Devices must have full-disk encryption, screen lock, endpoint protection and automatic updates.
- Confidential information must not be shared over personal email, consumer messaging or unapproved AI tools.
- Public Wi-Fi requires the company VPN.
- Suspected malware, phishing or data loss must be reported immediately.

## Discipline
Breaches are handled under the disciplinary process. Intentional or reckless exposure of customer data may result in termination and notification to affected parties.`,
  },
  {
    title: "Incident Response Plan",
    category: "Operations",
    summary: "Detection, triage, containment, communication and post-incident review for security incidents.",
    status: PolicyStatus.DRAFT,
    version: 1,
    reviewDueAt: days(45),
    approvedAt: null,
    refs: ["A.5.24", "A.5.25", "A.5.26", "A.8.15", "A.8.16"],
    content: `# Incident Response Plan

## Severity
- **SEV1** confirmed customer data exposure, ransomware or prolonged outage.
- **SEV2** credible threat with limited impact or contained production degradation.
- **SEV3** policy violation, lost device or single-account compromise.

## Response flow
1. **Detect** — alert, customer report or staff observation. Log in the incident channel.
2. **Triage** — incident commander assigns severity within 15 minutes.
3. **Contain** — revoke sessions, isolate hosts, rotate credentials, preserve logs.
4. **Eradicate and recover** — remove root cause, restore from known-good state, monitor.
5. **Communicate** — legal and customer success approve external messaging; regulators are notified where required.
6. **Review** — blameless post-incident review within five business days, with tracked actions.

## Contacts
Security on-call, CTO, Legal, Customer Success and the communications lead. The current rota is held in the on-call system.`,
  },
  {
    title: "Supplier Security Policy",
    category: "Third party",
    summary: "Due diligence, contractual controls, monitoring and exit planning for suppliers and subprocessors.",
    status: PolicyStatus.APPROVED,
    version: 1,
    reviewDueAt: days(-6),
    approvedAt: days(-210),
    refs: ["A.5.19", "A.5.23"],
    content: `# Supplier Security Policy

Suppliers that process customer data or support production services are assessed before onboarding and at least annually.

## Requirements
- Complete a security questionnaire proportionate to data sensitivity and access.
- Confirm encryption, access control, incident notification and subprocessor transparency.
- Execute a DPA and security addendum before data is shared.
- Maintain an owner and review date for every supplier in the register.
- Monitor advisories and certification status; escalate material changes.
- Define an exit plan for any supplier holding data classified Confidential or above.

Critical suppliers require evidence of independent assurance (ISO 27001, SOC 2 Type II or equivalent).`,
  },
  {
    title: "Business Continuity Policy",
    category: "Resilience",
    summary: "Recovery objectives, backup testing and crisis roles for a prolonged platform disruption.",
    status: PolicyStatus.DRAFT,
    version: 1,
    reviewDueAt: days(60),
    approvedAt: null,
    refs: ["A.5.29", "A.5.30", "A.8.13"],
    content: `# Business Continuity Policy

## Objectives
- Recovery time objective for the customer platform: **4 hours**.
- Recovery point objective: **15 minutes**.
- Crisis communication to affected customers within **2 hours** of a confirmed SEV1.

## Controls
Production data is replicated across regions and backed up daily. Restore tests are performed quarterly and recorded. The crisis team maintains a call tree and out-of-band communications channel. A tabletop exercise is run twice a year.

This policy is under review while the new multi-region architecture is validated.`,
  },
  {
    title: "Risk Management Policy",
    category: "Governance",
    summary: "How risks are identified, scored, treated, owned and reviewed across the organization.",
    status: PolicyStatus.APPROVED,
    version: 2,
    reviewDueAt: days(120),
    approvedAt: days(-60),
    refs: ["A.5.1", "A.5.7", "A.5.25"],
    content: `# Risk Management Policy

## Method
Risks are scored as **likelihood × impact** on a 1–5 scale, giving a maximum score of 25. Scores of 20–25 are Critical, 12–19 High, 6–11 Medium and 1–5 Low.

## Treatment
Every risk has a named owner and one of four treatments: mitigate, accept, transfer or avoid. Treatment actions have a due date and are reviewed monthly. Acceptance above the appetite threshold requires CTO approval.

## Review
The risk register is reviewed monthly by the security leadership team and before every external audit. New suppliers, product launches and architectural changes trigger a fresh assessment.`,
  },
  {
    title: "Data Classification Policy",
    category: "Data",
    summary: "Classification tiers, handling rules and retention for customer, employee and company information.",
    status: PolicyStatus.APPROVED,
    version: 1,
    reviewDueAt: days(90),
    approvedAt: days(-140),
    refs: ["A.5.9", "A.5.12", "A.5.13" as string, "A.8.10", "A.8.11"],
    content: `# Data Classification Policy

## Tiers
| Tier | Examples | Handling |
|---|---|---|
| Restricted | Customer production data, secrets, identity documents | Encrypted, least privilege, no external sharing without approval |
| Confidential | Contracts, financials, internal roadmaps | Encrypted, workforce only on a need-to-know basis |
| Internal | Policies, procedures, meeting notes | Workforce access, no public sharing |
| Public | Marketing, published documentation | Approved for release |

## Handling
Restricted data must remain in approved systems, be encrypted in transit and at rest, and be deleted according to the retention schedule. Labels are applied at creation. Exports require an owner-approved business reason and are logged.`,
  },
];

const riskSeed = [
  {
    title: "Phishing leads to workforce credential compromise",
    description: "A convincing campaign targets engineering and finance. Compromised SSO credentials could expose source code and customer metadata.",
    category: "People",
    likelihood: 4,
    impact: 5,
    treatment: Treatment.MITIGATE,
    status: RiskStatus.OPEN,
    dueIn: 21,
    refs: ["A.6.3", "A.8.5", "A.5.7"],
    actions: [
      ["Roll out phishing-resistant MFA for all workforce accounts", 14, false],
      ["Run a simulated campaign and targeted coaching for clickers", 30, false],
      ["Publish a one-page phishing reporting guide", -3, true],
    ],
  },
  {
    title: "Unpatched internet-facing service exploited",
    description: "A public load balancer and two API hosts run images that are patched monthly rather than on the critical-update SLA.",
    category: "Technology",
    likelihood: 4,
    impact: 4,
    treatment: Treatment.MITIGATE,
    status: RiskStatus.MONITORING,
    dueIn: 10,
    refs: ["A.8.8", "A.8.9", "CE-5"],
    actions: [
      ["Move critical patches to a 72-hour SLA with exception logging", 10, false],
      ["Add image scanning gate to the deployment pipeline", 28, true],
    ],
  },
  {
    title: "Third-party SaaS exposes customer data",
    description: "Analytics and support tools receive customer identifiers without a consistent DPA review or subprocessor inventory.",
    category: "Third party",
    likelihood: 3,
    impact: 5,
    treatment: Treatment.TRANSFER,
    status: RiskStatus.OPEN,
    dueIn: 35,
    refs: ["A.5.19", "A.5.23"],
    actions: [
      ["Complete DPA and security review for the top five processors", 35, false],
      ["Remove customer emails from the analytics event stream", 18, false],
    ],
  },
  {
    title: "Lost laptop exposes confidential data",
    description: "Two new starters use company laptops without confirmed full-disk encryption or remote wipe enrolment.",
    category: "Physical",
    likelihood: 3,
    impact: 4,
    treatment: Treatment.MITIGATE,
    status: RiskStatus.OPEN,
    dueIn: 7,
    refs: ["A.7.9", "A.8.1"],
    actions: [
      ["Enforce encryption and MDM enrolment before device handover", 7, false],
      ["Audit the device register against HR starters", 21, false],
    ],
  },
  {
    title: "Ransomware encrypts shared storage",
    description: "A shared file service holds policy evidence and finance records with versioning enabled but no isolated backups.",
    category: "Technology",
    likelihood: 3,
    impact: 5,
    treatment: Treatment.MITIGATE,
    status: RiskStatus.OPEN,
    dueIn: 42,
    refs: ["A.8.7", "A.8.13"],
    actions: [
      ["Create an immutable, offline backup copy", 42, false],
      ["Test a full restore and record the recovery time", 55, false],
    ],
  },
  {
    title: "Key person dependency in security team",
    description: "One engineer holds most production access and operational knowledge. Absence would slow incident response.",
    category: "People",
    likelihood: 3,
    impact: 3,
    treatment: Treatment.ACCEPT,
    status: RiskStatus.MONITORING,
    dueIn: 90,
    refs: ["A.5.2", "A.5.3"],
    actions: [
      ["Document runbooks and shadow the secondary on-call", 60, true],
    ],
  },
];

const exclusionJustification =
  "Excluded after the scope workshop: the control is not operated within the current ISMS scope. Reassess at the next management review.";

const exclusionByRef: Record<string, string> = {
  "A.7.1": "Northwind has no owned premises; the colocation provider operates physical perimeters under its ISO 27001 certificate and is reviewed annually.",
  "A.7.2": "Physical entry is controlled by the colocation provider; access lists are reviewed with them each quarter.",
  "A.7.4": "Physical monitoring is delegated to the colocation provider and evidenced through their service reports.",
  "A.7.8": "No Northwind-operated equipment is sited outside the cloud provider; endpoint controls cover the rest.",
  "A.7.9": "Staff devices are covered by endpoint encryption and MDM; no removable media leave the estate.",
  "A.7.10": "Storage media are managed by the cloud provider; Northwind does not own or transport removable media.",
  "A.7.14": "Equipment disposal is handled by the certified provider under a documented sanitisation process.",
  "A.8.11": "Production data is not copied into lower environments; masking is applied by the analytics sub-processor.",
};

const evidenceSeed = [
  {
    name: "Q3 access review export",
    expiresIn: 19,
    description: "Manager sign-off for all workforce and privileged accounts.",
    fileName: "access-review-q3.csv",
    mimeType: "text/csv",
    kind: EvidenceKind.REPORT,
    policy: "Access Control Policy",
    risk: "Phishing leads to workforce credential compromise",
    control: "A.5.18",
    body: "account,owner,role,reviewed_by,decision\nruby@northwind.example,Ruby Ellis,engineer,Alex Morgan,retain\nsam@northwind.example,Sam Okafor,finance,Alex Morgan,retain\nsvc-deploy,Platform,service,Alex Morgan,retain\ncontractor-17,External,read-only,Alex Morgan,revoked\n",
  },
  {
    name: "Incident response runbook",
    expiresIn: 8,
    description: "On-call checklist covering severity, containment and communications.",
    fileName: "incident-response-runbook.md",
    mimeType: "text/markdown",
    kind: EvidenceKind.DOCUMENT,
    policy: "Incident Response Plan",
    risk: null,
    control: "A.5.26",
    body: "# Incident response runbook\n\n1. Declare in #incident and page the commander.\n2. Assign severity and open the timeline.\n3. Contain: revoke sessions, isolate hosts, rotate secrets.\n4. Preserve logs before remediation.\n5. Notify legal and customer success for SEV1/SEV2.\n6. Schedule the post-incident review within 5 days.\n",
  },
  {
    name: "External vulnerability scan — October",
    expiresIn: -9,
    description: "Authenticated scan of the public estate, with two medium findings tracked to remediation.",
    fileName: "vulnerability-scan-october.txt",
    mimeType: "text/plain",
    kind: EvidenceKind.LOG,
    policy: null,
    risk: "Unpatched internet-facing service exploited",
    control: "A.8.8",
    body: "AUDITIX EXTERNAL SCAN\nTarget: app.northwind.example, api.northwind.example\nDate: 2026-10-18\n\nHIGH: 0\nMEDIUM: 2 (TLS cipher preference; missing HSTS on legacy host)\nLOW: 5\n\nRemediation owner: Platform\nTarget date: 2026-11-02\n",
  },
];

function days(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(12, 0, 0, 0);
  return date;
}

function severity(score: number) {
  if (score >= 20) return "Critical";
  if (score >= 12) return "High";
  if (score >= 6) return "Medium";
  return "Low";
}

async function seedFrameworks() {
  const iso = await db.framework.upsert({
    where: { key: "iso-27001-2022" },
    update: { name: "ISO/IEC 27001:2022", version: "2022", description: "Information security management system — Annex A control set." },
    create: { key: "iso-27001-2022", name: "ISO/IEC 27001:2022", version: "2022", description: "Information security management system — Annex A control set." },
  });
  const ce = await db.framework.upsert({
    where: { key: "cyber-essentials" },
    update: { name: "Cyber Essentials", version: "3.1", description: "NCSC baseline technical controls for UK organizations." },
    create: { key: "cyber-essentials", name: "Cyber Essentials", version: "3.1", description: "NCSC baseline technical controls for UK organizations." },
  });

  for (const [index, [ref, title, description, category]] of isoControls.entries()) {
    await db.frameworkControl.upsert({
      where: { frameworkId_ref: { frameworkId: iso.id, ref } },
      update: { title, description, category, sortOrder: index },
      create: { frameworkId: iso.id, ref, title, description, category, sortOrder: index },
    });
  }
  for (const [index, [ref, title, description, category]] of ceControls.entries()) {
    await db.frameworkControl.upsert({
      where: { frameworkId_ref: { frameworkId: ce.id, ref } },
      update: { title, description, category, sortOrder: index },
      create: { frameworkId: ce.id, ref, title, description, category, sortOrder: index },
    });
  }

  await seedFrameworkPacks();
  return db.frameworkControl.findMany({ orderBy: { sortOrder: "asc" } });
}

type PackControl = { ref: string; title: string; desc: string; domain?: string; domainLabel?: string; iso?: string[] };

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

async function seedFrameworkPacks() {
  for (const pack of PACKS) {
    const file = path.join(process.cwd(), "prisma", "frameworks", pack.file);
    const controls = JSON.parse(await readFile(file, "utf8")) as PackControl[];
    const framework = await db.framework.upsert({
      where: { key: pack.key },
      update: { name: pack.name, version: pack.version, description: pack.description, meta: pack.meta },
      create: { key: pack.key, name: pack.name, version: pack.version, description: pack.description, meta: pack.meta },
    });

    for (const [index, control] of controls.entries()) {
      const category = control.domainLabel ?? (control.ref.startsWith("GDPR") ? "GDPR articles" : SOC2_DOMAINS[control.ref.split(".")[0]] ?? "General");
      const meta = {
        domain: control.domain ?? control.ref.split(".")[0],
        domainLabel: category,
        iso: control.iso ?? [],
      };
      await db.frameworkControl.upsert({
        where: { frameworkId_ref: { frameworkId: framework.id, ref: control.ref } },
        update: { title: control.title, description: control.desc, category, sortOrder: index, meta },
        create: { frameworkId: framework.id, ref: control.ref, title: control.title, description: control.desc, category, sortOrder: index, meta },
      });
    }
  }
}

async function createWorkspace(opts: {
  name: string;
  slug: string;
  plan: Plan;
  user: { id: string; name: string };
  controls: Awaited<ReturnType<typeof seedFrameworks>>;
  coverage: "high" | "low";
}) {
  const workspace = await db.workspace.create({
    data: { name: opts.name, slug: opts.slug, plan: opts.plan },
  });
  await db.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: opts.user.id, role: Role.ADMIN, title: "Head of Security" },
  });

  const pattern =
    opts.coverage === "high"
      ? [ControlStatus.IMPLEMENTED, ControlStatus.IMPLEMENTED, ControlStatus.IN_PROGRESS, ControlStatus.IMPLEMENTED, ControlStatus.NOT_STARTED, ControlStatus.IMPLEMENTED, ControlStatus.IN_PROGRESS, ControlStatus.NOT_APPLICABLE]
      : [ControlStatus.IN_PROGRESS, ControlStatus.NOT_STARTED, ControlStatus.IN_PROGRESS, ControlStatus.NOT_STARTED, ControlStatus.NOT_STARTED, ControlStatus.IMPLEMENTED, ControlStatus.NOT_STARTED, ControlStatus.NOT_APPLICABLE];

  await db.workspaceControl.createMany({
    data: opts.controls.map((control, index) => {
      // Physical/provider controls are genuinely out of scope; everything else is applicable.
      const excluded = control.ref.startsWith("A.7.") || control.ref === "A.8.11";
      const patternStatus = pattern[index % pattern.length];
      const status = excluded
        ? ControlStatus.NOT_APPLICABLE
        : patternStatus === ControlStatus.NOT_APPLICABLE
          ? ControlStatus.IN_PROGRESS
          : patternStatus;
      return {
        workspaceId: workspace.id,
        controlId: control.id,
        status,
        justification:
          status === ControlStatus.NOT_APPLICABLE
            ? (exclusionByRef[control.ref] ?? exclusionJustification)
            : `Applies to ${opts.name}'s ISMS scope: ${control.title}.`,
        reviewedAt: new Date(),
      };
    }),
  });

  return workspace;
}

async function main() {
  console.log("Seeding Auditix demo data…");
  await db.workspace.deleteMany({ where: { slug: { in: SLUGS } } });

  // Deleting the seeded workspaces cascades their records, but the demo user also
  // owns records in workspaces this reset deliberately keeps. Those foreign keys
  // are required, so they have to be cleared before the users can be deleted —
  // otherwise a second `npm run db:seed` fails with Policy_ownerId_fkey.
  const demoUsers = await db.user.findMany({
    where: { email: { in: [DEMO_EMAIL, ...LEGACY_EMAILS] } },
    select: { id: true },
  });
  const demoUserIds = demoUsers.map((user) => user.id);
  if (demoUserIds.length > 0) {
    const owned = { ownerId: { in: demoUserIds } };
    await db.policy.deleteMany({ where: owned });
    await db.risk.deleteMany({ where: owned });
    await db.supplier.deleteMany({ where: owned });
    await db.incident.deleteMany({ where: owned });
    await db.correctiveAction.deleteMany({ where: owned });
    await db.evidence.deleteMany({ where: { uploadedById: { in: demoUserIds } } });
    await db.policyVersion.deleteMany({ where: { changedById: { in: demoUserIds } } });
  }

  await db.user.deleteMany({ where: { email: { in: [DEMO_EMAIL, ...LEGACY_EMAILS] } } });

  const controls = await seedFrameworks();
  const controlByRef = new Map(controls.map((control) => [control.ref, control]));
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const demo = await db.user.create({
    data: { name: "Alex Morgan", email: DEMO_EMAIL, passwordHash },
  });
  const priya = await db.user.create({
    data: { name: "Priya Nair", email: "priya@auditix.local", passwordHash },
  });
  await db.user.create({
    data: { name: "Daniel Okafor", email: "daniel@auditix.local", passwordHash },
  });

  const northwind = await createWorkspace({
    name: "Northwind Cloud Ltd",
    slug: "northwind-cloud",
    plan: Plan.PRO,
    user: demo,
    controls,
    coverage: "high",
  });
  await db.workspaceMember.create({
    data: { workspaceId: northwind.id, userId: priya.id, role: Role.MEMBER, title: "Compliance Analyst" },
  });

  const meridian = await createWorkspace({
    name: "Meridian Health",
    slug: "meridian-health",
    plan: Plan.CONSULTANT,
    user: demo,
    controls,
    coverage: "low",
  });
  await db.workspaceMember.create({
    data: { workspaceId: meridian.id, userId: priya.id, role: Role.CONSULTANT, title: "Security Consultant" },
  });

  const policiesByTitle = new Map<string, { id: string; title: string }>();
  for (const item of policySeed) {
    const policy = await db.policy.create({
      data: {
        workspaceId: northwind.id,
        title: item.title,
        category: item.category,
        summary: item.summary,
        content: item.content,
        status: item.status,
        version: item.version,
        ownerId: demo.id,
        reviewDueAt: item.reviewDueAt,
        approvedAt: item.approvedAt,
        controls: {
          create: item.refs
            .map((ref) => controlByRef.get(ref))
            .filter((control): control is NonNullable<typeof control> => Boolean(control))
            .map((control) => ({ controlId: control.id })),
        },
      },
    });
    policiesByTitle.set(item.title, policy);
    await db.policyVersion.create({
      data: {
        policyId: policy.id,
        version: item.version,
        title: item.title,
        content: item.content,
        status: item.status,
        changedById: demo.id,
        note: "Seeded baseline version",
      },
    });
    if (item.version > 1) {
      await db.policyVersion.create({
        data: {
          policyId: policy.id,
          version: item.version - 1,
          title: item.title,
          content: `${item.content}\n\n> Superseded draft retained for audit history.`,
          status: item.status === PolicyStatus.APPROVED ? PolicyStatus.IN_REVIEW : PolicyStatus.DRAFT,
          changedById: demo.id,
          note: "Previous review cycle",
          createdAt: days(-120),
        },
      });
    }
  }

  for (const item of riskSeed) {
    const policy = policiesByTitle.get("Risk Management Policy");
    if (!policy) throw new Error("Risk policy missing");
    await db.risk.create({
      data: {
        workspaceId: northwind.id,
        title: item.title,
        description: item.description,
        category: item.category,
        likelihood: item.likelihood,
        impact: item.impact,
        score: item.likelihood * item.impact,
        treatment: item.treatment,
        status: item.status,
        ownerId: demo.id,
        dueDate: days(item.dueIn),
        controls: {
          create: item.refs
            .map((ref) => controlByRef.get(ref))
            .filter((control): control is NonNullable<typeof control> => Boolean(control))
            .map((control) => ({ controlId: control.id })),
        },
        actions: {
          create: item.actions.map(([title, due, done]) => ({
            title: title as string,
            dueDate: days(due as number),
            done: done as boolean,
            ownerId: demo.id,
          })),
        },
      },
    });
  }

  await mkdir(UPLOAD_ROOT, { recursive: true });
  for (const item of evidenceSeed) {
    const storageKey = path.join("seed", `${Date.now()}-${item.fileName}`).replaceAll("\\", "/");
    const fullPath = path.join(UPLOAD_ROOT, storageKey);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, item.body, "utf8");
    const risk = await db.risk.findFirst({ where: { workspaceId: northwind.id, title: item.risk ?? "__none__" } });
    const policy = item.policy ? policiesByTitle.get(item.policy) : null;
    await db.evidence.create({
      data: {
        workspaceId: northwind.id,
        name: item.name,
        description: item.description,
        fileName: item.fileName,
        mimeType: item.mimeType,
        sizeBytes: Buffer.byteLength(item.body),
        storageKey,
        checksum: createHash("sha256").update(item.body).digest("hex"),
        kind: item.kind,
        uploadedById: demo.id,
        policyId: policy?.id ?? null,
        riskId: risk?.id ?? null,
        controlId: controlByRef.get(item.control)?.id ?? null,
        expiresAt: days(item.expiresIn),
      },
    });
  }

  // A lighter second client workspace so the consultant view is real.
  await db.policy.createMany({
    data: [
      {
        workspaceId: meridian.id,
        title: "Information Security Policy",
        category: "Governance",
        summary: "Client baseline pending review.",
        content: "# Information Security Policy\n\nDraft baseline for Meridian Health. Pending the first workshop with the CISO.",
        status: PolicyStatus.DRAFT,
        version: 1,
        ownerId: demo.id,
        reviewDueAt: days(30),
      },
      {
        workspaceId: meridian.id,
        title: "Access Control Policy",
        category: "Access",
        summary: "Draft access standard for clinical systems.",
        content: "# Access Control Policy\n\nDraft standard covering clinical role mapping, MFA and quarterly access reviews.",
        status: PolicyStatus.IN_REVIEW,
        version: 1,
        ownerId: demo.id,
        reviewDueAt: days(21),
      },
      {
        workspaceId: meridian.id,
        title: "Supplier Security Policy",
        category: "Third party",
        summary: "Awaiting procurement review.",
        content: "# Supplier Security Policy\n\nDraft supplier assessment and DPA requirements for Meridian Health.",
        status: PolicyStatus.DRAFT,
        version: 1,
        ownerId: demo.id,
        reviewDueAt: days(45),
      },
    ],
  });
  await db.risk.create({
    data: {
      workspaceId: meridian.id,
      title: "Clinical portal availability during regional outage",
      description: "A single-region deployment may interrupt access to patient-facing services during a cloud outage.",
      category: "Resilience",
      likelihood: 3,
      impact: 5,
      score: 15,
      treatment: Treatment.MITIGATE,
      status: RiskStatus.OPEN,
      ownerId: demo.id,
      dueDate: days(28),
      actions: { create: [{ title: "Document the failover runbook", dueDate: days(28), ownerId: demo.id }] },
    },
  });

  // ISMS foundation: intake, context, scope, methodology, objectives, roles and operating records.
  const northwindScope = [
    "The scope of the Information Security Management System (ISMS) at Northwind Cloud Ltd covers the B2B SaaS platform operated from the United Kingdom, including the customer portal, public API, billing service and the supporting engineering, support and finance functions.",
    "The ISMS applies to the people, processes, information assets and supporting infrastructure used to deliver these services, including production workloads hosted with AWS (eu-west-2) and Cloudflare, and business services delivered through GitHub, Slack, Jira and Google Workspace.",
    "It covers the confidentiality, integrity and availability of customer PII, support tickets, billing records and internal engineering information processed by Northwind Cloud Ltd, its workforce and relevant third-party suppliers.",
    "The management system is assessed against ISO/IEC 27001:2022 and Cyber Essentials. Home-working locations are in scope; the personal devices used are covered by the endpoint and acceptable-use controls.",
    "Exclusions: none. All Annex A controls apply except those recorded as excluded in the Statement of Applicability with a written justification.",
  ].join("\n\n");

  await db.workspaceProfile.create({
    data: {
      workspaceId: northwind.id,
      companyName: "Northwind Cloud Ltd",
      industry: "B2B SaaS",
      headcount: 42,
      geography: "United Kingdom",
      dataTypes: "Customer PII, support tickets, billing records, internal engineering data",
      cloudProviders: "AWS (eu-west-2), Cloudflare",
      saasTools: "GitHub, Slack, Jira, Google Workspace",
      keySystems: "Customer portal, public API, billing service, internal admin console",
    },
  });
  await db.workspace.update({
    where: { id: northwind.id },
    data: {
      scopeStatement: northwindScope,
      scopeUpdatedAt: days(-45),
      methodologyProcess:
        "Risks are identified from the asset inventory, threat intelligence, incidents, supplier reviews, penetration tests and change activity. Each risk is scored on likelihood and impact, evaluated against the acceptance criteria, assigned an owner, and linked to Annex A controls and treatment actions. The register is reviewed quarterly and on significant change.",
      methodologyLikelihood:
        "1 Rare — not expected within 10 years\n2 Unlikely — once in 3–10 years\n3 Possible — once in 1–3 years\n4 Likely — around once a year\n5 Almost certain — more than once a year",
      methodologyImpact:
        "1 Negligible — no material effect\n2 Minor — local, contained disruption\n3 Moderate — service disruption or regulatory attention\n4 Major — significant financial loss or personal-data breach\n5 Severe — existential or multi-tenant impact",
      acceptanceCriteria:
        "Residual risks scoring 5 or below are accepted by the risk owner. Scores from 6–11 require Head of Security approval. Scores of 12 or above require executive sign-off and a funded treatment plan. Accepted risks are recorded with the approver and a review date.",
      methodologyReviewFrequency: "Annually, quarterly for the register, and on significant change",
      methodologyUpdatedAt: days(-40),
    },
  });

  await db.contextItem.createMany({
    data: [
      {
        workspaceId: northwind.id,
        type: ContextType.INTERNAL,
        description: "The platform is still partly served by a legacy monolith with a small engineering team and limited change freezes.",
        needs: "Protect availability during migration without slowing delivery.",
        relevance: "Drives the resilience, change-management and access-control risk scenarios.",
        createdAt: days(-60),
      },
      {
        workspaceId: northwind.id,
        type: ContextType.EXTERNAL,
        description: "UK GDPR and the EU–US data transfer regime apply to customer data processed in the platform.",
        needs: "Lawful processing, breach notification and documented transfer safeguards.",
        relevance: "Sets the legal and regulatory criteria for the risk assessment and incident process.",
        createdAt: days(-58),
      },
      {
        workspaceId: northwind.id,
        type: ContextType.EXTERNAL,
        description: "Enterprise customers increasingly require ISO 27001 certification and completed security questionnaires before renewal.",
        needs: "Current certification evidence and a defensible Statement of Applicability.",
        relevance: "Makes certification a commercial dependency, not just a compliance exercise.",
        createdAt: days(-55),
      },
      {
        workspaceId: northwind.id,
        type: ContextType.PARTY,
        party: "Enterprise customers",
        description: "Customers whose employees and end users are represented in the platform.",
        needs: "Confidentiality of personal data, uptime commitments, breach notification within contractual timescales and an annual security attestation.",
        relevance: "Primary driver of the scope, data-classification and supplier requirements.",
        createdAt: days(-54),
      },
      {
        workspaceId: northwind.id,
        type: ContextType.PARTY,
        party: "UK ICO",
        description: "Supervisory authority for personal data processed in the United Kingdom.",
        needs: "Compliance with UK GDPR, including 72-hour breach notification where required.",
        relevance: "Shapes the incident-response and records-of-processing obligations.",
        createdAt: days(-53),
      },
    ],
  });

  await db.ismsRole.createMany({
    data: [
      {
        workspaceId: northwind.id,
        role: "CISO",
        holder: "Alex Morgan",
        responsibilities:
          "Owns the ISMS, sets the risk appetite, approves the risk methodology and reports ISMS performance to the board.",
        authority: "Accepts residual risk up to the board-approved threshold and commissions internal audits.",
        reportsTo: "Chief Executive Officer",
        createdAt: days(-70),
      },
      {
        workspaceId: northwind.id,
        role: "ISMS Manager",
        holder: "Priya Nair",
        responsibilities:
          "Maintains the control set, Statement of Applicability, policy review cycle and the evidence calendar; coordinates internal audits and management reviews.",
        authority: "Requests evidence from control owners and raises nonconformities.",
        reportsTo: "CISO",
        createdAt: days(-69),
      },
      {
        workspaceId: northwind.id,
        role: "Engineering Lead",
        holder: "Daniel Okafor",
        responsibilities:
          "Owns the technical controls for the platform, including secure development, vulnerability management, access reviews and backup restoration testing.",
        authority: "Blocks releases that fail the security gate and approves emergency changes.",
        reportsTo: "CTO",
        createdAt: days(-68),
      },
    ],
  });

  await db.objective.createMany({
    data: [
      {
        workspaceId: northwind.id,
        title: "Reduce mean time to patch critical vulnerabilities to under 7 days",
        measure: "Days from CVE disclosure to production deployment, taken from the scanner and change log.",
        target: "< 7 days",
        owner: "Daniel Okafor",
        dueDate: days(60),
        status: ObjectiveStatus.ON_TRACK,
        progressNote: "Last quarter median was 9 days; emergency patch process now live.",
        createdAt: days(-50),
      },
      {
        workspaceId: northwind.id,
        title: "Achieve 95% completion of annual security awareness training",
        measure: "Completed training records divided by active workforce, reported monthly.",
        target: "95% by 31 December",
        owner: "Priya Nair",
        dueDate: days(80),
        status: ObjectiveStatus.AT_RISK,
        progressNote: "Two teams have not completed the refreshed module.",
        createdAt: days(-48),
      },
      {
        workspaceId: northwind.id,
        title: "Restore the customer portal within the 4-hour RTO in a live test",
        measure: "Elapsed time from declared failure to a verified restore in the annual continuity exercise.",
        target: "< 4 hours",
        owner: "Daniel Okafor",
        dueDate: days(120),
        status: ObjectiveStatus.NOT_STARTED,
        createdAt: days(-46),
      },
    ],
  });

  await db.internalAudit.create({
    data: {
      workspaceId: northwind.id,
      title: "Annex A access-control and supplier-review audit",
      auditDate: days(-60),
      scope:
        "A.5.15–A.5.18 access control, A.5.19–A.5.22 supplier relationships, A.8.2 privileged access and the joiner/mover/leaver process.",
      status: AuditStatus.COMPLETED,
      completedAt: days(-58),
      findings:
        "One minor nonconformity: two leaver accounts remained active for 48 hours beyond the SLA. Corrective action raised and verified closed. No major nonconformities.",
      createdAt: days(-65),
    },
  });

  await db.managementReview.create({
    data: {
      workspaceId: northwind.id,
      reviewDate: days(-30),
      attendees: "Alex Morgan (CISO), Priya Nair (ISMS Manager), Daniel Okafor (Engineering Lead), Sam Patel (CEO)",
      decisions:
        "Accepted the residual risk position on the legacy monolith migration. Approved two additional engineering days per month for control maintenance. Agreed to commission the external Stage 1 readiness review in Q1. Noted the leaver-access nonconformity as closed with monitoring.",
      createdAt: days(-30),
    },
  });

  await db.trainingRecord.createMany({
    data: [
      {
        workspaceId: northwind.id,
        course: "Security awareness essentials",
        assignee: "Priya Nair",
        status: TrainingStatus.COMPLETED,
        dueDate: days(-20),
        completedAt: days(-24),
        createdAt: days(-40),
      },
      {
        workspaceId: northwind.id,
        course: "Security awareness essentials",
        assignee: "Daniel Okafor",
        status: TrainingStatus.COMPLETED,
        dueDate: days(-20),
        completedAt: days(-22),
        createdAt: days(-40),
      },
      {
        workspaceId: northwind.id,
        course: "Phishing and social engineering",
        assignee: "Support team",
        status: TrainingStatus.ASSIGNED,
        dueDate: days(14),
        createdAt: days(-7),
      },
    ],
  });

  // Supplier, incident and corrective-action registers.
  const supplierSeed = [
    {
      name: "Amazon Web Services",
      service: "Production cloud hosting (eu-west-2)",
      category: "Cloud infrastructure",
      criticality: SupplierCriticality.CRITICAL,
      status: SupplierStatus.ACTIVE,
      dataAccess: true,
      dpaSigned: true,
      assurance: "ISO/IEC 27001, SOC 2 Type II",
      lastReviewedAt: days(-34),
      nextReviewAt: days(146),
      notes: "Primary production hosting. Exit plan requires a tested restore path to the secondary region.",
    },
    {
      name: "Cloudflare",
      service: "Edge network, WAF and DNS",
      category: "Cloud infrastructure",
      criticality: SupplierCriticality.CRITICAL,
      status: SupplierStatus.ACTIVE,
      dataAccess: true,
      dpaSigned: true,
      assurance: "ISO/IEC 27001, SOC 2 Type II",
      lastReviewedAt: days(-41),
      nextReviewAt: days(139),
      notes: "Security header and rate-limit configuration owned by the platform team.",
    },
    {
      name: "GitHub",
      service: "Source control and CI/CD",
      category: "Software",
      criticality: SupplierCriticality.HIGH,
      status: SupplierStatus.ACTIVE,
      dataAccess: true,
      dpaSigned: true,
      assurance: "SOC 2 Type II",
      lastReviewedAt: days(-52),
      nextReviewAt: days(128),
      notes: "Repository access reviewed quarterly with the access-control cycle.",
    },
    {
      name: "Google Workspace",
      service: "Email, identity and documents",
      category: "Software",
      criticality: SupplierCriticality.HIGH,
      status: SupplierStatus.ACTIVE,
      dataAccess: true,
      dpaSigned: true,
      assurance: "ISO/IEC 27001, SOC 2 Type II",
      lastReviewedAt: days(-63),
      nextReviewAt: days(117),
      notes: "SSO is the only workforce sign-in path; break-glass accounts are held by the CISO.",
    },
    {
      name: "Slack",
      service: "Internal collaboration",
      category: "Software",
      criticality: SupplierCriticality.MEDIUM,
      status: SupplierStatus.ACTIVE,
      dataAccess: true,
      dpaSigned: true,
      assurance: "SOC 2 Type II",
      lastReviewedAt: days(-88),
      nextReviewAt: days(272),
      notes: "Customer data must not be pasted into channels; support uses the ticketing system.",
    },
    {
      name: "Ironclad Mail",
      service: "Transactional email delivery",
      category: "Data processor",
      criticality: SupplierCriticality.HIGH,
      status: SupplierStatus.UNDER_REVIEW,
      dataAccess: true,
      dpaSigned: true,
      assurance: "SOC 2 Type II",
      lastReviewedAt: days(-4),
      nextReviewAt: days(12),
      notes: "Renewal review in progress; subprocessor list needs refreshing.",
    },
    {
      name: "Brightline Legal",
      service: "Legal and contract advice",
      category: "Professional services",
      criticality: SupplierCriticality.LOW,
      status: SupplierStatus.ACTIVE,
      dataAccess: false,
      dpaSigned: false,
      assurance: null,
      lastReviewedAt: days(-120),
      nextReviewAt: days(245),
      notes: "Receives redacted contract summaries only; no customer data.",
    },
  ];
  const supplierByName = new Map<string, { id: string; name: string }>();
  for (const item of supplierSeed) {
    const supplier = await db.supplier.create({
      data: {
        workspaceId: northwind.id,
        name: item.name,
        service: item.service,
        category: item.category,
        criticality: item.criticality,
        status: item.status,
        ownerId: demo.id,
        dataAccess: item.dataAccess,
        dpaSigned: item.dpaSigned,
        assurance: item.assurance,
        lastReviewedAt: item.lastReviewedAt,
        nextReviewAt: item.nextReviewAt,
        notes: item.notes,
        createdAt: days(-150),
      },
    });
    supplierByName.set(supplier.name, supplier);
  }

  const incidentSeed = [
    {
      reference: "INC-0001",
      title: "Phishing email reported by finance",
      description:
        "A finance analyst received a credential-harvesting email impersonating the CEO. The link was reported before any credentials were entered; the message was quarantined and the sending domain blocked.",
      category: IncidentCategory.PHISHING,
      severity: IncidentSeverity.MEDIUM,
      status: IncidentStatus.CLOSED,
      ownerId: demo.id,
      detectedAt: days(-38),
      containedAt: days(-38),
      resolvedAt: days(-37),
      reportedBy: "Sam Patel",
      supplierId: null,
      impact: "No compromise. Two similar messages reached other teams and were quarantined.",
      rootCause: "The mail gateway allowed a lookalike domain through because DMARC was not enforced for the impersonated brand.",
      resolution: "Domain blocked, gateway rule added, finance moved to phishing-resistant MFA.",
      updates: [
        { status: IncidentStatus.OPEN, note: "Reported by finance through the phishing mailbox. Triage started.", at: -38 },
        { status: IncidentStatus.INVESTIGATING, note: "Headers reviewed; no clicks or credential entry found. Gateway rule prepared.", at: -38 },
        { status: IncidentStatus.CONTAINED, note: "Sending domain blocked and the message purged from all mailboxes.", at: -38 },
        { status: IncidentStatus.RESOLVED, note: "Phishing-resistant MFA enforced for finance; monitoring confirmed no further delivery.", at: -37 },
        { status: IncidentStatus.CLOSED, note: "Post-incident review completed; corrective action CA-0001 raised.", at: -30 },
      ],
    },
    {
      reference: "INC-0002",
      title: "Leaver account active after departure",
      description:
        "A routine access review found a contractor account still active 48 hours after the engagement ended. The account had no privileged role and no sign-in activity after the end date.",
      category: IncidentCategory.UNAUTHORISED_ACCESS,
      severity: IncidentSeverity.HIGH,
      status: IncidentStatus.RESOLVED,
      ownerId: priya.id,
      detectedAt: days(-18),
      containedAt: days(-18),
      resolvedAt: days(-17),
      reportedBy: "Priya Nair",
      supplierId: null,
      impact: "No evidence of misuse. The account could read support tickets for two days beyond the contract.",
      rootCause: "The leaver ticket was raised in the HR system but did not create an IT task automatically.",
      resolution: "Account disabled, sessions revoked, access review evidence retained. Automation tracked in CA-0002.",
      updates: [
        { status: IncidentStatus.OPEN, note: "Quarterly access review flagged the account as active after the end date.", at: -18 },
        { status: IncidentStatus.INVESTIGATING, note: "Sign-in logs checked; no activity after the contract end date.", at: -18 },
        { status: IncidentStatus.CONTAINED, note: "Account disabled and all sessions revoked.", at: -18 },
        { status: IncidentStatus.RESOLVED, note: "Identity provider audit confirms the account is disabled. HR process gap documented.", at: -17 },
      ],
    },
    {
      reference: "INC-0003",
      title: "Elevated 5xx errors on the customer portal",
      description:
        "The customer portal returned elevated 5xx responses for 22 minutes after a bad configuration push. Support received six tickets; no data was lost.",
      category: IncidentCategory.AVAILABILITY,
      severity: IncidentSeverity.MEDIUM,
      status: IncidentStatus.CLOSED,
      ownerId: demo.id,
      detectedAt: days(-9),
      containedAt: days(-9),
      resolvedAt: days(-8),
      reportedBy: "Platform on-call",
      supplierId: "Amazon Web Services",
      impact: "22 minutes of degraded portal availability. API traffic was unaffected due to the canary split.",
      rootCause: "A change to the ingress timeout was applied without the canary check because the pipeline skipped the staging gate.",
      resolution: "Configuration reverted, canary gate restored, synthetic portal checks added.",
      updates: [
        { status: IncidentStatus.OPEN, note: "On-call alerted by the 5xx rate. Incident channel opened.", at: -9 },
        { status: IncidentStatus.INVESTIGATING, note: "Error budget burn correlated with the ingress configuration deployment.", at: -9 },
        { status: IncidentStatus.CONTAINED, note: "Deployment rolled back; error rate returned to baseline.", at: -9 },
        { status: IncidentStatus.RESOLVED, note: "Root cause confirmed. Staging gate restored and probe added.", at: -8 },
        { status: IncidentStatus.CLOSED, note: "Customer communication sent. Post-incident review completed.", at: -4 },
      ],
    },
    {
      reference: "INC-0004",
      title: "Suspicious OAuth consent grant",
      description:
        "A staff member received an OAuth consent prompt for an unverified calendar app. The grant was cancelled before approval; the identity team is checking whether the app was used elsewhere.",
      category: IncidentCategory.PHISHING,
      severity: IncidentSeverity.LOW,
      status: IncidentStatus.INVESTIGATING,
      ownerId: demo.id,
      detectedAt: days(-1),
      containedAt: null,
      resolvedAt: null,
      reportedBy: "Daniel Okafor",
      supplierId: null,
      impact: "No grant recorded. Mailbox search under way for similar consent prompts.",
      rootCause: null,
      resolution: null,
      updates: [
        { status: IncidentStatus.OPEN, note: "Staff member reported the consent prompt. Grant was not approved.", at: -1 },
        { status: IncidentStatus.INVESTIGATING, note: "Identity team reviewing tenant consent logs and mailbox rules.", at: -1 },
      ],
    },
  ];
  const incidentByRef = new Map<string, { id: string; reference: string }>();
  for (const item of incidentSeed) {
    const incident = await db.incident.create({
      data: {
        workspaceId: northwind.id,
        reference: item.reference,
        title: item.title,
        description: item.description,
        category: item.category,
        severity: item.severity,
        status: item.status,
        ownerId: item.ownerId,
        detectedAt: item.detectedAt,
        containedAt: item.containedAt,
        resolvedAt: item.resolvedAt,
        reportedBy: item.reportedBy,
        supplierId: item.supplierId ? (supplierByName.get(item.supplierId)?.id ?? null) : null,
        impact: item.impact,
        rootCause: item.rootCause,
        resolution: item.resolution,
        createdAt: days(-38),
        updates: {
          create: item.updates.map((update) => ({
            actorId: item.ownerId,
            actorName: item.ownerId === priya.id ? priya.name : demo.name,
            status: update.status,
            note: update.note,
            createdAt: days(update.at),
          })),
        },
      },
    });
    incidentByRef.set(incident.reference, incident);
  }

  const correctiveActionSeed = [
    {
      reference: "CA-0001",
      title: "Roll out phishing-resistant MFA for finance",
      description: "Replace push-based MFA for the finance team with passkeys or hardware-backed authenticators, and enforce the policy at the identity provider.",
      source: ActionSource.INCIDENT,
      status: ActionStatus.IN_PROGRESS,
      priority: ActionPriority.HIGH,
      ownerId: demo.id,
      dueDate: days(10),
      completedAt: null,
      verifiedAt: null,
      effectivenessNote: null,
      incidentRef: "INC-0001",
      supplierName: null,
    },
    {
      reference: "CA-0002",
      title: "Automate leaver deprovisioning from the HR system",
      description: "Create an IT task automatically when an engagement ends, with a one-business-day SLA and an exception report for accounts still active.",
      source: ActionSource.INCIDENT,
      status: ActionStatus.OPEN,
      priority: ActionPriority.HIGH,
      ownerId: priya.id,
      dueDate: days(21),
      completedAt: null,
      verifiedAt: null,
      effectivenessNote: null,
      incidentRef: "INC-0002",
      supplierName: null,
    },
    {
      reference: "CA-0003",
      title: "Add synthetic checks for the customer portal",
      description: "Run a login and dashboard probe every minute from two regions, with an alert routed to the on-call rotation.",
      source: ActionSource.INCIDENT,
      status: ActionStatus.COMPLETED,
      priority: ActionPriority.MEDIUM,
      ownerId: demo.id,
      dueDate: days(-1),
      completedAt: days(-3),
      verifiedAt: null,
      effectivenessNote: null,
      incidentRef: "INC-0003",
      supplierName: null,
    },
    {
      reference: "CA-0004",
      title: "Test the AWS backup restore for the customer database",
      description: "Restore the production snapshot into an isolated account, verify row counts and application startup, and record the elapsed time against the 4-hour RTO.",
      source: ActionSource.SUPPLIER,
      status: ActionStatus.OPEN,
      priority: ActionPriority.MEDIUM,
      ownerId: demo.id,
      dueDate: days(45),
      completedAt: null,
      verifiedAt: null,
      effectivenessNote: null,
      incidentRef: null,
      supplierName: "Amazon Web Services",
    },
    {
      reference: "CA-0005",
      title: "Refresh the incident contact tree",
      description: "Update out-of-hours contacts for the CISO, legal, communications and customer success, then publish the new card to the on-call runbook.",
      source: ActionSource.MANAGEMENT_REVIEW,
      status: ActionStatus.VERIFIED,
      priority: ActionPriority.LOW,
      ownerId: priya.id,
      dueDate: days(-20),
      completedAt: days(-25),
      verifiedAt: days(-22),
      effectivenessNote: "Two test pages reached the correct on-call contacts in under five minutes during the tabletop exercise.",
      incidentRef: null,
      supplierName: null,
    },
    {
      reference: "CA-0006",
      title: "Close the leaver-access nonconformity",
      description: "Add an exception report for accounts active beyond their end date and review it weekly until the HR automation is live.",
      source: ActionSource.AUDIT,
      status: ActionStatus.IN_PROGRESS,
      priority: ActionPriority.HIGH,
      ownerId: priya.id,
      dueDate: days(2),
      completedAt: null,
      verifiedAt: null,
      effectivenessNote: null,
      incidentRef: null,
      supplierName: null,
    },
  ];
  const correctiveActionByRef = new Map<string, { id: string; reference: string }>();
  for (const item of correctiveActionSeed) {
    const action = await db.correctiveAction.create({
      data: {
        workspaceId: northwind.id,
        reference: item.reference,
        title: item.title,
        description: item.description,
        source: item.source,
        status: item.status,
        priority: item.priority,
        ownerId: item.ownerId,
        dueDate: item.dueDate,
        completedAt: item.completedAt,
        verifiedAt: item.verifiedAt,
        effectivenessNote: item.effectivenessNote,
        incidentId: item.incidentRef ? (incidentByRef.get(item.incidentRef)?.id ?? null) : null,
        supplierId: item.supplierName ? (supplierByName.get(item.supplierName)?.id ?? null) : null,
        createdAt: days(-36),
      },
    });
    correctiveActionByRef.set(action.reference, action);
  }

  // A believable audit trail so the Activity and dashboard feeds are not empty on a fresh install.
  const [ismsPolicy, accessPolicy, phishingRisk, scanEvidence] = await Promise.all([
    db.policy.findFirst({ where: { workspaceId: northwind.id, title: "Information Security Policy" }, select: { id: true } }),
    db.policy.findFirst({ where: { workspaceId: northwind.id, title: "Access Control Policy" }, select: { id: true } }),
    db.risk.findFirst({ where: { workspaceId: northwind.id, title: "Phishing leads to workforce credential compromise" }, select: { id: true } }),
    db.evidence.findFirst({ where: { workspaceId: northwind.id, name: "External vulnerability scan — October" }, select: { id: true } }),
  ]);
  await db.auditEvent.createMany({
    data: [
      {
        workspaceId: northwind.id,
        actorId: demo.id,
        actorName: demo.name,
        action: "policy.status_changed",
        entityType: "Policy",
        entityId: ismsPolicy?.id ?? null,
        summary: "“Information Security Policy” set to approved",
        detail: "Version 3 · next review scheduled",
        createdAt: days(-9),
      },
      {
        workspaceId: northwind.id,
        actorId: priya.id,
        actorName: priya.name,
        action: "risk.created",
        entityType: "Risk",
        entityId: phishingRisk?.id ?? null,
        summary: "Raised risk “Phishing leads to workforce credential compromise”",
        detail: "People · score 16",
        createdAt: days(-6),
      },
      {
        workspaceId: northwind.id,
        actorId: demo.id,
        actorName: demo.name,
        action: "evidence.uploaded",
        entityType: "Evidence",
        entityId: scanEvidence?.id ?? null,
        summary: "Uploaded evidence “External vulnerability scan — October”",
        detail: "Valid until " + days(-9).toISOString().slice(0, 10),
        createdAt: days(-5),
      },
      {
        workspaceId: northwind.id,
        actorId: priya.id,
        actorName: priya.name,
        action: "soa.control_excluded",
        entityType: "Control",
        entityId: controlByRef.get("A.7.1")?.id ?? null,
        summary: "A.7.1 excluded from scope",
        detail: exclusionByRef["A.7.1"],
        createdAt: days(-3),
      },
      {
        workspaceId: northwind.id,
        actorId: demo.id,
        actorName: demo.name,
        action: "policy.updated",
        entityType: "Policy",
        entityId: accessPolicy?.id ?? null,
        summary: "Updated policy “Access Control Policy”",
        detail: "Saved version 2 · quarterly review cadence",
        createdAt: days(-2),
      },
      {
        workspaceId: northwind.id,
        actorId: demo.id,
        actorName: demo.name,
        action: "control.status_changed",
        entityType: "Control",
        entityId: controlByRef.get("A.8.8")?.id ?? null,
        summary: "A.8.8 set to implemented",
        detail: "Management of technical vulnerabilities",
        createdAt: days(-1),
      },
      {
        workspaceId: northwind.id,
        actorId: demo.id,
        actorName: demo.name,
        action: "supplier.reviewed",
        entityType: "Supplier",
        entityId: supplierByName.get("Amazon Web Services")?.id ?? null,
        summary: "Reviewed supplier “Amazon Web Services”",
        detail: "Next review in 6 months · critical criticality",
        createdAt: days(-2),
      },
      {
        workspaceId: northwind.id,
        actorId: demo.id,
        actorName: demo.name,
        action: "incident.reported",
        entityType: "Incident",
        entityId: incidentByRef.get("INC-0004")?.id ?? null,
        summary: "Reported INC-0004 “Suspicious OAuth consent grant”",
        detail: "low severity · phishing",
        createdAt: days(-1),
      },
      {
        workspaceId: northwind.id,
        actorId: priya.id,
        actorName: priya.name,
        action: "corrective_action.status_changed",
        entityType: "CorrectiveAction",
        entityId: correctiveActionByRef.get("CA-0006")?.id ?? null,
        summary: "CA-0006 moved to in progress",
        detail: "Exception report drafted; weekly review added to the compliance calendar.",
        createdAt: days(-1),
      },
    ],
  });

  const counts = await db.workspace.findMany({
    where: { slug: { in: SLUGS } },
    include: {
      _count: {
        select: {
          policies: true,
          risks: true,
          evidence: true,
          controls: true,
          suppliers: true,
          incidents: true,
          correctiveActions: true,
        },
      },
    },
  });
  console.log(
    `Demo ready: ${counts
      .map(
        (w) =>
          `${w.name} (${w._count.policies} policies, ${w._count.risks} risks, ${w._count.controls} controls, ${w._count.suppliers} suppliers, ${w._count.incidents} incidents, ${w._count.correctiveActions} actions)`,
      )
      .join("; ")}`,
  );
  console.log(`Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  void severity;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

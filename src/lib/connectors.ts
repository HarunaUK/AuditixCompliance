export type ConnectorCheck = { name: string; controlRef: string; detail: string };

export type Connector = {
  provider: string;
  name: string;
  accountLabel: string;
  envKey: string;
  checks: ConnectorCheck[];
};

/**
 * The connector catalogue mirrors the systems that hold the configuration our
 * controls ask about. Each connector declares the checks it can assert and the
 * environment variable its credential is read from — the browser never sees it.
 */
export const CONNECTORS: Connector[] = [
  {
    provider: "github",
    name: "GitHub",
    accountLabel: "Organisation",
    envKey: "GITHUB_TOKEN",
    checks: [
      { name: "Branch protection on default branch", controlRef: "A.8.32", detail: "Require reviews and status checks before merge." },
      { name: "Secret scanning enabled", controlRef: "A.8.28", detail: "Alert on committed credentials across all repositories." },
      { name: "Dependabot alerts enabled", controlRef: "A.8.8", detail: "Vulnerable dependency alerts are on for the organisation." },
      { name: "Two-factor enforcement", controlRef: "A.5.17", detail: "Organisation requires 2FA for every member." },
    ],
  },
  {
    provider: "aws",
    name: "Amazon Web Services",
    accountLabel: "Account ID",
    envKey: "AWS_ACCESS_KEY_ID",
    checks: [
      { name: "Root account MFA enabled", controlRef: "A.5.17", detail: "Hardware MFA on the root user." },
      { name: "CloudTrail multi-region", controlRef: "A.8.15", detail: "Trail active in all regions, log validation on." },
      { name: "S3 public access blocked", controlRef: "A.8.20", detail: "Account-level block public access enabled." },
      { name: "GuardDuty enabled", controlRef: "A.8.16", detail: "Threat detection active in every enabled region." },
    ],
  },
  {
    provider: "google",
    name: "Google Workspace",
    accountLabel: "Primary domain",
    envKey: "GOOGLE_ADMIN_TOKEN",
    checks: [
      { name: "2-step verification enforced", controlRef: "A.5.17", detail: "Enforced for all users in the domain." },
      { name: "Admin role assignments reviewed", controlRef: "A.8.2", detail: "Super admin count is minimal and reviewed." },
      { name: "Drive sharing restricted", controlRef: "A.8.12", detail: "External sharing limited to approved domains." },
    ],
  },
  {
    provider: "azure",
    name: "Microsoft 365 / Azure",
    accountLabel: "Tenant ID",
    envKey: "AZURE_CLIENT_SECRET",
    checks: [
      { name: "Security defaults or Conditional Access", controlRef: "A.5.17", detail: "MFA required for all users." },
      { name: "Audit log retention", controlRef: "A.8.15", detail: "Unified audit log retained for 12 months." },
      { name: "Legacy authentication blocked", controlRef: "A.8.5", detail: "Basic auth protocols disabled." },
    ],
  },
  {
    provider: "jira",
    name: "Jira",
    accountLabel: "Site",
    envKey: "JIRA_API_TOKEN",
    checks: [
      { name: "Change tickets linked to reviews", controlRef: "A.8.32", detail: "Changes carry an approval before release." },
      { name: "Access reviews for projects", controlRef: "A.5.18", detail: "Project membership reviewed each quarter." },
    ],
  },
  {
    provider: "okta",
    name: "Okta",
    accountLabel: "Org URL",
    envKey: "OKTA_API_TOKEN",
    checks: [
      { name: "MFA enrolled for all users", controlRef: "A.5.17", detail: "Every active user has a factor enrolled." },
      { name: "Deprovisioned users suspended", controlRef: "A.5.18", detail: "Leavers suspended within the agreed SLA." },
    ],
  },
];

export function findConnector(provider: string | null | undefined) {
  return CONNECTORS.find((connector) => connector.provider === provider) ?? null;
}

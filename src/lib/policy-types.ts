/**
 * Policy types offered by the AI generator. Shared by the dialog and the server
 * action so a crafted request cannot ask for an arbitrary document type.
 */
export const POLICY_TYPES = [
  "Information Security Policy",
  "Access Control Policy",
  "Asset Management Policy",
  "Cryptographic Control Policy",
  "Physical Security Policy",
  "Operations Security Policy",
  "Communications Security Policy",
  "System Development Policy",
  "Supplier Relationships Policy",
  "Incident Management Policy",
  "Business Continuity Policy",
  "Compliance Policy",
  "Human Resources Policy",
  "Mobile Device & Teleworking Policy",
  "Change Management Policy",
  "Data Protection & Privacy Policy",
  "Acceptable Use Policy",
  "Remote Working Policy",
  "Backup Policy",
  "Vulnerability & Patch Management Policy",
  "Logging & Monitoring Policy",
  "Network Security Policy",
  "Secure Development Policy",
  "Threat Intelligence Policy",
  "Data Classification & Handling Policy",
  "Acceptable AI Use Policy",
] as const;

export type PolicyType = (typeof POLICY_TYPES)[number];

export function isPolicyType(value: string): value is PolicyType {
  return (POLICY_TYPES as readonly string[]).includes(value);
}

import "server-only";
import { db } from "@/lib/db";

export type ProfileFields = {
  companyName: string | null;
  industry: string | null;
  headcount: number | null;
  geography: string | null;
  dataTypes: string | null;
  cloudProviders: string | null;
  saasTools: string | null;
  keySystems: string | null;
};

export const PROFILE_FIELD_COUNT = 8;

export function profileCompleteness(profile: ProfileFields | null) {
  if (!profile) return 0;
  const filled = [
    profile.companyName,
    profile.industry,
    profile.headcount,
    profile.geography,
    profile.dataTypes,
    profile.cloudProviders,
    profile.saasTools,
    profile.keySystems,
  ].filter((value) => (typeof value === "string" ? value.trim().length > 0 : value !== null && value !== undefined)).length;
  return Math.round((filled / PROFILE_FIELD_COUNT) * 100);
}

export async function getProfile(workspaceId: string) {
  return db.workspaceProfile.findUnique({ where: { workspaceId } });
}

/**
 * A deterministic first draft of the Clause 4.3 scope. It is intentionally
 * conservative: it states boundaries and dependencies from the intake, and
 * leaves the exclusion sentence for a human to complete.
 */
export function scopeDraft(
  workspaceName: string,
  profile: ProfileFields | null,
  frameworks: { name: string }[] = [],
) {
  const org = profile?.companyName?.trim() || workspaceName;
  const industry = profile?.industry?.trim() || "the services it provides";
  const geography = profile?.geography?.trim() || "all operating locations";
  const systems = profile?.keySystems?.trim() || "its business systems and supporting applications";
  const data = profile?.dataTypes?.trim() || "confidential business and customer information";
  const cloud = profile?.cloudProviders?.trim() || "cloud hosting providers";
  const saas = profile?.saasTools?.trim() || "third-party SaaS tools";
  const frameworkNames = frameworks.length
    ? frameworks.map((framework) => framework.name).join(", ")
    : "ISO/IEC 27001:2022";

  return [
    `The scope of the Information Security Management System (ISMS) at ${org} covers ${industry} operations delivered from ${geography}, including ${systems}.`,
    `The ISMS applies to the people, processes, information assets and supporting infrastructure used to deliver these services, including workloads hosted with ${cloud} and business services delivered through ${saas}.`,
    `It covers the confidentiality, integrity and availability of ${data} processed by ${org} and its workforce, contractors and relevant third parties.`,
    `The management system is assessed against ${frameworkNames}. Physical sites, subsidiaries or services not listed above are outside the scope unless a documented scope change is approved.`,
    `Exclusions: none identified at the time of this draft. Record any exclusion here with the justification required by Clause 6.1.3 and the Statement of Applicability.`,
  ].join("\n\n");
}

export function methodologyCompleteness(workspace: {
  methodologyProcess: string | null;
  methodologyLikelihood: string | null;
  methodologyImpact: string | null;
  acceptanceCriteria: string | null;
  methodologyReviewFrequency: string | null;
}) {
  const fields = [
    workspace.methodologyProcess,
    workspace.methodologyLikelihood,
    workspace.methodologyImpact,
    workspace.acceptanceCriteria,
    workspace.methodologyReviewFrequency,
  ];
  return Math.round((fields.filter((value) => Boolean(value?.trim())).length / fields.length) * 100);
}

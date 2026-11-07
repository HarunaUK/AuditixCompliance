import "server-only";
import { db } from "@/lib/db";

export const isoControlKey = "iso-27001-2022";

export async function frameworkPack(workspaceId: string, key: string) {
  const [framework, workspace] = await Promise.all([
    db.framework.findUnique({
      where: { key },
      include: {
        controls: {
          orderBy: { sortOrder: "asc" },
          include: {
            workspaceControls: { where: { workspaceId } },
            evidence: { where: { workspaceId }, select: { id: true, name: true } },
          },
        },
      },
    }),
    db.workspace.findUnique({ where: { id: workspaceId }, select: { reuseIsoEvidence: true } }),
  ]);
  if (!framework) return null;

  const isoRefs = Array.from(
    new Set(
      framework.controls.flatMap((control) => {
        const meta = (control.meta ?? {}) as { iso?: string[] };
        return meta.iso ?? [];
      }),
    ),
  );

  const isoEvidence =
    workspace?.reuseIsoEvidence && isoRefs.length
      ? await db.evidence.findMany({
          where: {
            workspaceId,
            control: { framework: { key: isoControlKey }, ref: { in: isoRefs } },
          },
          select: { id: true, name: true, control: { select: { ref: true } } },
        })
      : [];

  const isoByRef = new Map<string, { id: string; name: string }[]>();
  for (const row of isoEvidence) {
    const ref = row.control?.ref;
    if (!ref) continue;
    isoByRef.set(ref, [...(isoByRef.get(ref) ?? []), { id: row.id, name: row.name }]);
  }

  const controls = framework.controls.map((control) => {
    const meta = (control.meta ?? {}) as { domain?: string; domainLabel?: string; iso?: string[] };
    const state = control.workspaceControls[0];
    const reused = (meta.iso ?? []).flatMap((ref) => isoByRef.get(ref) ?? []);
    const reusedNames = Array.from(new Map(reused.map((row) => [row.id, row.name])).values());
    return {
      id: control.id,
      ref: control.ref,
      title: control.title,
      description: control.description,
      category: control.category,
      domain: meta.domain ?? control.ref.split(".")[0],
      domainLabel: meta.domainLabel ?? control.category,
      iso: meta.iso ?? [],
      status: state?.status ?? "NOT_STARTED",
      note: state?.note ?? null,
      ownerId: state?.ownerId ?? null,
      dueDate: state?.dueDate ?? null,
      reviewFrequency: state?.reviewFrequency ?? null,
      evidence: control.evidence,
      reused: reusedNames,
    };
  });

  const domains = Array.from(
    controls.reduce((map, control) => {
      const entry = map.get(control.domain) ?? {
        key: control.domain,
        label: control.domainLabel,
        total: 0,
        implemented: 0,
        inProgress: 0,
        notApplicable: 0,
        controls: [] as typeof controls,
      };
      entry.total += 1;
      if (control.status === "IMPLEMENTED") entry.implemented += 1;
      if (control.status === "IN_PROGRESS") entry.inProgress += 1;
      if (control.status === "NOT_APPLICABLE") entry.notApplicable += 1;
      entry.controls.push(control);
      map.set(control.domain, entry);
      return map;
    }, new Map<string, { key: string; label: string; total: number; implemented: number; inProgress: number; notApplicable: number; controls: typeof controls }>()),
  ).map(([, domain]) => {
    const applicable = domain.total - domain.notApplicable;
    return {
      ...domain,
      percent: applicable > 0 ? Math.round((domain.implemented / applicable) * 100) : 0,
      gap: applicable - domain.implemented,
    };
  });

  const applicable = controls.length - controls.filter((control) => control.status === "NOT_APPLICABLE").length;
  const implemented = controls.filter((control) => control.status === "IMPLEMENTED").length;

  return {
    framework: {
      id: framework.id,
      key: framework.key,
      name: framework.name,
      version: framework.version,
      description: framework.description,
      meta: framework.meta,
    },
    controls,
    domains,
    reuseIsoEvidence: workspace?.reuseIsoEvidence ?? false,
    isoEvidenceCount: isoEvidence.length,
    totals: {
      total: controls.length,
      applicable,
      implemented,
      gaps: applicable - implemented,
      percent: applicable > 0 ? Math.round((implemented / applicable) * 100) : 0,
    },
  };
}

export async function frameworkSummaries(workspaceId: string) {
  const frameworks = await db.framework.findMany({
    orderBy: { name: "asc" },
    include: {
      controls: {
        select: {
          id: true,
          workspaceControls: { where: { workspaceId }, select: { status: true } },
        },
      },
    },
  });

  return frameworks.map((framework) => {
    const applicable = framework.controls.filter((control) => control.workspaceControls[0]?.status !== "NOT_APPLICABLE").length;
    const implemented = framework.controls.filter((control) => control.workspaceControls[0]?.status === "IMPLEMENTED").length;
    return {
      key: framework.key,
      name: framework.name,
      version: framework.version,
      description: framework.description,
      meta: framework.meta,
      total: framework.controls.length,
      implemented,
      gaps: applicable - implemented,
      percent: applicable > 0 ? Math.round((implemented / applicable) * 100) : 0,
    };
  });
}

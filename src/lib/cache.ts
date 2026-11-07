/**
 * Every read model that is expensive to compute but scoped to a workspace uses
 * this tag. Any mutation that records an audit event invalidates it, so cached
 * dashboards never outlive a write.
 */
export const WORKSPACE_DATA_TAG = "workspace-data";

import { Card, CardBody, CardTitle, Badge } from "../../components/ui";

interface PlanInfo {
  name: string;
  status: "PENDING" | "COMPLETE" | "VERIFIED";
  completed: number;
  total: number;
  phase: "plan" | "implement" | "verify";
  iterations: number;
  approved: boolean;
  worktree: boolean;
  specType?: "Feature" | "Bugfix";
  filePath?: string;
}

export interface PlanStatusProps {
  plans: PlanInfo[];
}

const phaseConfig = {
  plan: { label: "Planning", color: "info", border: "border-l-info" },
  implement: {
    label: "Implementing",
    color: "warning",
    border: "border-l-warning",
  },
  verify: { label: "Verifying", color: "accent", border: "border-l-accent" },
} as const;

function PlanRow({ plan }: { plan: PlanInfo }) {
  const config = phaseConfig[plan.phase];
  const progressPct = plan.total > 0 ? (plan.completed / plan.total) * 100 : 0;
  const needsAttention = plan.status === "PENDING" && !plan.approved;

  return (
    <div
      className={`border-l-4 ${config.border} pl-3 py-2${needsAttention ? " animate-pulse" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm truncate" title={plan.name}>
          {plan.name}
          {plan.specType === "Bugfix" && (
            <span className="ml-1.5 text-xs text-warning font-normal">
              bugfix
            </span>
          )}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant={config.color as "info" | "warning" | "accent"}
            size="xs"
          >
            {config.label}
          </Badge>
          <span className="text-xs font-mono text-base-content/60">
            {plan.completed}/{plan.total}
          </span>
        </div>
      </div>
      <div className="w-full bg-base-300 rounded-full h-1.5 mt-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${
            progressPct === 100 ? "bg-success" : "bg-primary"
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}

export function PlanStatus({ plans }: PlanStatusProps) {
  if (plans.length === 0) {
    return (
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CardTitle>Specification Status</CardTitle>
              <Badge variant="ghost" size="sm">
                Workspace
              </Badge>
            </div>
            <Badge variant="ghost">Quick Mode</Badge>
          </div>
          <div className="text-sm text-base-content/60">
            <p>No active spec-driven plan.</p>
            <p className="mt-2">
              Use <code className="text-primary">/spec</code> for complex tasks.
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CardTitle>Specification Status</CardTitle>
            <Badge variant="ghost" size="sm">
              Workspace
            </Badge>
          </div>
          <Badge variant="info">{plans.length} active</Badge>
        </div>
        <div className="space-y-2">
          {plans.map((plan, idx) => (
            <PlanRow key={plan.filePath ?? `${plan.name}-${idx}`} plan={plan} />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

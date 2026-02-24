import { Card, CardBody, Badge, Icon, Progress } from "../../components/ui";

interface ParsedTask {
  number: number;
  title: string;
  completed: boolean;
}

interface ParsedPlan {
  title: string;
  goal: string;
  tasks: ParsedTask[];
}

interface SpecMeta {
  status: "PENDING" | "COMPLETE" | "VERIFIED";
  iterations: number;
  approved: boolean;
  worktree: boolean;
  specType?: "Feature" | "Bugfix";
  filePath: string;
  modifiedAt: string;
}

const statusConfig = {
  PENDING: { color: "warning", icon: "lucide:clock", label: "In Progress" },
  COMPLETE: { color: "info", icon: "lucide:check-circle", label: "Complete" },
  VERIFIED: {
    color: "success",
    icon: "lucide:shield-check",
    label: "Verified",
  },
} as const;

export function SpecHeaderCard({
  parsed,
  spec,
  onTaskClick,
}: {
  parsed: ParsedPlan;
  spec: SpecMeta;
  onTaskClick?: (taskNumber: number) => void;
}) {
  const config = statusConfig[spec.status];
  const completedCount = parsed.tasks.filter((t) => t.completed).length;
  const totalCount = parsed.tasks.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Card>
      <CardBody className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">{parsed.title}</h2>
            {parsed.goal && (
              <p className="text-base-content/60 text-sm mt-1">{parsed.goal}</p>
            )}
          </div>
          <Badge
            variant={config.color as "warning" | "info" | "success"}
            size="sm"
            className="whitespace-nowrap"
          >
            <Icon icon={config.icon} size={12} className="mr-1" />
            {config.label}
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-base-content/70">Progress</span>
            <span className="font-medium">
              {completedCount} / {totalCount} tasks
            </span>
          </div>
          <Progress value={progressPct} max={100} variant="primary" />
        </div>

        {/* Task Checklist */}
        <div className="space-y-2">
          {parsed.tasks.map((task) => (
            <div
              key={task.number}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                task.completed
                  ? "bg-success/10 hover:bg-success/15"
                  : "bg-base-200/50 hover:bg-base-200"
              }`}
              onClick={() => onTaskClick?.(task.number)}
            >
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center ${
                  task.completed
                    ? "bg-success text-success-content"
                    : "bg-base-300"
                }`}
              >
                {task.completed ? (
                  <Icon icon="lucide:check" size={14} />
                ) : (
                  <span className="text-xs text-base-content/50">
                    {task.number}
                  </span>
                )}
              </div>
              <span
                className={`text-sm ${task.completed ? "text-base-content/70" : "text-base-content"}`}
              >
                Task {task.number}: {task.title}
              </span>
            </div>
          ))}
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-base-300/50 text-xs text-base-content/50">
          <Badge
            variant={spec.specType === "Bugfix" ? "warning" : "info"}
            size="xs"
          >
            {spec.specType === "Bugfix" ? "Bugfix" : "Feature"}
          </Badge>
          {spec.iterations > 0 && (
            <div className="flex items-center gap-1">
              <Icon icon="lucide:repeat" size={12} />
              <span>
                {spec.iterations} iteration
                {spec.iterations > 1 ? "s" : ""}
              </span>
            </div>
          )}
          {!spec.approved && spec.status === "PENDING" && (
            <Badge variant="warning" size="xs">
              Awaiting Approval
            </Badge>
          )}
          {spec.worktree ? (
            <div className="flex items-center gap-1">
              <Icon icon="lucide:git-branch" size={12} />
              <span>Worktree</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Icon icon="lucide:git-commit" size={12} />
              <span>Direct</span>
            </div>
          )}
          {spec.modifiedAt && (
            <div className="flex items-center gap-1">
              <Icon icon="lucide:calendar" size={12} />
              <span>
                {new Date(spec.modifiedAt).toLocaleString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <Icon icon="lucide:file" size={12} />
            <span className="font-mono">{spec.filePath.split("/").pop()}</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

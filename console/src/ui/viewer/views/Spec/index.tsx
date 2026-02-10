import { useState, useEffect, useCallback } from 'react';
import { Card, CardBody, Badge, Icon, Button, Spinner, Progress, Tooltip } from '../../components/ui';
import { SpecContent } from './SpecContent';
import { WorktreePanel } from './WorktreePanel';
import { TIMING } from '../../constants/timing';
import { useProject } from '../../context';

interface PlanInfo {
  name: string;
  status: 'PENDING' | 'COMPLETE' | 'VERIFIED';
  completed: number;
  total: number;
  phase: 'plan' | 'implement' | 'verify';
  iterations: number;
  approved: boolean;
  worktree: boolean;
  filePath: string;
  modifiedAt: string;
}

interface PlanContent {
  content: string;
  name: string;
  status: string;
  filePath: string;
}

interface ParsedTask {
  number: number;
  title: string;
  completed: boolean;
}

interface ParsedPlan {
  title: string;
  goal: string;
  tasks: ParsedTask[];
  implementationSection: string;
}

const statusConfig = {
  PENDING: { color: 'warning', icon: 'lucide:clock', label: 'In Progress' },
  COMPLETE: { color: 'info', icon: 'lucide:check-circle', label: 'Complete' },
  VERIFIED: { color: 'success', icon: 'lucide:shield-check', label: 'Verified' },
} as const;

function parsePlanContent(content: string): ParsedPlan {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].replace(' Implementation Plan', '') : 'Untitled';

  const goalMatch = content.match(/\*\*Goal:\*\*\s*(.+?)(?:\n|$)/);
  const goal = goalMatch ? goalMatch[1] : '';

  const tasks: ParsedTask[] = [];
  const taskRegex = /^- \[(x| )\] Task (\d+):\s*(.+)$/gm;
  let match;
  while ((match = taskRegex.exec(content)) !== null) {
    tasks.push({
      number: parseInt(match[2], 10),
      title: match[3],
      completed: match[1] === 'x',
    });
  }

  const implMatch = content.match(/## Implementation Tasks\n([\s\S]*?)(?=\n## [^#]|$)/);
  const implementationSection = implMatch ? implMatch[1].trim() : '';

  return { title, goal, tasks, implementationSection };
}

export function SpecView() {
  const { selectedProject } = useProject();
  const [specs, setSpecs] = useState<PlanInfo[]>([]);
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null);
  const [content, setContent] = useState<PlanContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const projectParam = selectedProject ? `?project=${encodeURIComponent(selectedProject)}` : '';

  const loadSpecs = useCallback(async () => {
    try {
      const res = await fetch(`/api/plans/active${projectParam}`);
      const data = await res.json();
      setSpecs(data.specs || []);

      if (data.specs?.length > 0 && !selectedSpec) {
        const active = data.specs.find((s: PlanInfo) => s.status === 'PENDING' || s.status === 'COMPLETE');
        setSelectedSpec(active ? active.filePath : data.specs[0].filePath);
      }
    } catch (err) {
      setError('Failed to load specs');
      console.error('Failed to load specs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSpec, projectParam]);

  const loadContent = useCallback(async (filePath: string, background = false) => {
    if (!background) {
      setIsLoadingContent(true);
    }
    setError(null);
    try {
      const res = await fetch(`/api/plan/content?path=${encodeURIComponent(filePath)}${selectedProject ? `&project=${encodeURIComponent(selectedProject)}` : ''}`);
      if (!res.ok) {
        throw new Error('Failed to load spec content');
      }
      const data = await res.json();
      setContent(data);
    } catch (err) {
      setError('Failed to load spec content');
      console.error('Failed to load spec content:', err);
    } finally {
      if (!background) {
        setIsLoadingContent(false);
      }
    }
  }, [selectedProject]);

  const deleteSpec = useCallback(async (filePath: string) => {
    if (!confirm(`Delete spec "${filePath.split('/').pop()}"? This cannot be undone.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/plan?path=${encodeURIComponent(filePath)}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to delete spec');
      }
      setSelectedSpec(null);
      setContent(null);
      await loadSpecs();
    } catch (err) {
      setError('Failed to delete spec');
      console.error('Failed to delete spec:', err);
    } finally {
      setIsDeleting(false);
    }
  }, [loadSpecs]);

  useEffect(() => {
    loadSpecs();
    const interval = setInterval(() => {
      loadSpecs();
      if (selectedSpec) {
        loadContent(selectedSpec, true);
      }
    }, TIMING.SPEC_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadSpecs, loadContent, selectedSpec]);

  useEffect(() => {
    if (selectedSpec) {
      loadContent(selectedSpec);
    }
  }, [selectedSpec, loadContent]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (specs.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardBody>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icon icon="lucide:file-text" size={48} className="text-base-content/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Specs</h3>
              <p className="text-base-content/60 max-w-md">
                Use <code className="text-primary bg-base-300 px-1 rounded">/spec</code> in Claude Pilot to start a spec-driven development workflow.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const activeSpecs = specs.filter(s => s.status === 'PENDING' || s.status === 'COMPLETE');
  const archivedSpecs = specs.filter(s => s.status === 'VERIFIED');
  const currentSpec = specs.find(s => s.filePath === selectedSpec);
  const config = currentSpec ? statusConfig[currentSpec.status] : null;
  const parsed = content ? parsePlanContent(content.content) : null;
  const completedCount = parsed?.tasks.filter(t => t.completed).length || 0;
  const totalCount = parsed?.tasks.length || 0;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header: title + spec selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold mr-auto">Specifications</h1>

        {/* Active plan tabs */}
        {activeSpecs.length > 0 && (
          <div role="tablist" className="flex items-center gap-1.5 flex-shrink-0">
            {activeSpecs.map((spec) => {
              const isActive = selectedSpec === spec.filePath;
              return (
                <button
                  key={spec.filePath}
                  role="tab"
                  aria-selected={isActive}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-base-200/60 border-base-300/50 text-base-content/70 hover:bg-base-200'
                  }`}
                  onClick={() => setSelectedSpec(spec.filePath)}
                >
                  <Icon
                    icon={statusConfig[spec.status].icon}
                    size={12}
                    className={spec.status === 'PENDING' ? 'text-warning' : 'text-info'}
                  />
                  <span className="truncate max-w-32">{spec.name}</span>
                  {spec.total > 0 && (
                    <span className="text-[10px] opacity-60">{spec.completed}/{spec.total}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Archived plans dropdown */}
        {archivedSpecs.length > 0 && (
          <select
            className="select select-bordered select-sm"
            value={currentSpec?.status === 'VERIFIED' ? selectedSpec || '' : ''}
            onChange={(e) => setSelectedSpec(e.target.value)}
          >
            <option value="" disabled>
              Archived ({archivedSpecs.length})
            </option>
            {archivedSpecs.map((spec) => {
              const date = spec.modifiedAt ? new Date(spec.modifiedAt) : null;
              const dateStr = date
                ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                : '';
              return (
                <option key={spec.filePath} value={spec.filePath}>
                  {spec.name}{dateStr ? ` - ${dateStr}` : ''}
                </option>
              );
            })}
          </select>
        )}

        {/* Delete button */}
        {selectedSpec && (
          <Tooltip text="Delete spec" position="bottom">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteSpec(selectedSpec)}
              disabled={isDeleting}
            >
              <Icon icon="lucide:trash-2" size={16} className="text-error" />
            </Button>
          </Tooltip>
        )}
      </div>

      {isLoadingContent ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : error ? (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icon icon="lucide:alert-circle" size={48} className="text-error mb-4" />
              <p className="text-error">{error}</p>
            </div>
          </CardBody>
        </Card>
      ) : parsed ? (
        <>
          {/* Structured Header Card */}
          <Card>
            <CardBody className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{parsed.title}</h2>
                  {parsed.goal && (
                    <p className="text-base-content/60 text-sm mt-1">{parsed.goal}</p>
                  )}
                </div>
                {config && (
                  <Badge variant={config.color as 'warning' | 'info' | 'success'} size="sm" className="whitespace-nowrap">
                    <Icon icon={config.icon} size={12} className="mr-1" />
                    {config.label}
                  </Badge>
                )}
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-base-content/70">Progress</span>
                  <span className="font-medium">{completedCount} / {totalCount} tasks</span>
                </div>
                <Progress value={progressPct} max={100} variant="primary" />
              </div>

              {/* Task Checklist */}
              <div className="space-y-2">
                {parsed.tasks.map((task) => (
                  <div
                    key={task.number}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      task.completed ? 'bg-success/10' : 'bg-base-200/50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                      task.completed ? 'bg-success text-success-content' : 'bg-base-300'
                    }`}>
                      {task.completed ? (
                        <Icon icon="lucide:check" size={14} />
                      ) : (
                        <span className="text-xs text-base-content/50">{task.number}</span>
                      )}
                    </div>
                    <span className={`text-sm ${task.completed ? 'text-base-content/70' : 'text-base-content'}`}>
                      Task {task.number}: {task.title}
                    </span>
                  </div>
                ))}
              </div>

              {/* Metadata row */}
              {currentSpec && (
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-base-300/50 text-xs text-base-content/50">
                  {currentSpec.iterations > 0 && (
                    <div className="flex items-center gap-1">
                      <Icon icon="lucide:repeat" size={12} />
                      <span>{currentSpec.iterations} iteration{currentSpec.iterations > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {!currentSpec.approved && currentSpec.status === 'PENDING' && (
                    <Badge variant="warning" size="xs">Awaiting Approval</Badge>
                  )}
                  {currentSpec.worktree ? (
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
                  {currentSpec.modifiedAt && (
                    <div className="flex items-center gap-1">
                      <Icon icon="lucide:calendar" size={12} />
                      <span>{new Date(currentSpec.modifiedAt).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    <Icon icon="lucide:file" size={12} />
                    <span className="font-mono">{currentSpec.filePath.split('/').pop()}</span>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Worktree isolation panel */}
          <WorktreePanel />

          {/* Implementation Tasks - Markdown */}
          {parsed.implementationSection && (
            <Card>
              <CardBody className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Icon icon="lucide:list-tree" size={18} />
                  Implementation Details
                </h3>
                <SpecContent content={parsed.implementationSection} />
              </CardBody>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}

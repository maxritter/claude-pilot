import { Card, CardBody, CardTitle, Badge, Icon } from '../../components/ui';

interface GitInfo {
  branch: string | null;
  staged: number;
  unstaged: number;
  untracked: number;
}

interface GitStatusProps {
  gitInfo: GitInfo;
}

export function GitStatus({ gitInfo }: GitStatusProps) {
  const { branch, staged, unstaged, untracked } = gitInfo;
  const hasChanges = staged > 0 || unstaged > 0 || untracked > 0;

  if (!branch) {
    return (
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Git Status</CardTitle>
            <Badge variant="ghost">Not a repo</Badge>
          </div>
          <div className="text-sm text-base-content/60">
            <p>No git repository detected.</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Git Status</CardTitle>
          <Badge variant={hasChanges ? 'warning' : 'success'}>
            {hasChanges ? 'Changes' : 'Clean'}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Icon icon="lucide:git-branch" size={16} className="text-base-content/50" />
            <span className="text-base-content/70">Branch:</span>
            <span className="font-mono font-medium text-primary">{branch}</span>
          </div>

          {staged > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Icon icon="lucide:plus-circle" size={16} className="text-success" />
              <span className="text-base-content/70">Staged:</span>
              <span className="font-mono text-success">{staged} file{staged !== 1 ? 's' : ''}</span>
            </div>
          )}

          {unstaged > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Icon icon="lucide:edit" size={16} className="text-warning" />
              <span className="text-base-content/70">Modified:</span>
              <span className="font-mono text-warning">{unstaged} file{unstaged !== 1 ? 's' : ''}</span>
            </div>
          )}

          {untracked > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Icon icon="lucide:file-plus" size={16} className="text-info" />
              <span className="text-base-content/70">Untracked:</span>
              <span className="font-mono text-info">{untracked} file{untracked !== 1 ? 's' : ''}</span>
            </div>
          )}

          {!hasChanges && (
            <div className="flex items-center gap-2 text-sm text-base-content/60">
              <Icon icon="lucide:check-circle" size={16} className="text-success" />
              <span>Working tree clean</span>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

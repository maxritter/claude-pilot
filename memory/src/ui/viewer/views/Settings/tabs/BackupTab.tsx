import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardBody, CardTitle, Button, Icon, Badge, Toggle, Spinner } from '../../../components/ui';

interface BackupInfo {
  filename: string;
  path: string;
  createdAt: string;
  sizeBytes: number;
  metadata?: {
    version: string;
    createdAt: string;
    stats: {
      observations: number;
      sessions: number;
      summaries: number;
      prompts: number;
      dbSizeBytes: number;
    };
  };
}

interface BackupTabProps {
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

export function BackupTab({ settings, onSettingChange }: BackupTabProps) {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [includeSettings, setIncludeSettings] = useState(true);
  const [compress, setCompress] = useState(true);
  const [restoreSettings, setRestoreSettings] = useState(false);
  const [clearExisting, setClearExisting] = useState(false);
  const [backupDir, setBackupDir] = useState('');

  const fetchBackups = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/backups');
      const data = await response.json();
      setBackups(data.backups || []);
      setBackupDir(data.backupDir || '');
    } catch (error) {
      console.error('Failed to fetch backups:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/backups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeSettings, compress }),
      });
      const data = await response.json();
      if (data.success) {
        fetchBackups();
      }
    } catch (error) {
      console.error('Failed to create backup:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`Delete backup "${filename}"?`)) return;

    try {
      const response = await fetch(`/api/backups/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchBackups();
      }
    } catch (error) {
      console.error('Failed to delete backup:', error);
    }
  };

  const handleRestore = async (filename: string) => {
    const confirmMsg = clearExisting
      ? `This will CLEAR ALL EXISTING DATA and restore from "${filename}". Are you sure?`
      : `Restore from "${filename}"? Existing data will be preserved if IDs don't conflict.`;

    if (!confirm(confirmMsg)) return;

    setIsRestoring(filename);
    try {
      const response = await fetch(`/api/backups/${encodeURIComponent(filename)}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restoreSettings, clearExisting }),
      });
      const data = await response.json();
      if (data.success) {
        alert(
          `Restore completed!\n\n` +
            `Sessions: ${data.stats.sessionsRestored} restored, ${data.stats.sessionsSkipped} skipped\n` +
            `Observations: ${data.stats.observationsRestored} restored, ${data.stats.observationsSkipped} skipped\n` +
            `Settings: ${data.stats.settingsRestored ? 'Restored' : 'Not restored'}`
        );
      }
    } catch (error) {
      console.error('Failed to restore backup:', error);
      alert('Failed to restore backup');
    } finally {
      setIsRestoring(null);
    }
  };

  const handleDownload = (filename: string) => {
    window.open(`/api/backups/${encodeURIComponent(filename)}/download`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Create Backup */}
      <Card>
        <CardBody>
          <CardTitle>Create Backup</CardTitle>
          <p className="text-sm text-base-content/60 mb-4">
            Create a backup of your Claude Pilot database and settings
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Include Settings</p>
                <p className="text-sm text-base-content/60">Backup settings.json configuration</p>
              </div>
              <Toggle checked={includeSettings} onChange={(e) => setIncludeSettings(e.target.checked)} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Compress Backup</p>
                <p className="text-sm text-base-content/60">Use gzip compression (recommended)</p>
              </div>
              <Toggle checked={compress} onChange={(e) => setCompress(e.target.checked)} />
            </div>

            <Button onClick={handleCreateBackup} loading={isCreating} className="w-full">
              <Icon icon="lucide:download" size={16} className="mr-2" />
              Create Backup Now
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Restore Options */}
      <Card>
        <CardBody>
          <CardTitle>Restore Options</CardTitle>
          <p className="text-sm text-base-content/60 mb-4">Configure how backups are restored</p>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Restore Settings</p>
                <p className="text-sm text-base-content/60">Overwrite current settings with backup</p>
              </div>
              <Toggle checked={restoreSettings} onChange={(e) => setRestoreSettings(e.target.checked)} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-error">Clear Existing Data</p>
                <p className="text-sm text-base-content/60">Delete all data before restoring (destructive!)</p>
              </div>
              <Toggle checked={clearExisting} onChange={(e) => setClearExisting(e.target.checked)} />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Available Backups */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle>Available Backups</CardTitle>
              <p className="text-sm text-base-content/60 mt-1">
                Stored in: <code className="text-xs bg-base-200 px-1 rounded">{backupDir}</code>
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchBackups}>
              <Icon icon="lucide:refresh-cw" size={14} />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-base-content/60">
              <Icon icon="lucide:archive" size={48} className="mx-auto mb-2 opacity-50" />
              <p>No backups found</p>
              <p className="text-sm">Create your first backup above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => (
                <div key={backup.filename} className="p-4 bg-base-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <Icon
                          icon={backup.filename.endsWith('.gz') ? 'lucide:archive' : 'lucide:file-json'}
                          size={16}
                        />
                        {backup.filename}
                      </p>
                      <p className="text-sm text-base-content/60 mt-1">{formatDate(backup.createdAt)}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary" size="xs">
                          {formatBytes(backup.sizeBytes)}
                        </Badge>
                        {backup.metadata && (
                          <>
                            <Badge variant="info" size="xs">
                              {backup.metadata.stats.observations} memories
                            </Badge>
                            <Badge variant="secondary" size="xs">
                              {backup.metadata.stats.sessions} sessions
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(backup.filename)}
                        title="Download"
                      >
                        <Icon icon="lucide:download" size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(backup.filename)}
                        loading={isRestoring === backup.filename}
                        title="Restore"
                      >
                        <Icon icon="lucide:upload" size={14} className="mr-1" />
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBackup(backup.filename)}
                        className="text-error"
                        title="Delete"
                      >
                        <Icon icon="lucide:trash-2" size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

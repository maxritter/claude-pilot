import React from 'react';
import { Button, Icon, Select, Dropdown } from '../../components/ui';

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'observation' | 'summary' | 'prompt';

interface MemoriesToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  filterType: FilterType;
  onFilterTypeChange: (type: FilterType) => void;
  totalCount: number;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  selectedCount: number;
  onSelectAll: () => void;
  onExport: (format: 'json' | 'csv' | 'markdown') => void;
  onDelete: () => void;
  isExporting: boolean;
  isDeleting: boolean;
  allSelected: boolean;
}

const filterOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'observation', label: 'Observations' },
  { value: 'summary', label: 'Summaries' },
  { value: 'prompt', label: 'Prompts' },
];

export function MemoriesToolbar({
  viewMode,
  onViewModeChange,
  filterType,
  onFilterTypeChange,
  totalCount,
  selectionMode,
  onToggleSelectionMode,
  selectedCount,
  onSelectAll,
  onExport,
  onDelete,
  isExporting,
  isDeleting,
  allSelected,
}: MemoriesToolbarProps) {
  const exportItems = [
    { label: 'Export as JSON', onClick: () => onExport('json'), icon: <Icon icon="lucide:file-json" size={16} /> },
    { label: 'Export as CSV', onClick: () => onExport('csv'), icon: <Icon icon="lucide:file-spreadsheet" size={16} /> },
    { label: 'Export as Markdown', onClick: () => onExport('markdown'), icon: <Icon icon="lucide:file-text" size={16} /> },
  ];

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        {selectionMode ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
            >
              <Icon icon={allSelected ? 'lucide:check-square' : 'lucide:square'} size={16} className="mr-1" />
              {allSelected ? 'Deselect All' : 'Select All'}
            </Button>
            <span className="text-sm text-base-content/60">
              {selectedCount} of {totalCount} selected
            </span>
          </>
        ) : (
          <span className="text-sm text-base-content/60">{totalCount} items</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {selectionMode ? (
          <>
            <Dropdown
              trigger={
                <Button variant="primary" size="sm" loading={isExporting} disabled={selectedCount === 0}>
                  <Icon icon="lucide:download" size={16} className="mr-1" />
                  Export
                </Button>
              }
              items={exportItems}
            />
            <Button
              variant="error"
              size="sm"
              onClick={onDelete}
              loading={isDeleting}
              disabled={selectedCount === 0}
            >
              <Icon icon="lucide:trash-2" size={16} className="mr-1" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggleSelectionMode}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={onToggleSelectionMode}>
              <Icon icon="lucide:check-square" size={16} className="mr-1" />
              Select
            </Button>
            <Select
              options={filterOptions}
              value={filterType}
              onChange={(e) => onFilterTypeChange(e.target.value as FilterType)}
              selectSize="sm"
              className="w-40"
            />
            <div className="btn-group">
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
              >
                <Icon icon="lucide:grid-3x3" size={16} />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('list')}
              >
                <Icon icon="lucide:list" size={16} />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Badge, Icon } from '../../components/ui';
import { TagChip } from '../../components/Tags';

interface Tag {
  name: string;
  color: string;
  usage_count: number;
}

interface SearchFiltersProps {
  filters: {
    type?: string;
    project?: string;
    dateRange?: string;
    tags?: string[];
  };
  onFilterChange: (key: string, value: string | string[] | undefined) => void;
}

const typeOptions = ['observation', 'summary', 'prompt'];
const dateOptions = ['today', 'week', 'month', 'year'];

export function SearchFilters({ filters, onFilterChange }: SearchFiltersProps) {
  const [popularTags, setPopularTags] = useState<Tag[]>([]);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);

  useEffect(() => {
    async function fetchPopularTags() {
      try {
        const response = await fetch('/api/tags/popular?limit=10');
        const data = await response.json();
        setPopularTags(data.tags || []);
      } catch (error) {
        console.error('Failed to fetch popular tags:', error);
      }
    }
    fetchPopularTags();
  }, []);

  const toggleTag = (tagName: string) => {
    const currentTags = filters.tags || [];
    if (currentTags.includes(tagName)) {
      onFilterChange('tags', currentTags.filter(t => t !== tagName));
    } else {
      onFilterChange('tags', [...currentTags, tagName]);
    }
  };

  const hasAnyFilter = filters.type || filters.dateRange || filters.project || (filters.tags && filters.tags.length > 0);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-base-content/60 self-center mr-2">Filters:</span>

        {typeOptions.map((type) => (
          <Badge
            key={type}
            variant={filters.type === type ? 'primary' : 'ghost'}
            className="cursor-pointer"
            onClick={() => onFilterChange('type', filters.type === type ? undefined : type)}
          >
            {type}
          </Badge>
        ))}

        <div className="border-l border-base-300 mx-2" />

        {dateOptions.map((date) => (
          <Badge
            key={date}
            variant={filters.dateRange === date ? 'primary' : 'ghost'}
            className="cursor-pointer"
            onClick={() => onFilterChange('dateRange', filters.dateRange === date ? undefined : date)}
          >
            {date}
          </Badge>
        ))}

        {popularTags.length > 0 && (
          <>
            <div className="border-l border-base-300 mx-2" />
            <div className="relative">
              <Badge
                variant={filters.tags && filters.tags.length > 0 ? 'primary' : 'ghost'}
                className="cursor-pointer"
                onClick={() => setShowTagsDropdown(!showTagsDropdown)}
              >
                <Icon icon="lucide:tags" size={12} className="mr-1" />
                Tags
                {filters.tags && filters.tags.length > 0 && (
                  <span className="ml-1">({filters.tags.length})</span>
                )}
              </Badge>

              {showTagsDropdown && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-base-100 border border-base-300 rounded-lg shadow-lg p-2 min-w-[200px]">
                  <div className="text-xs text-base-content/50 mb-2">Popular Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {popularTags.map(tag => (
                      <TagChip
                        key={tag.name}
                        name={tag.name}
                        color={tag.color}
                        size="xs"
                        onClick={() => toggleTag(tag.name)}
                        className={filters.tags?.includes(tag.name) ? 'ring-2 ring-primary' : ''}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {hasAnyFilter && (
          <>
            <div className="border-l border-base-300 mx-2" />
            <Badge
              variant="error"
              outline
              className="cursor-pointer"
              onClick={() => {
                onFilterChange('type', undefined);
                onFilterChange('dateRange', undefined);
                onFilterChange('project', undefined);
                onFilterChange('tags', undefined);
              }}
            >
              <Icon icon="lucide:x" size={12} className="mr-1" />
              Clear
            </Badge>
          </>
        )}
      </div>

      {/* Selected tags display */}
      {filters.tags && filters.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-xs text-base-content/50 mr-1">Tagged:</span>
          {filters.tags.map(tagName => {
            const tag = popularTags.find(t => t.name === tagName);
            return (
              <TagChip
                key={tagName}
                name={tagName}
                color={tag?.color || '#6b7280'}
                size="xs"
                onRemove={() => toggleTag(tagName)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

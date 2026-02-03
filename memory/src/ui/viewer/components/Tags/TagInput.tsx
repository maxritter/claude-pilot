import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../ui';
import { TagChip } from './TagChip';

interface Tag {
  name: string;
  color: string;
  usage_count?: number;
}

interface TagInputProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestions?: Tag[];
  placeholder?: string;
  className?: string;
}

export function TagInput({
  selectedTags,
  onTagsChange,
  suggestions = [],
  placeholder = 'Add tags...',
  className = ''
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  const filteredSuggestions = suggestions.filter(
    tag =>
      tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedTags.includes(tag.name)
  );

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tagName: string) => {
    const normalized = tagName.toLowerCase().trim();
    if (normalized && !selectedTags.includes(normalized)) {
      onTagsChange([...selectedTags, normalized]);
    }
    setInputValue('');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const removeTag = (tagName: string) => {
    onTagsChange(selectedTags.filter(t => t !== tagName));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        addTag(filteredSuggestions[highlightedIndex].name);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const getTagColor = (tagName: string) => {
    const suggestion = suggestions.find(s => s.name === tagName);
    return suggestion?.color || '#6b7280';
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex flex-wrap gap-1 p-2 border border-base-300 rounded-lg bg-base-100 focus-within:border-primary transition-colors">
        {selectedTags.map(tag => (
          <TagChip
            key={tag}
            name={tag}
            color={getTagColor(tag)}
            onRemove={() => removeTag(tag)}
            size="xs"
          />
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] bg-transparent outline-none text-sm"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredSuggestions.map((tag, index) => (
            <button
              key={tag.name}
              onClick={() => addTag(tag.name)}
              className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-base-200 ${
                index === highlightedIndex ? 'bg-base-200' : ''
              }`}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              <span className="flex-1">{tag.name}</span>
              {tag.usage_count !== undefined && (
                <span className="text-xs text-base-content/50">
                  {tag.usage_count} uses
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Create new tag hint */}
      {showSuggestions && inputValue && filteredSuggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg p-3 text-sm text-base-content/60">
          <span>Press Enter to create tag "</span>
          <span className="font-medium text-base-content">{inputValue}</span>
          <span>"</span>
        </div>
      )}
    </div>
  );
}

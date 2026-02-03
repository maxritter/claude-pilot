import React, { useState } from 'react';
import { Icon, Button } from '../../components/ui';

interface SearchInputProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
}

export function SearchInput({ onSearch, isSearching }: SearchInputProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Icon
          icon="lucide:search"
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/50"
        />
        <input
          type="text"
          placeholder="Search your memories semantically..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input input-bordered w-full pl-12 pr-4"
        />
      </div>
      <Button type="submit" loading={isSearching} disabled={!query.trim()}>
        Search
      </Button>
    </form>
  );
}

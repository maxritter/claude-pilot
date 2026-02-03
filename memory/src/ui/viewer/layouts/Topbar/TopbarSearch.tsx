import React, { useState } from 'react';
import { Icon } from '../../components/ui';

interface TopbarSearchProps {
  onSearch: (query: string) => void;
}

export function TopbarSearch({ onSearch }: TopbarSearchProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 max-w-md">
      <div className="relative">
        <Icon
          icon="lucide:search"
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50"
        />
        <input
          type="text"
          placeholder="Search memories... (Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input input-bordered input-sm w-full pl-10 pr-4"
        />
      </div>
    </form>
  );
}

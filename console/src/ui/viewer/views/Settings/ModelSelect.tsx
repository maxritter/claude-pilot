import React from 'react';
import { MODEL_DISPLAY_NAMES } from '../../hooks/useSettings.js';

interface ModelSelectProps {
  value: string;
  choices: readonly string[];
  onChange: (model: string) => void;
  disabled?: boolean;
  id?: string;
}

export function ModelSelect({ value, choices, onChange, disabled = false, id }: ModelSelectProps) {
  return (
    <select
      id={id}
      className="select select-sm select-bordered w-full max-w-xs"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {choices.map((model) => (
        <option key={model} value={model}>
          {MODEL_DISPLAY_NAMES[model] ?? model}
        </option>
      ))}
    </select>
  );
}

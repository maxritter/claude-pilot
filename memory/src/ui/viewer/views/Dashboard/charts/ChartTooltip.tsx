import React from 'react';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color?: string }>;
  label?: string;
  labelFormatter?: (label: string) => string;
  valueFormatter?: (value: number, name: string) => [React.ReactNode, string];
}

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const formattedLabel = labelFormatter ? labelFormatter(label || '') : label;

  return (
    <div className="bg-base-200 border border-base-300 rounded-lg px-3 py-2 shadow-lg text-sm">
      {formattedLabel && (
        <p className="text-base-content font-medium mb-1">{formattedLabel}</p>
      )}
      {payload.map((entry, index) => {
        const [value, name] = valueFormatter
          ? valueFormatter(entry.value, entry.name)
          : [entry.value, entry.name];
        return (
          <p key={index} className="text-base-content/80">
            <span className="font-medium">{name}:</span> {value}
          </p>
        );
      })}
    </div>
  );
}

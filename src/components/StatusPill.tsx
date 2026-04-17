import type { ReactNode } from 'react';

interface StatusPillProps {
  label: string;
  value: ReactNode;
}

export function StatusPill({ label, value }: StatusPillProps) {
  return (
    <div className="status-pill">
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  );
}

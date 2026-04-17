import clsx from 'clsx';
import type { ReactNode } from 'react';

interface InfoCardProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function InfoCard({ label, value, className }: InfoCardProps) {
  return (
    <div className={clsx('surface-block', className)}>
      <p className="surface-block__label">{label}</p>
      <p className="surface-block__value">{value}</p>
    </div>
  );
}

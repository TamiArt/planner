import clsx from 'clsx';
import type { PropsWithChildren } from 'react';

interface PanelProps extends PropsWithChildren {
  title: string;
  eyebrow?: string;
  className?: string;
}

export function Panel({ title, eyebrow, className = '', children }: PanelProps) {
  return (
    <section className={clsx('panel', className)}>
      <header className="panel__header">
        {eyebrow ? <p className="panel__eyebrow">{eyebrow}</p> : null}
        <h2 className="panel__title">{title}</h2>
      </header>
      {children}
    </section>
  );
}

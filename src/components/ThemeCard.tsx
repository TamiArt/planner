import clsx from 'clsx';
import type { PlannerTheme } from '../types/planner';

interface ThemeCardProps {
  theme: PlannerTheme;
  selected: boolean;
  onSelect: () => void;
}

export function ThemeCard({ theme, selected, onSelect }: ThemeCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx('theme-card', selected && 'theme-card--active')}
    >
      <div className="theme-card__preview" style={{ background: theme.preview }} />
      <div className="theme-card__content">
        <div>
          <p className="theme-card__title">{theme.name}</p>
          <p className="theme-card__description">{theme.description}</p>
        </div>
        <span className="theme-card__badge">{selected ? 'Активна' : 'Тема'}</span>
      </div>
    </button>
  );
}

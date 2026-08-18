import clsx from 'clsx';

export type WorkflowStepStatus = 'ready' | 'attention' | 'neutral';

export interface WorkflowStepItem {
  id: string;
  order: number;
  title: string;
  description: string;
  meta: string;
  status: WorkflowStepStatus;
}

interface WorkflowStepNavProps {
  steps: WorkflowStepItem[];
  activeStepId: string;
  onSelect: (stepId: string) => void;
}

const STATUS_LABELS: Record<WorkflowStepStatus, string> = {
  ready: 'Готово',
  attention: 'Проверить',
  neutral: 'Шаг',
};

export function WorkflowStepNav({ steps, activeStepId, onSelect }: WorkflowStepNavProps) {
  return (
    <nav className="workflow-steps" aria-label="Шаги сборки планера">
      {steps.map((step) => {
        const isActive = step.id === activeStepId;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onSelect(step.id)}
            aria-current={isActive ? 'step' : undefined}
            className={clsx(
              'workflow-step',
              isActive && 'workflow-step--active',
              step.status === 'ready' && 'workflow-step--ready',
              step.status === 'attention' && 'workflow-step--attention',
            )}
          >
            <span className="workflow-step__index">{String(step.order).padStart(2, '0')}</span>
            <span className="workflow-step__content">
              <strong>{step.title}</strong>
              <span>{step.description}</span>
              <small>{step.meta}</small>
            </span>
            <span className="workflow-step__badge">{isActive ? 'Сейчас' : STATUS_LABELS[step.status]}</span>
          </button>
        );
      })}
    </nav>
  );
}

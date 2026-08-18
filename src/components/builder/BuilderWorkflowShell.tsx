import clsx from 'clsx';
import type { ChangeEventHandler, ReactNode, RefObject } from 'react';
import { Panel } from '../Panel';
import { PlannerRenderPreviewPanel } from '../PlannerRenderPreviewPanel';
import { PreviewPanel } from '../PreviewPanel';
import { StatusPill } from '../StatusPill';
import { plannerThemes } from '../../data/themes/themes';
import { WorkflowStepNav, type WorkflowStepItem } from './WorkflowStepNav';
import { WORKFLOW_STEPS, type BuilderStepId } from './workflowDefinition';
import { buildPlannerPlan } from '../../lib/navigation/buildPlannerPlan';
import type { PlannerValidationResult } from '../../lib/validators/plannerConfigValidator';
import type { PlannerConfig, PlannerSectionType } from '../../types/planner';

type PlannerPlan = ReturnType<typeof buildPlannerPlan>;
type WorkflowStep = (typeof WORKFLOW_STEPS)[number];

interface BuilderWorkflowShellProps {
  config: PlannerConfig;
  deferredConfig: PlannerConfig;
  plan: PlannerPlan;
  validation: PlannerValidationResult;
  activeStep: BuilderStepId;
  currentStepIndex: number;
  currentStep: WorkflowStep;
  previousStep?: WorkflowStep;
  nextStep?: WorkflowStep;
  stepItems: WorkflowStepItem[];
  exportStatusLabel: string;
  saveLabel: string;
  feedback: string | null;
  isExporting: boolean;
  exportReady: boolean;
  preferredPreviewSection?: PlannerSectionType;
  stepContent: ReactNode;
  onStepChange: (step: BuilderStepId) => void;
  onThemeChange: (themeId: string) => void;
  onModeChange: (mode: PlannerConfig['mode']) => void;
  onPdfExport: () => void;
  onReset: () => void;
  onFooterPrimaryAction: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  backgroundInputRef: RefObject<HTMLInputElement | null>;
  coverInputRef: RefObject<HTMLInputElement | null>;
  pageBackgroundInputRef: RefObject<HTMLInputElement | null>;
  autoStickerInputRef: RefObject<HTMLInputElement | null>;
  readySheetInputRef: RefObject<HTMLInputElement | null>;
  onImportChange: ChangeEventHandler<HTMLInputElement>;
  onBackgroundUploadChange: ChangeEventHandler<HTMLInputElement>;
  onCoverUploadChange: ChangeEventHandler<HTMLInputElement>;
  onPageBackgroundUploadChange: ChangeEventHandler<HTMLInputElement>;
  onAutoStickerUploadChange: ChangeEventHandler<HTMLInputElement>;
  onReadySheetUploadChange: ChangeEventHandler<HTMLInputElement>;
}

export function BuilderWorkflowShell({
  config,
  deferredConfig,
  plan,
  validation,
  activeStep,
  currentStepIndex,
  currentStep,
  previousStep,
  nextStep,
  stepItems,
  exportStatusLabel,
  saveLabel,
  feedback,
  isExporting,
  exportReady,
  preferredPreviewSection,
  stepContent,
  onStepChange,
  onThemeChange,
  onModeChange,
  onPdfExport,
  onReset,
  onFooterPrimaryAction,
  fileInputRef,
  backgroundInputRef,
  coverInputRef,
  pageBackgroundInputRef,
  autoStickerInputRef,
  readySheetInputRef,
  onImportChange,
  onBackgroundUploadChange,
  onCoverUploadChange,
  onPageBackgroundUploadChange,
  onAutoStickerUploadChange,
  onReadySheetUploadChange,
}: BuilderWorkflowShellProps) {
  return (
    <main className="page-shell page-shell--workflow">
      <section className="workflow-toolbar">
        <div className="workflow-toolbar__intro">
          <p className="hero__eyebrow">Сборка планера</p>
          <h1 className="workflow-toolbar__title">Пошаговая сборка цифрового планера.</h1>
          <p className="workflow-toolbar__lead">
            Конструктор работает как мастер: слева шаги, в центре настройки текущего этапа, а живой предпросмотр вынесен ниже.
          </p>
        </div>

        <div className="workflow-toolbar__quick">
          <label className="field workflow-toolbar__field">
            <span className="field__label">Тема</span>
            <select value={config.themeId} onChange={(event) => onThemeChange(event.target.value)} className="select">
              {plannerThemes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
            </select>
          </label>

          <div className="field workflow-toolbar__field">
            <span className="field__label">Режим</span>
            <div className="workflow-mode-toggle">
              <button type="button" onClick={() => onModeChange('dated')} className={clsx('workflow-mode-toggle__button', config.mode === 'dated' && 'workflow-mode-toggle__button--active')}>датированный</button>
              <button type="button" onClick={() => onModeChange('undated')} className={clsx('workflow-mode-toggle__button', config.mode === 'undated' && 'workflow-mode-toggle__button--active')}>недатированный</button>
            </div>
          </div>

          <div className="workflow-toolbar__actions">
            <button type="button" onClick={onPdfExport} disabled={isExporting || !exportReady} className="button button--primary">
              {isExporting ? 'Сборка PDF...' : exportReady ? 'Экспорт PDF' : 'Проверьте экспорт'}
            </button>
            <button type="button" onClick={onReset} className="button button--secondary">Сбросить</button>
            <a href="#/append-stickers" target="_blank" rel="noreferrer" className="button button--secondary">Дополнить PDF</a>
            <a href="#/moon-phases-pdf" target="_blank" rel="noreferrer" className="button button--secondary">Фазы в PDF</a>
            <a href="#/templates" target="_blank" rel="noreferrer" className="button button--ghost">Шаблоны</a>
          </div>
        </div>

        <div className="workflow-toolbar__status">
          <StatusPill label="Шаг" value={`${currentStepIndex + 1} / ${WORKFLOW_STEPS.length} · ${currentStep.title}`} />
          <StatusPill label="Состояние" value={exportStatusLabel} />
          <StatusPill label="Автосохранение" value={`локально · ${saveLabel}`} />
          <StatusPill label="Документ" value={`${plan.pages.length} стр. · ${plan.tabs.length} вкладок`} />
        </div>
      </section>

      {feedback ? <p className="floating-note">{feedback}</p> : null}

      <div className="workflow-layout">
        <aside className="workflow-layout__sidebar">
          <Panel title="Шаги сборки" eyebrow="Мастер">
            <WorkflowStepNav steps={stepItems} activeStepId={activeStep} onSelect={(stepId) => onStepChange(stepId as BuilderStepId)} />
          </Panel>
        </aside>

        <section className="workflow-layout__settings">
          <div className="workflow-settings-stack">{stepContent}</div>

          <div className="workflow-step-footer">
            <button type="button" onClick={() => previousStep && onStepChange(previousStep.id)} disabled={!previousStep} className="button button--ghost">
              {previousStep ? `Назад: ${previousStep.title}` : 'Это первый шаг'}
            </button>

            <button
              type="button"
              onClick={onFooterPrimaryAction}
              disabled={!nextStep && (isExporting || !exportReady)}
              className={clsx('button', nextStep ? 'button--secondary' : 'button--primary')}
            >
              {nextStep ? `Далее: ${nextStep.title}` : isExporting ? 'Сборка PDF...' : exportReady ? 'Экспортировать PDF' : 'Исправьте ошибки экспорта'}
            </button>
          </div>
        </section>
      </div>

      <section className="workflow-preview-dock">
        <PlannerRenderPreviewPanel config={deferredConfig} plan={plan} preferredSectionType={preferredPreviewSection} />
        {activeStep === 'preview' || activeStep === 'export' ? (
          <PreviewPanel config={deferredConfig} plan={plan} errors={validation.errors} warnings={validation.warnings} />
        ) : null}
      </section>

      <input ref={fileInputRef} type="file" accept="application/json" onChange={onImportChange} className="hidden-input" />
      <input ref={backgroundInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onBackgroundUploadChange} className="hidden-input" />
      <input ref={coverInputRef} type="file" accept="image/png,.png" onChange={onCoverUploadChange} className="hidden-input" />
      <input ref={pageBackgroundInputRef} type="file" accept="image/png,.png" onChange={onPageBackgroundUploadChange} className="hidden-input" />
      <input ref={autoStickerInputRef} type="file" accept="image/png" multiple onChange={onAutoStickerUploadChange} className="hidden-input" />
      <input ref={readySheetInputRef} type="file" accept="image/png" multiple onChange={onReadySheetUploadChange} className="hidden-input" />
    </main>
  );
}

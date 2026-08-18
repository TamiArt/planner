import type { WorkflowStepItem } from './WorkflowStepNav';
import type { PlannerConfig, PlannerSectionType } from '../../types/planner';

export type BuilderStepId = 'foundation' | 'astrology' | 'structure' | 'design' | 'layout' | 'stickers' | 'preview' | 'export';

export const WORKFLOW_STEPS: Array<{ id: BuilderStepId; title: string; description: string }> = [
  { id: 'foundation', title: 'Основа', description: 'Определите сценарий продукта и базовый режим сборки.' },
  { id: 'astrology', title: 'Астрология', description: 'Уточните город, аянамшу и данные фаз Луны для датированных страниц.' },
  { id: 'structure', title: 'Структура', description: 'Соберите состав документа и порядок разделов.' },
  { id: 'design', title: 'Дизайн', description: 'Выберите тему, фон и визуальный язык планера.' },
  { id: 'layout', title: 'Макет', description: 'Редактируйте геометрию страниц через блоки, сетку и инспектор.' },
  { id: 'stickers', title: 'Стикеры', description: 'Настройте страницы со стикерами как отдельный продуктовый блок.' },
  { id: 'preview', title: 'Предпросмотр', description: 'Проверьте навигацию, страницы и общую композицию.' },
  { id: 'export', title: 'Экспорт', description: 'Выгрузите PDF, JSON-конфиг и инструкцию по использованию.' },
];

interface BuildWorkflowStepItemsInput {
  config: Pick<PlannerConfig, 'mode' | 'year'>;
  astrologyCityName: string;
  moonPhasesEnabled: boolean;
  moonPhaseDataReady: boolean;
  astrologyDataReady: boolean;
  enabledSectionsCount: number;
  themeName: string;
  backgroundName: string;
  layoutEditorEnabled: boolean;
  layoutCount: number;
  stickersEnabled: boolean;
  stickerPageCount: number;
  pageCount: number;
  tabCount: number;
  exportStatusLabel: string;
  exportReady: boolean;
  ayanamsaLabel: string;
}

function getModeLabel(mode: PlannerConfig['mode']) {
  return mode === 'dated' ? 'датированный' : 'недатированный';
}

export function buildWorkflowStepItems({
  config,
  astrologyCityName,
  moonPhasesEnabled,
  moonPhaseDataReady,
  astrologyDataReady,
  enabledSectionsCount,
  themeName,
  backgroundName,
  layoutEditorEnabled,
  layoutCount,
  stickersEnabled,
  stickerPageCount,
  pageCount,
  tabCount,
  exportStatusLabel,
  exportReady,
  ayanamsaLabel,
}: BuildWorkflowStepItemsInput): WorkflowStepItem[] {
  return WORKFLOW_STEPS.map((step, index) => {
    const base = { id: step.id, order: index + 1, title: step.title, description: step.description };

    switch (step.id) {
      case 'foundation':
        return {
          ...base,
          meta: config.mode === 'dated' ? `${getModeLabel(config.mode)} · ${config.year ?? 'без года'}` : getModeLabel(config.mode),
          status: config.mode === 'undated' || Boolean(config.year) ? 'ready' : 'attention',
        };
      case 'astrology':
        return {
          ...base,
          meta: `${astrologyCityName} · ${ayanamsaLabel}`,
          status: (moonPhasesEnabled && !moonPhaseDataReady) || !astrologyDataReady ? 'attention' : 'ready',
        };
      case 'structure':
        return {
          ...base,
          meta: `${enabledSectionsCount} активных разделов`,
          status: enabledSectionsCount >= 4 ? 'ready' : 'attention',
        };
      case 'design':
        return { ...base, meta: `${themeName} / ${backgroundName}`, status: 'ready' };
      case 'layout':
        return {
          ...base,
          meta: layoutEditorEnabled ? `${layoutCount} макетов` : 'модуль выключен',
          status: layoutEditorEnabled ? 'ready' : 'neutral',
        };
      case 'stickers':
        return {
          ...base,
          meta: stickersEnabled ? `${stickerPageCount} листа` : 'выключены',
          status: stickersEnabled && stickerPageCount > 0 ? 'ready' : stickersEnabled ? 'attention' : 'neutral',
        };
      case 'preview':
        return {
          ...base,
          meta: `${pageCount} страниц · ${tabCount} вкладок`,
          status: pageCount > 0 ? 'ready' : 'attention',
        };
      default:
        return { ...base, meta: exportStatusLabel, status: exportReady ? 'ready' : 'attention' };
    }
  });
}

const PREFERRED_PREVIEW_SECTION_BY_STEP: Partial<Record<BuilderStepId, PlannerSectionType>> = {
  foundation: 'index',
  structure: 'index',
  design: 'monthly',
  layout: 'monthly',
  stickers: 'stickers',
};

export function getPreferredPreviewSection(
  activeStep: BuilderStepId,
  weeklyEnabled: boolean,
  dailyEnabled: boolean,
  weekPreset: PlannerConfig['astrology']['display']['weekPreset'],
): PlannerSectionType | undefined {
  if (activeStep !== 'astrology') {
    return PREFERRED_PREVIEW_SECTION_BY_STEP[activeStep];
  }

  if (weeklyEnabled && weekPreset !== 'compact-icons') {
    return 'weekly';
  }

  if (dailyEnabled) {
    return 'daily';
  }

  return weeklyEnabled ? 'weekly' : 'monthly';
}

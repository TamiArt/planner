import { Panel } from '../../Panel';
import { SectionCard } from '../../SectionCard';
import { getModuleBySectionType } from '../../../core/registry/moduleRegistry';
import type { PlannerSectionConfig, PlannerSectionType } from '../../../types/planner';

interface StructureWorkflowStepProps {
  sections: PlannerSectionConfig[];
  stickerSection?: PlannerSectionConfig;
  onToggleSection: (type: PlannerSectionType) => void;
  onMoveSection: (type: PlannerSectionType, direction: 'up' | 'down') => void;
  onCountChange: (type: PlannerSectionType, value: number) => void;
}

function getSectionPresentation(section: PlannerSectionConfig) {
  const module = getModuleBySectionType(section.type);
  return {
    label: module?.manifest.title ?? section.type,
    description: module?.manifest.description ?? 'Служебный блок планера.',
    locked: Boolean(module?.manifest.locked),
  };
}

export function StructureWorkflowStep({
  sections,
  stickerSection,
  onToggleSection,
  onMoveSection,
  onCountChange,
}: StructureWorkflowStepProps) {
  return (
    <>
      <Panel title="Структура документа" eyebrow="Шаг 3">
        <p className="muted-copy">Включайте и выключайте разделы, меняйте их порядок и контролируйте объем страниц для каждого блока.</p>
        <div className="section-list workflow-panel__space">
          {sections.map((section) => {
            const presentation = getSectionPresentation(section);
            return (
              <SectionCard
                key={section.type}
                section={section}
                label={presentation.label}
                description={presentation.description}
                locked={presentation.locked}
                onToggle={() => onToggleSection(section.type)}
                onMoveUp={() => onMoveSection(section.type, 'up')}
                onMoveDown={() => onMoveSection(section.type, 'down')}
                onCountChange={(value) => onCountChange(section.type, value)}
              />
            );
          })}
        </div>
      </Panel>

      <Panel title="Что вынесено отдельно" eyebrow="Сценарий">
        <div className="surface-block">
          <p className="surface-block__label">Страницы со стикерами</p>
          <p className="surface-block__value">{stickerSection?.enabled ? `${stickerSection.count ?? 0} листа включены` : 'Сейчас выключены'}</p>
          <p className="muted-copy">Стикеры вынесены в отдельный шаг, чтобы их можно было проработать как отдельную ценность продукта.</p>
        </div>
      </Panel>
    </>
  );
}

import { InfoCard } from './InfoCard';
import type { PlannerDocumentPlan } from '../types/pdf';
import type { PlannerConfig } from '../types/planner';
import { Panel } from './Panel';
import { buildPlannerRenderModel } from '../core/render-model';

interface PreviewPanelProps {
  config: PlannerConfig;
  plan: PlannerDocumentPlan;
  errors: string[];
  warnings: string[];
}

export function PreviewPanel({ config, plan, errors, warnings }: PreviewPanelProps) {
  const renderModel = buildPlannerRenderModel(config);
  const bySection = renderModel.plan.pages.reduce<Record<string, number>>((accumulator, page) => {
    accumulator[page.sectionType] = (accumulator[page.sectionType] ?? 0) + 1;
    return accumulator;
  }, {});

  const sectionLabels: Record<string, string> = {
    cover: 'Обложка',
    index: 'Индекс',
    year: 'Обзор года',
    monthly: 'Месяцы',
    weekly: 'Недели',
    daily: 'Дни',
    notes: 'Заметки',
    checklist: 'Чек-листы',
    stickers: 'Стикеры',
  };

  return (
    <Panel title="Сводка проекта" eyebrow="Результат">
      <div className="preview-stats">
        <div className="stat-card stat-card--primary">
          <p className="small-label">Страницы</p>
          <p className="stat-card__value">{renderModel.plan.pages.length}</p>
          <p className="stat-card__copy">
            {config.mode === 'dated' ? `Датированный ${config.year}` : 'Недатированный'} PDF с навигацией и вкладками.
          </p>
        </div>
        <div className="stat-card">
          <p className="small-label">Вкладки</p>
          <p className="stat-card__value">{renderModel.plan.tabs.length}</p>
          <p className="stat-card__copy">12 вкладок месяцев + разделы заметок, чек-листов и стикеров.</p>
        </div>
        <div className="stat-card">
          <p className="small-label">Ссылки</p>
          <p className="stat-card__value">{renderModel.links.length}</p>
          <p className="stat-card__copy">Внутренние переходы: индекс, вкладки, разделы, кнопка домой и линейная навигация.</p>
        </div>
      </div>

      <div className="preview-layout">
        <div className="surface-block">
          <h3 className="panel__title" style={{ fontSize: '1.6rem' }}>Структура документа</h3>
          <div className="structure-grid">
            {Object.entries(bySection).map(([section, count]) => (
              <InfoCard key={section} label={sectionLabels[section] ?? section} value={`${count} стр.`} />
            ))}
          </div>
        </div>

        <div className="builder-column">
          <div className="surface-block">
            <h3 className="panel__title" style={{ fontSize: '1.6rem' }}>Вкладки</h3>
            <div className="pill-list">
              {renderModel.plan.tabs.map((tab) => (
                <span key={tab.id} className="pill">{tab.label}</span>
              ))}
            </div>
          </div>

          <div className="surface-block">
            <h3 className="panel__title" style={{ fontSize: '1.6rem' }}>Проверка конфигурации</h3>
            <div className="message-stack">
              {errors.length === 0 ? (
                <p className="message message--success">Блокирующих ошибок не найдено.</p>
              ) : (
                errors.map((item) => (
                  <p key={item} className="message message--error">{item}</p>
                ))
              )}

              {warnings.map((item) => (
                <p key={item} className="message message--warning">{item}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

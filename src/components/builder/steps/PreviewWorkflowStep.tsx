import { InfoCard } from '../../InfoCard';
import { Panel } from '../../Panel';

interface PreviewWorkflowStepProps {
  pageCount: number;
  tabCount: number;
  linkCount: number;
  errors: string[];
  warnings: string[];
  onGoToExport: () => void;
}

export function PreviewWorkflowStep({
  pageCount,
  tabCount,
  linkCount,
  errors,
  warnings,
  onGoToExport,
}: PreviewWorkflowStepProps) {
  return (
    <Panel title="Предпросмотр и проверка" eyebrow="Шаг 7">
      <p className="muted-copy">
        Живой предпросмотр находится ниже листа настроек. Здесь держите под рукой итоговую сводку, проверку конфигурации и быстрый
        переход в отдельную страницу шаблонов.
      </p>

      <div className="summary-grid workflow-panel__space">
        <InfoCard label="Страницы" value={`${pageCount}`} />
        <InfoCard label="Вкладки" value={`${tabCount}`} />
        <InfoCard label="Ссылки" value={`${linkCount}`} />
      </div>

      <div className="actions-grid workflow-panel__space">
        <a href="#/templates" target="_blank" rel="noreferrer" className="action-card">
          <p className="action-card__title">Открыть шаблоны</p>
          <p className="action-card__copy">Держать живой предпросмотр в отдельной вкладке рядом с конструктором.</p>
        </a>

        <a href="#/append-stickers" target="_blank" rel="noreferrer" className="action-card">
          <p className="action-card__title">Дополнить готовый PDF</p>
          <p className="action-card__copy">Открыть отдельную вкладку и дописать в конец чужого PDF только sticker pages.</p>
        </a>

        <a href="#/moon-phases-pdf" target="_blank" rel="noreferrer" className="action-card">
          <p className="action-card__title">Добавить фазы Луны в PDF</p>
          <p className="action-card__copy">Открыть редактор готового PDF и наложить лунные метки по текущему конфигу.</p>
        </a>

        <button type="button" onClick={onGoToExport} className="action-card">
          <p className="action-card__title">Перейти к экспорту</p>
          <p className="action-card__copy">После проверки перейти к финальной выгрузке файлов.</p>
        </button>
      </div>

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
    </Panel>
  );
}

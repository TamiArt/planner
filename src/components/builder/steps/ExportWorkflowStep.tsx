import { InfoCard } from '../../InfoCard';
import { Panel } from '../../Panel';

interface ExportWorkflowStepProps {
  isExporting: boolean;
  exportReady: boolean;
  themeName: string;
  backgroundName: string;
  hasCoverImage: boolean;
  hasPageBackgroundImage: boolean;
  dailyPagesLabel: string;
  errors: string[];
  warnings: string[];
  onPdfExport: () => void;
  onConfigExport: () => void;
  onGuideExport: () => void;
  onImport: () => void;
  onReset: () => void;
}

export function ExportWorkflowStep({
  isExporting,
  exportReady,
  themeName,
  backgroundName,
  hasCoverImage,
  hasPageBackgroundImage,
  dailyPagesLabel,
  errors,
  warnings,
  onPdfExport,
  onConfigExport,
  onGuideExport,
  onImport,
  onReset,
}: ExportWorkflowStepProps) {
  return (
    <>
      <Panel title="Экспорт" eyebrow="Шаг 8">
        <p className="muted-copy">
          Финальный шаг: выгружайте PDF, JSON-конфиг и инструкцию. Если конфигурация не готова, ошибки останутся прямо здесь.
        </p>

        <div className="actions-grid workflow-panel__space">
          <button
            type="button"
            onClick={onPdfExport}
            disabled={isExporting || !exportReady}
            className="action-card action-card--primary"
          >
            <p className="action-card__title">{isExporting ? 'Сборка PDF...' : 'Экспортировать PDF'}</p>
            <p className="action-card__copy">Скачать финальный интерактивный PDF-файл для клиента.</p>
          </button>

          <button type="button" onClick={onConfigExport} className="action-card">
            <p className="action-card__title">Скачать JSON</p>
            <p className="action-card__copy">Сохранить текущий конфиг как рабочую сборку или пресет.</p>
          </button>

          <button type="button" onClick={onGuideExport} className="action-card">
            <p className="action-card__title">Скачать инструкцию</p>
            <p className="action-card__copy">Сгенерировать инструкцию по использованию для конечного пользователя.</p>
          </button>

          <button type="button" onClick={onImport} className="action-card">
            <p className="action-card__title">Импортировать JSON</p>
            <p className="action-card__copy">Загрузить ранее сохранённый конфиг и продолжить сборку.</p>
          </button>

          <a href="#/templates" target="_blank" rel="noreferrer" className="action-card">
            <p className="action-card__title">Открыть шаблоны</p>
            <p className="action-card__copy">Проверить шаблоны отдельно перед финальным экспортом.</p>
          </a>

          <a href="#/append-stickers" target="_blank" rel="noreferrer" className="action-card">
            <p className="action-card__title">Дополнить готовый PDF</p>
            <p className="action-card__copy">Собрать sticker pages текущим движком и дописать их в конец уже существующего PDF.</p>
          </a>

          <a href="#/moon-phases-pdf" target="_blank" rel="noreferrer" className="action-card">
            <p className="action-card__title">Добавить фазы Луны в PDF</p>
            <p className="action-card__copy">Загрузить уже готовый PDF и сохранить копию с фазами Луны поверх дат.</p>
          </a>

          <button type="button" onClick={onReset} className="action-card">
            <p className="action-card__title">Сбросить конфиг</p>
            <p className="action-card__copy">Вернуть базовый MVP-сценарий и очистить локальные изменения.</p>
          </button>
        </div>
      </Panel>

      <Panel title="Готовность к выдаче" eyebrow="Проверка">
        <div className="summary-grid">
          <InfoCard label="Тема" value={themeName} />
          <InfoCard label="Фон" value={backgroundName} />
          <InfoCard label="Обложка" value={hasCoverImage ? 'загружена' : 'нет'} />
          <InfoCard label="Фон листов" value={hasPageBackgroundImage ? 'загружен' : 'нет'} />
          <InfoCard label="Дневные страницы" value={dailyPagesLabel} />
        </div>

        <div className="message-stack workflow-panel__space">
          {errors.length === 0 ? (
            <p className="message message--success">Экспорт не заблокирован. Конфигурация готова к выгрузке.</p>
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
    </>
  );
}

import { InfoCard } from '../InfoCard';
import { Panel } from '../Panel';
import { formatPdfFileSize } from '../../lib/pdf/pdfEditorUtils';

interface AstrologyPdfPreviewSummary {
  url: string;
  byteLength: number;
  annotatedPageCount: number;
  markerCount: number;
  iconCount: number;
  appendedPageCount: number;
}

interface AstrologyPdfPreviewPanelProps {
  sourcePageCount?: number;
  preview: AstrologyPdfPreviewSummary | null;
  isLoading: boolean;
  error: string | null;
  includeStickerPages: boolean;
}

export function AstrologyPdfPreviewPanel({
  sourcePageCount,
  preview,
  isLoading,
  error,
  includeStickerPages,
}: AstrologyPdfPreviewPanelProps) {
  const previewUrl = preview ? `${preview.url}#toolbar=1&navpanes=0&view=FitH` : null;

  return (
    <div className="preview-section">
      <Panel title="Предпросмотр итогового PDF" eyebrow="Перед сохранением">
        <p className="muted-copy">
          Ниже показывается уже собранный итоговый файл: загруженный PDF с наложенной астрологией по текущему конфигу,
          а при включённом комбинированном режиме ещё и с добавленными `sticker pages`.
          Предпросмотр обновляется автоматически после загрузки PDF, расчёта астрологии, смены слоёв и изменения режима.
        </p>

        {typeof sourcePageCount === 'number' ? (
          <div className="workflow-panel__space">
            <div className="summary-grid">
              <InfoCard label="Исходных страниц" value={`${sourcePageCount}`} />
              <InfoCard label="Страниц с метками" value={preview ? `${preview.annotatedPageCount}` : isLoading ? 'собирается' : '—'} />
              <InfoCard label="Текстовых меток" value={preview ? `${preview.markerCount}` : isLoading ? 'считаем' : '—'} />
              <InfoCard label="Иконок" value={preview ? `${preview.iconCount}` : isLoading ? 'считаем' : '—'} />
              <InfoCard label="Sticker pages" value={includeStickerPages ? (preview ? `${preview.appendedPageCount}` : isLoading ? 'считаем' : '—') : 'не добавляем'} />
              <InfoCard label="Размер предпросмотра" value={preview ? formatPdfFileSize(preview.byteLength) : isLoading ? 'собирается' : '—'} />
            </div>

            <div className="message-stack">
              {isLoading ? (
                <p className="message message--warning">
                  {includeStickerPages
                    ? 'Собираем предпросмотр итогового PDF с астрологией и sticker pages...'
                    : 'Собираем предпросмотр итогового PDF с астрологией...'}
                </p>
              ) : null}

              {error ? <p className="message message--error">{error}</p> : null}

              {preview && !error ? (
                <p className="message message--success">
                  {includeStickerPages
                    ? `Предпросмотр готов: ${preview.markerCount} текстовых меток, ${preview.iconCount} иконок и ${preview.appendedPageCount} sticker pages.`
                    : `Предпросмотр готов: добавлено ${preview.markerCount} текстовых меток и ${preview.iconCount} иконок на ${preview.annotatedPageCount} стр.`}
                </p>
              ) : null}
            </div>

            {preview ? (
              <div className="pdf-preview-panel">
                <div className="pdf-preview-panel__actions">
                  <a href={preview.url} target="_blank" rel="noreferrer" className="button button--secondary">
                    Открыть итоговый PDF в новой вкладке
                  </a>
                </div>

                <div className="pdf-preview-panel__frame">
                  <iframe
                    key={preview.url}
                    src={previewUrl ?? undefined}
                    title="Предпросмотр итогового PDF с астрологией"
                    className="pdf-preview-panel__viewer"
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="message-stack workflow-panel__space">
            <p className="message message--warning">
              Сначала загрузите исходный PDF. После этого здесь появится его итоговый предпросмотр
              {includeStickerPages ? ' с астрологией и sticker pages.' : ' с астрологией.'}
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}

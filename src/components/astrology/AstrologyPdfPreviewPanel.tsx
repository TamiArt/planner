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
  totalPageCount: number;
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
      <Panel title="Предпросмотр PDF с астрологией" eyebrow="Перед сохранением">
        <p className="muted-copy">
          Здесь показывается итоговый файл с астрологическими метками по текущему конфигу.
          Предпросмотр обновляется автоматически после загрузки PDF, расчёта астрологии и изменения состава экспорта.
        </p>

        {typeof sourcePageCount === 'number' ? (
          <div className="workflow-panel__space">
            <div className="summary-grid">
              <InfoCard label="Исходных страниц" value={`${sourcePageCount}`} />
              <InfoCard label="Страниц PDF" value={preview ? `${preview.totalPageCount}` : isLoading ? 'собирается' : '—'} />
              <InfoCard label="Страниц с астрологией" value={preview ? `${preview.annotatedPageCount}` : isLoading ? 'собирается' : '—'} />
              <InfoCard label="Метки" value={preview ? `${preview.markerCount}` : isLoading ? 'считаем' : '—'} />
              <InfoCard label="Иконки" value={preview ? `${preview.iconCount}` : isLoading ? 'считаем' : '—'} />
              <InfoCard label="Sticker pages" value={includeStickerPages ? (preview ? `${preview.appendedPageCount}` : isLoading ? 'собирается' : '—') : 'не добавляем'} />
              <InfoCard label="Размер" value={preview ? formatPdfFileSize(preview.byteLength) : isLoading ? 'собирается' : '—'} />
            </div>

            <div className="message-stack">
              {isLoading ? (
                <p className="message message--warning">Собираем предпросмотр итогового PDF с астрологией...</p>
              ) : null}

              {error ? <p className="message message--error">{error}</p> : null}

              {preview && !error ? (
                <p className="message message--success">
                  Предпросмотр готов: {preview.markerCount} меток, {preview.iconCount} иконок
                  {includeStickerPages ? `, ${preview.appendedPageCount} sticker pages` : ''}.
                </p>
              ) : null}
            </div>

            {preview ? (
              <div className="pdf-preview-panel">
                <div className="pdf-preview-panel__actions">
                  <a href={preview.url} target="_blank" rel="noreferrer" className="button button--secondary">
                    Открыть PDF в новой вкладке
                  </a>
                </div>

                <div className="pdf-preview-panel__frame">
                  <iframe
                    key={preview.url}
                    src={previewUrl ?? undefined}
                    title="Предпросмотр PDF с астрологией"
                    className="pdf-preview-panel__viewer"
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="message-stack workflow-panel__space">
            <p className="message message--warning">
              Сначала загрузите исходный PDF. После этого здесь появится итоговый предпросмотр с астрологией.
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}

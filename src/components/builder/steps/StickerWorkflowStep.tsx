import clsx from 'clsx';
import { InfoCard } from '../../InfoCard';
import { Panel } from '../../Panel';
import { DEFAULT_STICKER_AUTO_LAYOUT, type StickerAutoPageGroup } from '../../../lib/stickers/stickerModuleConfig';
import { getStickerCategoryMeta, STICKER_CATEGORY_ORDER } from '../../../lib/stickers/stickerCatalog';
import { READY_SHEET_ALLOWED_DIMENSIONS_LABEL } from '../../../lib/stickers/readySheetDimensions';
import type { StickerCategory, StickerModuleConfig } from '../../../types/planner';

interface StickerUploadNotice {
  scope: StickerCategory | 'ready-sheet';
  tone: 'success' | 'error';
  message: string;
}

interface StickerWorkflowStepProps {
  stickerConfig: StickerModuleConfig;
  stickerPageCount: number;
  autoStickerGroups: StickerAutoPageGroup[];
  stickerUploadNotice: StickerUploadNotice | null;
  onUpdateConfig: (patch: Partial<StickerModuleConfig>) => void;
  onToggleCategory: (category: StickerCategory) => void;
  onUploadCategory: (category: StickerCategory) => void;
  onUploadReadySheet: () => void;
  onRemoveAutoSticker: (assetId: string) => void;
  onRemoveReadySheet: (sheetId: string) => void;
}

function getStickerSourceModeLabel(sourceMode: StickerModuleConfig['sourceMode']) {
  return sourceMode === 'ready-sheet' ? 'готовые листы' : 'авто из PNG';
}

function getStickerBackgroundModeLabel(backgroundMode: StickerModuleConfig['backgroundMode']) {
  return backgroundMode === 'transparent' ? 'прозрачный' : 'белый';
}

export function StickerWorkflowStep({
  stickerConfig,
  stickerPageCount,
  autoStickerGroups,
  stickerUploadNotice,
  onUpdateConfig: updateStickerConfig,
  onToggleCategory: handleStickerCategoryToggle,
  onUploadCategory: handleAutoStickerUploadClick,
  onUploadReadySheet: handleReadySheetUploadClick,
  onRemoveAutoSticker: handleRemoveAutoSticker,
  onRemoveReadySheet: handleRemoveReadySheet,
}: StickerWorkflowStepProps) {
  const autoLayout = stickerConfig.autoLayout ?? DEFAULT_STICKER_AUTO_LAYOUT;
  const readySheets = stickerConfig.readySheets ?? [];
  const readySheetNotice = stickerUploadNotice?.scope === 'ready-sheet' ? stickerUploadNotice : null;

  return (
    <>
      <Panel title="Страницы со стикерами" eyebrow="Шаг 6">
        <p className="muted-copy">
          Здесь раздел со стикерами настраивается как отдельный модуль продукта. Листы попадают в итоговый PDF как
          встроенная библиотека, а пользователь работает с ними уже средствами PDF-приложения.
        </p>

        <div className="workflow-panel__space sticker-module-form">
          <div className="field">
            <span className="field__label">Состояние модуля</span>
            <div className="workflow-mode-toggle">
              <button
                type="button"
                onClick={() => updateStickerConfig({ enabled: true })}
                className={clsx('workflow-mode-toggle__button', stickerConfig.enabled && 'workflow-mode-toggle__button--active')}
              >
                Включен
              </button>
              <button
                type="button"
                onClick={() => updateStickerConfig({ enabled: false })}
                className={clsx('workflow-mode-toggle__button', !stickerConfig.enabled && 'workflow-mode-toggle__button--active')}
              >
                Выключен
              </button>
            </div>
          </div>

          <label className="field">
            <span className="field__label">Режим источника</span>
            <select
              value={stickerConfig.sourceMode}
              onChange={(event) => updateStickerConfig({ sourceMode: event.target.value as StickerModuleConfig['sourceMode'] })}
              disabled={!stickerConfig.enabled}
              className="select"
            >
              <option value="auto-png-pack">Авто-режим · набор PNG</option>
              <option value="ready-sheet">Режим готовых листов</option>
            </select>
          </label>

          <label className="field">
            <span className="field__label">Фон стикеров</span>
            <select
              value={stickerConfig.backgroundMode}
              onChange={(event) => updateStickerConfig({ backgroundMode: event.target.value as StickerModuleConfig['backgroundMode'] })}
              disabled={!stickerConfig.enabled}
              className="select"
            >
              <option value="transparent">прозрачный</option>
              <option value="white">белый</option>
            </select>
          </label>

          {stickerConfig.sourceMode === 'auto-png-pack' ? (
            <>
              <div className="field">
                <span className="field__label">Категории</span>
                <div className="pill-list">
                  {STICKER_CATEGORY_ORDER.map((category) => {
                    const meta = getStickerCategoryMeta(category);
                    const active = (stickerConfig.categories ?? STICKER_CATEGORY_ORDER).includes(category);
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => handleStickerCategoryToggle(category)}
                        disabled={!stickerConfig.enabled}
                        className={clsx('pill', active && 'pill--active')}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-grid">
                <label className="field">
                  <span className="field__label">Расстояние между стикерами</span>
                  <input
                    type="number"
                    min={8}
                    max={80}
                    value={autoLayout.itemSpacing}
                    onChange={(event) => updateStickerConfig({
                      autoLayout: {
                        ...autoLayout,
                        itemSpacing: Number(event.target.value),
                      },
                    })}
                    disabled={!stickerConfig.enabled}
                    className="input"
                  />
                </label>

                <label className="field">
                  <span className="field__label">Внутренние поля страницы</span>
                  <input
                    type="number"
                    min={24}
                    max={160}
                    value={autoLayout.pagePadding}
                    onChange={(event) => updateStickerConfig({
                      autoLayout: {
                        ...autoLayout,
                        pagePadding: Number(event.target.value),
                      },
                    })}
                    disabled={!stickerConfig.enabled}
                    className="input"
                  />
                </label>

                <label className="field">
                  <span className="field__label">Максимум элементов на странице</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={autoLayout.maxItemsPerPage ?? 6}
                    onChange={(event) => updateStickerConfig({
                      autoLayout: {
                        ...autoLayout,
                        maxItemsPerPage: Number(event.target.value),
                      },
                    })}
                    disabled={!stickerConfig.enabled}
                    className="input"
                  />
                </label>
              </div>
            </>
          ) : null}
        </div>

        <div className="sticker-category-grid workflow-panel__space">
          {stickerConfig.sourceMode === 'auto-png-pack'
            ? STICKER_CATEGORY_ORDER.map((category) => {
              const meta = getStickerCategoryMeta(category);
              const items = (stickerConfig.autoPngs ?? []).filter((item) => item.category === category);
              const categoryNotice = stickerUploadNotice?.scope === category ? stickerUploadNotice : null;

              return (
                <article key={category} className="sticker-category-card">
                  <p className="small-label">{meta.title}</p>
                  <h3 className="sticker-category-card__title">{meta.label}</h3>
                  <p className="sticker-category-card__description">{meta.description}</p>
                  <div className="pill-list">
                    {meta.chips.map((chip) => (
                      <span key={chip} className="pill">{chip}</span>
                    ))}
                  </div>
                  <p className="sticker-category-card__hint">{meta.usageHint}</p>
                  <div className="background-tools">
                    <button
                      type="button"
                      onClick={() => handleAutoStickerUploadClick(category)}
                      disabled={!stickerConfig.enabled}
                      className="button button--secondary"
                    >
                      {items.length > 0 ? 'Добавить ещё PNG' : 'Загрузить PNG в категорию'}
                    </button>
                  </div>
                  {categoryNotice ? (
                    <p
                      className={clsx(
                        'message',
                        'sticker-upload-feedback',
                        categoryNotice.tone === 'error' ? 'message--error' : 'message--success',
                      )}
                    >
                      {categoryNotice.message}
                    </p>
                  ) : null}
                  <div className="sticker-upload-grid">
                    {items.length > 0 ? items.map((item) => (
                      <article key={item.id} className="sticker-upload-card">
                        <div className="sticker-upload-card__preview">
                          <img src={item.previewSource} alt={item.name} className="sticker-upload-card__image" />
                        </div>
                        <div>
                          <p className="sticker-upload-card__title">{item.name}</p>
                          <p className="sticker-upload-card__meta">{item.width}×{item.height} · {Math.round(item.sizeBytes / 1024)} KB</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleRemoveAutoSticker(item.id)}
                          disabled={!stickerConfig.enabled}
                          className="action-button"
                        >
                          Удалить
                        </button>
                      </article>
                    )) : (
                      <p className="muted-copy">Пока ничего не загружено. Можно оставить встроенный базовый набор или добавить свои PNG.</p>
                    )}
                  </div>
                </article>
              );
            })
            : (
              <article className="sticker-category-card">
                <p className="small-label">Режим готовых листов</p>
                <h3 className="sticker-category-card__title">Готовые листы</h3>
                <p className="sticker-category-card__description">
                  Каждый PNG вставляется как отдельная страница со стикерами. Поддерживается размер {READY_SHEET_ALLOWED_DIMENSIONS_LABEL}.
                </p>
                <div className="background-tools">
                  <button
                    type="button"
                    onClick={handleReadySheetUploadClick}
                    disabled={!stickerConfig.enabled}
                    className="button button--secondary"
                  >
                    {readySheets.length > 0 ? 'Добавить ещё листы' : 'Загрузить готовые листы'}
                  </button>
                </div>
                {readySheetNotice ? (
                  <p
                    className={clsx(
                      'message',
                      'sticker-upload-feedback',
                      readySheetNotice.tone === 'error' ? 'message--error' : 'message--success',
                    )}
                  >
                    {readySheetNotice.message}
                  </p>
                ) : null}
                <div className="sticker-upload-grid">
                  {readySheets.length > 0 ? readySheets.map((sheet) => (
                    <article key={sheet.id} className="sticker-upload-card sticker-upload-card--sheet">
                      <div className="sticker-upload-card__preview sticker-upload-card__preview--sheet">
                        <img src={sheet.previewSource} alt={sheet.name} className="sticker-upload-card__image" />
                      </div>
                      <div>
                        <p className="sticker-upload-card__title">{sheet.name}</p>
                        <p className="sticker-upload-card__meta">{sheet.width}×{sheet.height} · {Math.round(sheet.sizeBytes / 1024)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRemoveReadySheet(sheet.id)}
                        disabled={!stickerConfig.enabled}
                        className="action-button"
                      >
                        Удалить
                      </button>
                    </article>
                  )) : (
                    <p className="muted-copy">Загрузите готовые PNG-листы {READY_SHEET_ALLOWED_DIMENSIONS_LABEL}. Каждый файл станет отдельной страницей со стикерами.</p>
                  )}
                </div>
              </article>
            )}
        </div>
      </Panel>

      <Panel title="Итог по стикерам" eyebrow="Результат">
        <div className="summary-grid">
          <InfoCard label="Режим" value={getStickerSourceModeLabel(stickerConfig.sourceMode)} />
          <InfoCard label="Фон стикеров" value={getStickerBackgroundModeLabel(stickerConfig.backgroundMode)} />
          <InfoCard label="Страницы" value={`${stickerPageCount}`} />
          <InfoCard label="PNG-файлы" value={`${stickerConfig.autoPngs?.length ?? 0}`} />
          <InfoCard label="Готовые листы" value={`${stickerConfig.readySheets?.length ?? 0}`} />
          <InfoCard label="Категории" value={(stickerConfig.categories ?? STICKER_CATEGORY_ORDER).map((category) => getStickerCategoryMeta(category).label).join(', ')} />
          <InfoCard label="Автогруппы" value={`${autoStickerGroups.length}`} />
        </div>
      </Panel>
    </>
  );
}

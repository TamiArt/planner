import clsx from 'clsx';
import type { ChangeEventHandler } from 'react';
import { InfoCard } from '../../InfoCard';
import { Panel } from '../../Panel';
import { ThemeCard } from '../../ThemeCard';
import { plannerThemes } from '../../../data/themes/themes';
import type { BackgroundAsset, PlannerConfig } from '../../../types/planner';

interface DesignWorkflowStepProps {
  config: PlannerConfig;
  availableBackgrounds: BackgroundAsset[];
  selectedThemeName: string;
  selectedBackgroundName: string;
  hasCustomBackground: boolean;
  colorPickerValue: string;
  gradientStartValue: string;
  gradientEndValue: string;
  gradientAngleValue: number;
  backgroundOpacityValue: number;
  currentBackgroundStyleLabel: string;
  coverUploadSizeLabel: string;
  pageBackgroundUploadSizeLabel: string;
  tabCount: number;
  getBackgroundTypeLabel: (background: BackgroundAsset) => string;
  onThemeSelect: (themeId: string) => void;
  onBackgroundSelect: (backgroundId: string) => void;
  onClearCustomBackground: () => void;
  onBackgroundColorChange: ChangeEventHandler<HTMLInputElement>;
  onGradientBackgroundChange: (patch: Partial<{ startColor: string; endColor: string; angle: number }>) => void;
  onBackgroundOpacityChange: ChangeEventHandler<HTMLInputElement>;
  onBackgroundUpload: () => void;
  onTabPositionChange: (position: PlannerConfig['tabPosition']) => void;
  onCoverUpload: () => void;
  onRemoveCover: () => void;
  onPageBackgroundUpload: () => void;
  onRemovePageBackground: () => void;
}

export function DesignWorkflowStep({
  config,
  availableBackgrounds,
  selectedThemeName,
  selectedBackgroundName,
  hasCustomBackground,
  colorPickerValue,
  gradientStartValue,
  gradientEndValue,
  gradientAngleValue,
  backgroundOpacityValue,
  currentBackgroundStyleLabel,
  coverUploadSizeLabel,
  pageBackgroundUploadSizeLabel,
  tabCount,
  getBackgroundTypeLabel,
  onThemeSelect: setTheme,
  onBackgroundSelect: setBackground,
  onClearCustomBackground: clearCustomBackground,
  onBackgroundColorChange: handleBackgroundColorChange,
  onGradientBackgroundChange: handleGradientBackgroundChange,
  onBackgroundOpacityChange: handleBackgroundOpacityChange,
  onBackgroundUpload: handleBackgroundUploadClick,
  onTabPositionChange: handleTabPositionChange,
  onCoverUpload: handleCoverUploadClick,
  onRemoveCover: handleRemoveCoverImage,
  onPageBackgroundUpload: handlePageBackgroundUploadClick,
  onRemovePageBackground: handleRemovePageBackgroundImage,
}: DesignWorkflowStepProps) {
  return (
    <>
      <Panel title="Тема" eyebrow="Шаг 4">
        <div className="theme-grid">
          {plannerThemes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              selected={config.themeId === theme.id}
              onSelect={() => setTheme(theme.id)}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Фон и атмосфера" eyebrow="Фоны">
        <div className="background-grid">
          {availableBackgrounds.map((background) => (
            <button
              key={background.id}
              type="button"
              onClick={() => setBackground(background.id)}
              className={clsx(
                'background-card',
                config.backgroundId === background.id && 'background-card--selected',
                background.isCustom && 'background-card--uploaded',
              )}
            >
              <div className="background-card__preview" style={{ background: background.preview }} />
              <p className="background-card__title">{background.name}</p>
              <p className="background-card__type">{getBackgroundTypeLabel(background)}</p>
            </button>
          ))}
        </div>

        <div className="background-tools">
          <label className="color-picker-field">
            <span className="field__label">Сплошной цвет</span>
            <span className="color-picker-field__control">
              <input
                type="color"
                value={colorPickerValue}
                onChange={handleBackgroundColorChange}
                className="color-picker-field__input"
              />
              <strong>{colorPickerValue}</strong>
            </span>
          </label>

          <div className="gradient-picker">
            <span className="field__label">Градиент из спектра</span>

            <div className="gradient-picker__row">
              <label className="color-picker-field">
                <span className="field__label">Старт</span>
                <span className="color-picker-field__control">
                  <input
                    type="color"
                    value={gradientStartValue}
                    onChange={(event) => handleGradientBackgroundChange({ startColor: event.target.value })}
                    className="color-picker-field__input"
                  />
                  <strong>{gradientStartValue}</strong>
                </span>
              </label>

              <label className="color-picker-field">
                <span className="field__label">Финиш</span>
                <span className="color-picker-field__control">
                  <input
                    type="color"
                    value={gradientEndValue}
                    onChange={(event) => handleGradientBackgroundChange({ endColor: event.target.value })}
                    className="color-picker-field__input"
                  />
                  <strong>{gradientEndValue}</strong>
                </span>
              </label>
            </div>

            <label className="field gradient-picker__angle">
              <span className="field__label">Угол градиента: {gradientAngleValue}°</span>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={gradientAngleValue}
                onChange={(event) => handleGradientBackgroundChange({ angle: Number(event.target.value) })}
                className="gradient-picker__slider"
              />
            </label>
          </div>

          <label className="field background-opacity-control">
            <span className="field__label">Прозрачность фона: {backgroundOpacityValue}%</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={backgroundOpacityValue}
              onChange={handleBackgroundOpacityChange}
              className="background-opacity-control__slider"
            />
            <span className="background-opacity-control__hint">
              0% скрывает декоративный фон, 100% показывает его полностью.
            </span>
          </label>

          <button type="button" onClick={handleBackgroundUploadClick} className="button button--secondary">
            Загрузить фото для фона
          </button>

          {hasCustomBackground ? (
            <button type="button" onClick={clearCustomBackground} className="button button--ghost">
              Удалить загруженный фон
            </button>
          ) : null}
        </div>

        <p className="background-hint">
          Можно выбрать сплошной цвет, собрать свой градиент из двух цветов и угла или загрузить фото. Фото
          автоматически уменьшается и сжимается, чтобы не раздувать локальное хранилище и итоговый PDF. Прозрачность
          применяется одинаково в живом предпросмотре и при PDF-экспорте.
        </p>

        <div className="summary-grid">
          <InfoCard label="Тема" value={selectedThemeName} />
          <InfoCard label="Фон" value={selectedBackgroundName} />
          <InfoCard label="Обложка" value={config.coverImage?.name ?? 'не задана'} />
          <InfoCard label="Фон листов" value={config.pageBackgroundImage?.name ?? 'не задан'} />
          <InfoCard label="Вкладки" value={config.tabPosition === 'top' ? 'сверху' : 'справа'} />
          <div className="surface-block surface-block--slider">
            <p className="surface-block__label">Прозрачность</p>
            <div className="surface-block__slider-stack">
              <p className="surface-block__value">{backgroundOpacityValue}%</p>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={backgroundOpacityValue}
                onChange={handleBackgroundOpacityChange}
                className="surface-block__slider"
                aria-label="Прозрачность фона"
              />
            </div>
          </div>
          <InfoCard label="Текущий стиль" value={currentBackgroundStyleLabel} />
        </div>
      </Panel>

      <Panel title="Навигация" eyebrow="Вкладки">
        <p className="muted-copy">
          Вкладки месяцев и разделов можно держать в правой колонке или перенести наверх, чтобы композиция страницы
          ощущалась более горизонтальной.
        </p>

        <div className="workflow-panel__space">
          <div className="field">
            <span className="field__label">Расположение вкладок</span>
            <div className="workflow-mode-toggle">
              <button
                type="button"
                onClick={() => handleTabPositionChange('top')}
                className={clsx('workflow-mode-toggle__button', config.tabPosition === 'top' && 'workflow-mode-toggle__button--active')}
              >
                Сверху
              </button>
              <button
                type="button"
                onClick={() => handleTabPositionChange('right')}
                className={clsx('workflow-mode-toggle__button', config.tabPosition === 'right' && 'workflow-mode-toggle__button--active')}
              >
                Справа
              </button>
            </div>
          </div>

          <div className="summary-grid">
            <InfoCard label="Положение" value={config.tabPosition === 'top' ? 'сверху' : 'справа'} />
            <InfoCard label="Всего вкладок" value={`${tabCount}`} />
          </div>
        </div>
      </Panel>

      <Panel title="Обложка и фон листов" eyebrow="PNG">
        <p className="muted-copy">
          Оба PNG опциональны. Обложка добавляется первой страницей документа, а фон листов вставляется внутрь каждого
          листа планера. Лучше готовить файлы сразу в нужном размере.
        </p>

        <div className="sticker-category-grid workflow-panel__space">
          <article className="sticker-category-card">
            <p className="small-label">Опционально</p>
            <h3 className="sticker-category-card__title">Обложка ({coverUploadSizeLabel})</h3>
            <p className="sticker-category-card__description">
              PNG вставляется как первая страница итогового PDF без дополнительного масштабирования и сжатия.
            </p>
            <div className="background-tools">
              <button type="button" onClick={handleCoverUploadClick} className="button button--secondary">
                {config.coverImage ? 'Заменить PNG-обложку' : 'Загрузить PNG-обложку'}
              </button>
              {config.coverImage ? (
                <button type="button" onClick={handleRemoveCoverImage} className="button button--ghost">
                  Удалить обложку
                </button>
              ) : null}
            </div>
            {config.coverImage ? (
              <article className="sticker-upload-card sticker-upload-card--sheet">
                <div className="sticker-upload-card__preview sticker-upload-card__preview--sheet">
                  <img src={config.coverImage.source} alt={config.coverImage.name} className="sticker-upload-card__image" />
                </div>
                <div>
                  <p className="sticker-upload-card__title">{config.coverImage.name}</p>
                  <p className="sticker-upload-card__meta">
                    {config.coverImage.width}×{config.coverImage.height} · {Math.max(1, Math.round(config.coverImage.sizeBytes / 1024))} KB
                  </p>
                </div>
              </article>
            ) : (
              <p className="muted-copy">Можно оставить планер без отдельной PNG-обложки.</p>
            )}
          </article>

          <article className="sticker-category-card">
            <p className="small-label">Опционально</p>
            <h3 className="sticker-category-card__title">Фон листов ({pageBackgroundUploadSizeLabel})</h3>
            <p className="sticker-category-card__description">
              PNG подставляется во все листы планера. Если в файле есть прозрачные области, они сохранятся и в
              предпросмотре, и в PDF.
            </p>
            <div className="background-tools">
              <button type="button" onClick={handlePageBackgroundUploadClick} className="button button--secondary">
                {config.pageBackgroundImage ? 'Заменить PNG-фон листов' : 'Загрузить PNG-фон листов'}
              </button>
              {config.pageBackgroundImage ? (
                <button type="button" onClick={handleRemovePageBackgroundImage} className="button button--ghost">
                  Удалить фон листов
                </button>
              ) : null}
            </div>
            {config.pageBackgroundImage ? (
              <article className="sticker-upload-card sticker-upload-card--sheet">
                <div className="sticker-upload-card__preview sticker-upload-card__preview--sheet">
                  <img
                    src={config.pageBackgroundImage.source}
                    alt={config.pageBackgroundImage.name}
                    className="sticker-upload-card__image"
                  />
                </div>
                <div>
                  <p className="sticker-upload-card__title">{config.pageBackgroundImage.name}</p>
                  <p className="sticker-upload-card__meta">
                    {config.pageBackgroundImage.width}×{config.pageBackgroundImage.height} · {Math.max(1, Math.round(config.pageBackgroundImage.sizeBytes / 1024))} KB
                  </p>
                </div>
              </article>
            ) : (
              <p className="muted-copy">Можно оставить стандартные листы без собственного PNG-фона.</p>
            )}
          </article>
        </div>
      </Panel>
    </>
  );
}

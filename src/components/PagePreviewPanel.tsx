export { PlannerRenderPreviewPanel as PagePreviewPanel } from './PlannerRenderPreviewPanel';
/*

import clsx from 'clsx';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { getBackgroundById, getStickersByCategory } from '../lib/assets/assetRegistry';
import { getMonthCalendar, getWeekCalendar, RU_MONTHS_SHORT, RU_WEEKDAYS } from '../lib/navigation/dateHelpers';
import {
  getReadyStickerSheetById,
  getStickerModuleConfig,
  getStickerRenderableAssetById,
  isUploadedStickerAsset,
} from '../lib/stickers/stickerModuleConfig';
import { getStickerCategoryMeta } from '../lib/stickers/stickerCatalog';
import { MONTH_DAILY_RECT, MONTH_YEAR_RECT, NEXT_RECT, PREVIOUS_RECT, rectFromTop } from '../lib/templates/layout';
import { getThemeById } from '../lib/themes/themeRegistry';
import type { BuiltPlannerPage, PlannerDocumentPlan } from '../types/pdf';
import type { PlannerConfig, PlannerSectionType, StickerAsset, StickerUploadAssetMeta } from '../types/planner';
import { InfoCard } from './InfoCard';
import { Panel } from './Panel';
import { PreviewLinkAction } from './preview/PreviewLinkAction';
import { PreviewNavRow } from './preview/PreviewNavRow';
import {
  getFirstPageIdBySection,
  getLinkedPageByRect,
  getPageById,
  getSidebarSelectionId,
} from './preview/previewNavigation';

interface PagePreviewPanelProps {
  config: PlannerConfig;
  plan: PlannerDocumentPlan;
  preferredSectionType?: PlannerSectionType;
}

const WEEK_MONTH_RECT = rectFromTop(382, 680, 150, 34);
const WEEK_PAIR_RECT = rectFromTop(724, 680, 150, 34);

function collectPreviewPages(plan: PlannerDocumentPlan) {
  const order: BuiltPlannerPage['kind'][] = [
    'index',
    'year',
    'month',
    'week-left',
    'day',
    'notes',
    'checklist',
    'sticker',
  ];

  return order
    .map((kind) => plan.pages.find((page) => page.kind === kind))
    .filter((page): page is BuiltPlannerPage => Boolean(page));
}

function isTabActive(page: BuiltPlannerPage, tabId: string) {
  if (tabId.startsWith('tab-month-')) {
    const monthIndex = Number(tabId.replace('tab-month-', '')) - 1;
    return page.monthIndex === monthIndex;
  }

  if (tabId === 'tab-notes') {
    return page.sectionType === 'notes';
  }

  if (tabId === 'tab-checklist') {
    return page.sectionType === 'checklist';
  }

  if (tabId === 'tab-stickers') {
    return page.sectionType === 'stickers';
  }

  return false;
}

function isRenderableStickerAsset(asset: StickerAsset | StickerUploadAssetMeta | undefined): asset is StickerAsset | StickerUploadAssetMeta {
  return Boolean(asset);
}

const PAGE_KIND_LABELS: Record<BuiltPlannerPage['kind'], string> = {
  index: 'главная',
  year: 'обзор года',
  month: 'месяц',
  'week-left': 'неделя слева',
  'week-right': 'неделя справа',
  day: 'день',
  notes: 'заметки',
  checklist: 'чек-лист',
  sticker: 'стикеры',
};

const SECTION_LABELS: Record<PlannerSectionType, string> = {
  cover: 'обложка',
  index: 'индекс',
  year: 'обзор года',
  monthly: 'месяцы',
  weekly: 'недели',
  daily: 'дни',
  notes: 'заметки',
  checklist: 'чек-листы',
  stickers: 'стикеры',
};

function PreviewBody({
  config,
  page,
  plan,
  onNavigate,
}: {
  config: PlannerConfig;
  page: BuiltPlannerPage;
  plan: PlannerDocumentPlan;
  onNavigate: (pageId: string) => void;
}) {
  if (page.kind === 'index') {
    const sectionTargets: Array<{ key: PlannerSectionType; label: string }> = [
      { key: 'year', label: 'Обзор года' },
      { key: 'weekly', label: 'Недельный блок' },
      { key: 'daily', label: 'Дневные страницы' },
      { key: 'notes', label: 'Заметки' },
      { key: 'checklist', label: 'Чек-листы' },
      { key: 'stickers', label: 'Страницы со стикерами' },
    ];

    return (
      <div className="planner-preview__body planner-preview__body--index">
        <div className="planner-preview__hero-card">
          <div className="planner-preview__chip-row">
            <span className="planner-preview__chip">Датированный / недатированный</span>
            <span className="planner-preview__chip">Тема</span>
            <span className="planner-preview__chip">Вкладки</span>
          </div>
          <div className="planner-preview__month-grid">
            {RU_MONTHS_SHORT.map((month, index) => (
              <PreviewLinkAction
                key={month}
                className="planner-preview__month-pill"
                targetPageId={getPageById(plan, `page-month-${index + 1}`)?.id}
                onNavigate={onNavigate}
              >
                {month}
              </PreviewLinkAction>
            ))}
          </div>
        </div>
        <div className="planner-preview__section-grid">
          {sectionTargets.map((item) => {
            const targetPageId = getFirstPageIdBySection(plan, item.key);
            return (
              <PreviewLinkAction
                key={item.key}
                className="planner-preview__section-card"
                targetPageId={targetPageId}
                onNavigate={onNavigate}
                block
              >
                <strong>{item.label}</strong>
                <small>{targetPageId ? 'Открыть' : 'Выкл.'}</small>
              </PreviewLinkAction>
            );
          })}
        </div>
      </div>
    );
  }

  if (page.kind === 'year') {
    return (
      <div className="planner-preview__body planner-preview__body--year">
        <div className="planner-preview__year-grid">
          {RU_MONTHS_SHORT.map((month, index) => (
            <PreviewLinkAction
              key={month}
              className="planner-preview__year-card"
              targetPageId={getPageById(plan, `page-month-${index + 1}`)?.id}
              onNavigate={onNavigate}
              block
            >
              <span>{month}</span>
              <div className="planner-preview__mini-lines">
                <i />
                <i />
                <i />
              </div>
              <small>Перейти к месяцу</small>
            </PreviewLinkAction>
          ))}
        </div>
      </div>
    );
  }

  if (page.kind === 'month') {
    const monthCalendar = getMonthCalendar(config.year ?? new Date().getFullYear(), page.monthIndex ?? 0);
    const weekCards = plan.pages
      .filter((candidate) => candidate.kind === 'week-left' && candidate.monthIndex === page.monthIndex)
      .slice(0, 5);
    const dailyTarget = getLinkedPageByRect(plan, page.id, MONTH_DAILY_RECT)?.id;
    const yearTarget = getLinkedPageByRect(plan, page.id, MONTH_YEAR_RECT)?.id;

    return (
      <div className="planner-preview__body planner-preview__body--month">
        <div className="planner-preview__month-layout">
          <div className="planner-preview__card-stack">
            <div className="planner-preview__focus-card">
              <strong>Фокус месяца</strong>
              <div className="planner-preview__mini-lines">
                <i />
                <i />
                <i />
              </div>
            </div>
            {weekCards.map((week) => (
              <PreviewLinkAction
                key={week.id}
                className="planner-preview__week-link"
                targetPageId={week.id}
                onNavigate={onNavigate}
                block
              >
                <span>{week.title}</span>
                <small>{week.label}</small>
              </PreviewLinkAction>
            ))}
          </div>
          <div className="planner-preview__calendar">
            <div className="planner-preview__calendar-head">
              {RU_WEEKDAYS.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="planner-preview__calendar-grid">
              {monthCalendar.grid.flatMap((row) =>
                row.map((cell) => (
                  <i key={cell.iso}>{config.mode === 'dated' && cell.inCurrentMonth ? cell.dayOfMonth : ''}</i>
                )),
              )}
            </div>
            <div className="planner-preview__month-actions">
              <PreviewLinkAction
                className="planner-preview__month-action"
                targetPageId={dailyTarget}
                onNavigate={onNavigate}
                block
              >
                {dailyTarget ? 'Дневные страницы' : 'Дневные выключены'}
              </PreviewLinkAction>
              <PreviewLinkAction
                className="planner-preview__month-action"
                targetPageId={yearTarget}
                onNavigate={onNavigate}
                block
              >
                Обзор года
              </PreviewLinkAction>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (page.kind === 'week-left' || page.kind === 'week-right') {
    const weekCalendar = getWeekCalendar(config.year ?? new Date().getFullYear(), page.weekIndex ?? 0);
    const days = page.kind === 'week-left' ? weekCalendar.days.slice(0, 3) : weekCalendar.days.slice(3);
    const previousTarget = getLinkedPageByRect(plan, page.id, PREVIOUS_RECT)?.id;
    const nextTarget = getLinkedPageByRect(plan, page.id, NEXT_RECT)?.id;
    const monthTarget = getLinkedPageByRect(plan, page.id, WEEK_MONTH_RECT)?.id;
    const pairTarget = getLinkedPageByRect(plan, page.id, WEEK_PAIR_RECT)?.id;

    return (
      <div className="planner-preview__body planner-preview__body--week">
        <div className="planner-preview__week-grid">
          {days.map((day) => (
            <div key={day.iso} className="planner-preview__day-card">
              <strong>{config.mode === 'dated' ? day.weekdayLabel : RU_WEEKDAYS[day.weekdayIndex]}</strong>
              <small>{config.mode === 'dated' ? day.shortLabel : 'Свободный слот'}</small>
              <div className="planner-preview__mini-lines">
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          ))}
        </div>
        <div className="planner-preview__footer-card">
          <strong>{page.kind === 'week-left' ? 'Фокус недели' : 'Заметки и трекер'}</strong>
          <div className="planner-preview__mini-lines">
            <i />
            <i />
            <i />
          </div>
        </div>
        <PreviewNavRow
          onNavigate={onNavigate}
          items={[
            { label: 'Назад', targetPageId: previousTarget },
            { label: 'Вперёд', targetPageId: nextTarget },
            { label: 'Месяц', targetPageId: monthTarget },
            { label: page.kind === 'week-left' ? 'Стр. 2' : 'Стр. 1', targetPageId: pairTarget },
          ]}
        />
      </div>
    );
  }

  if (page.kind === 'day') {
    const previousTarget = getLinkedPageByRect(plan, page.id, PREVIOUS_RECT)?.id;
    const nextTarget = getLinkedPageByRect(plan, page.id, NEXT_RECT)?.id;

    return (
      <div className="planner-preview__body planner-preview__body--day">
        {['План дня', 'Главные приоритеты', 'Заметки'].map((label) => (
          <div key={label} className="planner-preview__day-column">
            <strong>{label}</strong>
            <div className="planner-preview__mini-lines">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        ))}
        <PreviewNavRow
          compact
          onNavigate={onNavigate}
          items={[
            { label: 'Пред. день', targetPageId: previousTarget },
            { label: 'След. день', targetPageId: nextTarget },
          ]}
        />
      </div>
    );
  }

  if (page.kind === 'notes') {
    const previousTarget = getLinkedPageByRect(plan, page.id, PREVIOUS_RECT)?.id;
    const nextTarget = getLinkedPageByRect(plan, page.id, NEXT_RECT)?.id;

    return (
      <div className="planner-preview__body planner-preview__body--notes">
        <div className="planner-preview__lined-sheet">
          {Array.from({ length: 12 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
        <PreviewNavRow
          compact
          onNavigate={onNavigate}
          items={[
            { label: 'Пред. заметка', targetPageId: previousTarget },
            { label: 'След. заметка', targetPageId: nextTarget },
          ]}
        />
      </div>
    );
  }

  if (page.kind === 'checklist') {
    const previousTarget = getLinkedPageByRect(plan, page.id, PREVIOUS_RECT)?.id;
    const nextTarget = getLinkedPageByRect(plan, page.id, NEXT_RECT)?.id;

    return (
      <div className="planner-preview__body planner-preview__body--checklist">
        <div className="planner-preview__checklist-sheet">
          {Array.from({ length: 9 }, (_, index) => (
            <div key={index} className="planner-preview__check-row">
              <span />
              <i />
            </div>
          ))}
        </div>
        <PreviewNavRow
          compact
          onNavigate={onNavigate}
          items={[
            { label: 'Пред. список', targetPageId: previousTarget },
            { label: 'След. список', targetPageId: nextTarget },
          ]}
        />
      </div>
    );
  }

  if (page.kind === 'sticker') {
    const stickerConfig = getStickerModuleConfig(config);
    const category = page.stickerCategory ?? 'functional';
    const meta = getStickerCategoryMeta(category);
    const previousTarget = getLinkedPageByRect(plan, page.id, PREVIOUS_RECT)?.id;
    const nextTarget = getLinkedPageByRect(plan, page.id, NEXT_RECT)?.id;

    if (page.stickerSourceMode === 'ready-sheet') {
      const sheet = page.stickerReadySheetId ? getReadyStickerSheetById(stickerConfig, page.stickerReadySheetId) : undefined;

      return (
        <div className="planner-preview__body planner-preview__body--stickers">
          <div className="planner-preview__sticker-summary">
            <div>
              <strong>{sheet?.name ?? 'Готовый лист со стикерами'}</strong>
              <p>Готовый лист вставляется как отдельная страница без перекомпоновки.</p>
            </div>
            <div className="planner-preview__chip-row">
              <span className="planner-preview__chip">Готовый лист</span>
              <span className="planner-preview__chip">4:3 PNG</span>
              <span className="planner-preview__chip">Без изменений</span>
            </div>
          </div>
          <div className="planner-preview__ready-sheet">
            {sheet ? <img src={sheet.previewSource} alt={sheet.name} className="planner-preview__ready-sheet-image" /> : null}
          </div>
          <PreviewNavRow
            compact
            onNavigate={onNavigate}
            items={[
              { label: 'Пред. лист', targetPageId: previousTarget },
              { label: 'След. лист', targetPageId: nextTarget },
            ]}
          />
        </div>
      );
    }

    const stickers = page.stickerAssetIds?.length
      ? page.stickerAssetIds
        .map((assetId) => getStickerRenderableAssetById(stickerConfig, assetId))
        .filter(isRenderableStickerAsset)
      : getStickersByCategory(category).slice(0, 6);

    return (
      <div className="planner-preview__body planner-preview__body--stickers">
        <div className="planner-preview__sticker-summary">
          <div>
            <strong>{meta.label}</strong>
            <p>{meta.description}</p>
          </div>
          <div className="planner-preview__chip-row">
            {meta.chips.map((chip) => (
              <span key={chip} className="planner-preview__chip">{chip}</span>
            ))}
          </div>
        </div>
        <div className="planner-preview__sticker-grid">
          {stickers.map((sticker) => (
            <span key={sticker.id} className="planner-preview__sticker">
              {isUploadedStickerAsset(sticker)
                ? <img src={sticker.previewSource} alt={sticker.name} className="planner-preview__sticker-image" />
                : sticker.emoji ?? sticker.name}
            </span>
          ))}
        </div>
        <p className="planner-preview__sticker-note">{meta.usageHint}</p>
        <PreviewNavRow
          compact
          onNavigate={onNavigate}
          items={[
            { label: 'Пред. лист', targetPageId: previousTarget },
            { label: 'След. лист', targetPageId: nextTarget },
          ]}
        />
      </div>
    );
  }

  return null;
}

export function PagePreviewPanel({ config, plan, preferredSectionType }: PagePreviewPanelProps) {
  const previewPages = collectPreviewPages(plan);
  const [selectedPageId, setSelectedPageId] = useState(plan.pages[0]?.id ?? '');
  const lastAutoFocusedKeyRef = useRef('');
  const selectedPage = plan.pages.find((page) => page.id === selectedPageId) ?? previewPages[0] ?? plan.pages[0];
  const theme = getThemeById(config.themeId);
  const background = getBackgroundById(config.backgroundId, config.customBackground);
  const indexPageId = getFirstPageIdBySection(plan, 'index');
  const selectedSidebarPageId = selectedPage ? getSidebarSelectionId(previewPages, selectedPage) : '';

  useEffect(() => {
    if (!plan.pages.some((page) => page.id === selectedPageId)) {
      setSelectedPageId(plan.pages[0]?.id ?? '');
    }
  }, [plan.pages, selectedPageId]);

  useEffect(() => {
    if (!preferredSectionType) {
      lastAutoFocusedKeyRef.current = '';
      return;
    }

    const preferredPageId = getFirstPageIdBySection(plan, preferredSectionType);
    if (!preferredPageId) {
      return;
    }

    const focusKey = `${preferredSectionType}:${preferredPageId}`;
    if (lastAutoFocusedKeyRef.current === focusKey) {
      return;
    }

    setSelectedPageId((currentSelectedPageId) => {
      const currentPage = plan.pages.find((page) => page.id === currentSelectedPageId);
      if (currentPage?.sectionType === preferredSectionType) {
        return currentSelectedPageId;
      }

      return preferredPageId;
    });

    lastAutoFocusedKeyRef.current = focusKey;
  }, [plan, preferredSectionType]);

  if (!selectedPage) {
    return null;
  }

  return (
    <Panel title="Живой предпросмотр" eyebrow="Шаблоны">
      <div className="preview-workbench">
        <div className="preview-workbench__sidebar">
          {previewPages.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => setSelectedPageId(page.id)}
              className={clsx(
                'preview-workbench__page-button',
                page.id === selectedSidebarPageId && 'preview-workbench__page-button--active',
              )}
            >
              <strong>{page.title}</strong>
              <span>{page.label}</span>
            </button>
          ))}
        </div>

        <div className="preview-workbench__stage">
          <div
            className="planner-preview"
            style={
              {
                '--preview-paper': theme.colors.paper,
                '--preview-text': theme.colors.text,
                '--preview-muted': theme.colors.muted,
                '--preview-border': theme.colors.border,
                '--preview-accent': theme.colors.accent,
                '--preview-tab-text': theme.colors.tabText,
                '--preview-base': theme.colors.background,
                '--preview-bg': background.preview,
                '--preview-bg-opacity': String(config.backgroundOpacity),
              } as CSSProperties
            }
          >
            <div className="planner-preview__canvas">
              <div className="planner-preview__paper">
                <PreviewLinkAction
                  className={clsx(
                    'planner-preview__home',
                    selectedPage.kind === 'index' && 'planner-preview__home--active',
                  )}
                  targetPageId={indexPageId}
                  onNavigate={setSelectedPageId}
                >
                  Индекс
                </PreviewLinkAction>
                <div className="planner-preview__header">
                  <div>
                    <h3>{selectedPage.title}</h3>
                    <p>{selectedPage.label}</p>
                  </div>
                  <span>
                    {selectedPage.pageNumber} / {plan.pages.length}
                  </span>
                </div>

                <PreviewBody config={config} page={selectedPage} plan={plan} onNavigate={setSelectedPageId} />
              </div>

              <div className="planner-preview__tab-rail">
                {plan.tabs.map((tab) => (
                  <PreviewLinkAction
                    key={tab.id}
                    targetPageId={tab.targetPageId}
                    onNavigate={setSelectedPageId}
                    className={clsx(
                      'planner-preview__tab',
                      isTabActive(selectedPage, tab.id) && 'planner-preview__tab--active',
                    )}
                  >
                    {tab.label}
                  </PreviewLinkAction>
                ))}
              </div>
            </div>
          </div>

          <div className="preview-workbench__meta">
            <InfoCard label="Текущая страница" value={PAGE_KIND_LABELS[selectedPage.kind]} />
            <InfoCard label="Тема / фон" value={`${theme.name} / ${background.name}`} />
            <InfoCard label="Прозрачность" value={`${Math.round(config.backgroundOpacity * 100)}%`} />
            <InfoCard label="Раздел" value={SECTION_LABELS[selectedPage.sectionType]} />
          </div>
        </div>
      </div>
    </Panel>
  );
}
*/

import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildPlannerRenderModel } from '../core/render-model';
import type { PlannerDocumentPlan } from '../types/pdf';
import type { PlannerConfig, PlannerSectionType } from '../types/planner';
import { Panel } from './Panel';
import { InfoCard } from './InfoCard';
import { PlannerPageSvg } from './preview/PlannerPageSvg';

interface PlannerRenderPreviewPanelProps {
  config: PlannerConfig;
  plan: PlannerDocumentPlan;
  preferredSectionType?: PlannerSectionType;
}

function collectPreviewPageIds(plan: PlannerDocumentPlan) {
  return plan.pages.map((page) => page.id);
}

export function PlannerRenderPreviewPanel({ config, plan, preferredSectionType }: PlannerRenderPreviewPanelProps) {
  const renderModel = useMemo(() => buildPlannerRenderModel(config), [config]);
  const previewPageIds = useMemo(() => collectPreviewPageIds(renderModel.plan), [renderModel.plan]);
  const [selectedPageId, setSelectedPageId] = useState(previewPageIds[0] ?? renderModel.pages[0]?.page.id ?? '');
  const lastAutoFocusRef = useRef('');

  const selectedPage = renderModel.pages.find((page) => page.page.id === selectedPageId)
    ?? renderModel.pages.find((page) => page.page.id === previewPageIds[0])
    ?? renderModel.pages[0];

  useEffect(() => {
    if (!renderModel.pages.some((page) => page.page.id === selectedPageId)) {
      setSelectedPageId(previewPageIds[0] ?? renderModel.pages[0]?.page.id ?? '');
    }
  }, [previewPageIds, renderModel.pages, selectedPageId]);

  useEffect(() => {
    if (!preferredSectionType) {
      lastAutoFocusRef.current = '';
      return;
    }

    const pageId = renderModel.plan.pages.find((page) => page.sectionType === preferredSectionType)?.id;
    if (!pageId) {
      return;
    }

    const nextKey = `${preferredSectionType}:${pageId}`;
    if (lastAutoFocusRef.current === nextKey) {
      return;
    }

    setSelectedPageId((currentPageId) => {
      const currentPage = renderModel.plan.pages.find((page) => page.id === currentPageId);
      return currentPage?.sectionType === preferredSectionType ? currentPageId : pageId;
    });
    lastAutoFocusRef.current = nextKey;
  }, [preferredSectionType, renderModel.plan.pages]);

  if (!selectedPage) {
    return null;
  }

  const activeLinks = renderModel.links.filter((link) => link.sourcePageId === selectedPage.page.id);
  const previewPages = previewPageIds
    .map((pageId) => renderModel.pages.find((page) => page.page.id === pageId))
    .filter((page): page is NonNullable<typeof page> => Boolean(page));

  return (
    <Panel title="Живой предпросмотр" eyebrow="RenderModel">
      <div className="preview-workbench">
        <div className="preview-workbench__sidebar">
          {previewPages.map((page) => (
            <button
              key={page.page.id}
              type="button"
              onClick={() => setSelectedPageId(page.page.id)}
              className={clsx(
                'preview-workbench__page-button',
                page.page.id === selectedPage.page.id && 'preview-workbench__page-button--active',
              )}
            >
              <strong>{page.page.title}</strong>
              <span>{page.page.label}</span>
            </button>
          ))}
        </div>

        <div className="preview-workbench__stage">
          <div className="planner-preview planner-preview--rendered">
            <div className="planner-preview__canvas">
              <div className="planner-preview__paper planner-preview__paper--svg">
                <PlannerPageSvg
                  page={selectedPage}
                  links={activeLinks}
                  theme={renderModel.theme}
                  onNavigate={setSelectedPageId}
                />
              </div>
            </div>
          </div>

          <div className="preview-workbench__meta">
            <InfoCard label="Текущая страница" value={selectedPage.page.title} />
            <InfoCard label="Раздел" value={selectedPage.page.sectionType} />
            <InfoCard label="Размер" value={`${renderModel.width} × ${renderModel.height}`} />
            <InfoCard label="Ссылки на странице" value={`${activeLinks.length}`} />
            <InfoCard label="Всего страниц" value={`${plan.pages.length}`} />
            <InfoCard label="Тема" value={renderModel.theme.name} />
          </div>
        </div>
      </div>
    </Panel>
  );
}

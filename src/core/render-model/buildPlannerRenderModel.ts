import { PAGE_HEIGHT, PAGE_WIDTH } from '../../lib/templates/layout';
import { normalizePlannerLayouts } from '../../modules/layout-editor/model/normalizeLayouts';
import { getBackgroundById } from '../../lib/assets/assetRegistry';
import { buildPlannerPlan } from '../../lib/navigation/buildPlannerPlan';
import { getThemeById } from '../../lib/themes/themeRegistry';
import type { PlannerConfig } from '../types/planner';
import type { PlannerRenderModel, PlannerRenderPage } from './types';
import { buildBackgroundNodes, buildChromeLinks, buildCoverNodes, buildHeaderNodes } from './chrome';
import { buildPageContent } from './pageBuilders';
import { getLayoutTarget } from './selectors';

export function buildPlannerRenderModel(config: PlannerConfig) {
  const theme = getThemeById(config.themeId);
  const background = getBackgroundById(config.backgroundId, config.customBackground);
  const plan = buildPlannerPlan(config);
  const layouts = normalizePlannerLayouts(config.layouts);

  const model: PlannerRenderModel = {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    config,
    theme,
    background,
    plan,
    pages: [],
    links: [],
  };

  model.pages = plan.pages.map((page) => {
    if (page.kind === 'cover') {
      return {
        page,
        layout: {
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          blocks: [],
        },
        nodes: buildCoverNodes(model, page),
      };
    }

    const layout = layouts[getLayoutTarget(page)] ?? {
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      blocks: [],
    };

    const renderPage: PlannerRenderPage = {
      page,
      layout,
      nodes: buildBackgroundNodes(model, page),
    };

    renderPage.nodes.push(...buildHeaderNodes(model, renderPage));
    buildPageContent(model, renderPage, model.links);
    return renderPage;
  });

  buildChromeLinks(model);
  return model;
}

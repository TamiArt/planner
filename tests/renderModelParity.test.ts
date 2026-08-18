import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPlannerRenderModel } from '../src/core/render-model';
import { createDefaultPlannerConfig } from '../src/lib/config/defaultPlannerConfig';
import { buildPlannerPlan } from '../src/lib/navigation/buildPlannerPlan';

test('render model preserves planner plan page order and ids', () => {
  const config = createDefaultPlannerConfig();
  const plan = buildPlannerPlan(config);
  const renderModel = buildPlannerRenderModel(config);

  assert.deepEqual(
    renderModel.plan.pages.map((page) => page.id),
    plan.pages.map((page) => page.id),
  );
  assert.deepEqual(
    renderModel.pages.map((page) => page.page.id),
    plan.pages.map((page) => page.id),
  );
});

test('every render-model link points to pages present in the exported model', () => {
  const renderModel = buildPlannerRenderModel(createDefaultPlannerConfig());
  const pageIds = new Set(renderModel.pages.map((page) => page.page.id));

  renderModel.links.forEach((link) => {
    assert.equal(pageIds.has(link.sourcePageId), true, `Missing source page: ${link.sourcePageId}`);
    assert.equal(pageIds.has(link.targetPageId), true, `Missing target page: ${link.targetPageId}`);
  });
});

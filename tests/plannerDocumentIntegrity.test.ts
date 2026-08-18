import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultPlannerConfig } from '../src/lib/config/defaultPlannerConfig';
import { applyPlannerPreset, plannerPresets } from '../src/lib/config/plannerPresets';
import { buildPlannerPlan } from '../src/lib/navigation/buildPlannerPlan';
import type { PlannerConfig } from '../src/types/planner';

function assertPlanIntegrity(config: PlannerConfig) {
  const plan = buildPlannerPlan(config);
  const pageIds = plan.pages.map((page) => page.id);
  const pageIdSet = new Set(pageIds);

  assert.equal(pageIdSet.size, pageIds.length, 'Planner pages must have unique ids');
  assert.deepEqual(
    plan.pages.map((page) => page.pageNumber),
    plan.pages.map((_, index) => index + 1),
    'Planner page numbers must stay sequential',
  );

  plan.tabs.forEach((tab) => {
    assert.equal(pageIdSet.has(tab.targetPageId), true, `Tab ${tab.id} points to missing page ${tab.targetPageId}`);
  });

  plan.links.forEach((link) => {
    assert.equal(pageIdSet.has(link.sourcePageId), true, `Link source is missing: ${link.sourcePageId}`);
    assert.equal(pageIdSet.has(link.targetPageId), true, `Link target is missing: ${link.targetPageId}`);
  });
}

test('default planner document has stable navigation integrity', () => {
  assertPlanIntegrity(createDefaultPlannerConfig());
});

test('all planner presets preserve page and navigation integrity', () => {
  const base = createDefaultPlannerConfig();

  plannerPresets.forEach((preset) => {
    assertPlanIntegrity(applyPlannerPreset(base, preset.id));
  });
});

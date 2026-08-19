import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPlannerRenderModel } from '../src/core/render-model/buildPlannerRenderModel';
import { createDefaultPlannerConfig } from '../src/lib/config/defaultPlannerConfig';
import { addMonthLayoutBlock, updateLayoutBlockContent } from '../src/modules/layout-editor/model/blockOperations';
import { normalizePlannerLayouts } from '../src/modules/layout-editor/model/normalizeLayouts';
import type { AddableMonthBlockType } from '../src/modules/layout-editor/model/blockCatalog';
import { updateBlockRect } from '../src/shared/layout/updateBlock';

function getMonthPage(config = createDefaultPlannerConfig()) {
  const model = buildPlannerRenderModel(config);
  const page = model.pages.find((candidate) => candidate.page.kind === 'month');
  assert.ok(page);
  return page;
}

test('direct month geometry is preserved by the shared render model', () => {
  const config = createDefaultPlannerConfig();
  const monthLayout = normalizePlannerLayouts(config.layouts).month!;
  const added = addMonthLayoutBlock(monthLayout, 'text');
  const changed = updateBlockRect(added.layout, added.block.id, {
    x: 416,
    y: 512,
    width: 640,
    height: 256,
  }, { snapToGrid: false, resolveCollisions: false });

  config.layouts = { ...config.layouts, month: changed };
  const monthPage = getMonthPage(config);
  const surface = monthPage.nodes.find((node) => node.id.includes('custom-month-block') && node.id.endsWith('-surface'));

  assert.ok(surface && surface.kind === 'rect');
  assert.deepEqual(
    { x: surface.x, y: surface.y, width: surface.width, height: surface.height },
    { x: 416, y: 512, width: 640, height: 256 },
  );
});

test('all addable month window types reach the render model', () => {
  const types: AddableMonthBlockType[] = ['note-area', 'checklist', 'text', 'shape'];

  types.forEach((type) => {
    const config = createDefaultPlannerConfig();
    const monthLayout = normalizePlannerLayouts(config.layouts).month!;
    const added = addMonthLayoutBlock(monthLayout, type);
    const nextLayout = type === 'text'
      ? updateLayoutBlockContent(added.layout, added.block.id, { content: 'Проверочный текст' })
      : added.layout;

    config.layouts = { ...config.layouts, month: nextLayout };
    const monthPage = getMonthPage(config);
    const customNodes = monthPage.nodes.filter((node) => node.id.includes('custom-month-block'));

    assert.ok(customNodes.some((node) => node.kind === 'rect'), `${type} должен иметь surface в preview`);

    if (type === 'note-area') {
      assert.ok(customNodes.some((node) => node.kind === 'line'), 'note-area должен иметь линии для записи');
    }

    if (type === 'checklist') {
      assert.ok(customNodes.some((node) => node.kind === 'rect' && node.id.includes('checkbox')), 'checklist должен иметь checkbox');
    }

    if (type === 'text') {
      assert.ok(customNodes.some((node) => node.kind === 'text' && node.lines.includes('Проверочный текст')));
    }
  });
});

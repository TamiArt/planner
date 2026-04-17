import type { PlannerModule } from './plannerModule';
import type { PlannerModuleId, PlannerSectionType } from '../types/planner';
import { backgroundModule } from '../../modules/background';
import { checklistModule } from '../../modules/checklist';
import { dailyModule } from '../../modules/daily';
import { indexModule } from '../../modules/index';
import { layoutEditorModule } from '../../modules/layout-editor';
import { monthlyModule } from '../../modules/monthly';
import { notesModule } from '../../modules/notes';
import { stickersModule } from '../../modules/stickers';
import { weeklyModule } from '../../modules/weekly';
import { yearOverviewModule } from '../../modules/year-overview';

export const moduleRegistry: PlannerModule[] = [
  backgroundModule,
  indexModule,
  yearOverviewModule,
  monthlyModule,
  weeklyModule,
  dailyModule,
  notesModule,
  checklistModule,
  stickersModule,
  layoutEditorModule,
];

const moduleById = new Map<PlannerModuleId, PlannerModule>(
  moduleRegistry.map((module) => [module.manifest.id, module]),
);

const moduleBySectionType = new Map<Exclude<PlannerSectionType, 'cover'>, PlannerModule>(
  moduleRegistry
    .filter((module): module is PlannerModule & { manifest: { sectionType: Exclude<PlannerSectionType, 'cover'> } } => Boolean(module.manifest.sectionType))
    .map((module) => [module.manifest.sectionType, module]),
);

export function getModuleById(moduleId: PlannerModuleId) {
  return moduleById.get(moduleId);
}

export function getModuleBySectionType(sectionType: PlannerSectionType) {
  if (sectionType === 'cover') {
    return undefined;
  }

  return moduleBySectionType.get(sectionType);
}

export function isLockedSectionType(sectionType: PlannerSectionType) {
  return Boolean(getModuleBySectionType(sectionType)?.manifest.locked);
}

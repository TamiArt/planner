import { buildPlannerRenderModel } from '../render-model';
import type { PlannerConfig } from '../types/planner';

export function PlannerComposer(config: PlannerConfig) {
  return buildPlannerRenderModel(config);
}

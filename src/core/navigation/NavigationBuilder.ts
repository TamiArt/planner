import { buildPlannerRenderModel } from '../render-model';
import type { PlannerConfig } from '../types/planner';

export function NavigationBuilder(config: PlannerConfig) {
  const renderModel = buildPlannerRenderModel(config);

  return {
    tabs: renderModel.plan.tabs,
    links: renderModel.links,
  };
}

import type { PlannerDocumentPlan } from '../../types/pdf';
import type { PlannerConfig } from '../../types/planner';
import { composePlannerDocument } from '../../core/composer/composePlannerDocument';

export function buildPlannerPlan(config: PlannerConfig): PlannerDocumentPlan {
  return composePlannerDocument(config);
}

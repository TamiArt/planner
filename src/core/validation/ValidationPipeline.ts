import { validatePlannerConfig } from '../../lib/validators/plannerConfigValidator';
import type { PlannerConfig } from '../types/planner';

export function ValidationPipeline(config: PlannerConfig) {
  return validatePlannerConfig(config);
}

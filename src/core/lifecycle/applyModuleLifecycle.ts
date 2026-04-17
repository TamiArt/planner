import { moduleRegistry } from '../registry/moduleRegistry';
import type { PlannerConfig } from '../types/planner';

export function applyModuleLifecycle(config: PlannerConfig): PlannerConfig {
  return moduleRegistry.reduce((currentConfig, module) => {
    const patch = module.lifecycle?.normalizeConfig?.(currentConfig);

    return patch
      ? {
          ...currentConfig,
          ...patch,
        }
      : currentConfig;
  }, config);
}

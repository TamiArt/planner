import { moduleRegistry } from '../registry/moduleRegistry';
import type { PlannerModule } from '../registry/plannerModule';
import type { BuiltPlannerPage, PlannerDocumentPlan, PlannerPageDefinition, PlannerTabTarget } from '../types/pdf';
import type { PlannerConfig } from '../types/planner';
import { getModuleIdsInOrder } from '../config/moduleState';
import { buildHomeLinks, buildTabLinks } from '../navigation/linkBuilders';

function assignPageNumbers(pageDefinitions: PlannerPageDefinition[]) {
  return pageDefinitions.map((page, index) => ({
    ...page,
    pageNumber: index + 1,
  })) satisfies BuiltPlannerPage[];
}

function createCoverPage(config: PlannerConfig): PlannerPageDefinition[] {
  if (!config.coverImage) {
    return [];
  }

  return [{
    id: 'page-cover',
    kind: 'cover',
    title: 'Обложка',
    sectionType: 'cover',
    label: config.coverImage.name,
  }];
}

function resolveRegisteredModules(config: PlannerConfig) {
  const order = getModuleIdsInOrder(config.modules);
  const registryMap = new Map(moduleRegistry.map((module) => [module.manifest.id, module]));

  return order
    .map((moduleId) => registryMap.get(moduleId))
    .filter((module): module is PlannerModule => Boolean(module))
    .filter((module) => module.isEnabled(config))
    .filter((module) => (module.manifest.dependencies ?? []).every((dependencyId) => config.modules[dependencyId]?.enabled));
}

export function composePlannerDocument(config: PlannerConfig): PlannerDocumentPlan {
  const activeModules = resolveRegisteredModules(config);
  const contentModules = activeModules.filter(
    (module): module is PlannerModule & Required<Pick<PlannerModule, 'getPages'>> => module.manifest.kind !== 'tool' && Boolean(module.getPages),
  );
  const pageDefinitions = [
    ...createCoverPage(config),
    ...contentModules.flatMap((module) => module.getPages(config)),
  ];
  const pages = assignPageNumbers(pageDefinitions);
  const tabs = contentModules.flatMap((module) => module.getTabs?.({ config, pages, tabs: [] }) ?? []) as PlannerTabTarget[];
  const moduleLinks = contentModules.flatMap((module) => module.getLinks?.({ config, pages, tabs }) ?? []);
  const links = [
    ...buildHomeLinks(pages),
    ...buildTabLinks(pages, tabs),
    ...moduleLinks,
  ];

  return {
    pages,
    tabs,
    links,
  };
}

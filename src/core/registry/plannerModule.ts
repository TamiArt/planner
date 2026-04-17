import type { ComponentType } from 'react';
import type { PlannerDocumentPlan, PlannerLinkDefinition, PlannerPageDefinition, PlannerTabTarget } from '../types/pdf';
import type { PlannerConfig, PlannerModuleId, PlannerSectionConfig, PlannerSectionType } from '../types/planner';

export interface PlannerModuleComposeContext {
  config: PlannerConfig;
  pages: PlannerDocumentPlan['pages'];
  tabs: PlannerTabTarget[];
}

export interface PlannerModuleValidationContext {
  config: PlannerConfig;
}

export interface PlannerModulePanelProps {
  config: PlannerConfig;
  onConfigChange: (patch: Partial<PlannerConfig>) => void;
}

export interface PlannerModuleManifest {
  id: PlannerModuleId;
  title: string;
  description: string;
  version: string;
  kind?: 'content' | 'tool';
  sectionType?: PlannerSectionType;
  enabledByDefault: boolean;
  canDisable?: boolean;
  locked?: boolean;
  dependencies?: PlannerModuleId[];
}

export interface PlannerModule {
  manifest: PlannerModuleManifest;
  createSection?: (config: PlannerConfig) => PlannerSectionConfig;
  isEnabled: (config: PlannerConfig) => boolean;
  getPages?: (config: PlannerConfig) => PlannerPageDefinition[];
  getTabs?: (context: PlannerModuleComposeContext) => PlannerTabTarget[];
  getLinks?: (context: PlannerModuleComposeContext) => PlannerLinkDefinition[];
  validate?: (context: PlannerModuleValidationContext) => string[];
  lifecycle?: {
    normalizeConfig?: (config: PlannerConfig) => Partial<PlannerConfig>;
  };
  ui?: {
    panel?: ComponentType<PlannerModulePanelProps>;
  };
}

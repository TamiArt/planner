import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BackgroundAsset, PlannerConfig, PlannerSectionConfig, PlannerSectionType } from '../types/planner';
import { isLockedSectionType } from '../core/registry/moduleRegistry';
import { applyPlannerPreset, type PlannerPresetId } from '../lib/config/plannerPresets';
import { createDefaultPlannerConfig, syncPlannerConfig } from '../lib/config/defaultPlannerConfig';
import { getBackgroundsForTheme, resolveBackgroundIdForTheme } from '../lib/assets/assetRegistry';
import { isCustomBackground } from '../lib/assets/uploadBackground';
import { resolvePlannerThemeId } from '../lib/themes/themeRegistry';

interface PlannerStoreState {
  config: PlannerConfig;
  lastSavedAt: string;
  setField: <K extends keyof PlannerConfig>(field: K, value: PlannerConfig[K]) => void;
  setTheme: (themeId: string) => void;
  setBackground: (backgroundId: string) => void;
  setCustomBackground: (background: BackgroundAsset) => void;
  clearCustomBackground: () => void;
  updateSection: (type: PlannerSectionType, patch: Partial<PlannerSectionConfig>) => void;
  toggleSection: (type: PlannerSectionType) => void;
  moveSection: (type: PlannerSectionType, direction: 'up' | 'down') => void;
  applyPreset: (presetId: PlannerPresetId) => void;
  resetConfig: () => void;
  loadConfig: (config: PlannerConfig) => void;
}

function normalize(config: PlannerConfig) {
  return syncPlannerConfig(config);
}

function createTimestamp() {
  return new Date().toISOString();
}

export const usePlannerStore = create<PlannerStoreState>()(
  persist(
    (set) => ({
      config: normalize(createDefaultPlannerConfig()),
      lastSavedAt: createTimestamp(),
      setField: (field, value) =>
        set((state) => ({
          config: normalize({
            ...state.config,
            [field]: value,
          }),
          lastSavedAt: createTimestamp(),
        })),
      setTheme: (themeId) =>
        set((state) => {
          const nextThemeId = resolvePlannerThemeId(themeId, state.config.theme);
          const nextBackgroundId = resolveBackgroundIdForTheme(
            nextThemeId,
            state.config.backgroundId,
            state.config.customBackground,
          );

          return {
            config: normalize({
              ...state.config,
              theme: nextThemeId,
              themeId: nextThemeId,
              backgroundId: nextBackgroundId,
            }),
            lastSavedAt: createTimestamp(),
          };
        }),
      setBackground: (backgroundId) =>
        set((state) => ({
          config: normalize({
            ...state.config,
            backgroundId,
          }),
          lastSavedAt: createTimestamp(),
        })),
      setCustomBackground: (background) =>
        set((state) => ({
          config: normalize({
            ...state.config,
            customBackground: background,
            backgroundId: background.id,
          }),
          lastSavedAt: createTimestamp(),
        })),
      clearCustomBackground: () =>
        set((state) => {
          const nextBackgroundId = isCustomBackground(state.config.customBackground) && state.config.backgroundId === state.config.customBackground?.id
            ? getBackgroundsForTheme(state.config.themeId)[0]?.id ?? createDefaultPlannerConfig().backgroundId
            : state.config.backgroundId;

          return {
            config: normalize({
              ...state.config,
              customBackground: undefined,
              backgroundId: nextBackgroundId,
            }),
            lastSavedAt: createTimestamp(),
          };
        }),
      updateSection: (type, patch) =>
        set((state) => ({
          config: normalize({
            ...state.config,
            sections: state.config.sections.map((section) =>
              section.type === type
                ? {
                    ...section,
                    ...patch,
                    enabled:
                      isLockedSectionType(type)
                        ? true
                        : patch.enabled ?? section.enabled,
                  }
                : section,
            ),
          }),
          lastSavedAt: createTimestamp(),
        })),
      toggleSection: (type) =>
        set((state) => ({
          config: normalize({
            ...state.config,
            sections: state.config.sections.map((section) =>
              section.type === type
                ? {
                    ...section,
                    enabled: isLockedSectionType(type) ? true : !section.enabled,
                  }
                : section,
            ),
          }),
          lastSavedAt: createTimestamp(),
        })),
      moveSection: (type, direction) =>
        set((state) => {
          const sections = [...state.config.sections];
          const index = sections.findIndex((section) => section.type === type);

          if (index < 0) {
            return state;
          }

          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= sections.length) {
            return state;
          }

          const [item] = sections.splice(index, 1);
          sections.splice(targetIndex, 0, item);

          return {
            config: normalize({
              ...state.config,
              sections,
            }),
            lastSavedAt: createTimestamp(),
          };
        }),
      applyPreset: (presetId) =>
        set((state) => ({
          config: applyPlannerPreset(state.config, presetId),
          lastSavedAt: createTimestamp(),
        })),
      resetConfig: () =>
        set({
          config: normalize(createDefaultPlannerConfig()),
          lastSavedAt: createTimestamp(),
        }),
      loadConfig: (config) =>
        set({
          config: normalize(config),
          lastSavedAt: createTimestamp(),
        }),
    }),
    {
      name: 'planner-builder-config',
      partialize: (state) => ({ config: state.config, lastSavedAt: state.lastSavedAt }),
      merge: (persistedState, currentState) => {
        const typedState = persistedState as Partial<PlannerStoreState> | undefined;
        const persistedConfig = typedState?.config;

        return {
          ...currentState,
          ...typedState,
          config: persistedConfig
            ? normalize({
                ...currentState.config,
                ...persistedConfig,
              })
            : currentState.config,
          lastSavedAt: typedState?.lastSavedAt ?? currentState.lastSavedAt,
        };
      },
    },
  ),
);

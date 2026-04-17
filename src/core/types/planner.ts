import type { PlannerLayoutsConfig } from '../../shared/layout';

export type PlannerLanguage = 'ru';
export type PlannerMode = 'dated' | 'undated';
export type PlannerPageSize = 'iPadLandscape';
export type PlannerOrientation = 'landscape';
export type PlannerThemeId = 'minimal' | 'soft' | 'dark';
export type PlannerSectionType =
  | 'cover'
  | 'index'
  | 'year'
  | 'monthly'
  | 'weekly'
  | 'daily'
  | 'notes'
  | 'checklist'
  | 'stickers';

export type PlannerModuleId =
  | 'background'
  | 'index'
  | 'year-overview'
  | 'monthly'
  | 'weekly'
  | 'daily'
  | 'notes'
  | 'checklist'
  | 'stickers'
  | 'layout-editor';

export type PlannerTabKind = 'month' | 'section';
export type BackgroundType = 'color' | 'texture' | 'image';
export type StickerBackgroundMode = 'white' | 'transparent';
export type StickerCategory = 'functional' | 'decorative' | 'emoji';
export type StickerSourceMode = 'auto-png-pack' | 'ready-sheet';
export type MoonPhaseSourceId = 'usno';
export type MoonPrimaryPhaseId = 'new' | 'first-quarter' | 'full' | 'last-quarter';
export type MoonPhaseId =
  | MoonPrimaryPhaseId
  | 'waxing-crescent'
  | 'waxing-gibbous'
  | 'waning-gibbous'
  | 'waning-crescent';
export type JyotishAyanamsaId = 'lahiri';
export type AstrologyCalculationSourceId = 'astronomy-engine';
export type AstrologyCalculationTime = 'sunrise';
export type AstroIconStyle = 'fluent-flat';
export type AstrologyLinePresetId = 'compact-icons' | 'full-icons' | 'text-icons';
export type AstrologyLineDensity = 'compact' | 'standard' | 'wide';
export type AstrologyTithiType = 'start' | 'active' | 'cleansing' | 'peak';
export type AstrologyNakshatraType = 'start' | 'soft' | 'sharp' | 'active' | 'heavy';
export type AstrologyPlanetDay = 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' | 'venus' | 'saturn';
export type AstrologyDayEnergy = 'growth' | 'calm' | 'active' | 'tension' | 'heavy';
export type AstrologyDayFocus = 'action' | 'communication' | 'creativity' | 'cleansing' | 'rest';

export interface PlannerAstrologyLayers {
  moon: boolean;
  tithi: boolean;
  nakshatra: boolean;
  planet: boolean;
  energy: boolean;
  focus: boolean;
}

export interface PlannerAstrologyDisplayConfig {
  weekPreset: AstrologyLinePresetId;
  dayPreset: AstrologyLinePresetId;
  lineDensity: AstrologyLineDensity;
}

export interface PlannerSectionConfig {
  type: PlannerSectionType;
  enabled: boolean;
  variant?: string;
  count?: number;
  options?: Record<string, unknown>;
}

export interface PlannerModuleState {
  enabled: boolean;
  order: number;
  count?: number;
  options?: Record<string, unknown>;
}

export type PlannerModulesConfig = Record<PlannerModuleId, PlannerModuleState>;

export interface TabConfig {
  id: string;
  label: string;
  target: string;
  kind: PlannerTabKind;
}

export interface PlannerTheme {
  id: string;
  name: string;
  description: string;
  preview: string;
  colors: {
    background: string;
    paper: string;
    text: string;
    accent: string;
    border: string;
    muted: string;
    tabText: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  decoration: {
    tabStyle: string;
    lineStyle: string;
    blockStyle: string;
  };
}

export interface BackgroundAsset {
  id: string;
  name: string;
  type: BackgroundType;
  source: string;
  preview: string;
  themeId: string;
  isCustom?: boolean;
  variant?: 'theme-preset' | 'custom-color' | 'generated-gradient' | 'uploaded-photo';
  color?: string;
  gradient?: {
    startColor: string;
    endColor: string;
    angle: number;
  };
}

export interface StickerAsset {
  id: string;
  name: string;
  source?: string;
  backgroundMode: StickerBackgroundMode;
  category: StickerCategory;
  themeId?: string;
  emoji?: string;
  color: string;
  shape: 'pill' | 'ticket' | 'circle' | 'flag';
}

export interface StickerAutoLayoutConfig {
  itemSpacing: number;
  pagePadding: number;
  maxItemsPerPage?: number;
}

export interface StickerUploadAssetMeta {
  id: string;
  storageId: string;
  name: string;
  previewSource: string;
  width: number;
  height: number;
  sizeBytes: number;
  category: StickerCategory;
}

export interface ReadyStickerSheetMeta {
  id: string;
  storageId: string;
  name: string;
  previewSource: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export interface PlannerUploadedPngAsset {
  id: string;
  name: string;
  source: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export interface MoonPhaseEvent {
  phase: MoonPrimaryPhaseId;
  phaseName: string;
  year: number;
  month: number;
  day: number;
  time: string;
  iso: string;
  instant: string;
}

export interface PlannerMoonPhaseConfig {
  enabled: boolean;
  source: MoonPhaseSourceId;
  sourceUrl: string;
  fetchedAt?: string;
  years: number[];
  events: MoonPhaseEvent[];
}

export interface PlannerAstrologyDayEntry {
  iso: string;
  cityId: string;
  timezone: string;
  sunriseInstant: string;
  tithiNumber: number;
  tithiPakshaNumber: number;
  tithiType: AstrologyTithiType;
  nakshatraNumber: number;
  nakshatraName: string;
  nakshatraType: AstrologyNakshatraType;
  planetDay: AstrologyPlanetDay;
  energy: AstrologyDayEnergy;
  focus: AstrologyDayFocus;
}

export interface PlannerAstrologyDataConfig {
  source: AstrologyCalculationSourceId;
  year: number;
  cityId: string;
  timezone: string;
  ayanamsa: JyotishAyanamsaId;
  calculationTime: AstrologyCalculationTime;
  calculatedAt: string;
  entries: PlannerAstrologyDayEntry[];
}

export interface PlannerAstrologyConfig {
  cityId: string;
  ayanamsa: JyotishAyanamsaId;
  calculationTime: AstrologyCalculationTime;
  iconStyle: AstroIconStyle;
  includeLegend: boolean;
  layers: PlannerAstrologyLayers;
  display: PlannerAstrologyDisplayConfig;
  data?: PlannerAstrologyDataConfig;
}

export interface StickerModuleConfig {
  enabled: boolean;
  sourceMode: StickerSourceMode;
  categories?: StickerCategory[];
  autoLayout?: StickerAutoLayoutConfig;
  autoPngs?: StickerUploadAssetMeta[];
  readySheets?: ReadyStickerSheetMeta[];
  backgroundMode: StickerBackgroundMode;
}

export interface PlannerConfig {
  id: string;
  title: string;
  language: PlannerLanguage;
  mode: PlannerMode;
  year?: number;
  theme: PlannerThemeId;
  background: {
    type: BackgroundType;
    image?: string;
    opacity?: number;
    color?: string;
  };
  themeId: string;
  backgroundId: string;
  backgroundOpacity: number;
  customBackground?: BackgroundAsset;
  coverId?: string;
  coverImage?: PlannerUploadedPngAsset;
  pageBackgroundImage?: PlannerUploadedPngAsset;
  astrology: PlannerAstrologyConfig;
  moonPhases: PlannerMoonPhaseConfig;
  pageSize: PlannerPageSize;
  orientation: PlannerOrientation;
  modules: PlannerModulesConfig;
  layouts: PlannerLayoutsConfig;
  sections: PlannerSectionConfig[];
  includeIndex: boolean;
  includeStickerSheets: boolean;
  tabs: TabConfig[];
  weekStartsOn: 'monday';
}

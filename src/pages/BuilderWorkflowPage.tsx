import clsx from 'clsx';
import { startTransition, useDeferredValue, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { InfoCard } from '../components/InfoCard';
import { Panel } from '../components/Panel';
import { PlannerRenderPreviewPanel } from '../components/PlannerRenderPreviewPanel';
import { PreviewPanel } from '../components/PreviewPanel';
import { SectionCard } from '../components/SectionCard';
import { StatusPill } from '../components/StatusPill';
import { ThemeCard } from '../components/ThemeCard';
import { WorkflowStepNav, type WorkflowStepItem } from '../components/builder/WorkflowStepNav';
import { getModuleById, getModuleBySectionType } from '../core/registry/moduleRegistry';
import { plannerThemes } from '../data/themes/themes';
import { getBackgroundById, getBackgroundsForTheme } from '../lib/assets/assetRegistry';
import {
  createGradientBackground,
  createSolidColorBackground,
  createUploadedBackground,
  isCustomBackground,
  isCustomColorBackground,
  isCustomGradientBackground,
  isCustomPhotoBackground,
  normalizeBackgroundOpacity,
} from '../lib/assets/uploadBackground';
import {
  COVER_UPLOAD_SIZE,
  createPlannerArtwork,
  formatPlannerArtworkSize,
  PAGE_BACKGROUND_UPLOAD_SIZE,
} from '../lib/assets/uploadPlannerArtwork';
import {
  ASTROLOGY_CALCULATION_TIME_LABEL,
  ASTROLOGY_ICON_STYLE_LABEL,
  ASTROLOGY_LINE_DENSITY_LABELS,
  ASTROLOGY_LINE_PRESET_LABELS,
  ASTROLOGY_REFERENCE_LABEL,
  ASTROLOGY_SOURCE_LABEL,
  getAstrologyCity,
  JYOTISH_AYANAMSA_LABEL,
  normalizeAstrologyConfig,
} from '../lib/astrology/astrologyConfig';
import { CAPITAL_CITY_OPTIONS } from '../lib/astrology/capitalCities';
import { getAstroIconDataUri } from '../lib/astrology/astroIcons';
import {
  ASTROLOGY_LAYER_LABELS,
  calculateAstrologyDataForYear,
  ENERGY_META,
  FOCUS_META,
  hasAstrologyDataForConfig,
  NAKSHATRA_TYPE_META,
  PLANET_DAY_META,
  TITHI_TYPE_META,
} from '../lib/astrology/jyotishDaily';
import { createDefaultPlannerConfig } from '../lib/config/defaultPlannerConfig';
import { plannerPresets, type PlannerPresetId } from '../lib/config/plannerPresets';
import {
  downloadPlannerConfig,
  downloadUsageGuide,
  exportPlannerPdf,
} from '../lib/export/exportPlannerPdf';
import { buildPlannerPlan } from '../lib/navigation/buildPlannerPlan';
import {
  fetchMoonPhaseData,
  hasMoonPhaseDataForYear,
  MOON_PHASE_SOURCE_DOCS_URL,
  normalizeMoonPhaseConfig,
} from '../lib/moon/moonPhases';
import { removeStickerAssetBlobs } from '../lib/stickers/stickerAssetStorage';
import {
  DEFAULT_STICKER_AUTO_LAYOUT,
  buildAutoStickerPageGroups,
  getStickerGeneratedPageCount,
  getStickerModuleConfig,
  getStickerStorageIds,
  patchStickerModuleConfig,
} from '../lib/stickers/stickerModuleConfig';
import { getStickerCategoryMeta, STICKER_CATEGORY_ORDER } from '../lib/stickers/stickerCatalog';
import { READY_SHEET_ALLOWED_DIMENSIONS_LABEL } from '../lib/stickers/readySheetDimensions';
import { createAutoStickerAsset, createReadyStickerSheet } from '../lib/stickers/uploadStickerAssets';
import { getThemeById } from '../lib/themes/themeRegistry';
import { parsePlannerConfig, validatePlannerConfig } from '../lib/validators/plannerConfigValidator';
import { usePlannerStore } from '../store/plannerStore';
import type {
  AstrologyLineDensity,
  AstrologyLinePresetId,
  PlannerAstrologyConfig,
  PlannerAstrologyCustomCity,
  PlannerAstrologyLayers,
  PlannerConfig,
  PlannerSectionConfig,
  PlannerSectionType,
  StickerCategory,
  StickerModuleConfig,
} from '../types/planner';

type BuilderStepId = 'foundation' | 'astrology' | 'structure' | 'design' | 'layout' | 'stickers' | 'preview' | 'export';
type StickerUploadNoticeScope = StickerCategory | 'ready-sheet';

interface StickerUploadNotice {
  scope: StickerUploadNoticeScope;
  tone: 'success' | 'error';
  message: string;
}

const WORKFLOW_STEPS: Array<{ id: BuilderStepId; title: string; description: string }> = [
  { id: 'foundation', title: 'Основа', description: 'Определите сценарий продукта и базовый режим сборки.' },
  { id: 'astrology', title: 'Астрология', description: 'Уточните город, аянамшу и данные фаз Луны для датированных страниц.' },
  { id: 'structure', title: 'Структура', description: 'Соберите состав документа и порядок разделов.' },
  { id: 'design', title: 'Дизайн', description: 'Выберите тему, фон и визуальный язык планера.' },
  { id: 'layout', title: 'Макет', description: 'Редактируйте геометрию страниц через блоки, сетку и инспектор.' },
  { id: 'stickers', title: 'Стикеры', description: 'Настройте страницы со стикерами как отдельный продуктовый блок.' },
  { id: 'preview', title: 'Предпросмотр', description: 'Проверьте навигацию, страницы и общую композицию.' },
  { id: 'export', title: 'Экспорт', description: 'Выгрузите PDF, JSON-конфиг и инструкцию по использованию.' },
];

function openFilePicker(input: HTMLInputElement | null) {
  if (!input) {
    return;
  }

  input.value = '';

  const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
  if (typeof pickerInput.showPicker === 'function') {
    try {
      pickerInput.showPicker();
      return;
    } catch {
      // Fallback to click for browsers that restrict showPicker on hidden inputs.
    }
  }

  input.click();
}

function getSectionPresentation(section: PlannerSectionConfig) {
  const module = getModuleBySectionType(section.type);

  return {
    label: module?.manifest.title ?? section.type,
    description: module?.manifest.description ?? 'Служебный блок планера.',
    locked: Boolean(module?.manifest.locked),
  };
}

function AstroIconPreview({ icon, label }: { icon: string; label: string }) {
  const src = getAstroIconDataUri(icon);

  return src ? <img src={src} alt={label} className="astro-icon-preview" /> : <span className="astro-icon-preview">{label}</span>;
}

export function BuilderWorkflowPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const pageBackgroundInputRef = useRef<HTMLInputElement | null>(null);
  const autoStickerInputRef = useRef<HTMLInputElement | null>(null);
  const readySheetInputRef = useRef<HTMLInputElement | null>(null);
  const [activeStep, setActiveStep] = useState<BuilderStepId>('foundation');
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingStickerCategory, setPendingStickerCategory] = useState<StickerCategory>('functional');
  const [stickerUploadNotice, setStickerUploadNotice] = useState<StickerUploadNotice | null>(null);
  const [moonPhaseStatus, setMoonPhaseStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [moonPhaseMessage, setMoonPhaseMessage] = useState<string | null>(null);
  const [astrologyStatus, setAstrologyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [astrologyMessage, setAstrologyMessage] = useState<string | null>(null);

  const {
    config,
    lastSavedAt,
    setField,
    setTheme,
    setBackground,
    setCustomBackground,
    clearCustomBackground,
    toggleSection,
    updateSection,
    moveSection,
    applyPreset,
    resetConfig,
    loadConfig,
  } = usePlannerStore();

  const deferredConfig = useDeferredValue(config);
  const validation = validatePlannerConfig(deferredConfig);
  const plan = buildPlannerPlan(deferredConfig);
  const availableBackgrounds = getBackgroundsForTheme(config.themeId, config.customBackground);
  const selectedBackground = getBackgroundById(config.backgroundId, config.customBackground);
  const selectedTheme = getThemeById(config.themeId);
  const hasCustomBackground = isCustomBackground(config.customBackground);
  const hasCustomColorBackground = isCustomColorBackground(config.customBackground);
  const hasCustomGradientBackground = isCustomGradientBackground(config.customBackground);
  const hasCustomPhotoBackground = isCustomPhotoBackground(config.customBackground);
  const coverUploadSizeLabel = formatPlannerArtworkSize(COVER_UPLOAD_SIZE);
  const pageBackgroundUploadSizeLabel = formatPlannerArtworkSize(PAGE_BACKGROUND_UPLOAD_SIZE);
  const colorPickerValue = hasCustomColorBackground ? config.customBackground?.source ?? selectedTheme.colors.background : selectedTheme.colors.background;
  const gradientStartValue = hasCustomGradientBackground
    ? config.customBackground?.gradient?.startColor ?? selectedTheme.colors.background
    : selectedTheme.colors.background;
  const gradientEndValue = hasCustomGradientBackground
    ? config.customBackground?.gradient?.endColor ?? selectedTheme.colors.paper
    : selectedTheme.colors.paper;
  const gradientAngleValue = hasCustomGradientBackground
    ? config.customBackground?.gradient?.angle ?? 135
    : 135;
  const backgroundOpacityValue = Math.round(normalizeBackgroundOpacity(config.backgroundOpacity) * 100);
  const exportReady = validation.errors.length === 0;
  const exportStatusLabel = exportReady ? 'Готов к экспорту' : `Нужно исправить ${validation.errors.length}`;
  const moonPhaseDataReady = config.mode === 'dated' && Boolean(config.year) && hasMoonPhaseDataForYear(config.moonPhases, config.year ?? 0);
  const moonPhaseYearsLabel = config.moonPhases.years.length > 0 ? config.moonPhases.years.join(', ') : 'нет данных';
  const moonPhaseFetchedAtLabel = config.moonPhases.fetchedAt
    ? new Date(config.moonPhases.fetchedAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
    : 'не загружено';
  const selectedAstrologyCity = getAstrologyCity(config.astrology);
  const astrologyDataReady = hasAstrologyDataForConfig(config);
  const astrologyCalculatedAtLabel = config.astrology.data?.calculatedAt
    ? new Date(config.astrology.data.calculatedAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
    : 'не рассчитано';
  const safeLastSavedAt = Number.isNaN(new Date(lastSavedAt).getTime()) ? new Date().toISOString() : lastSavedAt;
  const saveLabel = new Date(safeLastSavedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const weeklySection = config.sections.find((section) => section.type === 'weekly');
  const dailySection = config.sections.find((section) => section.type === 'daily');
  const notesSection = config.sections.find((section) => section.type === 'notes');
  const checklistSection = config.sections.find((section) => section.type === 'checklist');
  const stickerSection = config.sections.find((section) => section.type === 'stickers');
  const stickerConfig = getStickerModuleConfig(config);
  const stickerPageCount = getStickerGeneratedPageCount(stickerConfig);
  const autoStickerGroups = buildAutoStickerPageGroups(stickerConfig);
  const readySheets = stickerConfig.readySheets ?? [];
  const readySheetNotice = stickerUploadNotice?.scope === 'ready-sheet' ? stickerUploadNotice : null;
  const layoutEditorModule = getModuleById('layout-editor');
  const LayoutEditorPanel = layoutEditorModule?.ui?.panel;
  const layoutEditorEnabled = config.modules['layout-editor']?.enabled ?? true;
  const layoutCount = Object.keys(config.layouts ?? {}).length;
  const structureSections = config.sections.filter((section) => section.type !== 'stickers');
  const enabledSectionsCount = config.sections.filter((section) => section.enabled).length;

  const currentStepIndex = WORKFLOW_STEPS.findIndex((step) => step.id === activeStep);
  const currentStep = WORKFLOW_STEPS[currentStepIndex];
  const previousStep = WORKFLOW_STEPS[currentStepIndex - 1];
  const nextStep = WORKFLOW_STEPS[currentStepIndex + 1];

  const preferredPreviewSectionByStep: Partial<Record<BuilderStepId, PlannerSectionType>> = {
    foundation: 'index',
    structure: 'index',
    design: 'monthly',
    layout: 'monthly',
    stickers: 'stickers',
  };
  const astrologyPreviewSection: PlannerSectionType =
    weeklySection?.enabled && config.astrology.display.weekPreset !== 'compact-icons'
      ? 'weekly'
      : dailySection?.enabled
        ? 'daily'
        : weeklySection?.enabled
          ? 'weekly'
          : 'monthly';
  const preferredPreviewSection =
    activeStep === 'astrology'
      ? astrologyPreviewSection
      : preferredPreviewSectionByStep[activeStep];

  const stepItems: WorkflowStepItem[] = WORKFLOW_STEPS.map((step, index) => {
    if (step.id === 'foundation') {
      return {
        id: step.id,
        order: index + 1,
        title: step.title,
        description: step.description,
        meta: config.mode === 'dated' ? `${getModeLabel(config.mode)} · ${config.year ?? 'без года'}` : getModeLabel(config.mode),
        status: config.mode === 'undated' || Boolean(config.year) ? 'ready' : 'attention',
      };
    }

    if (step.id === 'astrology') {
      return {
        id: step.id,
        order: index + 1,
        title: step.title,
        description: step.description,
        meta: `${selectedAstrologyCity.name} · ${JYOTISH_AYANAMSA_LABEL}`,
        status: (config.moonPhases.enabled && !moonPhaseDataReady) || !astrologyDataReady ? 'attention' : 'ready',
      };
    }

    if (step.id === 'structure') {
      return {
        id: step.id,
        order: index + 1,
        title: step.title,
        description: step.description,
        meta: `${enabledSectionsCount} активных разделов`,
        status: enabledSectionsCount >= 4 ? 'ready' : 'attention',
      };
    }

    if (step.id === 'design') {
      return {
        id: step.id,
        order: index + 1,
        title: step.title,
        description: step.description,
        meta: `${selectedTheme.name} / ${selectedBackground.name}`,
        status: 'ready',
      };
    }

    if (step.id === 'layout') {
      return {
        id: step.id,
        order: index + 1,
        title: step.title,
        description: step.description,
        meta: layoutEditorEnabled ? `${layoutCount} макетов` : 'модуль выключен',
        status: layoutEditorEnabled ? 'ready' : 'neutral',
      };
    }

    if (step.id === 'stickers') {
      return {
        id: step.id,
        order: index + 1,
        title: step.title,
        description: step.description,
        meta: stickerSection?.enabled ? `${stickerPageCount} листа` : 'выключены',
        status: stickerSection?.enabled && stickerPageCount > 0 ? 'ready' : stickerSection?.enabled ? 'attention' : 'neutral',
      };
    }

    if (step.id === 'preview') {
      return {
        id: step.id,
        order: index + 1,
        title: step.title,
        description: step.description,
        meta: `${plan.pages.length} страниц · ${plan.tabs.length} вкладок`,
        status: plan.pages.length > 0 ? 'ready' : 'attention',
      };
    }

    return {
      id: step.id,
      order: index + 1,
      title: step.title,
      description: step.description,
      meta: exportStatusLabel,
      status: exportReady ? 'ready' : 'attention',
    };
  });

  function handleSectionCountChange(type: PlannerSectionConfig['type'], value: number) {
    updateSection(type, {
      count: Math.max(1, Math.floor(value || 1)),
    });
  }

  function updateMoonPhaseConfig(patch: Partial<PlannerConfig['moonPhases']>) {
    setField('moonPhases', normalizeMoonPhaseConfig({
      ...config.moonPhases,
      ...patch,
    }));
  }

  function updateAstrologyConfig(patch: Partial<PlannerAstrologyConfig>) {
    setField('astrology', normalizeAstrologyConfig({
      ...config.astrology,
      ...patch,
    }));
  }

  function syncMoonPhaseMessage(targetYear = config.year, enabled = config.moonPhases.enabled) {
    if (config.mode !== 'dated' || !targetYear) {
      setMoonPhaseStatus('idle');
      setMoonPhaseMessage('Фазы Луны доступны для датированного режима с выбранным годом.');
      return;
    }

    if (!enabled) {
      setMoonPhaseStatus('idle');
      setMoonPhaseMessage(null);
      return;
    }

    if (hasMoonPhaseDataForYear(config.moonPhases, targetYear)) {
      setMoonPhaseStatus('success');
      setMoonPhaseMessage(`Используются сохраненные данные USNO для ${targetYear} года.`);
      return;
    }

    setMoonPhaseStatus('idle');
    setMoonPhaseMessage(`Сохраненных данных USNO для ${targetYear} года нет. Нажмите «Обновить данные».`);
  }

  useEffect(() => {
    if (moonPhaseStatus === 'loading' || moonPhaseStatus === 'error') {
      return;
    }

    syncMoonPhaseMessage(config.year, config.moonPhases.enabled);
  }, [
    config.mode,
    config.year,
    config.moonPhases.enabled,
    config.moonPhases.fetchedAt,
    config.moonPhases.events.length,
    config.moonPhases.years.join(','),
    moonPhaseStatus,
  ]);

  function updateAstrologyDisplay<K extends keyof PlannerAstrologyConfig['display']>(
    field: K,
    value: PlannerAstrologyConfig['display'][K],
  ) {
    updateAstrologyConfig({
      display: {
        ...config.astrology.display,
        [field]: value,
      },
    });
  }

  function handleAstrologyCityChange(cityId: string) {
    updateAstrologyConfig({ cityId });
  }

  function handleAstrologyCityModeChange(cityMode: PlannerAstrologyConfig['cityMode']) {
    if (cityMode === 'custom') {
      const nextCustomCity: PlannerAstrologyCustomCity = config.astrology.cityMode === 'custom' && config.astrology.customCity
        ? config.astrology.customCity
        : {
            name: selectedAstrologyCity.name,
            country: selectedAstrologyCity.country,
            timezone: selectedAstrologyCity.timezone,
            latitude: selectedAstrologyCity.latitudeText,
            longitude: selectedAstrologyCity.longitudeText,
          };

      updateAstrologyConfig({
        cityMode: 'custom',
        customCity: nextCustomCity,
      });
      return;
    }

    updateAstrologyConfig({ cityMode: 'preset' });
  }

  function handleAstrologyCustomCityChange<K extends keyof PlannerAstrologyCustomCity>(
    field: K,
    value: PlannerAstrologyCustomCity[K],
  ) {
    updateAstrologyConfig({
      customCity: {
        ...(config.astrology.customCity ?? {
          name: selectedAstrologyCity.name,
          country: selectedAstrologyCity.country,
          timezone: selectedAstrologyCity.timezone,
          latitude: selectedAstrologyCity.latitudeText,
          longitude: selectedAstrologyCity.longitudeText,
        }),
        [field]: value,
      },
    });
  }

  function handleAstrologyLayerToggle(layer: keyof PlannerAstrologyLayers) {
    updateAstrologyConfig({
      layers: {
        ...config.astrology.layers,
        [layer]: !config.astrology.layers[layer],
      },
    });
  }

  function refreshAstrologyData(targetYear = config.year) {
    if (config.mode !== 'dated' || !targetYear) {
      setAstrologyStatus('idle');
      setAstrologyMessage('Астрологические данные доступны для датированного режима с выбранным годом.');
      return;
    }

    setAstrologyStatus('loading');
    setAstrologyMessage('Считаем титхи, накшатры, планету, энергию и фокус на локальный восход...');

    try {
      const data = calculateAstrologyDataForYear(targetYear, config.astrology);
      updateAstrologyConfig({ data });
      setAstrologyStatus('success');
      setAstrologyMessage(`Астрология рассчитана для ${targetYear}: ${selectedAstrologyCity.name}, ${ASTROLOGY_CALCULATION_TIME_LABEL}.`);
    } catch (error) {
      setAstrologyStatus('error');
      setAstrologyMessage(error instanceof Error ? error.message : 'Не удалось рассчитать астрологические данные.');
    }
  }

  async function refreshMoonPhaseData(targetYear = config.year) {
    if (config.mode !== 'dated' || !targetYear) {
      updateMoonPhaseConfig({ enabled: false });
      setMoonPhaseStatus('idle');
      setMoonPhaseMessage('Фазы Луны доступны для датированного режима с выбранным годом.');
      return;
    }

    setMoonPhaseStatus('loading');
    setMoonPhaseMessage('Загружаем фазы Луны из USNO...');

    try {
      const data = await fetchMoonPhaseData(targetYear);
      const nextData = normalizeMoonPhaseConfig({
        ...data,
        enabled: config.moonPhases.enabled,
      });

      startTransition(() => {
        setField('moonPhases', nextData);
      });

      setMoonPhaseStatus('success');
      setMoonPhaseMessage(`Данные USNO обновлены для ${targetYear} года и соседних границ календаря.`);
    } catch (error) {
      setMoonPhaseStatus('error');
      setMoonPhaseMessage(error instanceof Error ? error.message : 'Не удалось загрузить данные USNO.');
    }
  }

  function handleMoonPhaseToggle(enabled: boolean) {
    if (!enabled) {
      updateMoonPhaseConfig({ enabled: false });
      setMoonPhaseStatus('idle');
      setMoonPhaseMessage('Фазы Луны выключены.');
      return;
    }

    updateMoonPhaseConfig({ enabled: true });
    syncMoonPhaseMessage(config.year, true);
  }

  function handleModeChange(mode: PlannerConfig['mode']) {
    setField('mode', mode);

    if (mode === 'undated' && config.moonPhases.enabled) {
      updateMoonPhaseConfig({ enabled: false });
      setMoonPhaseStatus('idle');
      setMoonPhaseMessage('Фазы Луны выключены: для них нужны конкретные даты.');
    }
  }

  function handleFoundationYearChange(value: string) {
    const nextYear = value ? Number(value) : undefined;

    setField('year', nextYear);

    if (config.moonPhases.enabled) {
      syncMoonPhaseMessage(nextYear, true);
    }
  }

  function updateStickerConfig(patch: Partial<StickerModuleConfig>) {
    const nextConfig = patchStickerModuleConfig(config, patch);

    updateSection('stickers', {
      enabled: nextConfig.enabled,
      count: getStickerGeneratedPageCount(nextConfig),
      variant: nextConfig.sourceMode === 'ready-sheet' ? 'ready-sheet-template' : 'sticker-sheet-template',
      options: nextConfig as unknown as Record<string, unknown>,
    });
  }

  function handleStickerCategoryToggle(category: StickerCategory) {
    const currentCategories = stickerConfig.categories ?? STICKER_CATEGORY_ORDER;
    const nextCategories = currentCategories.includes(category)
      ? currentCategories.filter((item) => item !== category)
      : [...currentCategories, category];

    updateStickerConfig({
      categories: nextCategories.length > 0 ? nextCategories : [category],
    });
  }

  function handleAutoStickerUploadClick(category: StickerCategory) {
    setPendingStickerCategory(category);
    openFilePicker(autoStickerInputRef.current);
  }

  function handleReadySheetUploadClick() {
    openFilePicker(readySheetInputRef.current);
  }

  function handlePresetApply(presetId: PlannerPresetId) {
    startTransition(() => {
      applyPreset(presetId);
    });
    setFeedback('Пресет применен. Проверьте структуру и дизайн в следующих шагах.');
  }

  function clearStickerUploadNotice(scope: StickerUploadNoticeScope) {
    setStickerUploadNotice((current) => (current?.scope === scope ? null : current));
  }

  async function cleanupObsoleteStickerStorage(nextConfig: PlannerConfig) {
    const currentStorageIds = getStickerStorageIds(getStickerModuleConfig(config));
    const nextStorageIds = new Set(getStickerStorageIds(getStickerModuleConfig(nextConfig)));
    const obsoleteStorageIds = currentStorageIds.filter((storageId) => !nextStorageIds.has(storageId));

    if (obsoleteStorageIds.length > 0) {
      await removeStickerAssetBlobs(obsoleteStorageIds);
    }
  }

  async function handleResetConfig() {
    await cleanupObsoleteStickerStorage(createDefaultPlannerConfig());

    startTransition(() => {
      resetConfig();
    });
    setActiveStep('foundation');
    setFeedback('Конфиг сброшен к базовому MVP-сценарию.');
  }

  function applyConfigPatch(patch: Partial<PlannerConfig>) {
    startTransition(() => {
      loadConfig({
        ...config,
        ...patch,
      });
    });
  }

  async function handlePdfExport() {
    if (validation.errors.length > 0) {
      setActiveStep('export');
      setFeedback('Сначала исправьте ошибки конфигурации, затем повторите экспорт.');
      return;
    }

    setActiveStep('export');
    setIsExporting(true);
    setFeedback('Собираем PDF...');

    try {
      const result = await exportPlannerPdf(config);
      const sizeLabel = result ? ` (${Math.max(1, Math.round(result.byteLength / 1024))} KB)` : '';
      setFeedback(`PDF успешно собран. Сохранение или загрузка начаты${sizeLabel}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Не удалось собрать PDF.');
    } finally {
      setIsExporting(false);
    }
  }

  function handleFooterPrimaryAction() {
    if (nextStep) {
      setActiveStep(nextStep.id);
      return;
    }

    void handlePdfExport();
  }

  function handleConfigExport() {
    downloadPlannerConfig(config);
    setFeedback('JSON-конфиг выгружен.');
  }

  function handleGuideExport() {
    downloadUsageGuide(config);
    setFeedback('Инструкция по использованию выгружена.');
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleBackgroundUploadClick() {
    openFilePicker(backgroundInputRef.current);
  }

  function handleCoverUploadClick() {
    openFilePicker(coverInputRef.current);
  }

  function handlePageBackgroundUploadClick() {
    openFilePicker(pageBackgroundInputRef.current);
  }

  async function handleImportChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      const json = JSON.parse(raw);
      const parsed = parsePlannerConfig(json);

      if (!parsed.success) {
        setFeedback(parsed.error.issues[0]?.message ?? 'JSON-конфиг не прошел валидацию.');
        return;
      }

      await cleanupObsoleteStickerStorage(parsed.data);

      startTransition(() => {
        loadConfig(parsed.data);
      });
      setActiveStep('foundation');
      setFeedback(`Конфиг "${file.name}" загружен.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Не удалось прочитать JSON-конфиг.');
    } finally {
      event.target.value = '';
    }
  }

  async function handleBackgroundUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const uploadedBackground = await createUploadedBackground(file);

      startTransition(() => {
        setCustomBackground(uploadedBackground);
      });

      setActiveStep('design');
      setFeedback(`Фон "${file.name}" загружен, оптимизирован и выбран для экспорта.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Не удалось подготовить фоновое изображение.');
    } finally {
      event.target.value = '';
    }
  }

  async function handleCoverUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const coverImage = await createPlannerArtwork(file, 'cover');

      startTransition(() => {
        setField('coverImage', coverImage);
      });

      setActiveStep('design');
      setFeedback(`Обложка "${file.name}" загружена и будет добавлена первой страницей PDF.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Не удалось подготовить PNG-обложку.');
    } finally {
      event.target.value = '';
    }
  }

  async function handlePageBackgroundUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const pageBackgroundImage = await createPlannerArtwork(file, 'page-background');

      startTransition(() => {
        setField('pageBackgroundImage', pageBackgroundImage);
      });

      setActiveStep('design');
      setFeedback(`Фон листов "${file.name}" загружен и будет применен ко всем листам планера.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Не удалось подготовить PNG-фон листов.');
    } finally {
      event.target.value = '';
    }
  }

  function handleBackgroundColorChange(event: ChangeEvent<HTMLInputElement>) {
    const colorBackground = createSolidColorBackground(event.target.value);

    startTransition(() => {
      setCustomBackground(colorBackground);
    });

    setActiveStep('design');
    setFeedback(`Фон обновлен на цвет ${colorBackground.source}.`);
  }

  function handleGradientBackgroundChange(
    patch: Partial<{ startColor: string; endColor: string; angle: number }>,
  ) {
    const gradientBackground = createGradientBackground(
      patch.startColor ?? gradientStartValue,
      patch.endColor ?? gradientEndValue,
      patch.angle ?? gradientAngleValue,
    );

    startTransition(() => {
      setCustomBackground(gradientBackground);
    });

    setActiveStep('design');
    setFeedback(`Градиентный фон обновлен: ${gradientBackground.gradient?.startColor} -> ${gradientBackground.gradient?.endColor}.`);
  }

  function handleBackgroundOpacityChange(event: ChangeEvent<HTMLInputElement>) {
    const nextOpacity = normalizeBackgroundOpacity(Number(event.target.value) / 100);

    startTransition(() => {
      setField('backgroundOpacity', nextOpacity);
    });

    setActiveStep('design');
    setFeedback(`Прозрачность фона обновлена: ${Math.round(nextOpacity * 100)}%.`);
  }

  function handleTabPositionChange(position: PlannerConfig['tabPosition']) {
    startTransition(() => {
      setField('tabPosition', position);
    });

    setActiveStep('design');
    setFeedback(`Расположение вкладок обновлено: ${position === 'top' ? 'сверху' : 'справа'}.`);
  }

  function handleRemoveCoverImage() {
    startTransition(() => {
      setField('coverImage', undefined);
    });

    setActiveStep('design');
    setFeedback('Обложка удалена из текущей конфигурации.');
  }

  function handleRemovePageBackgroundImage() {
    startTransition(() => {
      setField('pageBackgroundImage', undefined);
    });

    setActiveStep('design');
    setFeedback('Фон листов удален из текущей конфигурации.');
  }

  async function handleAutoStickerUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const createdAssets: Awaited<ReturnType<typeof createAutoStickerAsset>>[] = [];

    if (files.length === 0) {
      return;
    }

    try {
      for (const file of files) {
        const createdAsset = await createAutoStickerAsset(file, pendingStickerCategory, stickerConfig.backgroundMode);
        createdAssets.push(createdAsset);
      }

      updateStickerConfig({
        sourceMode: 'auto-png-pack',
        autoPngs: [...(stickerConfig.autoPngs ?? []), ...createdAssets],
      });

      setStickerUploadNotice({
        scope: pendingStickerCategory,
        tone: 'success',
        message: `Добавлено ${createdAssets.length} PNG в категорию "${getStickerCategoryMeta(pendingStickerCategory).label}".`,
      });
      setFeedback(`Добавлено ${createdAssets.length} PNG в категорию "${getStickerCategoryMeta(pendingStickerCategory).label}".`);
    } catch (error) {
      if (createdAssets.length > 0) {
        await removeStickerAssetBlobs(createdAssets.map((item) => item.storageId));
      }
      setStickerUploadNotice({
        scope: pendingStickerCategory,
        tone: 'error',
        message: error instanceof Error ? error.message : 'Не удалось загрузить sticker PNG.',
      });
      setFeedback(error instanceof Error ? error.message : 'Не удалось загрузить sticker PNG.');
    } finally {
      event.target.value = '';
    }
  }

  async function handleReadySheetUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const createdSheets: Awaited<ReturnType<typeof createReadyStickerSheet>>[] = [];

    if (files.length === 0) {
      return;
    }

    try {
      for (const file of files) {
        const createdSheet = await createReadyStickerSheet(file);
        createdSheets.push(createdSheet);
      }

      updateStickerConfig({
        sourceMode: 'ready-sheet',
        readySheets: [...(stickerConfig.readySheets ?? []), ...createdSheets],
      });

      setStickerUploadNotice({
        scope: 'ready-sheet',
        tone: 'success',
        message: `Добавлено ${createdSheets.length} страниц готовых листов.`,
      });
      setFeedback(`Добавлено ${createdSheets.length} страниц готовых листов.`);
    } catch (error) {
      if (createdSheets.length > 0) {
        await removeStickerAssetBlobs(createdSheets.map((item) => item.storageId));
      }
      setStickerUploadNotice({
        scope: 'ready-sheet',
        tone: 'error',
        message: error instanceof Error ? error.message : 'Не удалось загрузить PNG готового листа.',
      });
      setFeedback(error instanceof Error ? error.message : 'Не удалось загрузить PNG готового листа.');
    } finally {
      event.target.value = '';
    }
  }

  async function handleRemoveAutoSticker(assetId: string) {
    const asset = (stickerConfig.autoPngs ?? []).find((item) => item.id === assetId);
    if (!asset) {
      return;
    }

    await removeStickerAssetBlobs([asset.storageId]);
    clearStickerUploadNotice(asset.category);
    updateStickerConfig({
      autoPngs: (stickerConfig.autoPngs ?? []).filter((item) => item.id !== assetId),
    });
  }

  async function handleRemoveReadySheet(sheetId: string) {
    const sheet = (stickerConfig.readySheets ?? []).find((item) => item.id === sheetId);
    if (!sheet) {
      return;
    }

    await removeStickerAssetBlobs([sheet.storageId]);
    clearStickerUploadNotice('ready-sheet');
    updateStickerConfig({
      readySheets: (stickerConfig.readySheets ?? []).filter((item) => item.id !== sheetId),
    });
  }

  const autoLayout = stickerConfig.autoLayout ?? DEFAULT_STICKER_AUTO_LAYOUT;

  function getModeLabel(mode: PlannerConfig['mode']) {
    return mode === 'dated' ? 'датированный' : 'недатированный';
  }

  function getBackgroundTypeLabel(background: typeof selectedBackground) {
    if (background.isCustom) {
      if (background.type === 'color') {
        return 'пользовательский цвет';
      }

      if (background.variant === 'generated-gradient') {
        return 'пользовательский градиент';
      }

      return 'загруженное фото';
    }

    if (background.type === 'color') {
      return 'сплошной';
    }

    if (background.type === 'texture') {
      return 'текстура';
    }

    return 'изображение';
  }

  function getCurrentBackgroundStyleLabel() {
    if (hasCustomPhotoBackground) {
      return 'фото с наложением';
    }

    if (hasCustomGradientBackground) {
      return 'свой градиент';
    }

    if (hasCustomColorBackground) {
      return 'свой сплошной цвет';
    }

    return 'тематический фон';
  }

  function getStickerSourceModeLabel(sourceMode: StickerModuleConfig['sourceMode']) {
    return sourceMode === 'ready-sheet' ? 'готовые листы' : 'авто из PNG';
  }

  function getStickerBackgroundModeLabel(backgroundMode: StickerModuleConfig['backgroundMode']) {
    return backgroundMode === 'transparent' ? 'прозрачный' : 'белый';
  }

  function renderSectionCard(section: PlannerSectionConfig) {
    const presentation = getSectionPresentation(section);

    return (
      <SectionCard
        key={section.type}
        section={section}
        label={presentation.label}
        description={presentation.description}
        locked={presentation.locked}
        onToggle={() => toggleSection(section.type)}
        onMoveUp={() => moveSection(section.type, 'up')}
        onMoveDown={() => moveSection(section.type, 'down')}
        onCountChange={(value) => handleSectionCountChange(section.type, value)}
      />
    );
  }

  function renderActiveStepPanels() {
    if (activeStep === 'foundation') {
      return (
        <>
        <Panel title="Основа планера" eyebrow="Шаг 1">
          <p className="muted-copy">
            Начните с базового сценария продукта: режим, год, название и стартовый пресет. Это задает основу
            для всех следующих шагов.
          </p>

          <div className="preset-grid workflow-panel__space">
            {plannerPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetApply(preset.id)}
                className="preset-card"
              >
                <p className="preset-card__title">{preset.name}</p>
                <p className="preset-card__copy">{preset.description}</p>
              </button>
            ))}
          </div>

          <div className="form-grid workflow-panel__space">
            <label className="field">
              <span className="field__label">Название продукта</span>
              <input
                value={config.title}
                onChange={(event) => setField('title', event.target.value)}
                className="input"
              />
            </label>

            <label className="field">
              <span className="field__label">Режим</span>
              <select
                value={config.mode}
                onChange={(event) => handleModeChange(event.target.value as 'dated' | 'undated')}
                className="select"
              >
                <option value="dated">датированный</option>
                <option value="undated">недатированный</option>
              </select>
            </label>

            <label className="field">
              <span className="field__label">Год</span>
              <input
                type="number"
                min={2020}
                max={2100}
                value={config.year ?? ''}
                onChange={(event) => handleFoundationYearChange(event.target.value)}
                disabled={config.mode === 'undated'}
                className="input"
              />
            </label>

            <label className="field">
              <span className="field__label">Язык</span>
              <input value="ru" disabled className="input" />
            </label>
          </div>

          <div className="meta-grid">
            <div className="field-meta">
              <p className="field-meta__label">Размер страницы</p>
              <p className="field-meta__value">iPad landscape</p>
            </div>
            <div className="field-meta">
              <p className="field-meta__label">Ориентация</p>
              <p className="field-meta__value">альбомная</p>
            </div>
            <div className="field-meta">
              <p className="field-meta__label">Начало недели</p>
              <p className="field-meta__value">понедельник</p>
            </div>
          </div>
        </Panel>

        </>
      );
    }

    if (activeStep === 'astrology') {
      return (
        <>
        <Panel title="Астрология" eyebrow="Шаг 2">
          <p className="muted-copy">
            Уточните город пользователя для будущих расчетов Джйотиш. Можно выбрать готовый город из списка или ввести
            свой вручную вместе с часовым поясом и координатами.
          </p>

          <div className="workflow-mode-toggle workflow-panel__space">
            <button
              type="button"
              onClick={() => handleAstrologyCityModeChange('preset')}
              className={clsx('workflow-mode-toggle__button', config.astrology.cityMode === 'preset' && 'workflow-mode-toggle__button--active')}
            >
              Из списка
            </button>
            <button
              type="button"
              onClick={() => handleAstrologyCityModeChange('custom')}
              className={clsx('workflow-mode-toggle__button', config.astrology.cityMode === 'custom' && 'workflow-mode-toggle__button--active')}
            >
              Свой город
            </button>
          </div>

          {config.astrology.cityMode === 'preset' ? (
            <div className="form-grid workflow-panel__space">
              <label className="field">
                <span className="field__label">Город пользователя</span>
                <select
                  value={config.astrology.cityId}
                  onChange={(event) => handleAstrologyCityChange(event.target.value)}
                  className="select"
                >
                  {CAPITAL_CITY_OPTIONS.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name} · {city.country}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field__label">Аянамша</span>
                <input value={JYOTISH_AYANAMSA_LABEL} disabled className="input" />
              </label>
            </div>
          ) : (
            <div className="form-grid workflow-panel__space">
              <label className="field">
                <span className="field__label">Название города</span>
                <input
                  value={config.astrology.customCity?.name ?? ''}
                  onChange={(event) => handleAstrologyCustomCityChange('name', event.target.value)}
                  className="input"
                  placeholder="Например, Казань"
                />
              </label>

              <label className="field">
                <span className="field__label">Страна или регион</span>
                <input
                  value={config.astrology.customCity?.country ?? ''}
                  onChange={(event) => handleAstrologyCustomCityChange('country', event.target.value)}
                  className="input"
                  placeholder="Россия"
                />
              </label>

              <label className="field">
                <span className="field__label">Часовой пояс</span>
                <input
                  value={config.astrology.customCity?.timezone ?? ''}
                  onChange={(event) => handleAstrologyCustomCityChange('timezone', event.target.value)}
                  className="input"
                  placeholder="Europe/Moscow"
                />
              </label>

              <label className="field">
                <span className="field__label">Широта</span>
                <input
                  value={config.astrology.customCity?.latitude ?? ''}
                  onChange={(event) => handleAstrologyCustomCityChange('latitude', event.target.value)}
                  className="input"
                  placeholder="55.7558"
                />
              </label>

              <label className="field">
                <span className="field__label">Долгота</span>
                <input
                  value={config.astrology.customCity?.longitude ?? ''}
                  onChange={(event) => handleAstrologyCustomCityChange('longitude', event.target.value)}
                  className="input"
                  placeholder="37.6173"
                />
              </label>

              <label className="field">
                <span className="field__label">Аянамша</span>
                <input value={JYOTISH_AYANAMSA_LABEL} disabled className="input" />
              </label>
            </div>
          )}

          <div className="summary-grid workflow-panel__space">
            <InfoCard label="Режим города" value={config.astrology.cityMode === 'custom' ? 'свой город' : 'из списка'} />
            <InfoCard label="Город" value={`${selectedAstrologyCity.name} · ${selectedAstrologyCity.country}`} />
            <InfoCard label="Часовой пояс" value={selectedAstrologyCity.timezone} />
            <InfoCard label="Координаты" value={`${selectedAstrologyCity.latitudeText}, ${selectedAstrologyCity.longitudeText}`} />
            <InfoCard label="Аянамша" value={JYOTISH_AYANAMSA_LABEL} />
            <InfoCard label="Расчёт" value={ASTROLOGY_CALCULATION_TIME_LABEL} />
            <InfoCard label="Иконки" value={ASTROLOGY_ICON_STYLE_LABEL} />
          </div>
        </Panel>

        <Panel title="Астро-день" eyebrow="Расчёт">
          <p className="muted-copy">
            Титхи и накшатра считаются на локальный восход выбранного города. Swiss Ephemeris не встраивается в проект,
            а используется только как внешний ориентир для сверки методики.
          </p>

          <div className="summary-grid workflow-panel__space">
            <InfoCard label="Статус" value={astrologyDataReady ? 'готово' : 'нужен расчёт'} />
            <InfoCard label="Год" value={config.year ? `${config.year}` : 'не выбран'} />
            <InfoCard label="Рассчитано" value={astrologyCalculatedAtLabel} />
            <InfoCard label="Источник расчёта" value={ASTROLOGY_SOURCE_LABEL} />
            <InfoCard label="Сверка" value={ASTROLOGY_REFERENCE_LABEL} />
            <InfoCard label="Записей" value={`${config.astrology.data?.entries.length ?? 0}`} />
          </div>

          <div className="form-grid workflow-panel__space">
            <label className="field">
              <span className="field__label">Weekly preset</span>
              <select
                value={config.astrology.display.weekPreset}
                onChange={(event) => updateAstrologyDisplay('weekPreset', event.target.value as AstrologyLinePresetId)}
                className="select"
              >
                {(Object.entries(ASTROLOGY_LINE_PRESET_LABELS) as Array<[AstrologyLinePresetId, string]>).map(([preset, label]) => (
                  <option key={preset} value={preset}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">Daily preset</span>
              <select
                value={config.astrology.display.dayPreset}
                onChange={(event) => updateAstrologyDisplay('dayPreset', event.target.value as AstrologyLinePresetId)}
                className="select"
              >
                {(Object.entries(ASTROLOGY_LINE_PRESET_LABELS) as Array<[AstrologyLinePresetId, string]>).map(([preset, label]) => (
                  <option key={preset} value={preset}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">Плотность строки</span>
              <select
                value={config.astrology.display.lineDensity}
                onChange={(event) => updateAstrologyDisplay('lineDensity', event.target.value as AstrologyLineDensity)}
                className="select"
              >
                {(Object.entries(ASTROLOGY_LINE_DENSITY_LABELS) as Array<[AstrologyLineDensity, string]>).map(([density, label]) => (
                  <option key={density} value={density}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="summary-grid workflow-panel__space">
            <InfoCard label="Weekly строка" value={ASTROLOGY_LINE_PRESET_LABELS[config.astrology.display.weekPreset]} />
            <InfoCard label="Daily строка" value={ASTROLOGY_LINE_PRESET_LABELS[config.astrology.display.dayPreset]} />
            <InfoCard label="Плотность" value={ASTROLOGY_LINE_DENSITY_LABELS[config.astrology.display.lineDensity]} />
          </div>

          <div className="workflow-panel__space">
            <p className="small-label">Что показывать в астростроке</p>
            <p className="muted-copy">
              Выберите, какие элементы будут входить в астрологическую строку на weekly и daily страницах.
            </p>
            <div className="pill-list astro-layer-pills">
              {(Object.entries(ASTROLOGY_LAYER_LABELS) as Array<[keyof PlannerAstrologyLayers, string]>).map(([layer, label]) => (
                <button
                  key={layer}
                  type="button"
                  onClick={() => handleAstrologyLayerToggle(layer)}
                  className={clsx('pill', config.astrology.layers[layer] && 'pill--active')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="workflow-mode-toggle workflow-panel__space">
            <button
              type="button"
              onClick={() => updateAstrologyConfig({ includeLegend: true })}
              className={clsx('workflow-mode-toggle__button', config.astrology.includeLegend && 'workflow-mode-toggle__button--active')}
            >
              легенда в PDF
            </button>
            <button
              type="button"
              onClick={() => updateAstrologyConfig({ includeLegend: false })}
              className={clsx('workflow-mode-toggle__button', !config.astrology.includeLegend && 'workflow-mode-toggle__button--active')}
            >
              без легенды
            </button>
          </div>

          <div className="inline-actions workflow-panel__space">
            <button
              type="button"
              onClick={() => refreshAstrologyData()}
              disabled={config.mode === 'undated' || astrologyStatus === 'loading'}
              className="button button--secondary"
            >
              {astrologyStatus === 'loading' ? 'Считаем...' : 'Рассчитать астрологию на год'}
            </button>
            <a href="#/astrology-pdf" className="button button--ghost">
              Добавить в PDF
            </a>
          </div>

          {astrologyMessage ? (
            <p
              className={clsx(
                'message',
                astrologyStatus === 'error' ? 'message--error' : astrologyStatus === 'success' ? 'message--success' : 'message--warning',
              )}
            >
              {astrologyMessage}
            </p>
          ) : null}
        </Panel>

        <Panel title="Расшифровка символов" eyebrow="Легенда">
          <p className="muted-copy">
            Эту страницу можно добавить в документ как отдельный лист. Она появится сразу после декабря и перед следующими разделами.
          </p>

          <div className="background-tools workflow-panel__space">
            <button
              type="button"
              onClick={() => updateAstrologyConfig({ includeLegend: !config.astrology.includeLegend })}
              className={clsx('button', config.astrology.includeLegend ? 'button--secondary' : 'button--primary')}
            >
              {config.astrology.includeLegend ? 'Убрать из планера' : 'Добавить в планер'}
            </button>
          </div>

          <div className="astro-legend-grid">
            <div className="astro-legend-card">
              <p className="small-label">Титхи</p>
              {Object.values(TITHI_TYPE_META).map((item) => (
                <p key={item.icon} className="astro-legend-row">
                  <AstroIconPreview icon={item.icon} label={item.label} />
                  <span>{item.range} · {item.label}</span>
                </p>
              ))}
            </div>
            <div className="astro-legend-card">
              <p className="small-label">Накшатра</p>
              {Object.values(NAKSHATRA_TYPE_META).map((item) => (
                <p key={item.icon} className="astro-legend-row">
                  <AstroIconPreview icon={item.icon} label={item.label} />
                  <span>{item.label}</span>
                </p>
              ))}
            </div>
            <div className="astro-legend-card">
              <p className="small-label">Планета дня</p>
              {Object.values(PLANET_DAY_META).map((item) => (
                <p key={item.icon} className="astro-legend-row">
                  <AstroIconPreview icon={item.icon} label={item.label} />
                  <span>{item.label}</span>
                </p>
              ))}
            </div>
            <div className="astro-legend-card">
              <p className="small-label">Энергия</p>
              {Object.values(ENERGY_META).map((item) => (
                <p key={item.icon} className="astro-legend-row">
                  <AstroIconPreview icon={item.icon} label={item.label} />
                  <span>{item.label}</span>
                </p>
              ))}
            </div>
            <div className="astro-legend-card">
              <p className="small-label">Фокус</p>
              {Object.values(FOCUS_META).map((item) => (
                <p key={item.icon} className="astro-legend-row">
                  <AstroIconPreview icon={item.icon} label={item.label} />
                  <span>{item.label}</span>
                </p>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Фазы Луны" eyebrow="Астрономия">
          <p className="muted-copy">
            Источник данных: Astronomical Applications Department U.S. Naval Observatory. В календаре используются первичные
            фазы из USNO API, а промежуточные дни распределяются между соседними первичными фазами.
          </p>

          <div className="workflow-mode-toggle workflow-panel__space">
            <button
              type="button"
              onClick={() => handleMoonPhaseToggle(true)}
              disabled={config.mode === 'undated' || moonPhaseStatus === 'loading'}
              className={clsx('workflow-mode-toggle__button', config.moonPhases.enabled && 'workflow-mode-toggle__button--active')}
            >
              включить
            </button>
            <button
              type="button"
              onClick={() => handleMoonPhaseToggle(false)}
              disabled={moonPhaseStatus === 'loading'}
              className={clsx('workflow-mode-toggle__button', !config.moonPhases.enabled && 'workflow-mode-toggle__button--active')}
            >
              выключить
            </button>
          </div>

          <div className="summary-grid workflow-panel__space">
            <InfoCard label="Статус" value={config.moonPhases.enabled ? (moonPhaseDataReady ? 'готово' : 'нужна загрузка') : 'выключено'} />
            <InfoCard label="Покрытие" value={moonPhaseYearsLabel} />
            <InfoCard label="Обновлено" value={moonPhaseFetchedAtLabel} />
            <InfoCard label="Источник" value="USNO AA API" />
          </div>

          <div className="inline-actions workflow-panel__space">
            <button
              type="button"
              onClick={() => void refreshMoonPhaseData()}
              disabled={config.mode === 'undated' || moonPhaseStatus === 'loading'}
              className="button button--secondary"
            >
              {moonPhaseStatus === 'loading' ? 'Загрузка...' : 'Обновить данные'}
            </button>
            <a href={MOON_PHASE_SOURCE_DOCS_URL} target="_blank" rel="noreferrer" className="button button--ghost">
              Документация USNO
            </a>
          </div>

          {moonPhaseMessage ? (
            <p
              className={clsx(
                'message',
                moonPhaseStatus === 'error' ? 'message--error' : moonPhaseStatus === 'success' ? 'message--success' : 'message--warning',
              )}
            >
              {moonPhaseMessage}
            </p>
          ) : null}
        </Panel>
        </>
      );
    }

    if (activeStep === 'structure') {
      return (
        <>
          <Panel title="Структура документа" eyebrow="Шаг 3">
            <p className="muted-copy">
              Включайте и выключайте разделы, меняйте их порядок и контролируйте объем страниц для каждого блока.
            </p>
            <div className="section-list workflow-panel__space">
              {structureSections.map((section) => renderSectionCard(section))}
            </div>
          </Panel>

          <Panel title="Что вынесено отдельно" eyebrow="Сценарий">
            <div className="surface-block">
              <p className="surface-block__label">Страницы со стикерами</p>
              <p className="surface-block__value">
                {stickerSection?.enabled ? `${stickerSection.count ?? 0} листа включены` : 'Сейчас выключены'}
              </p>
              <p className="muted-copy">
                Стикеры вынесены в отдельный шаг, чтобы их можно было проработать как отдельную ценность продукта.
              </p>
            </div>
          </Panel>
        </>
      );
    }

    if (activeStep === 'design') {
      return (
        <>
          <Panel title="Тема" eyebrow="Шаг 4">
            <div className="theme-grid">
              {plannerThemes.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  selected={config.themeId === theme.id}
                  onSelect={() => setTheme(theme.id)}
                />
              ))}
            </div>
          </Panel>

          <Panel title="Фон и атмосфера" eyebrow="Фоны">
            <div className="background-grid">
              {availableBackgrounds.map((background) => (
                <button
                  key={background.id}
                  type="button"
                  onClick={() => setBackground(background.id)}
                  className={clsx(
                    'background-card',
                    config.backgroundId === background.id && 'background-card--selected',
                    background.isCustom && 'background-card--uploaded',
                  )}
                >
                  <div className="background-card__preview" style={{ background: background.preview }} />
                  <p className="background-card__title">{background.name}</p>
                  <p className="background-card__type">{getBackgroundTypeLabel(background)}</p>
                </button>
              ))}
            </div>

            <div className="background-tools">
              <label className="color-picker-field">
                <span className="field__label">Сплошной цвет</span>
                <span className="color-picker-field__control">
                  <input
                    type="color"
                    value={colorPickerValue}
                    onChange={handleBackgroundColorChange}
                    className="color-picker-field__input"
                  />
                  <strong>{colorPickerValue}</strong>
                </span>
              </label>

              <div className="gradient-picker">
                <span className="field__label">Градиент из спектра</span>

                <div className="gradient-picker__row">
                  <label className="color-picker-field">
                    <span className="field__label">Старт</span>
                    <span className="color-picker-field__control">
                      <input
                        type="color"
                        value={gradientStartValue}
                        onChange={(event) => handleGradientBackgroundChange({ startColor: event.target.value })}
                        className="color-picker-field__input"
                      />
                      <strong>{gradientStartValue}</strong>
                    </span>
                  </label>

                  <label className="color-picker-field">
                    <span className="field__label">Финиш</span>
                    <span className="color-picker-field__control">
                      <input
                        type="color"
                        value={gradientEndValue}
                        onChange={(event) => handleGradientBackgroundChange({ endColor: event.target.value })}
                        className="color-picker-field__input"
                      />
                      <strong>{gradientEndValue}</strong>
                    </span>
                  </label>
                </div>

                <label className="field gradient-picker__angle">
                  <span className="field__label">Угол градиента: {gradientAngleValue}°</span>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={gradientAngleValue}
                    onChange={(event) => handleGradientBackgroundChange({ angle: Number(event.target.value) })}
                    className="gradient-picker__slider"
                  />
                </label>
              </div>

              <label className="field background-opacity-control">
                <span className="field__label">Прозрачность фона: {backgroundOpacityValue}%</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={backgroundOpacityValue}
                  onChange={handleBackgroundOpacityChange}
                  className="background-opacity-control__slider"
                />
                <span className="background-opacity-control__hint">
                  0% скрывает декоративный фон, 100% показывает его полностью.
                </span>
              </label>

              <button type="button" onClick={handleBackgroundUploadClick} className="button button--secondary">
                Загрузить фото для фона
              </button>

              {hasCustomBackground ? (
                <button type="button" onClick={clearCustomBackground} className="button button--ghost">
                  Удалить загруженный фон
                </button>
              ) : null}
            </div>

            <p className="background-hint">
              Можно выбрать сплошной цвет, собрать свой градиент из двух цветов и угла или загрузить фото. Фото
              автоматически уменьшается и сжимается, чтобы не раздувать локальное хранилище и итоговый PDF. Прозрачность
              применяется одинаково в живом предпросмотре и при PDF-экспорте.
            </p>

            <div className="summary-grid">
              <InfoCard label="Тема" value={selectedTheme.name} />
              <InfoCard label="Фон" value={selectedBackground.name} />
              <InfoCard label="Обложка" value={config.coverImage?.name ?? 'не задана'} />
              <InfoCard label="Фон листов" value={config.pageBackgroundImage?.name ?? 'не задан'} />
              <InfoCard label="Вкладки" value={config.tabPosition === 'top' ? 'сверху' : 'справа'} />
              <div className="surface-block surface-block--slider">
                <p className="surface-block__label">Прозрачность</p>
                <div className="surface-block__slider-stack">
                  <p className="surface-block__value">{backgroundOpacityValue}%</p>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={backgroundOpacityValue}
                    onChange={handleBackgroundOpacityChange}
                    className="surface-block__slider"
                    aria-label="Прозрачность фона"
                  />
                </div>
              </div>
              <InfoCard
                label="Текущий стиль"
                value={getCurrentBackgroundStyleLabel()}
              />
            </div>
          </Panel>

          <Panel title="Навигация" eyebrow="Вкладки">
            <p className="muted-copy">
              Вкладки месяцев и разделов можно держать в правой колонке или перенести наверх, чтобы композиция страницы
              ощущалась более горизонтальной.
            </p>

            <div className="workflow-panel__space">
              <div className="field">
                <span className="field__label">Расположение вкладок</span>
                <div className="workflow-mode-toggle">
                  <button
                    type="button"
                    onClick={() => handleTabPositionChange('top')}
                    className={clsx('workflow-mode-toggle__button', config.tabPosition === 'top' && 'workflow-mode-toggle__button--active')}
                  >
                    Сверху
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabPositionChange('right')}
                    className={clsx('workflow-mode-toggle__button', config.tabPosition === 'right' && 'workflow-mode-toggle__button--active')}
                  >
                    Справа
                  </button>
                </div>
              </div>

              <div className="summary-grid">
                <InfoCard label="Положение" value={config.tabPosition === 'top' ? 'сверху' : 'справа'} />
                <InfoCard label="Всего вкладок" value={`${plan.tabs.length}`} />
              </div>
            </div>
          </Panel>

          <Panel title="Обложка и фон листов" eyebrow="PNG">
            <p className="muted-copy">
              Оба PNG опциональны. Обложка добавляется первой страницей документа, а фон листов вставляется внутрь каждого
              листа планера. Лучше готовить файлы сразу в нужном размере.
            </p>

            <div className="sticker-category-grid workflow-panel__space">
              <article className="sticker-category-card">
                <p className="small-label">Опционально</p>
                <h3 className="sticker-category-card__title">Обложка ({coverUploadSizeLabel})</h3>
                <p className="sticker-category-card__description">
                  PNG вставляется как первая страница итогового PDF без дополнительного масштабирования и сжатия.
                </p>
                <div className="background-tools">
                  <button type="button" onClick={handleCoverUploadClick} className="button button--secondary">
                    {config.coverImage ? 'Заменить PNG-обложку' : 'Загрузить PNG-обложку'}
                  </button>
                  {config.coverImage ? (
                    <button type="button" onClick={handleRemoveCoverImage} className="button button--ghost">
                      Удалить обложку
                    </button>
                  ) : null}
                </div>
                {config.coverImage ? (
                  <article className="sticker-upload-card sticker-upload-card--sheet">
                    <div className="sticker-upload-card__preview sticker-upload-card__preview--sheet">
                      <img src={config.coverImage.source} alt={config.coverImage.name} className="sticker-upload-card__image" />
                    </div>
                    <div>
                      <p className="sticker-upload-card__title">{config.coverImage.name}</p>
                      <p className="sticker-upload-card__meta">
                        {config.coverImage.width}×{config.coverImage.height} · {Math.max(1, Math.round(config.coverImage.sizeBytes / 1024))} KB
                      </p>
                    </div>
                  </article>
                ) : (
                  <p className="muted-copy">Можно оставить планер без отдельной PNG-обложки.</p>
                )}
              </article>

              <article className="sticker-category-card">
                <p className="small-label">Опционально</p>
                <h3 className="sticker-category-card__title">Фон листов ({pageBackgroundUploadSizeLabel})</h3>
                <p className="sticker-category-card__description">
                  PNG подставляется во все листы планера. Если в файле есть прозрачные области, они сохранятся и в
                  предпросмотре, и в PDF.
                </p>
                <div className="background-tools">
                  <button type="button" onClick={handlePageBackgroundUploadClick} className="button button--secondary">
                    {config.pageBackgroundImage ? 'Заменить PNG-фон листов' : 'Загрузить PNG-фон листов'}
                  </button>
                  {config.pageBackgroundImage ? (
                    <button type="button" onClick={handleRemovePageBackgroundImage} className="button button--ghost">
                      Удалить фон листов
                    </button>
                  ) : null}
                </div>
                {config.pageBackgroundImage ? (
                  <article className="sticker-upload-card sticker-upload-card--sheet">
                    <div className="sticker-upload-card__preview sticker-upload-card__preview--sheet">
                      <img
                        src={config.pageBackgroundImage.source}
                        alt={config.pageBackgroundImage.name}
                        className="sticker-upload-card__image"
                      />
                    </div>
                    <div>
                      <p className="sticker-upload-card__title">{config.pageBackgroundImage.name}</p>
                      <p className="sticker-upload-card__meta">
                        {config.pageBackgroundImage.width}×{config.pageBackgroundImage.height} · {Math.max(1, Math.round(config.pageBackgroundImage.sizeBytes / 1024))} KB
                      </p>
                    </div>
                  </article>
                ) : (
                  <p className="muted-copy">Можно оставить стандартные листы без собственного PNG-фона.</p>
                )}
              </article>
            </div>
          </Panel>
        </>
      );
    }

    if (activeStep === 'layout') {
      return LayoutEditorPanel ? (
        <LayoutEditorPanel config={config} onConfigChange={applyConfigPatch} />
      ) : (
        <Panel title="Редактор макета" eyebrow="Шаг 5">
          <p className="muted-copy">
            Модуль `layout-editor` не подключен в реестр. Подключите его как инструментальный модуль, чтобы редактировать
            `PageLayout` через общий контракт макета.
          </p>
        </Panel>
      );
    }

    if (activeStep === 'stickers') {
      return (
        <>
        <Panel title="Страницы со стикерами" eyebrow="Шаг 6">
          <p className="muted-copy">
            Здесь раздел со стикерами настраивается как отдельный модуль продукта. Листы попадают в итоговый PDF как
            встроенная библиотека, а пользователь работает с ними уже средствами PDF-приложения.
          </p>

          <div className="workflow-panel__space sticker-module-form">
            <div className="field">
              <span className="field__label">Состояние модуля</span>
              <div className="workflow-mode-toggle">
                <button
                  type="button"
                  onClick={() => updateStickerConfig({ enabled: true })}
                  className={clsx('workflow-mode-toggle__button', stickerConfig.enabled && 'workflow-mode-toggle__button--active')}
                >
                  Включен
                </button>
                <button
                  type="button"
                  onClick={() => updateStickerConfig({ enabled: false })}
                  className={clsx('workflow-mode-toggle__button', !stickerConfig.enabled && 'workflow-mode-toggle__button--active')}
                >
                  Выключен
                </button>
              </div>
            </div>

            <label className="field">
              <span className="field__label">Режим источника</span>
              <select
                value={stickerConfig.sourceMode}
                onChange={(event) => updateStickerConfig({ sourceMode: event.target.value as StickerModuleConfig['sourceMode'] })}
                disabled={!stickerConfig.enabled}
                className="select"
              >
                <option value="auto-png-pack">Авто-режим · набор PNG</option>
                <option value="ready-sheet">Режим готовых листов</option>
              </select>
            </label>

            <label className="field">
              <span className="field__label">Фон стикеров</span>
              <select
                value={stickerConfig.backgroundMode}
                onChange={(event) => updateStickerConfig({ backgroundMode: event.target.value as StickerModuleConfig['backgroundMode'] })}
                disabled={!stickerConfig.enabled}
                className="select"
              >
                <option value="transparent">прозрачный</option>
                <option value="white">белый</option>
              </select>
            </label>

            {stickerConfig.sourceMode === 'auto-png-pack' ? (
              <>
                <div className="field">
                  <span className="field__label">Категории</span>
                  <div className="pill-list">
                    {STICKER_CATEGORY_ORDER.map((category) => {
                      const meta = getStickerCategoryMeta(category);
                      const active = (stickerConfig.categories ?? STICKER_CATEGORY_ORDER).includes(category);
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => handleStickerCategoryToggle(category)}
                          disabled={!stickerConfig.enabled}
                          className={clsx('pill', active && 'pill--active')}
                        >
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-grid">
                  <label className="field">
                    <span className="field__label">Расстояние между стикерами</span>
                    <input
                      type="number"
                      min={8}
                      max={80}
                      value={autoLayout.itemSpacing}
                      onChange={(event) => updateStickerConfig({
                        autoLayout: {
                          ...autoLayout,
                          itemSpacing: Number(event.target.value),
                        },
                      })}
                      disabled={!stickerConfig.enabled}
                      className="input"
                    />
                  </label>

                  <label className="field">
                    <span className="field__label">Внутренние поля страницы</span>
                    <input
                      type="number"
                      min={24}
                      max={160}
                      value={autoLayout.pagePadding}
                      onChange={(event) => updateStickerConfig({
                        autoLayout: {
                          ...autoLayout,
                          pagePadding: Number(event.target.value),
                        },
                      })}
                      disabled={!stickerConfig.enabled}
                      className="input"
                    />
                  </label>

                  <label className="field">
                    <span className="field__label">Максимум элементов на странице</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={autoLayout.maxItemsPerPage ?? 6}
                      onChange={(event) => updateStickerConfig({
                        autoLayout: {
                          ...autoLayout,
                          maxItemsPerPage: Number(event.target.value),
                        },
                      })}
                      disabled={!stickerConfig.enabled}
                      className="input"
                    />
                  </label>
                </div>
              </>
            ) : null}
          </div>

          <div className="sticker-category-grid workflow-panel__space">
            {stickerConfig.sourceMode === 'auto-png-pack'
              ? STICKER_CATEGORY_ORDER.map((category) => {
                const meta = getStickerCategoryMeta(category);
                const items = (stickerConfig.autoPngs ?? []).filter((item) => item.category === category);
                const categoryNotice = stickerUploadNotice?.scope === category ? stickerUploadNotice : null;

                return (
                  <article key={category} className="sticker-category-card">
                    <p className="small-label">{meta.title}</p>
                    <h3 className="sticker-category-card__title">{meta.label}</h3>
                    <p className="sticker-category-card__description">{meta.description}</p>
                    <div className="pill-list">
                      {meta.chips.map((chip) => (
                        <span key={chip} className="pill">{chip}</span>
                      ))}
                    </div>
                    <p className="sticker-category-card__hint">{meta.usageHint}</p>
                    <div className="background-tools">
                      <button
                        type="button"
                        onClick={() => handleAutoStickerUploadClick(category)}
                        disabled={!stickerConfig.enabled}
                        className="button button--secondary"
                      >
                        {items.length > 0 ? 'Добавить ещё PNG' : 'Загрузить PNG в категорию'}
                      </button>
                    </div>
                    {categoryNotice ? (
                      <p
                        className={clsx(
                          'message',
                          'sticker-upload-feedback',
                          categoryNotice.tone === 'error' ? 'message--error' : 'message--success',
                        )}
                      >
                        {categoryNotice.message}
                      </p>
                    ) : null}
                    <div className="sticker-upload-grid">
                      {items.length > 0 ? items.map((item) => (
                        <article key={item.id} className="sticker-upload-card">
                          <div className="sticker-upload-card__preview">
                            <img src={item.previewSource} alt={item.name} className="sticker-upload-card__image" />
                          </div>
                          <div>
                            <p className="sticker-upload-card__title">{item.name}</p>
                            <p className="sticker-upload-card__meta">{item.width}×{item.height} · {Math.round(item.sizeBytes / 1024)} KB</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleRemoveAutoSticker(item.id)}
                            disabled={!stickerConfig.enabled}
                            className="action-button"
                          >
                            Удалить
                          </button>
                        </article>
                      )) : (
                        <p className="muted-copy">Пока ничего не загружено. Можно оставить встроенный базовый набор или добавить свои PNG.</p>
                      )}
                    </div>
                  </article>
                );
              })
              : (
                <article className="sticker-category-card">
                  <p className="small-label">Режим готовых листов</p>
                  <h3 className="sticker-category-card__title">Готовые листы</h3>
                  <p className="sticker-category-card__description">
                    Каждый PNG вставляется как отдельная страница со стикерами. Поддерживается размер {READY_SHEET_ALLOWED_DIMENSIONS_LABEL}.
                  </p>
                  <div className="background-tools">
                    <button
                      type="button"
                      onClick={handleReadySheetUploadClick}
                      disabled={!stickerConfig.enabled}
                      className="button button--secondary"
                    >
                      {readySheets.length > 0 ? 'Добавить ещё листы' : 'Загрузить готовые листы'}
                    </button>
                  </div>
                  {readySheetNotice ? (
                    <p
                      className={clsx(
                        'message',
                        'sticker-upload-feedback',
                        readySheetNotice.tone === 'error' ? 'message--error' : 'message--success',
                      )}
                    >
                      {readySheetNotice.message}
                    </p>
                  ) : null}
                  <div className="sticker-upload-grid">
                    {readySheets.length > 0 ? readySheets.map((sheet) => (
                      <article key={sheet.id} className="sticker-upload-card sticker-upload-card--sheet">
                        <div className="sticker-upload-card__preview sticker-upload-card__preview--sheet">
                          <img src={sheet.previewSource} alt={sheet.name} className="sticker-upload-card__image" />
                        </div>
                        <div>
                          <p className="sticker-upload-card__title">{sheet.name}</p>
                          <p className="sticker-upload-card__meta">{sheet.width}×{sheet.height} · {Math.round(sheet.sizeBytes / 1024)} KB</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleRemoveReadySheet(sheet.id)}
                          disabled={!stickerConfig.enabled}
                          className="action-button"
                        >
                          Удалить
                        </button>
                      </article>
                    )) : (
                      <p className="muted-copy">Загрузите готовые PNG-листы {READY_SHEET_ALLOWED_DIMENSIONS_LABEL}. Каждый файл станет отдельной страницей со стикерами.</p>
                    )}
                  </div>
                </article>
              )}
          </div>
        </Panel>

        <Panel title="Итог по стикерам" eyebrow="Результат">
          <div className="summary-grid">
            <InfoCard label="Режим" value={getStickerSourceModeLabel(stickerConfig.sourceMode)} />
            <InfoCard label="Фон стикеров" value={getStickerBackgroundModeLabel(stickerConfig.backgroundMode)} />
            <InfoCard label="Страницы" value={`${stickerPageCount}`} />
            <InfoCard label="PNG-файлы" value={`${stickerConfig.autoPngs?.length ?? 0}`} />
            <InfoCard label="Готовые листы" value={`${stickerConfig.readySheets?.length ?? 0}`} />
            <InfoCard label="Категории" value={(stickerConfig.categories ?? STICKER_CATEGORY_ORDER).map((category) => getStickerCategoryMeta(category).label).join(', ')} />
            <InfoCard label="Автогруппы" value={`${autoStickerGroups.length}`} />
          </div>
        </Panel>
        </>
      );
    }

    if (activeStep === 'preview') {
      return (
        <Panel title="Предпросмотр и проверка" eyebrow="Шаг 7">
          <p className="muted-copy">
            Живой предпросмотр находится ниже листа настроек. Здесь держите под рукой итоговую сводку, проверку конфигурации и быстрый
            переход в отдельную страницу шаблонов.
          </p>

          <div className="summary-grid workflow-panel__space">
            <InfoCard label="Страницы" value={`${plan.pages.length}`} />
            <InfoCard label="Вкладки" value={`${plan.tabs.length}`} />
            <InfoCard label="Ссылки" value={`${plan.links.length}`} />
          </div>

          <div className="actions-grid workflow-panel__space">
            <a href="#/templates" target="_blank" rel="noreferrer" className="action-card">
              <p className="action-card__title">Открыть шаблоны</p>
              <p className="action-card__copy">Держать живой предпросмотр в отдельной вкладке рядом с конструктором.</p>
            </a>

            <a href="#/append-stickers" target="_blank" rel="noreferrer" className="action-card">
              <p className="action-card__title">Дополнить готовый PDF</p>
              <p className="action-card__copy">Открыть отдельную вкладку и дописать в конец чужого PDF только sticker pages.</p>
            </a>

            <a href="#/moon-phases-pdf" target="_blank" rel="noreferrer" className="action-card">
              <p className="action-card__title">Добавить фазы Луны в PDF</p>
              <p className="action-card__copy">Открыть редактор готового PDF и наложить лунные метки по текущему конфигу.</p>
            </a>

            <button type="button" onClick={() => setActiveStep('export')} className="action-card">
              <p className="action-card__title">Перейти к экспорту</p>
              <p className="action-card__copy">После проверки перейти к финальной выгрузке файлов.</p>
            </button>
          </div>

          <div className="message-stack">
            {validation.errors.length === 0 ? (
              <p className="message message--success">Блокирующих ошибок не найдено.</p>
            ) : (
              validation.errors.map((item) => (
                <p key={item} className="message message--error">{item}</p>
              ))
            )}

            {validation.warnings.map((item) => (
              <p key={item} className="message message--warning">{item}</p>
            ))}
          </div>
        </Panel>
      );
    }

    return (
      <>
        <Panel title="Экспорт" eyebrow="Шаг 8">
          <p className="muted-copy">
            Финальный шаг: выгружайте PDF, JSON-конфиг и инструкцию. Если конфигурация не готова, ошибки останутся прямо здесь.
          </p>

          <div className="actions-grid workflow-panel__space">
            <button
              type="button"
              onClick={handlePdfExport}
              disabled={isExporting || !exportReady}
              className="action-card action-card--primary"
            >
              <p className="action-card__title">{isExporting ? 'Сборка PDF...' : 'Экспортировать PDF'}</p>
              <p className="action-card__copy">Скачать финальный интерактивный PDF-файл для клиента.</p>
            </button>

            <button type="button" onClick={handleConfigExport} className="action-card">
              <p className="action-card__title">Скачать JSON</p>
              <p className="action-card__copy">Сохранить текущий конфиг как рабочую сборку или пресет.</p>
            </button>

            <button type="button" onClick={handleGuideExport} className="action-card">
              <p className="action-card__title">Скачать инструкцию</p>
              <p className="action-card__copy">Сгенерировать инструкцию по использованию для конечного пользователя.</p>
            </button>

            <button type="button" onClick={handleImportClick} className="action-card">
              <p className="action-card__title">Импортировать JSON</p>
              <p className="action-card__copy">Загрузить ранее сохранённый конфиг и продолжить сборку.</p>
            </button>

            <a href="#/templates" target="_blank" rel="noreferrer" className="action-card">
              <p className="action-card__title">Открыть шаблоны</p>
              <p className="action-card__copy">Проверить шаблоны отдельно перед финальным экспортом.</p>
            </a>

            <a href="#/append-stickers" target="_blank" rel="noreferrer" className="action-card">
              <p className="action-card__title">Дополнить готовый PDF</p>
              <p className="action-card__copy">Собрать sticker pages текущим движком и дописать их в конец уже существующего PDF.</p>
            </a>

            <a href="#/moon-phases-pdf" target="_blank" rel="noreferrer" className="action-card">
              <p className="action-card__title">Добавить фазы Луны в PDF</p>
              <p className="action-card__copy">Загрузить уже готовый PDF и сохранить копию с фазами Луны поверх дат.</p>
            </a>

            <button type="button" onClick={handleResetConfig} className="action-card">
              <p className="action-card__title">Сбросить конфиг</p>
              <p className="action-card__copy">Вернуть базовый MVP-сценарий и очистить локальные изменения.</p>
            </button>
          </div>
        </Panel>

        <Panel title="Готовность к выдаче" eyebrow="Проверка">
          <div className="summary-grid">
            <InfoCard label="Тема" value={selectedTheme.name} />
            <InfoCard label="Фон" value={selectedBackground.name} />
            <InfoCard label="Обложка" value={config.coverImage ? 'загружена' : 'нет'} />
            <InfoCard label="Фон листов" value={config.pageBackgroundImage ? 'загружен' : 'нет'} />
            <InfoCard label="Дневные страницы" value={dailySection?.enabled ? `${dailySection.count} шт.` : 'Выключены'} />
          </div>

          <div className="message-stack workflow-panel__space">
            {validation.errors.length === 0 ? (
              <p className="message message--success">Экспорт не заблокирован. Конфигурация готова к выгрузке.</p>
            ) : (
              validation.errors.map((item) => (
                <p key={item} className="message message--error">{item}</p>
              ))
            )}

            {validation.warnings.map((item) => (
              <p key={item} className="message message--warning">{item}</p>
            ))}
          </div>
        </Panel>
      </>
    );
  }

  return (
    <main className="page-shell page-shell--workflow">
      <section className="workflow-toolbar">
        <div className="workflow-toolbar__intro">
          <p className="hero__eyebrow">Сборка планера</p>
          <h1 className="workflow-toolbar__title">Пошаговая сборка цифрового планера.</h1>
          <p className="workflow-toolbar__lead">
            Конструктор работает как мастер: слева шаги, в центре настройки текущего этапа, а живой предпросмотр вынесен ниже.
          </p>
        </div>

        <div className="workflow-toolbar__quick">
          <label className="field workflow-toolbar__field">
            <span className="field__label">Тема</span>
            <select
              value={config.themeId}
              onChange={(event) => setTheme(event.target.value)}
              className="select"
            >
              {plannerThemes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </label>

          <div className="field workflow-toolbar__field">
            <span className="field__label">Режим</span>
            <div className="workflow-mode-toggle">
              <button
                type="button"
                onClick={() => handleModeChange('dated')}
                className={clsx('workflow-mode-toggle__button', config.mode === 'dated' && 'workflow-mode-toggle__button--active')}
              >
                датированный
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('undated')}
                className={clsx('workflow-mode-toggle__button', config.mode === 'undated' && 'workflow-mode-toggle__button--active')}
              >
                недатированный
              </button>
            </div>
          </div>

          <div className="workflow-toolbar__actions">
            <button
              type="button"
              onClick={handlePdfExport}
              disabled={isExporting || !exportReady}
              className="button button--primary"
            >
              {isExporting ? 'Сборка PDF...' : exportReady ? 'Экспорт PDF' : 'Проверьте экспорт'}
            </button>
            <button type="button" onClick={handleResetConfig} className="button button--secondary">
              Сбросить
            </button>
            <a href="#/append-stickers" target="_blank" rel="noreferrer" className="button button--secondary">
              Дополнить PDF
            </a>
            <a href="#/moon-phases-pdf" target="_blank" rel="noreferrer" className="button button--secondary">
              Фазы в PDF
            </a>
            <a href="#/templates" target="_blank" rel="noreferrer" className="button button--ghost">
              Шаблоны
            </a>
          </div>
        </div>

        <div className="workflow-toolbar__status">
          <StatusPill label="Шаг" value={`${currentStepIndex + 1} / ${WORKFLOW_STEPS.length} · ${currentStep.title}`} />
          <StatusPill label="Состояние" value={exportStatusLabel} />
          <StatusPill label="Автосохранение" value={`локально · ${saveLabel}`} />
          <StatusPill label="Документ" value={`${plan.pages.length} стр. · ${plan.tabs.length} вкладок`} />
        </div>
      </section>

      {feedback ? <p className="floating-note">{feedback}</p> : null}

      <div className="workflow-layout">
        <aside className="workflow-layout__sidebar">
          <Panel title="Шаги сборки" eyebrow="Мастер">
            <WorkflowStepNav
              steps={stepItems}
              activeStepId={activeStep}
              onSelect={(stepId) => setActiveStep(stepId as BuilderStepId)}
            />
          </Panel>
        </aside>

        <section className="workflow-layout__settings">
          <div className="workflow-settings-stack">
            {renderActiveStepPanels()}
          </div>

          <div className="workflow-step-footer">
            <button
              type="button"
              onClick={() => previousStep && setActiveStep(previousStep.id)}
              disabled={!previousStep}
              className="button button--ghost"
            >
              {previousStep ? `Назад: ${previousStep.title}` : 'Это первый шаг'}
            </button>

            <button
              type="button"
              onClick={handleFooterPrimaryAction}
              disabled={!nextStep && (isExporting || !exportReady)}
              className={clsx('button', nextStep ? 'button--secondary' : 'button--primary')}
            >
              {nextStep
                ? `Далее: ${nextStep.title}`
                : isExporting
                  ? 'Сборка PDF...'
                  : exportReady
                    ? 'Экспортировать PDF'
                    : 'Исправьте ошибки экспорта'}
            </button>
          </div>
        </section>
      </div>

      <section className="workflow-preview-dock">
        <PlannerRenderPreviewPanel
          config={deferredConfig}
          plan={plan}
          preferredSectionType={preferredPreviewSection}
        />

        {activeStep === 'preview' || activeStep === 'export' ? (
          <PreviewPanel config={deferredConfig} plan={plan} errors={validation.errors} warnings={validation.warnings} />
        ) : null}
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleImportChange}
        className="hidden-input"
      />

      <input
        ref={backgroundInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleBackgroundUploadChange}
        className="hidden-input"
      />

      <input
        ref={coverInputRef}
        type="file"
        accept="image/png,.png"
        onChange={handleCoverUploadChange}
        className="hidden-input"
      />

      <input
        ref={pageBackgroundInputRef}
        type="file"
        accept="image/png,.png"
        onChange={handlePageBackgroundUploadChange}
        className="hidden-input"
      />

      <input
        ref={autoStickerInputRef}
        type="file"
        accept="image/png"
        multiple
        onChange={handleAutoStickerUploadChange}
        className="hidden-input"
      />

      <input
        ref={readySheetInputRef}
        type="file"
        accept="image/png"
        multiple
        onChange={handleReadySheetUploadChange}
        className="hidden-input"
      />
    </main>
  );
}

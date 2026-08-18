import { startTransition, useDeferredValue, useRef, useState, type ChangeEvent } from 'react';
import { InfoCard } from '../components/InfoCard';
import { Panel } from '../components/Panel';
import { BuilderWorkflowShell } from '../components/builder/BuilderWorkflowShell';
import { buildWorkflowStepItems, getPreferredPreviewSection, WORKFLOW_STEPS, type BuilderStepId } from '../components/builder/workflowDefinition';
import { AstrologyWorkflowStep } from '../components/builder/steps/AstrologyWorkflowStep';
import { DesignWorkflowStep } from '../components/builder/steps/DesignWorkflowStep';
import { ExportWorkflowStep } from '../components/builder/steps/ExportWorkflowStep';
import { FoundationWorkflowStep } from '../components/builder/steps/FoundationWorkflowStep';
import { PreviewWorkflowStep } from '../components/builder/steps/PreviewWorkflowStep';
import { StickerWorkflowStep } from '../components/builder/steps/StickerWorkflowStep';
import { StructureWorkflowStep } from '../components/builder/steps/StructureWorkflowStep';
import { useBuilderAstrologyActions } from '../components/builder/hooks/useBuilderAstrologyActions';
import { useBuilderDesignActions } from '../components/builder/hooks/useBuilderDesignActions';
import { useBuilderStickerActions } from '../components/builder/hooks/useBuilderStickerActions';
import { getBackgroundTypeLabel, getCurrentBackgroundStyleLabel } from '../components/builder/builderUtils';
import { getModuleById } from '../core/registry/moduleRegistry';
import {
  JYOTISH_AYANAMSA_LABEL,
} from '../lib/astrology/astrologyConfig';
import { createDefaultPlannerConfig } from '../lib/config/defaultPlannerConfig';
import type { PlannerPresetId } from '../lib/config/plannerPresets';
import {
  downloadPlannerConfig,
  downloadUsageGuide,
  exportPlannerPdf,
} from '../lib/export/exportPlannerPdf';
import { buildPlannerPlan } from '../lib/navigation/buildPlannerPlan';
import { parsePlannerConfig, validatePlannerConfig } from '../lib/validators/plannerConfigValidator';
import { usePlannerStore } from '../store/plannerStore';
import type {
  PlannerConfig,
  PlannerSectionConfig,
} from '../types/planner';

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

  const {
    selectedAstrologyCity,
    moonPhaseDataReady,
    moonPhaseYearsLabel,
    moonPhaseFetchedAtLabel,
    moonPhaseStatus,
    moonPhaseMessage,
    astrologyDataReady,
    astrologyCalculatedAtLabel,
    astrologyStatus,
    astrologyMessage,
    updateAstrologyConfig,
    updateAstrologyDisplay,
    handleAstrologyCityChange,
    handleAstrologyCityModeChange,
    handleAstrologyCustomCityChange,
    handleAstrologyLayerToggle,
    refreshAstrologyData,
    refreshMoonPhaseData,
    handleMoonPhaseToggle,
    handleModeChange,
    handleFoundationYearChange,
  } = useBuilderAstrologyActions(config, setField);

  const {
    stickerConfig,
    stickerPageCount,
    autoStickerGroups,
    stickerUploadNotice,
    updateStickerConfig,
    handleStickerCategoryToggle,
    handleAutoStickerUploadClick,
    handleReadySheetUploadClick,
    cleanupObsoleteStickerStorage,
    handleAutoStickerUploadChange,
    handleReadySheetUploadChange,
    handleRemoveAutoSticker,
    handleRemoveReadySheet,
  } = useBuilderStickerActions(config, updateSection, setFeedback, autoStickerInputRef, readySheetInputRef);

  const {
    availableBackgrounds,
    selectedBackground,
    selectedTheme,
    hasCustomBackground,
    hasCustomColorBackground,
    hasCustomGradientBackground,
    hasCustomPhotoBackground,
    coverUploadSizeLabel,
    pageBackgroundUploadSizeLabel,
    colorPickerValue,
    gradientStartValue,
    gradientEndValue,
    gradientAngleValue,
    backgroundOpacityValue,
    handleBackgroundUploadClick,
    handleCoverUploadClick,
    handlePageBackgroundUploadClick,
    handleBackgroundUploadChange,
    handleCoverUploadChange,
    handlePageBackgroundUploadChange,
    handleBackgroundColorChange,
    handleGradientBackgroundChange,
    handleBackgroundOpacityChange,
    handleTabPositionChange,
    handleRemoveCoverImage,
    handleRemovePageBackgroundImage,
  } = useBuilderDesignActions(
    config,
    setField,
    setCustomBackground,
    () => setActiveStep('design'),
    setFeedback,
    backgroundInputRef,
    coverInputRef,
    pageBackgroundInputRef,
  );

  const deferredConfig = useDeferredValue(config);
  const validation = validatePlannerConfig(deferredConfig);
  const plan = buildPlannerPlan(deferredConfig);
  const exportReady = validation.errors.length === 0;
  const exportStatusLabel = exportReady ? 'Готов к экспорту' : `Нужно исправить ${validation.errors.length}`;
  const safeLastSavedAt = Number.isNaN(new Date(lastSavedAt).getTime()) ? new Date().toISOString() : lastSavedAt;
  const saveLabel = new Date(safeLastSavedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const weeklySection = config.sections.find((section) => section.type === 'weekly');
  const dailySection = config.sections.find((section) => section.type === 'daily');
  const notesSection = config.sections.find((section) => section.type === 'notes');
  const checklistSection = config.sections.find((section) => section.type === 'checklist');
  const stickerSection = config.sections.find((section) => section.type === 'stickers');
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

  const preferredPreviewSection = getPreferredPreviewSection(
    activeStep,
    Boolean(weeklySection?.enabled),
    Boolean(dailySection?.enabled),
    config.astrology.display.weekPreset,
  );

  const stepItems = buildWorkflowStepItems({
    config,
    astrologyCityName: selectedAstrologyCity.name,
    moonPhasesEnabled: config.moonPhases.enabled,
    moonPhaseDataReady,
    astrologyDataReady,
    enabledSectionsCount,
    themeName: selectedTheme.name,
    backgroundName: selectedBackground.name,
    layoutEditorEnabled,
    layoutCount,
    stickersEnabled: Boolean(stickerSection?.enabled),
    stickerPageCount,
    pageCount: plan.pages.length,
    tabCount: plan.tabs.length,
    exportStatusLabel,
    exportReady,
    ayanamsaLabel: JYOTISH_AYANAMSA_LABEL,
  });

  function handleSectionCountChange(type: PlannerSectionConfig['type'], value: number) {
    updateSection(type, {
      count: Math.max(1, Math.floor(value || 1)),
    });
  }

  function handlePresetApply(presetId: PlannerPresetId) {
    startTransition(() => {
      applyPreset(presetId);
    });
    setFeedback('Пресет применен. Проверьте структуру и дизайн в следующих шагах.');
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

  function renderActiveStepPanels() {
    if (activeStep === 'foundation') {
      return (
        <FoundationWorkflowStep
          config={config}
          onPresetApply={handlePresetApply}
          onTitleChange={(value) => setField('title', value)}
          onModeChange={handleModeChange}
          onYearChange={handleFoundationYearChange}
        />
      );
    }

    if (activeStep === 'astrology') {
      return (
        <AstrologyWorkflowStep
          config={config}
          selectedAstrologyCity={selectedAstrologyCity}
          astrologyDataReady={astrologyDataReady}
          astrologyCalculatedAtLabel={astrologyCalculatedAtLabel}
          astrologyStatus={astrologyStatus}
          astrologyMessage={astrologyMessage}
          moonPhaseStatus={moonPhaseStatus}
          moonPhaseMessage={moonPhaseMessage}
          moonPhaseDataReady={moonPhaseDataReady}
          moonPhaseYearsLabel={moonPhaseYearsLabel}
          moonPhaseFetchedAtLabel={moonPhaseFetchedAtLabel}
          onCityModeChange={handleAstrologyCityModeChange}
          onCityChange={handleAstrologyCityChange}
          onCustomCityChange={handleAstrologyCustomCityChange}
          onDisplayChange={updateAstrologyDisplay}
          onLayerToggle={handleAstrologyLayerToggle}
          onAstrologyConfigChange={updateAstrologyConfig}
          onRefreshAstrology={() => refreshAstrologyData()}
          onMoonPhaseToggle={handleMoonPhaseToggle}
          onRefreshMoonPhases={() => void refreshMoonPhaseData()}
        />
      );
    }

    if (activeStep === 'structure') {
      return (
        <StructureWorkflowStep
          sections={structureSections}
          stickerSection={stickerSection}
          onToggleSection={toggleSection}
          onMoveSection={moveSection}
          onCountChange={handleSectionCountChange}
        />
      );
    }

    if (activeStep === 'design') {
      return (
        <DesignWorkflowStep
          config={config}
          availableBackgrounds={availableBackgrounds}
          selectedThemeName={selectedTheme.name}
          selectedBackgroundName={selectedBackground.name}
          hasCustomBackground={hasCustomBackground}
          colorPickerValue={colorPickerValue}
          gradientStartValue={gradientStartValue}
          gradientEndValue={gradientEndValue}
          gradientAngleValue={gradientAngleValue}
          backgroundOpacityValue={backgroundOpacityValue}
          currentBackgroundStyleLabel={getCurrentBackgroundStyleLabel({ hasCustomPhotoBackground, hasCustomGradientBackground, hasCustomColorBackground })}
          coverUploadSizeLabel={coverUploadSizeLabel}
          pageBackgroundUploadSizeLabel={pageBackgroundUploadSizeLabel}
          tabCount={plan.tabs.length}
          getBackgroundTypeLabel={getBackgroundTypeLabel}
          onThemeSelect={setTheme}
          onBackgroundSelect={setBackground}
          onClearCustomBackground={clearCustomBackground}
          onBackgroundColorChange={handleBackgroundColorChange}
          onGradientBackgroundChange={handleGradientBackgroundChange}
          onBackgroundOpacityChange={handleBackgroundOpacityChange}
          onBackgroundUpload={handleBackgroundUploadClick}
          onTabPositionChange={handleTabPositionChange}
          onCoverUpload={handleCoverUploadClick}
          onRemoveCover={handleRemoveCoverImage}
          onPageBackgroundUpload={handlePageBackgroundUploadClick}
          onRemovePageBackground={handleRemovePageBackgroundImage}
        />
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
        <StickerWorkflowStep
          stickerConfig={stickerConfig}
          stickerPageCount={stickerPageCount}
          autoStickerGroups={autoStickerGroups}
          stickerUploadNotice={stickerUploadNotice}
          onUpdateConfig={updateStickerConfig}
          onToggleCategory={handleStickerCategoryToggle}
          onUploadCategory={handleAutoStickerUploadClick}
          onUploadReadySheet={handleReadySheetUploadClick}
          onRemoveAutoSticker={(assetId) => void handleRemoveAutoSticker(assetId)}
          onRemoveReadySheet={(sheetId) => void handleRemoveReadySheet(sheetId)}
        />
      );
    }

    if (activeStep === 'preview') {
      return (
        <PreviewWorkflowStep
          pageCount={plan.pages.length}
          tabCount={plan.tabs.length}
          linkCount={plan.links.length}
          errors={validation.errors}
          warnings={validation.warnings}
          onGoToExport={() => setActiveStep('export')}
        />
      );
    }

    return (
      <ExportWorkflowStep
        isExporting={isExporting}
        exportReady={exportReady}
        themeName={selectedTheme.name}
        backgroundName={selectedBackground.name}
        hasCoverImage={Boolean(config.coverImage)}
        hasPageBackgroundImage={Boolean(config.pageBackgroundImage)}
        dailyPagesLabel={dailySection?.enabled ? `${dailySection.count} шт.` : 'Выключены'}
        errors={validation.errors}
        warnings={validation.warnings}
        onPdfExport={() => void handlePdfExport()}
        onConfigExport={handleConfigExport}
        onGuideExport={handleGuideExport}
        onImport={handleImportClick}
        onReset={() => void handleResetConfig()}
      />
    );
  }

  return (
    <BuilderWorkflowShell
      config={config}
      deferredConfig={deferredConfig}
      plan={plan}
      validation={validation}
      activeStep={activeStep}
      currentStepIndex={currentStepIndex}
      currentStep={currentStep}
      previousStep={previousStep}
      nextStep={nextStep}
      stepItems={stepItems}
      exportStatusLabel={exportStatusLabel}
      saveLabel={saveLabel}
      feedback={feedback}
      isExporting={isExporting}
      exportReady={exportReady}
      preferredPreviewSection={preferredPreviewSection}
      stepContent={renderActiveStepPanels()}
      onStepChange={setActiveStep}
      onThemeChange={setTheme}
      onModeChange={handleModeChange}
      onPdfExport={() => void handlePdfExport()}
      onReset={() => void handleResetConfig()}
      onFooterPrimaryAction={handleFooterPrimaryAction}
      fileInputRef={fileInputRef}
      backgroundInputRef={backgroundInputRef}
      coverInputRef={coverInputRef}
      pageBackgroundInputRef={pageBackgroundInputRef}
      autoStickerInputRef={autoStickerInputRef}
      readySheetInputRef={readySheetInputRef}
      onImportChange={handleImportChange}
      onBackgroundUploadChange={handleBackgroundUploadChange}
      onCoverUploadChange={handleCoverUploadChange}
      onPageBackgroundUploadChange={handlePageBackgroundUploadChange}
      onAutoStickerUploadChange={handleAutoStickerUploadChange}
      onReadySheetUploadChange={handleReadySheetUploadChange}
    />
  );
}

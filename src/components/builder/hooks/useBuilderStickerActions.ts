import { useState, type ChangeEvent, type RefObject } from 'react';
import { openFilePicker } from '../builderUtils';
import { removeStickerAssetBlobs } from '../../../lib/stickers/stickerAssetStorage';
import {
  buildAutoStickerPageGroups,
  getStickerGeneratedPageCount,
  getStickerModuleConfig,
  getStickerStorageIds,
  patchStickerModuleConfig,
} from '../../../lib/stickers/stickerModuleConfig';
import { getStickerCategoryMeta, STICKER_CATEGORY_ORDER } from '../../../lib/stickers/stickerCatalog';
import { createAutoStickerAsset, createReadyStickerSheet } from '../../../lib/stickers/uploadStickerAssets';
import type {
  PlannerConfig,
  PlannerSectionConfig,
  PlannerSectionType,
  StickerCategory,
  StickerModuleConfig,
} from '../../../types/planner';

type UpdateSection = (type: PlannerSectionType, patch: Partial<PlannerSectionConfig>) => void;
type SetFeedback = (message: string | null) => void;
type StickerUploadNoticeScope = StickerCategory | 'ready-sheet';

export interface StickerUploadNotice {
  scope: StickerUploadNoticeScope;
  tone: 'success' | 'error';
  message: string;
}

export function useBuilderStickerActions(
  config: PlannerConfig,
  updateSection: UpdateSection,
  setFeedback: SetFeedback,
  autoStickerInputRef: RefObject<HTMLInputElement | null>,
  readySheetInputRef: RefObject<HTMLInputElement | null>,
) {
  const [pendingStickerCategory, setPendingStickerCategory] = useState<StickerCategory>('functional');
  const [stickerUploadNotice, setStickerUploadNotice] = useState<StickerUploadNotice | null>(null);
  const stickerConfig = getStickerModuleConfig(config);
  const stickerPageCount = getStickerGeneratedPageCount(stickerConfig);
  const autoStickerGroups = buildAutoStickerPageGroups(stickerConfig);

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

    updateStickerConfig({ categories: nextCategories.length > 0 ? nextCategories : [category] });
  }

  function handleAutoStickerUploadClick(category: StickerCategory) {
    setPendingStickerCategory(category);
    openFilePicker(autoStickerInputRef.current);
  }

  function handleReadySheetUploadClick() {
    openFilePicker(readySheetInputRef.current);
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

  async function handleAutoStickerUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const createdAssets: Awaited<ReturnType<typeof createAutoStickerAsset>>[] = [];
    if (files.length === 0) return;

    try {
      for (const file of files) {
        createdAssets.push(await createAutoStickerAsset(file, pendingStickerCategory, stickerConfig.backgroundMode));
      }
      updateStickerConfig({ sourceMode: 'auto-png-pack', autoPngs: [...(stickerConfig.autoPngs ?? []), ...createdAssets] });
      const message = `Добавлено ${createdAssets.length} PNG в категорию "${getStickerCategoryMeta(pendingStickerCategory).label}".`;
      setStickerUploadNotice({ scope: pendingStickerCategory, tone: 'success', message });
      setFeedback(message);
    } catch (error) {
      if (createdAssets.length > 0) await removeStickerAssetBlobs(createdAssets.map((item) => item.storageId));
      const message = error instanceof Error ? error.message : 'Не удалось загрузить sticker PNG.';
      setStickerUploadNotice({ scope: pendingStickerCategory, tone: 'error', message });
      setFeedback(message);
    } finally {
      event.target.value = '';
    }
  }

  async function handleReadySheetUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const createdSheets: Awaited<ReturnType<typeof createReadyStickerSheet>>[] = [];
    if (files.length === 0) return;

    try {
      for (const file of files) createdSheets.push(await createReadyStickerSheet(file));
      updateStickerConfig({ sourceMode: 'ready-sheet', readySheets: [...(stickerConfig.readySheets ?? []), ...createdSheets] });
      const message = `Добавлено ${createdSheets.length} страниц готовых листов.`;
      setStickerUploadNotice({ scope: 'ready-sheet', tone: 'success', message });
      setFeedback(message);
    } catch (error) {
      if (createdSheets.length > 0) await removeStickerAssetBlobs(createdSheets.map((item) => item.storageId));
      const message = error instanceof Error ? error.message : 'Не удалось загрузить PNG готового листа.';
      setStickerUploadNotice({ scope: 'ready-sheet', tone: 'error', message });
      setFeedback(message);
    } finally {
      event.target.value = '';
    }
  }

  async function handleRemoveAutoSticker(assetId: string) {
    const asset = (stickerConfig.autoPngs ?? []).find((item) => item.id === assetId);
    if (!asset) return;
    await removeStickerAssetBlobs([asset.storageId]);
    clearStickerUploadNotice(asset.category);
    updateStickerConfig({ autoPngs: (stickerConfig.autoPngs ?? []).filter((item) => item.id !== assetId) });
  }

  async function handleRemoveReadySheet(sheetId: string) {
    const sheet = (stickerConfig.readySheets ?? []).find((item) => item.id === sheetId);
    if (!sheet) return;
    await removeStickerAssetBlobs([sheet.storageId]);
    clearStickerUploadNotice('ready-sheet');
    updateStickerConfig({ readySheets: (stickerConfig.readySheets ?? []).filter((item) => item.id !== sheetId) });
  }

  return {
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
  };
}

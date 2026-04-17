import type { PlannerModuleManifest } from '../../core/registry/plannerModule';

export const notesManifest: PlannerModuleManifest = {
  id: 'notes',
  title: 'Заметки',
  description: 'Свободные страницы для заметок, идей, мозговых карт и набросков.',
  version: '1.0.0',
  sectionType: 'notes',
  enabledByDefault: true,
};

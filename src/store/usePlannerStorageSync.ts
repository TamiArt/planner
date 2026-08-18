import { useEffect } from 'react';
import { usePlannerStore } from './plannerStore';

export const PLANNER_STORAGE_KEY = 'planner-builder-config';

export function isPlannerStorageKey(key: string | null) {
  return key === PLANNER_STORAGE_KEY;
}

export function usePlannerStorageSync() {
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.storageArea !== window.localStorage || !isPlannerStorageKey(event.key)) {
        return;
      }

      void usePlannerStore.persist.rehydrate();
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
}

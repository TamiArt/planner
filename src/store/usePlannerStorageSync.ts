import { useEffect } from 'react';
import { usePlannerStore } from './plannerStore';

const PLANNER_STORAGE_KEY = 'planner-builder-config';

export function usePlannerStorageSync() {
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.storageArea !== window.localStorage || event.key !== PLANNER_STORAGE_KEY) {
        return;
      }

      void usePlannerStore.persist.rehydrate();
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
}

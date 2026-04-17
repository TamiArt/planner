const DB_NAME = 'planner-builder-assets';
const DB_VERSION = 1;
const STORE_NAME = 'sticker-assets';

interface StoredStickerAssetRecord {
  storageId: string;
  blob: Blob;
  mimeType: string;
  updatedAt: string;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error('Не удалось открыть локальное хранилище sticker assets.'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'storageId' });
      }
    };
  });
}

async function withStore<T>(mode: IDBTransactionMode, handler: (store: IDBObjectStore) => void | Promise<T>) {
  const database = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let handlerResult: T | undefined;
    let hasHandlerResult = false;
    let isSettled = false;

    transaction.oncomplete = () => {
      if (!isSettled) {
        resolve(hasHandlerResult ? (handlerResult as T) : (undefined as T));
      }
      database.close();
    };

    transaction.onerror = () => {
      if (!isSettled) {
        isSettled = true;
        reject(transaction.error ?? new Error('Ошибка при работе с локальным sticker storage.'));
      }
      database.close();
    };

    transaction.onabort = () => {
      if (!isSettled) {
        isSettled = true;
        reject(transaction.error ?? new Error('Транзакция sticker storage была прервана.'));
      }
      database.close();
    };

    Promise.resolve(handler(store))
      .then((result) => {
        handlerResult = result as T;
        hasHandlerResult = true;
      })
      .catch((error) => {
        if (!isSettled) {
          isSettled = true;
          reject(error);
        }

        try {
          transaction.abort();
        } catch {
          database.close();
        }
      });
  });
}

export async function saveStickerAssetBlob(storageId: string, blob: Blob) {
  await withStore('readwrite', (store) => {
    const record: StoredStickerAssetRecord = {
      storageId,
      blob,
      mimeType: blob.type,
      updatedAt: new Date().toISOString(),
    };
    store.put(record);
  });
}

export async function getStickerAssetBlob(storageId: string) {
  return withStore<Blob | undefined>('readonly', (store) => (
    new Promise<Blob | undefined>((resolve, reject) => {
      const request = store.get(storageId);
      request.onerror = () => reject(new Error('Не удалось прочитать sticker asset из локального хранилища.'));
      request.onsuccess = () => {
        const result = request.result as StoredStickerAssetRecord | undefined;
        resolve(result?.blob);
      };
    })
  ));
}

export async function removeStickerAssetBlob(storageId: string) {
  await withStore('readwrite', (store) => {
    store.delete(storageId);
  });
}

export async function removeStickerAssetBlobs(storageIds: string[]) {
  await Promise.all(storageIds.map((storageId) => removeStickerAssetBlob(storageId)));
}

import { StateStorage } from 'zustand/middleware';

const DB_NAME = 'medlens-db';
const STORE_NAME = 'medlens-store';
const KEY_NAME = 'medlens-storage';

export const createIndexedDBStorage = (): StateStorage => {
    let dbPromise: Promise<IDBDatabase> | null = null;

    const getDB = (): Promise<IDBDatabase> => {
        if (dbPromise) return dbPromise;

        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };

            request.onsuccess = (event) => {
                resolve((event.target as IDBOpenDBRequest).result);
            };

            request.onerror = (event) => {
                reject((event.target as IDBOpenDBRequest).error);
            };
        });

        return dbPromise;
    };

    return {
        getItem: async (name: string): Promise<string | null> => {
            try {
                const db = await getDB();
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(STORE_NAME, 'readonly');
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.get(name);

                    request.onsuccess = () => {
                        resolve(request.result as string || null);
                    };

                    request.onerror = () => {
                        reject(request.error);
                    };
                });
            } catch (error) {
                console.error('Error getting item from IndexedDB:', error);
                return null;
            }
        },

        setItem: async (name: string, value: string): Promise<void> => {
            try {
                const db = await getDB();
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(STORE_NAME, 'readwrite');
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.put(value, name);

                    request.onsuccess = () => {
                        resolve();
                    };

                    request.onerror = () => {
                        reject(request.error);
                    };
                });
            } catch (error) {
                console.error('Error setting item in IndexedDB:', error);
                throw error;
            }
        },

        removeItem: async (name: string): Promise<void> => {
            try {
                const db = await getDB();
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(STORE_NAME, 'readwrite');
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.delete(name);

                    request.onsuccess = () => {
                        resolve();
                    };

                    request.onerror = () => {
                        reject(request.error);
                    };
                });
            } catch (error) {
                console.error('Error removing item from IndexedDB:', error);
            }
        },
    };
};

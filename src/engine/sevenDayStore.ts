export type GuardCategory = 'ua' | 'phone' | 'addr' | 'gmail';

const DB_NAME = 'AgentSpec7DayHistory';
const STORE_NAME = 'issued';
const DB_VERSION = 1;
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Fast dual-32bit hash (FNV-1a + DJB2) -> compact 16-char base36 key
export function hashItemKey(category: GuardCategory, value: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 5381;
  for (let i = 0; i < value.length; i++) {
    const ch = value.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 = Math.imul(h2, 33) ^ ch;
  }
  return `${category}:${(h1 >>> 0).toString(36)}_${(h2 >>> 0).toString(36)}`;
}

class SevenDayStore {
  private memorySet = new Set<string>();
  private counts: Record<GuardCategory, number> = {
    ua: 0,
    phone: 0,
    addr: 0,
    gmail: 0,
  };
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private initialized = false;
  private listeners = new Set<() => void>();

  private openDb(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        try {
          const req = indexedDB.open(DB_NAME, DB_VERSION);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
              store.createIndex('expiresAt', 'expiresAt', { unique: false });
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }
    return this.dbPromise;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    const db = await this.openDb();
    if (!db) return;

    const now = Date.now();
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) return;
          const record = cursor.value as { id: string; expiresAt: number };
          if (record.expiresAt <= now) {
            cursor.delete();
          } else {
            this.memorySet.add(record.id);
            const cat = record.id.split(':')[0] as GuardCategory;
            if (cat in this.counts) this.counts[cat]++;
          }
          cursor.continue();
        };
        tx.oncomplete = () => {
          this.notify();
          resolve();
        };
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  has(category: GuardCategory, value: string): boolean {
    return this.memorySet.has(hashItemKey(category, value));
  }

  hasKey(key: string): boolean {
    return this.memorySet.has(key);
  }

  async recordBatch(entries: Array<{ category: GuardCategory; value: string }>): Promise<void> {
    if (entries.length === 0) return;
    const expiresAt = Date.now() + SEVEN_DAYS_MS;
    const newKeys: string[] = [];

    for (let i = 0; i < entries.length; i++) {
      const { category, value } = entries[i];
      const key = hashItemKey(category, value);
      if (!this.memorySet.has(key)) {
        this.memorySet.add(key);
        this.counts[category]++;
        newKeys.push(key);
      }
    }

    this.notify();
    if (newKeys.length === 0) return;

    const db = await this.openDb();
    if (!db) return;

    // Persist in chunks to keep IndexedDB transactions fast
    const CHUNK = 5000;
    for (let i = 0; i < newKeys.length; i += CHUNK) {
      const slice = newKeys.slice(i, i + CHUNK);
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          for (let j = 0; j < slice.length; j++) {
            store.put({ id: slice[j], expiresAt });
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
  }

  async clearAll(): Promise<void> {
    this.memorySet.clear();
    this.counts = { ua: 0, phone: 0, addr: 0, gmail: 0 };
    this.notify();
    const db = await this.openDb();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  getCounts(): Record<GuardCategory, number> {
    return { ...this.counts };
  }

  getTotalCount(): number {
    return this.memorySet.size;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    for (const fn of this.listeners) fn();
  }
}

export const sevenDayStore = new SevenDayStore();

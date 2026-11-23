import type { MurdokuCase } from '../engine/types';

const DAILY_DB_NAME = 'murdoku_daily_library_v1';
const DAILY_STORE_NAME = 'daily_cases';
const DAILY_LS_KEY = 'murdoku_daily_library_v1';

function getCanonicalDailyDate(c: MurdokuCase): string | null {
  if (typeof c.date === 'string' && c.date.trim().length > 0) {
    return c.date.trim();
  }
  if (typeof c.id === 'string' && c.id.startsWith('daily-')) {
    const extracted = c.id.slice('daily-'.length).trim();
    if (extracted.length > 0) return extracted;
  }
  return null;
}

/**
 * Pure merge of locally archived daily cases and server-returned daily cases.
 *
 * Guarantees:
 * - Previously saved days are NEVER dropped when a new day starts or when
 *   an ephemeral server returns only today's case.
 * - If both local and remote contain the same date, the remote copy wins
 *   (so server-side Gemini or integrity repairs update cleanly).
 * - Cases are numbered sequentially from oldest (#1) to newest (#N) with
 *   matching book page numbers, then returned newest-first for the TOC.
 */
export function mergeDailyCases(
  localCases: MurdokuCase[],
  remoteCases: MurdokuCase[]
): MurdokuCase[] {
  const byDate = new Map<string, MurdokuCase>();

  for (const c of localCases) {
    const key = getCanonicalDailyDate(c);
    if (!key) continue;
    byDate.set(key, { ...c, date: key, volume: 'daily' });
  }

  for (const c of remoteCases) {
    const key = getCanonicalDailyDate(c);
    if (!key) continue;
    byDate.set(key, { ...c, date: key, volume: 'daily' });
  }

  // Chronological oldest -> newest for stable sequential numbering (#1 = first day)
  const chronological = Array.from(byDate.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([, murdokuCase], idx): MurdokuCase => {
      const num = idx + 1;
      return {
        ...murdokuCase,
        volume: 'daily',
        number: num,
        pageLeft: 100 + num * 2,
        pageRight: 101 + num * 2,
      };
    });

  // Newest first so dailyCases[0] is today / most recent
  return chronological.reverse();
}

function openDailyDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DAILY_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DAILY_STORE_NAME)) {
          db.createObjectStore(DAILY_STORE_NAME, { keyPath: 'date' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function readFromLocalStorage(): MurdokuCase[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DAILY_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MurdokuCase[]) : [];
  } catch {
    return [];
  }
}

function writeToLocalStorage(cases: MurdokuCase[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DAILY_LS_KEY, JSON.stringify(cases));
  } catch {
    // If localStorage hits quota after hundreds of days, keep a rolling recent mirror
    // while IndexedDB holds the complete unbounded archive.
    try {
      localStorage.setItem(DAILY_LS_KEY, JSON.stringify(cases.slice(0, 45)));
    } catch {
      // ignore storage quota errors
    }
  }
}

/**
 * Fast synchronous hydration from localStorage mirror for instant initial UI.
 */
export function loadCachedDailyCasesSync(): MurdokuCase[] {
  const lsCases = readFromLocalStorage();
  return lsCases.length > 0 ? mergeDailyCases(lsCases, []) : [];
}

/**
 * Loads all locally persisted daily cases from IndexedDB + localStorage mirror.
 */
export async function loadSavedDailyCases(): Promise<MurdokuCase[]> {
  const lsCases = readFromLocalStorage();
  const db = await openDailyDb();
  if (!db) {
    return mergeDailyCases(lsCases, []);
  }

  const idbCases = await new Promise<MurdokuCase[]>((resolve) => {
    try {
      const tx = db.transaction(DAILY_STORE_NAME, 'readonly');
      const req = tx.objectStore(DAILY_STORE_NAME).getAll();
      req.onsuccess = () => {
        const res = req.result;
        resolve(Array.isArray(res) ? (res as MurdokuCase[]) : []);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });

  // Merge both sources so neither IndexedDB nor localStorage data is ever lost
  return mergeDailyCases(lsCases, idbCases);
}

/**
 * Persists all merged daily cases into IndexedDB (unbounded) and localStorage (fast mirror).
 */
export async function saveDailyCasesToLibrary(cases: MurdokuCase[]): Promise<void> {
  if (cases.length === 0) return;

  writeToLocalStorage(cases);

  const db = await openDailyDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(DAILY_STORE_NAME, 'readwrite');
      const store = tx.objectStore(DAILY_STORE_NAME);
      for (const c of cases) {
        const dateKey = getCanonicalDailyDate(c);
        if (!dateKey) continue;
        store.put({ ...c, date: dateKey, volume: 'daily' });
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export type InkTool = 'pencil' | 'pen' | 'highlighter' | 'eraser';

export interface InkPoint {
  x: number; // normalized 0..1 relative to page width
  y: number; // normalized 0..1 relative to page height
  p: number; // pressure 0.1..1.0
  t?: number; // optional stylus tilt magnitude 0..1
}

export interface InkStroke {
  id: string;
  page: 'left' | 'right';
  tool: Exclude<InkTool, 'eraser'>;
  color: string;
  size: number;
  points: InkPoint[];
}

export interface SavedVerdictRecord {
  murdererId: string;
  twistAnswer?: string;
  swapPair?: string[];
}

export interface CaseProgressState {
  caseId: string;
  strokes: InkStroke[];
  /** Tap Assist marks keyed by "r,c" -> 'X' or suspect initial 'A'..'V' */
  tapMarks: Record<string, string>;
  /** Selected missing map patch id if Book 3 Missing Piece twist */
  selectedPatchId?: 'A' | 'B' | 'C' | 'D';
  /** Number of Back-of-Book progressive hints revealed */
  revealedHints: number;
  /** Whether the player has correctly solved the case */
  solved: boolean;
  /** Timestamp (ms) when the player first solved this case */
  solvedAt?: number;
  /** How many hints had been revealed when the player solved the case */
  hintsUsedAtSolve?: number;
  /** Number of wrong verdict checks before solving */
  wrongAttempts?: number;
  /** Last verified winning verdict so the player can review how they answered */
  savedVerdict?: SavedVerdictRecord;
  updatedAt: number;
}

export interface CaseProgressSummary {
  caseId: string;
  solved: boolean;
  solvedAt?: number;
  hintsUsedAtSolve?: number;
  revealedHints: number;
  wrongAttempts: number;
  strokeCount: number;
  stampCount: number;
  hasWork: boolean;
  updatedAt: number;
}

const DB_NAME = 'murdoku_book_v2';
const STORE_NAME = 'case_progress';
const PROGRESS_INDEX_KEY = 'murdoku_progress_index_v1';
const MAX_LS_PROG_CHARS = 220_000;

let dbPromise: Promise<IDBDatabase | null> | null = null;
let persistRequested = false;

export function requestPersistentDeviceStorage(): void {
  if (persistRequested) return;
  persistRequested = true;
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }
  } catch {
    // ignore unsupported environments
  }
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'caseId' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onclose = () => {
          dbPromise = null;
        };
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        dbPromise = null;
        resolve(null);
      };
    } catch {
      dbPromise = null;
      resolve(null);
    }
  });

  return dbPromise;
}

export function createEmptyProgress(caseId: string): CaseProgressState {
  return {
    caseId,
    strokes: [],
    tapMarks: {},
    revealedHints: 0,
    solved: false,
    wrongAttempts: 0,
    updatedAt: 0,
  };
}

export function summarizeProgress(state: CaseProgressState): CaseProgressSummary {
  const strokeCount = Array.isArray(state.strokes) ? state.strokes.length : 0;
  const stampCount = state.tapMarks ? Object.keys(state.tapMarks).length : 0;
  const revealedHints = state.revealedHints ?? 0;
  const wrongAttempts = state.wrongAttempts ?? 0;
  const hasWork =
    strokeCount > 0 ||
    stampCount > 0 ||
    revealedHints > 0 ||
    Boolean(state.selectedPatchId) ||
    state.solved;

  return {
    caseId: state.caseId,
    solved: Boolean(state.solved),
    solvedAt: state.solvedAt,
    hintsUsedAtSolve: state.hintsUsedAtSolve,
    revealedHints,
    wrongAttempts,
    strokeCount,
    stampCount,
    hasWork,
    updatedAt: state.updatedAt || 0,
  };
}

export function mergeProgressStates(
  a: CaseProgressState,
  b: CaseProgressState
): CaseProgressState {
  const newer = (b.updatedAt ?? 0) >= (a.updatedAt ?? 0) ? b : a;
  const older = newer === b ? a : b;

  const solved = Boolean(a.solved || b.solved);
  const solvedAt =
    a.solvedAt && b.solvedAt
      ? Math.min(a.solvedAt, b.solvedAt)
      : a.solvedAt ?? b.solvedAt;
  const hintsUsedAtSolve =
    newer.hintsUsedAtSolve ?? older.hintsUsedAtSolve;

  return {
    ...newer,
    solved,
    solvedAt,
    hintsUsedAtSolve,
    revealedHints: Math.max(a.revealedHints ?? 0, b.revealedHints ?? 0),
    wrongAttempts: Math.max(a.wrongAttempts ?? 0, b.wrongAttempts ?? 0),
    savedVerdict: newer.savedVerdict ?? older.savedVerdict,
    updatedAt: Math.max(a.updatedAt ?? 0, b.updatedAt ?? 0),
  };
}

function readProgressIndexFromLs(): Record<string, CaseProgressSummary> {
  if (typeof localStorage === 'undefined') return {};
  const map: Record<string, CaseProgressSummary> = {};
  try {
    const raw = localStorage.getItem(PROGRESS_INDEX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, CaseProgressSummary>;
      if (parsed && typeof parsed === 'object') {
        for (const [k, v] of Object.entries(parsed)) {
          if (v && typeof v === 'object' && v.caseId) {
            map[k] = v;
          }
        }
      }
    }
    // Backwards-compatible hydration of legacy murdoku_solved_* keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('murdoku_solved_') && localStorage.getItem(key) === '1') {
        const cid = key.replace('murdoku_solved_', '');
        if (!map[cid]) {
          map[cid] = {
            caseId: cid,
            solved: true,
            revealedHints: 0,
            wrongAttempts: 0,
            strokeCount: 0,
            stampCount: 0,
            hasWork: true,
            updatedAt: 0,
          };
        } else if (!map[cid].solved) {
          map[cid] = { ...map[cid], solved: true, hasWork: true };
        }
      }
    }
  } catch {
    // ignore storage errors
  }
  return map;
}

function writeProgressIndexToLs(map: Record<string, CaseProgressSummary>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PROGRESS_INDEX_KEY, JSON.stringify(map));
  } catch {
    // ignore quota errors
  }
}

function updateSummaryIndexEntry(state: CaseProgressState): void {
  const summary = summarizeProgress(state);
  const index = readProgressIndexFromLs();
  const prev = index[state.caseId];
  index[state.caseId] = {
    ...summary,
    solved: Boolean(prev?.solved || summary.solved),
    solvedAt: prev?.solvedAt ?? summary.solvedAt,
    hintsUsedAtSolve: summary.hintsUsedAtSolve ?? prev?.hintsUsedAtSolve,
    hasWork: Boolean(prev?.solved || summary.hasWork),
  };
  writeProgressIndexToLs(index);
}

/**
 * Synchronously loads the lightweight progress summary map for instant TOC/Cover rendering.
 */
export function loadProgressIndexSync(): Record<string, CaseProgressSummary> {
  return readProgressIndexFromLs();
}

/**
 * Hydrates and reconciles all saved progress records from IndexedDB into the summary map,
 * ensuring any older IndexedDB strokes or solved cases are always visible in the TOC.
 */
export async function loadAllProgressSummaries(): Promise<Record<string, CaseProgressSummary>> {
  const index = readProgressIndexFromLs();
  const db = await openDb();
  if (!db) return index;

  const allRecords = await new Promise<CaseProgressState[]>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        resolve(Array.isArray(req.result) ? (req.result as CaseProgressState[]) : []);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });

  let changed = false;
  for (const rec of allRecords) {
    if (!rec || !rec.caseId) continue;
    const idbSummary = summarizeProgress(rec);
    const existing = index[rec.caseId];
    if (!existing || idbSummary.updatedAt >= existing.updatedAt) {
      index[rec.caseId] = {
        ...idbSummary,
        solved: Boolean(existing?.solved || idbSummary.solved),
        solvedAt: existing?.solvedAt ?? idbSummary.solvedAt,
        hintsUsedAtSolve: idbSummary.hintsUsedAtSolve ?? existing?.hintsUsedAtSolve,
        hasWork: Boolean(existing?.solved || idbSummary.hasWork),
      };
      changed = true;
    } else if (idbSummary.solved && !existing.solved) {
      index[rec.caseId] = {
        ...existing,
        solved: true,
        solvedAt: existing.solvedAt ?? idbSummary.solvedAt,
        hintsUsedAtSolve: existing.hintsUsedAtSolve ?? idbSummary.hintsUsedAtSolve,
        hasWork: true,
      };
      changed = true;
    }
  }

  if (changed) {
    writeProgressIndexToLs(index);
  }
  return index;
}

/**
 * Synchronously reads the localStorage mirror for a single case so reopening a case
 * displays handwritten notes & stamps immediately on frame 1 without a blank flash.
 */
export function loadCaseProgressSync(caseId: string): CaseProgressState | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`murdoku_prog_${caseId}`);
    if (raw) {
      return JSON.parse(raw) as CaseProgressState;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function loadCaseProgress(caseId: string): Promise<CaseProgressState> {
  const lsCopy = loadCaseProgressSync(caseId);
  let idbCopy: CaseProgressState | null = null;

  const db = await openDb();
  if (db) {
    idbCopy = await new Promise<CaseProgressState | null>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(caseId);
        req.onsuccess = () => resolve((req.result as CaseProgressState) ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  let resolved: CaseProgressState;
  if (lsCopy && idbCopy) {
    resolved = mergeProgressStates(lsCopy, idbCopy);
  } else if (idbCopy) {
    resolved = idbCopy;
  } else if (lsCopy) {
    resolved = lsCopy;
  } else {
    resolved = createEmptyProgress(caseId);
    // Preserve legacy solved flag if present
    try {
      if (
        typeof localStorage !== 'undefined' &&
        localStorage.getItem(`murdoku_solved_${caseId}`) === '1'
      ) {
        resolved.solved = true;
      }
    } catch {
      // ignore
    }
  }

  return resolved;
}

/**
 * Persists case progress synchronously to the lightweight localStorage index & mirror
 * (survives sudden PWA swipe-close / pagehide), and writes the full unbounded record
 * (including large Apple Pencil drawings) to IndexedDB.
 */
export async function saveCaseProgress(state: CaseProgressState): Promise<void> {
  const payload: CaseProgressState = { ...state, updatedAt: Date.now() };

  // 1. Immediate synchronous persistence to localStorage (immune to tab-close / timer cancellation)
  try {
    if (typeof localStorage !== 'undefined') {
      if (payload.solved) {
        localStorage.setItem(`murdoku_solved_${state.caseId}`, '1');
      }
      updateSummaryIndexEntry(payload);

      const serialized = JSON.stringify(payload);
      if (serialized.length <= MAX_LS_PROG_CHARS) {
        localStorage.setItem(`murdoku_prog_${state.caseId}`, serialized);
      }
    }
  } catch {
    // ignore localStorage quota errors; IndexedDB below handles large stroke payloads
  }

  // 2. Full unbounded persistence in IndexedDB
  const db = await openDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(payload);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

export function loadSolvedCaseIds(): Set<string> {
  const solved = new Set<string>();
  const index = readProgressIndexFromLs();
  for (const [cid, summary] of Object.entries(index)) {
    if (summary.solved) solved.add(cid);
  }
  return solved;
}

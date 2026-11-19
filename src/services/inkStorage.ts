export type InkTool = 'pencil' | 'pen' | 'highlighter' | 'eraser';

export interface InkPoint {
  x: number; // normalized 0..1 relative to page width
  y: number; // normalized 0..1 relative to page height
  p: number; // pressure 0.1..1.0
}

export interface InkStroke {
  id: string;
  page: 'left' | 'right';
  tool: Exclude<InkTool, 'eraser'>;
  color: string;
  size: number;
  points: InkPoint[];
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
  updatedAt: number;
}

const DB_NAME = 'murdoku_book_v2';
const STORE_NAME = 'case_progress';

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'caseId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function createEmptyProgress(caseId: string): CaseProgressState {
  return {
    caseId,
    strokes: [],
    tapMarks: {},
    revealedHints: 0,
    solved: false,
    updatedAt: Date.now(),
  };
}

export async function loadCaseProgress(caseId: string): Promise<CaseProgressState> {
  const db = await openDb();
  if (db) {
    const found = await new Promise<CaseProgressState | null>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(caseId);
        req.onsuccess = () => resolve((req.result as CaseProgressState) ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    if (found) return found;
  }

  try {
    const raw = localStorage.getItem(`murdoku_prog_${caseId}`);
    if (raw) return JSON.parse(raw) as CaseProgressState;
  } catch {
    // ignore storage quota errors
  }

  return createEmptyProgress(caseId);
}

export async function saveCaseProgress(state: CaseProgressState): Promise<void> {
  const payload: CaseProgressState = { ...state, updatedAt: Date.now() };
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

  // Also persist lightweight solved flag + fallback in localStorage
  try {
    localStorage.setItem(`murdoku_solved_${state.caseId}`, state.solved ? '1' : '0');
    if (!db) {
      localStorage.setItem(`murdoku_prog_${state.caseId}`, JSON.stringify(payload));
    }
  } catch {
    // ignore
  }
}

export function loadSolvedCaseIds(): Set<string> {
  const solved = new Set<string>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('murdoku_solved_') && localStorage.getItem(k) === '1') {
        solved.add(k.replace('murdoku_solved_', ''));
      }
    }
  } catch {
    // ignore
  }
  return solved;
}

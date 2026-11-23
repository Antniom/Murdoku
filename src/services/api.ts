import type { MurdokuCase } from '../engine/types';
import { generateVerifiedCase, getDailyScheduleForDate } from '../engine/generator';
import { FALLBACK_THEMES } from '../data/themes';
import { hashSeed } from '../engine/prng';
import {
  loadCachedDailyCasesSync,
  loadSavedDailyCases,
  mergeDailyCases,
  saveDailyCasesToLibrary,
} from './dailyLibrary';

export { loadCachedDailyCasesSync };

export interface DailyArchiveResponse {
  today: string;
  cases: MurdokuCase[];
}

function getLocalTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Generates an instant client-side fallback daily case ONLY when the backend /api/*
 * isn't running (e.g. standalone `vite dev` without Vercel serverless functions) or offline.
 */
function buildLocalDailyFallback(dateStr: string): MurdokuCase {
  const sched = getDailyScheduleForDate(dateStr);
  const brief = FALLBACK_THEMES[hashSeed(dateStr) % FALLBACK_THEMES.length];
  return generateVerifiedCase({
    id: `daily-${dateStr}`,
    number: 1,
    pageLeft: 102,
    pageRight: 103,
    volume: 'daily',
    date: dateStr,
    seed: `daily-${dateStr}`,
    rows: sched.rows,
    cols: sched.cols,
    difficulty: sched.difficulty,
    twistKind: sched.twistKind,
    allowIrregularVoid: sched.allowIrregularVoid,
    brief,
    generatedBy: 'fallback',
  });
}

export async function fetchDailyArchive(): Promise<DailyArchiveResponse> {
  const localToday = getLocalTodayString();
  const savedLocalCases = await loadSavedDailyCases();

  let serverToday = localToday;
  let remoteCases: MurdokuCase[] = [];

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);
    const res = await fetch('/api/archive', {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    window.clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as DailyArchiveResponse;
    if (typeof data.today === 'string' && data.today.length >= 10) {
      serverToday = data.today;
    }
    if (Array.isArray(data.cases) && data.cases.length > 0) {
      remoteCases = data.cases;
    }
  } catch {
    // Offline, timeout, or plain `vite dev` fallback
  }

  let merged = mergeDailyCases(savedLocalCases, remoteCases);

  // Ensure today's daily case is always present even when offline or server returned empty
  const hasToday = merged.some((c) => c.date === serverToday);
  if (!hasToday) {
    merged = mergeDailyCases(merged, [buildLocalDailyFallback(serverToday)]);
  }

  // Persist the complete accumulated library back to IndexedDB + localStorage
  await saveDailyCasesToLibrary(merged);

  return {
    today: serverToday,
    cases: merged,
  };
}

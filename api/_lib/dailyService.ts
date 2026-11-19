import type { CreativeBrief, MurdokuCase, TwistKind } from '../../src/engine/types';
import { generateVerifiedCase, getDailyScheduleForDate } from '../../src/engine/generator';
import type { DailyStore } from './store';
import { generateCreativeBriefWithGemini } from './gemini';

export function getTodayUtcDateString(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function isValidDateString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export interface DailyServiceDeps {
  store: DailyStore;
  fetchBrief?: (
    dateStr: string,
    twistKind: TwistKind
  ) => Promise<{ brief: CreativeBrief; source: 'gemini' | 'fallback' }>;
}

/**
 * Guarantees strictly at most ONE Gemini generation per calendar day using a
 * distributed lock + persistent cache.
 */
export async function getOrCreateDailyCase(
  dateStr: string,
  deps: DailyServiceDeps,
  options: { forceRegenerate?: boolean } = {}
): Promise<MurdokuCase> {
  const { store, fetchBrief = generateCreativeBriefWithGemini } = deps;

  if (!options.forceRegenerate) {
    const existing = await store.getCase(dateStr);
    if (existing) return existing;
  }

  // Acquire distributed lock so concurrent visitors at 00:00 UTC never double-call Gemini
  const gotLock = await store.acquireLock(dateStr, 60);
  if (!gotLock) {
    // Another worker is currently generating today's case; wait briefly & read cache
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 350));
      const cached = await store.getCase(dateStr);
      if (cached) return cached;
    }
  }

  try {
    if (!options.forceRegenerate) {
      const doubleCheck = await store.getCase(dateStr);
      if (doubleCheck) return doubleCheck;
    }

    const sched = getDailyScheduleForDate(dateStr);
    const { brief, source } = await fetchBrief(dateStr, sched.twistKind);

    // Compute sequential daily volume case number from archive length
    const archive = await store.listArchive();
    const existingMatch = archive.find((c) => c.date === dateStr);
    const caseNumber = existingMatch ? existingMatch.number : archive.length + 1;

    const generated = generateVerifiedCase({
      id: `daily-${dateStr}`,
      number: caseNumber,
      pageLeft: 100 + caseNumber * 2,
      pageRight: 101 + caseNumber * 2,
      volume: 'daily',
      date: dateStr,
      seed: options.forceRegenerate ? `daily-${dateStr}-${Date.now()}` : `daily-${dateStr}`,
      rows: sched.rows,
      cols: sched.cols,
      difficulty: sched.difficulty,
      twistKind: sched.twistKind,
      brief,
      generatedBy: source,
    });

    await store.saveCase(dateStr, generated);
    return generated;
  } finally {
    if (gotLock) {
      await store.releaseLock(dateStr);
    }
  }
}

import { describe, expect, it } from 'vitest';
import type { MurdokuCase } from '../src/engine/types';
import type { DailyStore } from '../api/_lib/store';
import { getOrCreateDailyCase } from '../api/_lib/dailyService';
import { FALLBACK_THEMES } from '../src/data/themes';

class InMemoryDailyStore implements DailyStore {
  private readonly cases = new Map<string, MurdokuCase>();
  private readonly locks = new Set<string>();

  async getCase(date: string): Promise<MurdokuCase | null> {
    return this.cases.get(date) ?? null;
  }

  async saveCase(date: string, murdokuCase: MurdokuCase): Promise<void> {
    this.cases.set(date, murdokuCase);
  }

  async listArchive(): Promise<MurdokuCase[]> {
    return Array.from(this.cases.values()).sort((a, b) =>
      (b.date ?? '').localeCompare(a.date ?? '')
    );
  }

  async acquireLock(date: string): Promise<boolean> {
    if (this.locks.has(date)) return false;
    this.locks.add(date);
    return true;
  }

  async releaseLock(date: string): Promise<void> {
    this.locks.delete(date);
  }
}

describe('Daily Generation 1/Day Lock & Cache', () => {
  it('calls Gemini at most ONCE even under 10 concurrent first-of-day requests', async () => {
    const store = new InMemoryDailyStore();
    let geminiCalls = 0;

    const mockFetchBrief = async () => {
      geminiCalls++;
      // Simulate network latency from Gemini API
      await new Promise((r) => setTimeout(r, 80));
      return { brief: FALLBACK_THEMES[0], source: 'gemini' as const };
    };

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        getOrCreateDailyCase('2026-11-19', { store, fetchBrief: mockFetchBrief })
      )
    );

    expect(geminiCalls).toBe(1);
    const firstId = results[0].id;
    for (const r of results) {
      expect(r.id).toBe(firstId);
      expect(r.solution.murdererId).toBe(results[0].solution.murdererId);
    }

    // Subsequent call later in the day also hits cache with 0 extra Gemini calls
    const later = await getOrCreateDailyCase('2026-11-19', { store, fetchBrief: mockFetchBrief });
    expect(geminiCalls).toBe(1);
    expect(later.id).toBe(firstId);
  });
});

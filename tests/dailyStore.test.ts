import { describe, expect, it } from 'vitest';
import type { MurdokuCase } from '../src/engine/types';
import type { DailyStore } from '../api/_lib/store';
import { getOrCreateDailyCase } from '../api/_lib/dailyService';
import { mergeDailyCases } from '../src/services/dailyLibrary';
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

describe('Daily Mystery Library Accumulation', () => {
  it('retains previous days in the library when a new day starts and server only returns today', async () => {
    const store1 = new InMemoryDailyStore();
    const day1 = await getOrCreateDailyCase('2026-11-22', {
      store: store1,
      fetchBrief: async () => ({ brief: FALLBACK_THEMES[0], source: 'fallback' }),
    });

    // Simulate next day on an ephemeral server that lost day 1 and only returns day 2
    const store2 = new InMemoryDailyStore();
    const day2 = await getOrCreateDailyCase('2026-11-23', {
      store: store2,
      fetchBrief: async () => ({ brief: FALLBACK_THEMES[1], source: 'gemini' }),
    });

    const afterDay2 = mergeDailyCases([day1], [day2]);
    expect(afterDay2.map((c) => c.date)).toEqual(['2026-11-23', '2026-11-22']);
    expect(afterDay2[0].number).toBe(2);
    expect(afterDay2[0].pageLeft).toBe(104);
    expect(afterDay2[1].number).toBe(1);
    expect(afterDay2[1].pageLeft).toBe(102);

    // Day 3 arrives, and remote also supplies an updated copy for day 2
    const store3 = new InMemoryDailyStore();
    const day3 = await getOrCreateDailyCase('2026-11-24', {
      store: store3,
      fetchBrief: async () => ({ brief: FALLBACK_THEMES[2], source: 'gemini' }),
    });
    const refreshedDay2: MurdokuCase = {
      ...day2,
      title: { en: 'Updated Day 2 Title', pt: 'Título Atualizado Dia 2' },
    };

    const afterDay3 = mergeDailyCases(afterDay2, [day3, refreshedDay2]);
    expect(afterDay3.map((c) => c.date)).toEqual(['2026-11-24', '2026-11-23', '2026-11-22']);
    expect(afterDay3.map((c) => c.number)).toEqual([3, 2, 1]);
    expect(afterDay3[1].title.en).toBe('Updated Day 2 Title');
  });
});

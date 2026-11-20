import { describe, expect, it } from 'vitest';
import { generateVerifiedCase, getDailyScheduleForDate } from '../src/engine/generator';
import { solveCSP } from '../src/engine/solver';
import { FALLBACK_THEMES } from '../src/data/themes';
import type { TwistKind } from '../src/engine/types';

describe('Deterministic Puzzle Generator Stress Test', () => {
  const modes: Array<{ twist: TwistKind; rows: number; cols: number }> = [
    { twist: 'classic', rows: 5, cols: 5 },
    { twist: 'classic', rows: 6, cols: 6 },
    { twist: 'classic', rows: 7, cols: 7 },
    { twist: 'outlaw', rows: 6, cols: 6 },
    { twist: 'uninvolved', rows: 6, cols: 6 },
    { twist: 'missing_piece', rows: 6, cols: 6 },
    { twist: 'liar', rows: 6, cols: 6 },
    { twist: 'time_travel', rows: 6, cols: 6 },
    { twist: 'split_grids', rows: 6, cols: 6 },
    { twist: 'secret_identities', rows: 6, cols: 6 },
  ];

  for (const m of modes) {
    it(`generates 5 uniquely solvable ${m.rows}x${m.cols} ${m.twist} puzzles cleanly`, () => {
      for (let i = 0; i < 5; i++) {
        const theme = FALLBACK_THEMES[i % FALLBACK_THEMES.length];
        const generated = generateVerifiedCase({
          id: `stress-${m.twist}-${i}`,
          number: i + 1,
          pageLeft: 10,
          pageRight: 11,
          volume: 'daily',
          seed: `stress-seed-${m.twist}-${m.rows}-${i}`,
          rows: m.rows,
          cols: m.cols,
          difficulty: 'medium',
          twistKind: m.twist,
          brief: theme,
        });

        const sols = solveCSP(
          {
            rows: generated.rows,
            cols: generated.cols,
            voidCells: generated.voidCells,
            rooms: generated.rooms,
            objects: generated.objects,
            suspects: generated.suspects,
            twist: generated.twist,
          },
          { limit: 2 }
        );
        expect(sols.length).toBe(1);
      }
    });
  }

  it('cycles strictly through Easy -> Medium -> Hard -> Expert every 4 days and repeats across all 8 twists', () => {
    const seq = [];
    const twists = new Set<TwistKind>();
    for (let d = 1; d <= 16; d++) {
      const dateStr = `2026-11-${String(d).padStart(2, '0')}`;
      const sched = getDailyScheduleForDate(dateStr);
      seq.push(sched.difficulty);
      twists.add(sched.twistKind);
    }
    // Every consecutive 4-day block must contain all 4 difficulties and repeat identically!
    expect(new Set(seq.slice(0, 4)).size).toBe(4);
    expect(seq.slice(4, 8)).toEqual(seq.slice(0, 4));
    expect(seq.slice(8, 12)).toEqual(seq.slice(0, 4));
    expect(seq.slice(12, 16)).toEqual(seq.slice(0, 4));
    expect(twists.size).toBe(8);
  });
});

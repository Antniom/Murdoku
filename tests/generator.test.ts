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

  it('rotates through all twists across a 7-day daily schedule', () => {
    const twists = new Set<TwistKind>();
    for (let d = 1; d <= 7; d++) {
      const sched = getDailyScheduleForDate(`2026-11-0${d}`);
      twists.add(sched.twistKind);
    }
    expect(twists.size).toBe(5);
  });
});

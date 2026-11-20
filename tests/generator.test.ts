import { describe, expect, it } from 'vitest';
import { generateVerifiedCase, getDailyScheduleForDate } from '../src/engine/generator';
import { areClausesCompatibleOnSuspect, verifyCaseIntegrity } from '../src/engine/verifier';
import { FALLBACK_THEMES } from '../src/data/themes';
import type { TwistKind } from '../src/engine/types';

describe('Deterministic Puzzle Generator & Integrity Verifier', () => {
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
    it(`generates 5 uniquely solvable ${m.rows}x${m.cols} ${m.twist} puzzles passing full clue & resolution integrity`, () => {
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

        const check = verifyCaseIntegrity(generated);
        expect(check.errors).toEqual([]);
        expect(check.valid).toBe(true);
      }
    });
  }

  it('forbids conflicting or confusing multi-direction clues on the same target (e.g. Blake east + north of Outlaw)', () => {
    expect(
      areClausesCompatibleOnSuspect([{ kind: 'east_of_outlaw' }], { kind: 'north_of_outlaw' })
    ).toBe(false);
    expect(
      areClausesCompatibleOnSuspect(
        [{ kind: 'east_of', targetId: 'A' }],
        { kind: 'north_of', targetId: 'A' }
      )
    ).toBe(false);
    expect(
      areClausesCompatibleOnSuspect(
        [{ kind: 'east_of_role', roleId: 'tracker' }],
        { kind: 'south_of_role', roleId: 'tracker' }
      )
    ).toBe(false);
    expect(
      areClausesCompatibleOnSuspect([{ kind: 'in_room', roomId: 'r0' }], { kind: 'not_in_room', roomId: 'r1' })
    ).toBe(false);
    expect(
      areClausesCompatibleOnSuspect([{ kind: 'sitting_in_chair' }], { kind: 'only_person_sitting' })
    ).toBe(false);
    // Diverse clues on different aspects remain compatible!
    expect(
      areClausesCompatibleOnSuspect([{ kind: 'east_of_outlaw' }], { kind: 'in_room', roomId: 'r0' })
    ).toBe(true);
    expect(
      areClausesCompatibleOnSuspect(
        [{ kind: 'east_of', targetId: 'A' }],
        { kind: 'north_of', targetId: 'C' }
      )
    ).toBe(true);
  });

  it('verifies The Velvet Theatre (Outlaw) daily case produces zero contradictory or ambiguous clues', () => {
    const velvet = FALLBACK_THEMES.find((t) => t.title.en === 'The Velvet Theatre')!;
    for (let i = 0; i < 6; i++) {
      const c = generateVerifiedCase({
        id: `velvet-outlaw-${i}`,
        number: 1,
        pageLeft: 102,
        pageRight: 103,
        volume: 'daily',
        date: `2026-11-${String(10 + i).padStart(2, '0')}`,
        seed: `daily-velvet-outlaw-${i}`,
        rows: 6,
        cols: 6,
        difficulty: 'medium',
        twistKind: 'outlaw',
        brief: velvet,
      });
      const check = verifyCaseIntegrity(c);
      expect(check.errors).toEqual([]);
      expect(check.valid).toBe(true);
    }
  });

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

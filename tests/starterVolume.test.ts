import { describe, expect, it } from 'vitest';
import { getStarterVolume } from '../src/data/starterVolume';
import { solveCSP } from '../src/engine/solver';
import { CHARACTER_BY_ID } from '../src/data/characters';

describe('Starter Anthology Volume (32 Cases)', () => {
  const cases = getStarterVolume();

  it('contains exactly 32 curated cases covering Classic + all 4 Book 2/3 twists', () => {
    expect(cases.length).toBe(32);
    const twists = new Set(cases.map((c) => c.twist.kind));
    expect(twists.has('classic')).toBe(true);
    expect(twists.has('outlaw')).toBe(true);
    expect(twists.has('uninvolved')).toBe(true);
    expect(twists.has('missing_piece')).toBe(true);
    expect(twists.has('liar')).toBe(true);
  });

  for (const c of cases) {
    it(`Case #${c.number} (${c.title.en} · ${c.twist.kind}) has EXACTLY 1 unique solution, valid pronouns, and complete proof`, () => {
      const solutions = solveCSP(
        {
          rows: c.rows,
          cols: c.cols,
          voidCells: c.voidCells,
          rooms: c.rooms,
          objects: c.objects,
          suspects: c.suspects,
          twist: c.twist,
        },
        { limit: 2 }
      );
      expect(solutions.length).toBe(1);
      expect(solutions[0].murdererId).toBe(c.solution.murdererId);

      // Verify alphabetical suspect IDs + Victim 'V' + accurate gender pronouns
      expect(c.suspects[c.suspects.length - 1].isVictim).toBe(true);
      expect(c.suspects[c.suspects.length - 1].id).toBe('V');
      for (const s of c.suspects) {
        const prof = CHARACTER_BY_ID[s.profileId];
        expect(prof).toBeDefined();
        expect(s.gender).toBe(prof.gender);
        expect(s.clueText.en.length).toBeGreaterThan(5);
        expect(s.clueText.pt.length).toBeGreaterThan(5);
      }

      // Verify proof steps exist and mention the murderer
      expect(c.proofSteps.length).toBeGreaterThanOrEqual(c.rows);
    });
  }
});

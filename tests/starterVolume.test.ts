import { describe, expect, it } from 'vitest';
import { getStarterVolume } from '../src/data/starterVolume';
import { verifyCaseIntegrity } from '../src/engine/verifier';

describe('Starter Anthology Volume (40 Cases)', () => {
  const cases = getStarterVolume();

  it('contains exactly 40 curated cases covering Classic Vol. 1 + all Vol. 2 & Vol. 3 twists', () => {
    expect(cases.length).toBe(40);
    const twists = new Set(cases.map((c) => c.twist.kind));
    expect(twists.has('classic')).toBe(true);
    expect(twists.has('outlaw')).toBe(true);
    expect(twists.has('uninvolved')).toBe(true);
    expect(twists.has('missing_piece')).toBe(true);
    expect(twists.has('liar')).toBe(true);
    expect(twists.has('time_travel')).toBe(true);
    expect(twists.has('split_grids')).toBe(true);
    expect(twists.has('secret_identities')).toBe(true);

    const editions = new Set(cases.map((c) => c.edition ?? 'vol1'));
    expect(editions.has('vol1')).toBe(true);
    expect(editions.has('vol2')).toBe(true);
    expect(editions.has('vol3')).toBe(true);
  });

  for (const c of cases) {
    it(`Case #${c.number} (${c.title.en} · ${c.twist.kind}) passes 100% clue, uniqueness, and resolution verification`, () => {
      const check = verifyCaseIntegrity(c);
      expect(check.errors).toEqual([]);
      expect(check.valid).toBe(true);

      // Verify Victim 'V' is last
      expect(c.suspects[c.suspects.length - 1].isVictim).toBe(true);
      expect(c.suspects[c.suspects.length - 1].id).toBe('V');
    });
  }
});

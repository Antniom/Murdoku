import { describe, expect, it } from 'vitest';
import {
  createEmptyProgress,
  mergeProgressStates,
  summarizeProgress,
  type CaseProgressState,
} from '../src/services/inkStorage';

describe('On-Device Progress & Handwritten Ink Persistence', () => {
  it('summarizes in-progress notes vs pure deduction solved records accurately', () => {
    const started: CaseProgressState = {
      ...createEmptyProgress('starter-1'),
      strokes: [
        {
          id: 's1',
          page: 'right',
          tool: 'pencil',
          color: '#18181b',
          size: 2,
          points: [{ x: 0.2, y: 0.4, p: 0.6 }],
        },
      ],
      tapMarks: { '0,0': 'X', '1,2': 'A' },
      updatedAt: 1000,
    };

    const inProg = summarizeProgress(started);
    expect(inProg.solved).toBe(false);
    expect(inProg.hasWork).toBe(true);
    expect(inProg.strokeCount).toBe(1);
    expect(inProg.stampCount).toBe(2);

    const solved: CaseProgressState = {
      ...started,
      solved: true,
      solvedAt: 2000,
      hintsUsedAtSolve: 0,
      wrongAttempts: 0,
      savedVerdict: { murdererId: 'B' },
      updatedAt: 2000,
    };
    const solvedSummary = summarizeProgress(solved);
    expect(solvedSummary.solved).toBe(true);
    expect(solvedSummary.hintsUsedAtSolve).toBe(0);
    expect(solvedSummary.strokeCount).toBe(1);
  });

  it('merges IndexedDB and localStorage progress without ever losing solved state or newer ink', () => {
    const olderSolved: CaseProgressState = {
      ...createEmptyProgress('daily-2026-11-23'),
      solved: true,
      solvedAt: 1000,
      hintsUsedAtSolve: 1,
      revealedHints: 1,
      savedVerdict: { murdererId: 'C' },
      strokes: [
        {
          id: 's1',
          page: 'left',
          tool: 'pencil',
          color: '#18181b',
          size: 2,
          points: [{ x: 0.1, y: 0.1, p: 0.5 }],
        },
      ],
      updatedAt: 1000,
    };

    const newerExtraInk: CaseProgressState = {
      ...olderSolved,
      solved: false, // simulate stale/partial mirror
      strokes: [
        ...olderSolved.strokes,
        {
          id: 's2',
          page: 'right',
          tool: 'pen',
          color: '#245ca8',
          size: 2,
          points: [{ x: 0.5, y: 0.6, p: 0.8 }],
        },
      ],
      updatedAt: 2500,
    };

    const merged = mergeProgressStates(olderSolved, newerExtraInk);
    expect(merged.solved).toBe(true);
    expect(merged.solvedAt).toBe(1000);
    expect(merged.hintsUsedAtSolve).toBe(1);
    expect(merged.savedVerdict?.murdererId).toBe('C');
    expect(merged.strokes.length).toBe(2);
    expect(merged.updatedAt).toBe(2500);
  });
});

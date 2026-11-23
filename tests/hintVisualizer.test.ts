import { describe, expect, it } from 'vitest';
import { getStarterCaseById, getStarterSummaries } from '../src/data/starterVolume';
import { buildVisualHintTimeline } from '../src/engine/hintVisualizer';

describe('Visual Step-by-Step Hints Timeline', () => {
  it('builds progressive placements, blue/purple row/col eliminations, and final victim+murderer reveal for Classic cases', () => {
    const summary = getStarterSummaries().find((s) => s.twistKind === 'classic')!;
    const murdokuCase = getStarterCaseById(summary.id)!;

    const timeline = buildVisualHintTimeline(murdokuCase);
    expect(timeline.length).toBe(murdokuCase.proofSteps.length);

    // Step 1 places 1 active suspect and emits row/col elimination X marks
    const first = timeline[0];
    expect(first.overlay.placements.length).toBe(1);
    expect(first.overlay.placements[0].variant).toBe('active');
    expect(first.overlay.highlightCell).toEqual(first.placedCoord);
    expect(
      first.overlay.activeRowEliminatedCells.length + first.overlay.activeColEliminatedCells.length
    ).toBeGreaterThan(0);

    // Final step reveals Victim + Murderer in victimRoomId with crime tone
    const last = timeline[timeline.length - 1];
    expect(last.kind).toBe('final_verdict');
    expect(last.overlay.highlightRoomId).toBe(murdokuCase.solution.victimRoomId);
    expect(last.overlay.highlightRoomTone).toBe('crime');
    expect(last.overlay.placements.some((p) => p.variant === 'victim' && p.suspectId === 'V')).toBe(true);
    expect(
      last.overlay.placements.some(
        (p) => p.variant === 'murderer' && p.suspectId === murdokuCase.solution.murdererId
      )
    ).toBe(true);
  });

  it('supports backwards-compatible inference for older cached cases without kind/placedCoord', () => {
    const summary = getStarterSummaries().find((s) => s.twistKind === 'missing_piece')!;
    const original = getStarterCaseById(summary.id)!;
    const legacyCase = {
      ...original,
      proofSteps: original.proofSteps.map(({ stepNumber, focusSuspectId, focusRoomId, text }) => ({
        stepNumber,
        focusSuspectId,
        focusRoomId,
        text,
      })),
    };

    const timeline = buildVisualHintTimeline(legacyCase);
    expect(timeline[0].kind).toBe('twist');
    expect(timeline[0].overlay.revealPatchId).toBe(original.solution.correctPatchId);
    expect(timeline[timeline.length - 1].kind).toBe('final_verdict');
    expect(timeline[timeline.length - 1].overlay.placements.length).toBe(
      Object.keys(original.solution.placements).length
    );
  });
});

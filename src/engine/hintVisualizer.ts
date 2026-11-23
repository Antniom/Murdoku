import type {
  GridCoord,
  LocalizedText,
  MurdokuCase,
  ProofStep,
  ProofStepKind,
  SuspectDef,
} from './types';

export interface FloorplanHintPlacement {
  suspectId: string;
  coord: GridCoord;
  variant: 'prior' | 'active' | 'victim' | 'murderer';
}

export interface FloorplanHintArrow {
  from: GridCoord;
  to: GridCoord;
  variant: 'relation' | 'swap';
}

export interface FloorplanHintOverlay {
  placements: FloorplanHintPlacement[];
  priorEliminatedCells: GridCoord[];
  activeRowEliminatedCells: GridCoord[];
  activeColEliminatedCells: GridCoord[];
  highlightRoomId?: string;
  highlightRoomTone?: 'focus' | 'crime';
  highlightCell?: GridCoord;
  arrows: FloorplanHintArrow[];
  revealPatchId?: 'A' | 'B' | 'C' | 'D';
}

export interface VisualHintStep {
  step: ProofStep;
  stepIndex: number;
  kind: ProofStepKind;
  suspect?: SuspectDef;
  secondarySuspect?: SuspectDef;
  victim?: SuspectDef;
  roomName?: LocalizedText;
  coordLabel?: string;
  placedCoord?: GridCoord;
  rolePairings?: Array<{ roleTitle: LocalizedText; suspect: SuspectDef }>;
  splitGroups?: Array<{ gridName: LocalizedText; suspects: SuspectDef[] }>;
  overlay: FloorplanHintOverlay;
}

function formatCoord(c: GridCoord, murdokuCase: MurdokuCase): string {
  if (murdokuCase.twist.kind === 'split_grids') {
    const [gA, gB] = murdokuCase.twist.grids;
    if (c.c >= gB.colOffset) {
      return `${gB.id}:R${c.r + 1}C${c.c - gB.colOffset + 1}`;
    }
    return `${gA.id}:R${c.r + 1}C${c.c + 1}`;
  }
  return `R${c.r + 1}C${c.c + 1}`;
}

function inferStepKind(
  step: ProofStep,
  stepIndex: number,
  totalSteps: number,
  murdokuCase: MurdokuCase
): ProofStepKind {
  if (step.kind) return step.kind;
  if (stepIndex === totalSteps - 1) return 'final_verdict';
  if (stepIndex === 0 && murdokuCase.twist.kind !== 'classic') return 'twist';
  const en = step.text.en.toLowerCase();
  if (en.includes('immediately pins down')) return 'unary_single';
  if (en.includes('no other remaining suspect')) return 'hidden_single';
  if (en.includes('relational clue')) return 'relational_narrowing';
  if (en.includes('is lying')) return 'liar_elimination';
  if (en.includes('remaining candidate squares')) return 'contradiction_elim';
  return 'row_col_elimination';
}

function getSubGridColBounds(c: number, murdokuCase: MurdokuCase): [number, number] {
  if (murdokuCase.twist.kind === 'split_grids') {
    const [gA, gB] = murdokuCase.twist.grids;
    if (c >= gB.colOffset) {
      return [gB.colOffset, gB.colOffset + gB.cols - 1];
    }
    return [gA.colOffset, gA.colOffset + gA.cols - 1];
  }
  return [0, murdokuCase.cols - 1];
}

function getRelationalTargets(
  suspect: SuspectDef,
  murdokuCase: MurdokuCase
): string[] {
  const targets = new Set<string>();
  const { solution, twist } = murdokuCase;

  const allClauses = [...suspect.clauses];
  if (twist.kind === 'secret_identities' && solution.roleAssignment) {
    for (const role of twist.roles) {
      if (solution.roleAssignment[role.id] === suspect.id) {
        allClauses.push(...role.clauses);
      }
    }
  }

  for (const cl of allClauses) {
    if ('targetId' in cl && typeof cl.targetId === 'string') {
      targets.add(cl.targetId);
    } else if (
      cl.kind === 'north_of_outlaw' ||
      cl.kind === 'south_of_outlaw' ||
      cl.kind === 'east_of_outlaw' ||
      cl.kind === 'west_of_outlaw' ||
      cl.kind === 'same_room_as_outlaw' ||
      cl.kind === 'beside_outlaw'
    ) {
      if (solution.outlawId) targets.add(solution.outlawId);
    } else if (
      cl.kind === 'north_of_role' ||
      cl.kind === 'south_of_role' ||
      cl.kind === 'east_of_role' ||
      cl.kind === 'west_of_role' ||
      cl.kind === 'same_room_as_role'
    ) {
      const holder = solution.roleAssignment?.[cl.roleId];
      if (holder) targets.add(holder);
    }
  }

  targets.delete(suspect.id);
  return Array.from(targets);
}

/**
 * Builds the complete progressive visual walkthrough timeline for a Murdoku case.
 * Works identically on newly generated cases and previously cached daily cases.
 */
export function buildVisualHintTimeline(murdokuCase: MurdokuCase): VisualHintStep[] {
  const { rows, cols, rooms, objects, voidCells = [], suspects, twist, solution, proofSteps } =
    murdokuCase;

  const suspectsById = Object.fromEntries(suspects.map((s) => [s.id, s]));
  const roomsById = Object.fromEntries(rooms.map((r) => [r.id, r]));
  const victim = suspects.find((s) => s.isVictim);
  const voidSet = new Set(voidCells.map((v) => `${v.r},${v.c}`));

  // Build blocked cell set (respecting valid patch for missing_piece once revealed)
  const buildBlockedSet = (patchId?: 'A' | 'B' | 'C' | 'D'): Set<string> => {
    const blocked = new Set<string>();
    let effObjs = objects;
    if (twist.kind === 'missing_piece') {
      const inPatch = (r: number, c: number) =>
        r >= twist.originR &&
        r < twist.originR + twist.height &&
        c >= twist.originC &&
        c < twist.originC + twist.width;
      const base = objects.filter((o) => !inPatch(o.r, o.c));
      if (patchId) {
        const patch = twist.patches.find((p) => p.id === patchId);
        effObjs = patch ? base.concat(patch.objects) : base;
      } else {
        effObjs = base;
      }
    }
    for (const o of effObjs) {
      if (!o.walkable) blocked.add(`${o.r},${o.c}`);
    }
    return blocked;
  };

  const placedSoFar = new Map<string, GridCoord>();
  const timeline: VisualHintStep[] = [];
  let patchRevealed: 'A' | 'B' | 'C' | 'D' | undefined;

  for (let i = 0; i < proofSteps.length; i++) {
    const step = proofSteps[i];
    const kind = inferStepKind(step, i, proofSteps.length, murdokuCase);

    if (kind === 'twist' && twist.kind === 'missing_piece' && solution.correctPatchId) {
      patchRevealed = solution.correctPatchId;
    }

    const blockedSet = buildBlockedSet(patchRevealed);
    const placements: FloorplanHintPlacement[] = [];
    const arrows: FloorplanHintArrow[] = [];
    const activeRowEliminatedCells: GridCoord[] = [];
    const activeColEliminatedCells: GridCoord[] = [];

    let placedCoord: GridCoord | undefined;
    let activeSuspectId: string | undefined;
    let highlightRoomId = step.focusRoomId;
    let highlightRoomTone: 'focus' | 'crime' = 'focus';
    let highlightCell: GridCoord | undefined;
    let secondarySuspect: SuspectDef | undefined;
    let rolePairings: Array<{ roleTitle: LocalizedText; suspect: SuspectDef }> | undefined;
    let splitGroups: Array<{ gridName: LocalizedText; suspects: SuspectDef[] }> | undefined;

    // 1. Add previously placed suspects
    for (const [sid, coord] of placedSoFar.entries()) {
      const isKillerOnFinal = kind === 'final_verdict' && sid === solution.murdererId;
      placements.push({
        suspectId: sid,
        coord,
        variant: isKillerOnFinal ? 'murderer' : 'prior',
      });
    }

    // 2. Apply this step's visual action
    if (kind === 'twist') {
      if (twist.kind === 'time_travel' && solution.timeSwappedPair) {
        const [, bId] = solution.timeSwappedPair;
        secondarySuspect = suspectsById[bId];
      } else if (twist.kind === 'secret_identities' && solution.roleAssignment) {
        rolePairings = twist.roles
          .map((r) => {
            const s = suspectsById[solution.roleAssignment![r.id]];
            return s ? { roleTitle: r.title, suspect: s } : null;
          })
          .filter((x): x is { roleTitle: LocalizedText; suspect: SuspectDef } => x !== null);
      } else if (twist.kind === 'split_grids') {
        const [gA, gB] = twist.grids;
        splitGroups = [
          {
            gridName: gA.name,
            suspects: suspects.filter((s) => {
              const p = solution.placements[s.id];
              return p && p.c < gB.colOffset;
            }),
          },
          {
            gridName: gB.name,
            suspects: suspects.filter((s) => {
              const p = solution.placements[s.id];
              return p && p.c >= gB.colOffset;
            }),
          },
        ];
      }
    } else if (kind === 'final_verdict') {
      const vCoord = step.placedCoord ?? (victim ? solution.placements[victim.id] : undefined);
      highlightRoomId = solution.victimRoomId;
      highlightRoomTone = 'crime';
      if (victim && vCoord) {
        placedCoord = vCoord;
        highlightCell = vCoord;
        placements.push({
          suspectId: victim.id,
          coord: vCoord,
          variant: 'victim',
        });
        const killerCoord = placedSoFar.get(solution.murdererId) ?? solution.placements[solution.murdererId];
        if (killerCoord) {
          if (!placedSoFar.has(solution.murdererId)) {
            placements.push({
              suspectId: solution.murdererId,
              coord: killerCoord,
              variant: 'murderer',
            });
          }
          arrows.push({ from: killerCoord, to: vCoord, variant: 'relation' });
        }
      }
    } else if (step.focusSuspectId) {
      const sid = step.focusSuspectId;
      const coord = step.placedCoord ?? solution.placements[sid];
      if (coord) {
        activeSuspectId = sid;
        placedCoord = coord;
        highlightCell = coord;
        placements.push({
          suspectId: sid,
          coord,
          variant: 'active',
        });

        // Draw relational clue links to any already-placed suspects referenced in this suspect's clue
        const suspectObj = suspectsById[sid];
        if (suspectObj && sid !== solution.liarId) {
          const targets = getRelationalTargets(suspectObj, murdokuCase);
          for (const tid of targets) {
            const tCoord = placedSoFar.get(tid);
            if (tCoord) {
              arrows.push({ from: tCoord, to: coord, variant: 'relation' });
            }
          }
        }
        // Highlight time-travel swap pair once both swapped suspects are placed
        if (twist.kind === 'time_travel' && solution.timeSwappedPair) {
          const [aId, bId] = solution.timeSwappedPair;
          const partnerId = sid === aId ? bId : sid === bId ? aId : null;
          if (partnerId && placedSoFar.has(partnerId)) {
            arrows.push({ from: placedSoFar.get(partnerId)!, to: coord, variant: 'swap' });
          }
        }
      }
    }

    // 3. Compute eliminated row & column squares (skipping occupied, void, and blocking furniture)
    const occupiedKeys = new Set(placements.map((p) => `${p.coord.r},${p.coord.c}`));
    const activeElimKeys = new Set<string>();

    if (placedCoord && activeSuspectId) {
      const [cMin, cMax] = getSubGridColBounds(placedCoord.c, murdokuCase);
      for (let c = cMin; c <= cMax; c++) {
        const k = `${placedCoord.r},${c}`;
        if (c === placedCoord.c || occupiedKeys.has(k) || voidSet.has(k) || blockedSet.has(k)) continue;
        activeRowEliminatedCells.push({ r: placedCoord.r, c });
        activeElimKeys.add(k);
      }
      for (let r = 0; r < rows; r++) {
        const k = `${r},${placedCoord.c}`;
        if (r === placedCoord.r || occupiedKeys.has(k) || voidSet.has(k) || blockedSet.has(k)) continue;
        activeColEliminatedCells.push({ r, c: placedCoord.c });
        activeElimKeys.add(k);
      }
    }

    const priorElimKeys = new Set<string>();
    const priorEliminatedCells: GridCoord[] = [];
    for (const [, pCoord] of placedSoFar.entries()) {
      const [cMin, cMax] = getSubGridColBounds(pCoord.c, murdokuCase);
      for (let c = cMin; c <= cMax; c++) {
        const k = `${pCoord.r},${c}`;
        if (
          occupiedKeys.has(k) ||
          voidSet.has(k) ||
          blockedSet.has(k) ||
          activeElimKeys.has(k) ||
          priorElimKeys.has(k)
        ) {
          continue;
        }
        priorElimKeys.add(k);
        priorEliminatedCells.push({ r: pCoord.r, c });
      }
      for (let r = 0; r < rows; r++) {
        const k = `${r},${pCoord.c}`;
        if (
          occupiedKeys.has(k) ||
          voidSet.has(k) ||
          blockedSet.has(k) ||
          activeElimKeys.has(k) ||
          priorElimKeys.has(k)
        ) {
          continue;
        }
        priorElimKeys.add(k);
        priorEliminatedCells.push({ r, c: pCoord.c });
      }
    }

    // Advance cumulative placed map for subsequent steps
    if (activeSuspectId && placedCoord) {
      placedSoFar.set(activeSuspectId, placedCoord);
    } else if (kind === 'final_verdict' && victim && placedCoord) {
      placedSoFar.set(victim.id, placedCoord);
    }

    const focusRoom = highlightRoomId ? roomsById[highlightRoomId] : undefined;

    timeline.push({
      step,
      stepIndex: i,
      kind,
      suspect: step.focusSuspectId ? suspectsById[step.focusSuspectId] : undefined,
      secondarySuspect,
      victim: kind === 'final_verdict' ? victim : undefined,
      roomName: focusRoom?.name,
      coordLabel: placedCoord ? formatCoord(placedCoord, murdokuCase) : undefined,
      placedCoord,
      rolePairings,
      splitGroups,
      overlay: {
        placements,
        priorEliminatedCells,
        activeRowEliminatedCells,
        activeColEliminatedCells,
        highlightRoomId,
        highlightRoomTone,
        highlightCell,
        arrows,
        revealPatchId: patchRevealed,
      },
    });
  }

  return timeline;
}

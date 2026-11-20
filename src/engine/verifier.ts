import type {
  CaseSolution,
  ClueClause,
  MurdokuCase,
  TwistConfig,
} from './types';
import {
  buildBoardIndex,
  evaluateClauseFull,
  evaluateOutlawCondition,
  type BoardIndex,
  type EvalContext,
} from './predicates';
import { solveCSP } from './solver';
import { CHARACTER_BY_ID } from '../data/characters';

const COMPASS_PERSON_KINDS = new Set(['north_of', 'south_of', 'east_of', 'west_of']);
const COMPASS_OUTLAW_KINDS = new Set([
  'north_of_outlaw',
  'south_of_outlaw',
  'east_of_outlaw',
  'west_of_outlaw',
]);
const COMPASS_ROLE_KINDS = new Set([
  'north_of_role',
  'south_of_role',
  'east_of_role',
  'west_of_role',
]);
const OUTLAW_REF_KINDS = new Set([
  'same_room_as_outlaw',
  'not_same_room_as_outlaw',
  'north_of_outlaw',
  'south_of_outlaw',
  'east_of_outlaw',
  'west_of_outlaw',
  'beside_outlaw',
  'not_the_outlaw',
]);

function clauseSignature(cl: ClueClause): string {
  return JSON.stringify(cl);
}

function getTargetPersonId(cl: ClueClause): string | null {
  if ('targetId' in cl && typeof cl.targetId === 'string') return cl.targetId;
  return null;
}

function getRoleId(cl: ClueClause): string | null {
  if ('roleId' in cl && typeof cl.roleId === 'string') return cl.roleId;
  return null;
}

/**
 * Checks whether adding `candidate` to a suspect's (or secret role's) `existing` clauses
 * keeps the card 100% non-contradictory, non-redundant, and intuitive for human solvers.
 *
 * Specifically forbids:
 * - Any two compass directions relative to the SAME target (e.g., east_of_outlaw + north_of_outlaw)
 * - Duplicate or overlapping spatial relations to the same person/outlaw/role
 * - Redundant pairs (in_room + not_in_room, sitting_in_chair + only_person_sitting, etc.)
 * - Contradictory pairs (stayed_in_place + moved_in_time, in_room_corner + not_beside_wall, etc.)
 */
export function areClausesCompatibleOnSuspect(
  existing: ClueClause[],
  candidate: ClueClause
): boolean {
  const candSig = clauseSignature(candidate);
  const candTarget = getTargetPersonId(candidate);
  const candRole = getRoleId(candidate);

  for (const ex of existing) {
    if (clauseSignature(ex) === candSig) return false;

    const exTarget = getTargetPersonId(ex);
    const exRole = getRoleId(ex);

    // 1. NEVER two compass directions relative to the same Outlaw!
    if (COMPASS_OUTLAW_KINDS.has(ex.kind) && COMPASS_OUTLAW_KINDS.has(candidate.kind)) {
      return false;
    }

    // 2. NEVER two compass directions (or overlapping spatial relation) relative to the same person!
    if (candTarget && exTarget && candTarget === exTarget) {
      const bothPresentRel =
        !ex.kind.startsWith('past_') &&
        !candidate.kind.startsWith('past_') &&
        ex.kind !== 'same_subgrid_as' &&
        ex.kind !== 'different_subgrid_from' &&
        candidate.kind !== 'same_subgrid_as' &&
        candidate.kind !== 'different_subgrid_from';
      if (bothPresentRel) {
        if (COMPASS_PERSON_KINDS.has(ex.kind) && COMPASS_PERSON_KINDS.has(candidate.kind)) {
          return false;
        }
        if (
          ex.kind === 'beside_person' ||
          candidate.kind === 'beside_person' ||
          ex.kind === 'not_beside_person' ||
          candidate.kind === 'not_beside_person' ||
          ex.kind === 'same_diagonal' ||
          candidate.kind === 'same_diagonal'
        ) {
          return false;
        }
        if (ex.kind === 'same_room_as' || candidate.kind === 'same_room_as') {
          return false;
        }
      }
      if (
        (ex.kind === 'same_subgrid_as' || ex.kind === 'different_subgrid_from') &&
        (candidate.kind === 'same_subgrid_as' || candidate.kind === 'different_subgrid_from')
      ) {
        return false;
      }
      if (ex.kind === 'past_same_room_as' && candidate.kind === 'past_same_room_as') {
        return false;
      }
    }

    // 3. NEVER two compass directions or overlapping outlaw relations on the same card!
    if (OUTLAW_REF_KINDS.has(ex.kind) && OUTLAW_REF_KINDS.has(candidate.kind)) {
      // Any outlaw spatial relation already implies `not_the_outlaw` and should stay single & clean
      return false;
    }

    // 4. NEVER two compass directions or overlapping role relations for the same role!
    if (candRole && exRole && candRole === exRole) {
      if (COMPASS_ROLE_KINDS.has(ex.kind) && COMPASS_ROLE_KINDS.has(candidate.kind)) {
        return false;
      }
      return false;
    }

    // 5. Room & Sub-grid redundancies / conflicts
    if (
      (ex.kind === 'in_room' && (candidate.kind === 'in_room' || candidate.kind === 'not_in_room' || candidate.kind === 'in_subgrid')) ||
      (candidate.kind === 'in_room' && (ex.kind === 'not_in_room' || ex.kind === 'in_subgrid'))
    ) {
      return false;
    }
    if (ex.kind === 'not_in_room' && candidate.kind === 'not_in_room') return false;
    if (ex.kind === 'in_subgrid' && candidate.kind === 'in_subgrid') return false;
    if (ex.kind === 'in_row' && candidate.kind === 'in_row') return false;
    if (ex.kind === 'in_col' && candidate.kind === 'in_col') return false;

    // 6. Room occupancy redundancies / conflicts
    if (
      (ex.kind === 'alone_in_room' && (candidate.kind === 'alone_in_room' || candidate.kind === 'room_occupant_count')) ||
      (candidate.kind === 'alone_in_room' && ex.kind === 'room_occupant_count') ||
      (ex.kind === 'room_occupant_count' && candidate.kind === 'room_occupant_count')
    ) {
      return false;
    }
    if (
      (ex.kind === 'alone_in_room' && (candidate.kind === 'same_room_as' || candidate.kind === 'beside_person' || candidate.kind === 'same_room_as_outlaw' || candidate.kind === 'beside_outlaw' || candidate.kind === 'same_room_as_role')) ||
      (candidate.kind === 'alone_in_room' && (ex.kind === 'same_room_as' || ex.kind === 'beside_person' || ex.kind === 'same_room_as_outlaw' || ex.kind === 'beside_outlaw' || ex.kind === 'same_room_as_role'))
    ) {
      return false;
    }

    // 7. Object occupancy & adjacency redundancies / conflicts
    if (
      (ex.kind === 'sitting_in_chair' && candidate.kind === 'only_person_sitting') ||
      (ex.kind === 'only_person_sitting' && candidate.kind === 'sitting_in_chair')
    ) {
      return false;
    }
    if (
      (ex.kind === 'beside_object' || ex.kind === 'only_person_beside' || ex.kind === 'not_beside_object') &&
      (candidate.kind === 'beside_object' || candidate.kind === 'only_person_beside' || candidate.kind === 'not_beside_object') &&
      ex.objectType === candidate.objectType
    ) {
      return false;
    }
    if (ex.kind === 'on_object' && candidate.kind === 'on_object' && ex.objectType === candidate.objectType) {
      return false;
    }

    // 8. Wall / corner conflict
    if (
      (ex.kind === 'in_room_corner' && candidate.kind === 'not_beside_wall') ||
      (ex.kind === 'not_beside_wall' && candidate.kind === 'in_room_corner')
    ) {
      return false;
    }

    // 9. Time travel redundancies / conflicts
    if (
      (ex.kind === 'stayed_in_place' && candidate.kind === 'moved_in_time') ||
      (ex.kind === 'moved_in_time' && candidate.kind === 'stayed_in_place')
    ) {
      return false;
    }
    if (
      (ex.kind === 'in_room' && candidate.kind === 'past_in_room' && ex.roomId === candidate.roomId) ||
      (candidate.kind === 'in_room' && ex.kind === 'past_in_room' && candidate.roomId === ex.roomId)
    ) {
      return false;
    }
    if (ex.kind === 'past_in_room' && candidate.kind === 'past_in_room') return false;

    // 10. Secret role redundancies
    if (
      (ex.kind === 'has_role' && (candidate.kind === 'has_role' || candidate.kind === 'not_role')) ||
      (candidate.kind === 'has_role' && ex.kind === 'not_role')
    ) {
      return false;
    }
  }

  return true;
}

function getReferencedObjectType(cl: ClueClause): string | null {
  switch (cl.kind) {
    case 'beside_object':
    case 'not_beside_object':
    case 'only_person_beside':
    case 'on_object':
    case 'past_beside_object':
      return cl.objectType;
    case 'sitting_in_chair':
    case 'only_person_sitting':
      return 'chair';
    default:
      return null;
  }
}

function collectPresentObjectTypes(board: BoardIndex): Set<string> {
  const present = new Set<string>();
  for (const objs of board.objectsAt.values()) {
    for (const o of objs) {
      present.add(o.type);
    }
  }
  return present;
}

function solutionsMatch(a: CaseSolution, b: CaseSolution): boolean {
  if (a.murdererId !== b.murdererId) return false;
  if (a.victimRoomId !== b.victimRoomId) return false;
  if (a.outlawId !== b.outlawId) return false;
  if (a.uninvolvedId !== b.uninvolvedId) return false;
  if (a.correctPatchId !== b.correctPatchId) return false;
  if (a.liarId !== b.liarId) return false;

  const keysA = Object.keys(a.placements).sort();
  const keysB = Object.keys(b.placements).sort();
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    const k = keysA[i];
    if (k !== keysB[i]) return false;
    if (a.placements[k].r !== b.placements[k].r || a.placements[k].c !== b.placements[k].c) {
      return false;
    }
  }

  if (a.timeSwappedPair || b.timeSwappedPair) {
    if (!a.timeSwappedPair || !b.timeSwappedPair) return false;
    if (
      a.timeSwappedPair[0] !== b.timeSwappedPair[0] ||
      a.timeSwappedPair[1] !== b.timeSwappedPair[1]
    ) {
      return false;
    }
  }

  if (a.roleAssignment || b.roleAssignment) {
    if (!a.roleAssignment || !b.roleAssignment) return false;
    const rkA = Object.keys(a.roleAssignment).sort();
    const rkB = Object.keys(b.roleAssignment).sort();
    if (rkA.length !== rkB.length) return false;
    for (let i = 0; i < rkA.length; i++) {
      if (rkA[i] !== rkB[i] || a.roleAssignment[rkA[i]] !== b.roleAssignment[rkB[i]]) {
        return false;
      }
    }
  }

  return true;
}

export interface CaseIntegrityResult {
  valid: boolean;
  errors: string[];
}

/**
 * Exhaustively verifies a MurdokuCase for mathematical uniqueness, clue consistency,
 * zero confusing/contradictory clauses, asset presence, legal board placements, and
 * accurate Back-of-Book deduction resolution.
 */
export function verifyCaseIntegrity(murdokuCase: MurdokuCase): CaseIntegrityResult {
  const errors: string[] = [];
  const { rows, cols, voidCells = [], rooms, objects, suspects, twist, solution, proofSteps } =
    murdokuCase;

  const patchApply =
    twist.kind === 'missing_piece'
      ? {
          twist,
          patch:
            twist.patches.find((p) => p.id === solution.correctPatchId) ??
            twist.patches.find((p) => p.id === twist.correctPatchId) ??
            twist.patches[0],
        }
      : undefined;

  const board = buildBoardIndex(rows, cols, rooms, objects, voidCells, patchApply);
  const presentObjects = collectPresentObjectTypes(board);
  const suspectsById = Object.fromEntries(suspects.map((s) => [s.id, s]));

  // 1. Exact Unique Solution via CSP solver
  const cspSolutions = solveCSP(
    { rows, cols, voidCells, rooms, objects, suspects, twist },
    { limit: 2 }
  );
  if (cspSolutions.length !== 1) {
    errors.push(`Expected exactly 1 unique CSP solution, got ${cspSolutions.length}.`);
  } else if (!solutionsMatch(cspSolutions[0], solution)) {
    errors.push('Stored case.solution does not match the unique CSP solution.');
  }

  // 2. For missing_piece, verify all 3 decoy patches produce 0 solutions
  if (twist.kind === 'missing_piece') {
    for (const p of twist.patches) {
      const singlePatchTwist: TwistConfig = {
        ...twist,
        patches: [p],
        correctPatchId: p.id,
      };
      const pSols = solveCSP(
        { rows, cols, voidCells, rooms, objects, suspects, twist: singlePatchTwist },
        { limit: 2 }
      );
      if (p.id === solution.correctPatchId) {
        if (pSols.length !== 1) {
          errors.push(`Correct patch ${p.id} yielded ${pSols.length} solutions instead of 1.`);
        }
      } else if (pSols.length !== 0) {
        errors.push(`Decoy patch ${p.id} unexpectedly yielded ${pSols.length} solution(s).`);
      }
    }
  }

  // 3. Validate board legality: open cells, 1-per-row/col, Victim alone with Murderer
  const placedEntries = Object.entries(solution.placements);
  const usedRowsA = new Set<number>();
  const usedColsA = new Set<number>();
  const usedRowsB = new Set<number>();
  const usedColsB = new Set<number>();

  for (const [sid, pos] of placedEntries) {
    if (pos.r < 0 || pos.r >= rows || pos.c < 0 || pos.c >= cols) {
      errors.push(`Suspect ${sid} placed out of bounds at (${pos.r},${pos.c}).`);
      continue;
    }
    if (board.voidMask[pos.r][pos.c]) {
      errors.push(`Suspect ${sid} placed on void cell (${pos.r},${pos.c}).`);
    }
    if (board.blockedMask[pos.r][pos.c]) {
      errors.push(`Suspect ${sid} placed on non-walkable object cell (${pos.r},${pos.c}).`);
    }
    if (!board.roomGrid[pos.r][pos.c]) {
      errors.push(`Suspect ${sid} placed outside any room at (${pos.r},${pos.c}).`);
    }

    const sub = twist.kind === 'split_grids' ? board.subGridGrid[pos.r][pos.c] : 'A';
    if (sub === 'B') {
      if (usedRowsB.has(pos.r)) errors.push(`Duplicate row ${pos.r} in Sub-Grid B.`);
      if (usedColsB.has(pos.c)) errors.push(`Duplicate col ${pos.c} in Sub-Grid B.`);
      usedRowsB.add(pos.r);
      usedColsB.add(pos.c);
    } else {
      if (usedRowsA.has(pos.r)) errors.push(`Duplicate row ${pos.r} in Grid A.`);
      if (usedColsA.has(pos.c)) errors.push(`Duplicate col ${pos.c} in Grid A.`);
      usedRowsA.add(pos.r);
      usedColsA.add(pos.c);
    }
  }

  const vPos = solution.placements['V'];
  if (!vPos) {
    errors.push('Victim V is missing from solution.placements.');
  } else {
    const vRoom = board.roomGrid[vPos.r][vPos.c];
    const inVRoom = placedEntries.filter(([, p]) => board.roomGrid[p.r][p.c] === vRoom);
    if (inVRoom.length !== 2) {
      errors.push(`Victim room ${vRoom} contains ${inVRoom.length} people instead of 2.`);
    } else if (!inVRoom.some(([id]) => id === solution.murdererId)) {
      errors.push(`Murderer ${solution.murdererId} is not in Victim room ${vRoom}.`);
    }
  }

  // 4. Evaluate every suspect's clues + compatibility + text integrity + object existence
  const evalCtx: EvalContext = {
    outlawId: solution.outlawId,
    swappedPair: solution.timeSwappedPair,
    pastPlacements: solution.pastPlacements,
    roleAssignment: solution.roleAssignment,
  };

  if (twist.kind === 'outlaw') {
    if (!solution.outlawId) {
      errors.push('Outlaw twist missing solution.outlawId.');
    } else if (!evaluateOutlawCondition(board, solution.outlawId, solution.placements, twist.condition)) {
      errors.push(`Outlaw ${solution.outlawId} fails public Outlaw condition.`);
    }
    if (twist.condition.kind === 'beside_object' && !presentObjects.has(twist.condition.objectType)) {
      errors.push(`Outlaw condition references absent object "${twist.condition.objectType}".`);
    }
    if (twist.condition.kind === 'sitting_in_chair' && !presentObjects.has('chair')) {
      errors.push('Outlaw condition references chair, but no chair exists on map.');
    }
  }

  if (twist.kind === 'secret_identities') {
    if (!solution.roleAssignment) {
      errors.push('Secret Identities twist missing solution.roleAssignment.');
    } else {
      const holders = new Set<string>();
      for (const role of twist.roles) {
        const holderId = solution.roleAssignment[role.id];
        if (!holderId || holderId === 'V' || !suspectsById[holderId]) {
          errors.push(`Invalid role holder "${holderId}" for role "${role.id}".`);
          continue;
        }
        if (holders.has(holderId)) {
          errors.push(`Suspect ${holderId} assigned multiple secret roles.`);
        }
        holders.add(holderId);
        // Check role clause compatibility & truth
        const seenRoleClauses: ClueClause[] = [];
        for (const cl of role.clauses) {
          if (!areClausesCompatibleOnSuspect(seenRoleClauses, cl)) {
            errors.push(`Role "${role.id}" has incompatible/redundant clauses.`);
          }
          seenRoleClauses.push(cl);
          const objType = getReferencedObjectType(cl);
          if (objType && !presentObjects.has(objType)) {
            errors.push(`Role "${role.id}" references absent object "${objType}".`);
          }
          if (!evaluateClauseFull(board, holderId, cl, solution.placements, evalCtx)) {
            errors.push(`Role "${role.id}" clause ${cl.kind} is FALSE for holder ${holderId}.`);
          }
        }
      }
    }
  }

  for (const s of suspects) {
    const prof = CHARACTER_BY_ID[s.profileId];
    if (!prof) {
      errors.push(`Suspect ${s.id} has unknown profileId "${s.profileId}".`);
    } else if (prof.gender !== s.gender) {
      errors.push(`Suspect ${s.id} gender mismatch (${s.gender} vs ${prof.gender}).`);
    }

    if (!s.clueText.en || s.clueText.en.length < 5 || s.clueText.en.includes('undefined')) {
      errors.push(`Suspect ${s.id} has invalid EN clueText: "${s.clueText.en}".`);
    }
    if (!s.clueText.pt || s.clueText.pt.length < 5 || s.clueText.pt.includes('undefined')) {
      errors.push(`Suspect ${s.id} has invalid PT clueText: "${s.clueText.pt}".`);
    }

    if (s.isVictim) continue;

    // Clause-pair compatibility & sanity
    const seen: ClueClause[] = [];
    for (const cl of s.clauses) {
      if (!areClausesCompatibleOnSuspect(seen, cl)) {
        errors.push(
          `Suspect ${s.id} (${s.name}) has conflicting/redundant clauses: ${JSON.stringify(s.clauses)}`
        );
      }
      seen.push(cl);

      const tId = getTargetPersonId(cl);
      if (tId === s.id) {
        errors.push(`Suspect ${s.id} references themselves in clause ${cl.kind}.`);
      }
      const objType = getReferencedObjectType(cl);
      if (objType && !presentObjects.has(objType)) {
        errors.push(`Suspect ${s.id} (${s.name}) references absent object "${objType}".`);
      }
    }

    if (s.id === solution.uninvolvedId) {
      // Ensure uninvolved clue targets a plausible open square if it specifies in_row + in_col
      const rowCl = s.clauses.find((c) => c.kind === 'in_row');
      const colCl = s.clauses.find((c) => c.kind === 'in_col');
      if (rowCl && colCl && rowCl.kind === 'in_row' && colCl.kind === 'in_col') {
        if (board.voidMask[rowCl.row]?.[colCl.col] || board.blockedMask[rowCl.row]?.[colCl.col]) {
          errors.push(`Uninvolved suspect ${s.id} targets a blocked/void cell (${rowCl.row},${colCl.col}).`);
        }
      }
      continue;
    }

    if (s.id === solution.liarId) {
      if (s.clauses.length === 0) {
        errors.push(`Liar ${s.id} has no clauses.`);
      }
      for (const cl of s.clauses) {
        if (evaluateClauseFull(board, s.id, cl, solution.placements, evalCtx)) {
          errors.push(`Liar ${s.id} (${s.name}) has a TRUE clause (${cl.kind}) instead of false.`);
        }
      }
    } else {
      for (const cl of s.clauses) {
        if (!evaluateClauseFull(board, s.id, cl, solution.placements, evalCtx)) {
          errors.push(
            `Suspect ${s.id} (${s.name}) clause ${JSON.stringify(cl)} evaluates FALSE at solution.`
          );
        }
      }
    }
  }

  // 5. Verify Back-of-Book Resolution (proofSteps) matches exact solution coordinates & murderer
  if (!proofSteps || proofSteps.length < 4) {
    errors.push(`Insufficient proofSteps (${proofSteps?.length ?? 0}).`);
  } else {
    const coordRegex = /(?:([AB]):)?R(\d+)C(\d+)/g;
    for (const step of proofSteps) {
      if (!step.text.en || !step.text.pt) {
        errors.push(`Proof step ${step.stepNumber} has empty text.`);
        continue;
      }
      if (step.focusSuspectId && solution.placements[step.focusSuspectId]) {
        const expected = solution.placements[step.focusSuspectId];
        // Check any coordinate mentioned in the final placement step for this suspect
        const isFinalVictimStep = step === proofSteps[proofSteps.length - 1];
        if (!isFinalVictimStep) {
          const matches = Array.from(step.text.en.matchAll(coordRegex));
          if (matches.length === 1) {
            const [, gridLetter, rStr, cStr] = matches[0];
            const r = Number(rStr) - 1;
            let c = Number(cStr) - 1;
            if (gridLetter === 'B' && twist.kind === 'split_grids') {
              c += twist.grids[1].colOffset;
            }
            if (r !== expected.r || c !== expected.c) {
              errors.push(
                `Proof step ${step.stepNumber} places ${step.focusSuspectId} at (${r},${c}), expected (${expected.r},${expected.c}).`
              );
            }
          }
        }
      }
    }

    const lastStep = proofSteps[proofSteps.length - 1];
    const killerName = suspectsById[solution.murdererId]?.name;
    const victimName = suspectsById['V']?.name;
    if (killerName && (!lastStep.text.en.includes(killerName) || !lastStep.text.pt.includes(killerName))) {
      errors.push(`Final proof step does not name murderer "${killerName}".`);
    }
    if (victimName && (!lastStep.text.en.includes(victimName) || !lastStep.text.pt.includes(victimName))) {
      errors.push(`Final proof step does not name victim "${victimName}".`);
    }
  }

  return { valid: errors.length === 0, errors };
}

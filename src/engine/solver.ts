import type {
  CaseSolution,
  GridCoord,
  MapObject,
  RoomDef,
  SecretRoleDef,
  SplitGridsTwist,
  SuspectDef,
  TwistConfig,
} from './types';
import {
  buildBoardIndex,
  evaluateClauseFull,
  evaluateOutlawCondition,
  evaluateUnaryClause,
  isClausePartiallyConsistent,
  type BoardIndex,
  type EvalContext,
} from './predicates';

export interface SolverInput {
  rows: number;
  cols: number;
  voidCells?: GridCoord[];
  rooms: RoomDef[];
  objects: MapObject[];
  suspects: SuspectDef[];
  twist: TwistConfig;
}

export interface SolveOptions {
  limit?: number;
}

function buildPastPlacements(
  placements: Record<string, GridCoord>,
  swappedPair: [string, string]
): Record<string, GridCoord> {
  const past: Record<string, GridCoord> = { ...placements };
  const [a, b] = swappedPair;
  if (placements[a] && placements[b]) {
    past[a] = placements[b];
    past[b] = placements[a];
  }
  return past;
}

function solveCoreBoard(
  board: BoardIndex,
  activeSuspects: SuspectDef[],
  options: {
    limit: number;
    outlawId?: string;
    outlawCheck?: (placements: Record<string, GridCoord>) => boolean;
    liarId?: string;
    uninvolvedId?: string;
    patchId?: 'A' | 'B' | 'C' | 'D';
    swappedPair?: [string, string];
    splitTwist?: SplitGridsTwist;
    roles?: SecretRoleDef[];
    roleAssignment?: Record<string, string>;
  }
): CaseSolution[] {
  const {
    limit,
    outlawId,
    outlawCheck,
    liarId,
    uninvolvedId,
    patchId,
    swappedPair,
    splitTwist,
    roles,
    roleAssignment,
  } = options;
  const solutions: CaseSolution[] = [];

  // Validate expected suspect count
  if (splitTwist) {
    const expectedTotal = splitTwist.grids[0].rows + splitTwist.grids[1].rows;
    if (activeSuspects.length !== expectedTotal) return solutions;
  } else {
    if (
      activeSuspects.length !== board.activeRows.length ||
      activeSuspects.length !== board.activeCols.length
    ) {
      return solutions;
    }
  }

  const victim = activeSuspects.find((s) => s.isVictim);
  if (!victim) return solutions;

  // Quick pre-check for time_travel static swap constraints
  if (swappedPair) {
    for (const s of activeSuspects) {
      if (s.isVictim) continue;
      for (const cl of s.clauses) {
        if (cl.kind === 'stayed_in_place' && (s.id === swappedPair[0] || s.id === swappedPair[1])) {
          return solutions;
        }
        if (cl.kind === 'moved_in_time' && s.id !== swappedPair[0] && s.id !== swappedPair[1]) {
          return solutions;
        }
      }
    }
  }

  // Quick pre-check for secret_identities static role clauses
  const extraClausesBySuspect: Record<string, typeof activeSuspects[number]['clauses']> = {};
  if (roles && roleAssignment) {
    for (const s of activeSuspects) {
      if (s.isVictim) continue;
      for (const cl of s.clauses) {
        if (cl.kind === 'has_role' && roleAssignment[cl.roleId] !== s.id) return solutions;
        if (cl.kind === 'not_role' && roleAssignment[cl.roleId] === s.id) return solutions;
      }
    }
    for (const role of roles) {
      const holder = roleAssignment[role.id];
      if (!holder) return solutions;
      if (!extraClausesBySuspect[holder]) extraClausesBySuspect[holder] = [];
      extraClausesBySuspect[holder].push(...role.clauses);
    }
  }

  const evalCtx: EvalContext = {
    outlawId,
    swappedPair,
    roleAssignment,
  };

  // Pre-filter candidate open cells per suspect using unary clauses
  const domains: Record<string, GridCoord[]> = {};
  for (const s of activeSuspects) {
    const combinedClauses = extraClausesBySuspect[s.id]
      ? [...s.clauses, ...extraClausesBySuspect[s.id]]
      : s.clauses;

    if (s.id === liarId) {
      if (combinedClauses.length === 1) {
        const c0 = combinedClauses[0];
        domains[s.id] = board.openCells.filter((cell) => {
          const u = evaluateUnaryClause(board, cell, c0);
          return u === null ? true : !u;
        });
      } else {
        domains[s.id] = board.openCells.slice();
      }
    } else {
      const isStationaryInTime =
        swappedPair !== undefined && s.id !== swappedPair[0] && s.id !== swappedPair[1];

      domains[s.id] = board.openCells.filter((cell) => {
        for (const cl of combinedClauses) {
          const u = evaluateUnaryClause(board, cell, cl);
          if (u === false) return false;
          // For stationary suspects in time_travel, past position === present position!
          if (isStationaryInTime) {
            if (cl.kind === 'past_in_room' && board.roomGrid[cell.r][cell.c] !== cl.roomId) {
              return false;
            }
            if (
              cl.kind === 'past_beside_object' &&
              !(board.besideObjects.get(`${cell.r},${cell.c}`)?.has(cl.objectType) ?? false)
            ) {
              return false;
            }
          }
        }
        return true;
      });
    }
    if (domains[s.id].length === 0) return solutions;
  }

  // Sort suspects by smallest domain first (MRV), putting Victim last
  const ordered = activeSuspects.slice().sort((a, b) => {
    if (a.isVictim !== b.isVictim) return a.isVictim ? 1 : -1;
    return domains[a.id].length - domains[b.id].length;
  });

  // For classic/single-grid: 1 global row/col set. For split_grids: independent per-subgrid row/col sets!
  const usedRowsA = new Set<number>();
  const usedColsA = new Set<number>();
  const usedRowsB = new Set<number>();
  const usedColsB = new Set<number>();
  const maxInA = splitTwist ? splitTwist.grids[0].rows : board.activeRows.length;
  const maxInB = splitTwist ? splitTwist.grids[1].rows : 0;
  let countInA = 0;
  let countInB = 0;

  const placements: Record<string, GridCoord> = {};

  function backtrack(idx: number): void {
    if (solutions.length >= limit) return;

    if (idx === ordered.length) {
      if (splitTwist && (countInA !== maxInA || countInB !== maxInB)) return;

      const vPos = placements[victim!.id];
      const vRoom = board.roomGrid[vPos.r][vPos.c];
      if (!vRoom) return;

      // Victim's room must contain EXACTLY 2 people (Victim + Murderer) in the Present
      let murdererId: string | null = null;
      let vRoomCount = 0;
      for (const s of activeSuspects) {
        const p = placements[s.id];
        if (board.roomGrid[p.r][p.c] === vRoom) {
          vRoomCount++;
          if (s.id !== victim!.id) murdererId = s.id;
        }
      }
      if (vRoomCount !== 2 || !murdererId) return;

      if (outlawCheck && !outlawCheck(placements)) return;

      const fullCtx: EvalContext = swappedPair
        ? { ...evalCtx, pastPlacements: buildPastPlacements(placements, swappedPair) }
        : evalCtx;

      // Verify all active suspects' statements
      for (const s of activeSuspects) {
        if (s.isVictim || s.clauses.length === 0) continue;
        if (s.id === liarId) {
          const allFalse = s.clauses.every(
            (cl) => !evaluateClauseFull(board, s.id, cl, placements, fullCtx)
          );
          if (!allFalse) return;
        } else {
          const allTrue = s.clauses.every((cl) =>
            evaluateClauseFull(board, s.id, cl, placements, fullCtx)
          );
          if (!allTrue) return;
        }
      }

      // Verify all secret role clues
      if (roles && roleAssignment) {
        for (const role of roles) {
          const holderId = roleAssignment[role.id];
          if (!holderId) return;
          const roleOk = role.clauses.every((cl) =>
            evaluateClauseFull(board, holderId, cl, placements, fullCtx)
          );
          if (!roleOk) return;
        }
      }

      solutions.push({
        placements: { ...placements },
        murdererId,
        victimRoomId: vRoom,
        ...(outlawId ? { outlawId } : {}),
        ...(uninvolvedId ? { uninvolvedId } : {}),
        ...(patchId ? { correctPatchId: patchId } : {}),
        ...(liarId ? { liarId } : {}),
        ...(swappedPair
          ? {
              timeSwappedPair: swappedPair,
              pastPlacements: fullCtx.pastPlacements,
            }
          : {}),
        ...(roleAssignment ? { roleAssignment: { ...roleAssignment } } : {}),
      });
      return;
    }

    const suspect = ordered[idx];
    const candidates = domains[suspect.id];

    for (let i = 0; i < candidates.length; i++) {
      const cell = candidates[i];
      const sub = splitTwist ? board.subGridGrid[cell.r][cell.c] : 'A';
      if (sub === 'B') {
        if (countInB >= maxInB || usedRowsB.has(cell.r) || usedColsB.has(cell.c)) continue;
      } else {
        if (countInA >= maxInA || usedRowsA.has(cell.r) || usedColsA.has(cell.c)) continue;
      }

      placements[suspect.id] = cell;
      if (sub === 'B') {
        usedRowsB.add(cell.r);
        usedColsB.add(cell.c);
        countInB++;
      } else {
        usedRowsA.add(cell.r);
        usedColsA.add(cell.c);
        countInA++;
      }

      // Partial consistency check for all placed non-liar suspects & their assigned role clues
      let ok = true;
      for (let j = 0; j <= idx; j++) {
        const ps = ordered[j];
        if (ps.isVictim || ps.id === liarId) continue;
        for (const cl of ps.clauses) {
          if (!isClausePartiallyConsistent(board, ps.id, cl, placements, evalCtx)) {
            ok = false;
            break;
          }
        }
        if (!ok) break;
        const rClauses = extraClausesBySuspect[ps.id];
        if (rClauses) {
          for (const cl of rClauses) {
            if (!isClausePartiallyConsistent(board, ps.id, cl, placements, evalCtx)) {
              ok = false;
              break;
            }
          }
          if (!ok) break;
        }
      }

      if (ok) {
        backtrack(idx + 1);
      }

      delete placements[suspect.id];
      if (sub === 'B') {
        usedRowsB.delete(cell.r);
        usedColsB.delete(cell.c);
        countInB--;
      } else {
        usedRowsA.delete(cell.r);
        usedColsA.delete(cell.c);
        countInA--;
      }

      if (solutions.length >= limit) return;
    }
  }

  backtrack(0);
  return solutions;
}

/**
 * Generates all injective assignments mapping `roleIds` -> distinct non-victim `suspectIds`
 * respecting any static `has_role` / `not_role` clauses on suspects.
 */
function enumerateRoleAssignments(
  roleIds: string[],
  nonVictims: SuspectDef[]
): Array<Record<string, string>> {
  const results: Array<Record<string, string>> = [];
  const used = new Set<string>();
  const cur: Record<string, string> = {};

  function dfs(rIdx: number): void {
    if (rIdx === roleIds.length) {
      results.push({ ...cur });
      return;
    }
    const roleId = roleIds[rIdx];
    for (const s of nonVictims) {
      if (used.has(s.id)) continue;
      // Prune obvious static contradictions
      let conflict = false;
      for (const cl of s.clauses) {
        if (cl.kind === 'not_role' && cl.roleId === roleId) conflict = true;
        if (cl.kind === 'has_role' && cl.roleId !== roleId) conflict = true;
      }
      if (conflict) continue;
      // Also if another suspect explicitly has `has_role: roleId`, skip everyone else
      const forcedOther = nonVictims.some(
        (other) => other.id !== s.id && other.clauses.some((cl) => cl.kind === 'has_role' && cl.roleId === roleId)
      );
      if (forcedOther) continue;

      cur[roleId] = s.id;
      used.add(s.id);
      dfs(rIdx + 1);
      used.delete(s.id);
      delete cur[roleId];
    }
  }

  dfs(0);
  return results;
}

/**
 * Exact CSP solver supporting Classic Book 1 rules and ALL Volume 2 & Volume 3 twists:
 * outlaw, uninvolved, missing_piece, liar, time_travel, split_grids, secret_identities.
 */
export function solveCSP(input: SolverInput, options: SolveOptions = {}): CaseSolution[] {
  const limit = options.limit ?? 2;
  const { rows, cols, voidCells = [], rooms, objects, suspects, twist } = input;

  if (twist.kind === 'classic') {
    const board = buildBoardIndex(rows, cols, rooms, objects, voidCells);
    return solveCoreBoard(board, suspects, { limit });
  }

  if (twist.kind === 'outlaw') {
    const board = buildBoardIndex(rows, cols, rooms, objects, voidCells);
    const results: CaseSolution[] = [];
    for (const candidate of suspects) {
      if (candidate.isVictim) continue;
      const found = solveCoreBoard(board, suspects, {
        limit: limit - results.length,
        outlawId: candidate.id,
        outlawCheck: (p) => evaluateOutlawCondition(board, candidate.id, p, twist.condition),
      });
      results.push(...found);
      if (results.length >= limit) break;
    }
    return results;
  }

  if (twist.kind === 'uninvolved') {
    const board = buildBoardIndex(rows, cols, rooms, objects, voidCells);
    const results: CaseSolution[] = [];
    for (const candidate of suspects) {
      if (candidate.isVictim) continue;
      const active = suspects.filter((s) => s.id !== candidate.id);
      const found = solveCoreBoard(board, active, {
        limit: limit - results.length,
        uninvolvedId: candidate.id,
      });
      results.push(...found);
      if (results.length >= limit) break;
    }
    return results;
  }

  if (twist.kind === 'missing_piece') {
    const results: CaseSolution[] = [];
    for (const patch of twist.patches) {
      const board = buildBoardIndex(rows, cols, rooms, objects, voidCells, { twist, patch });
      const found = solveCoreBoard(board, suspects, {
        limit: limit - results.length,
        patchId: patch.id,
      });
      results.push(...found);
      if (results.length >= limit) break;
    }
    return results;
  }

  if (twist.kind === 'liar') {
    const board = buildBoardIndex(rows, cols, rooms, objects, voidCells);
    const results: CaseSolution[] = [];
    for (const candidate of suspects) {
      if (candidate.isVictim) continue;
      const found = solveCoreBoard(board, suspects, {
        limit: limit - results.length,
        liarId: candidate.id,
      });
      results.push(...found);
      if (results.length >= limit) break;
    }
    return results;
  }

  if (twist.kind === 'time_travel') {
    const board = buildBoardIndex(rows, cols, rooms, objects, voidCells);
    const nonVictims = suspects.filter((s) => !s.isVictim);
    const results: CaseSolution[] = [];
    for (let i = 0; i < nonVictims.length; i++) {
      for (let j = i + 1; j < nonVictims.length; j++) {
        const pair: [string, string] = [nonVictims[i].id, nonVictims[j].id];
        const found = solveCoreBoard(board, suspects, {
          limit: limit - results.length,
          swappedPair: pair,
        });
        results.push(...found);
        if (results.length >= limit) return results;
      }
    }
    return results;
  }

  if (twist.kind === 'split_grids') {
    const board = buildBoardIndex(rows, cols, rooms, objects, voidCells);
    return solveCoreBoard(board, suspects, {
      limit,
      splitTwist: twist,
    });
  }

  if (twist.kind === 'secret_identities') {
    const board = buildBoardIndex(rows, cols, rooms, objects, voidCells);
    const nonVictims = suspects.filter((s) => !s.isVictim);
    const roleIds = twist.roles.map((r) => r.id);
    const assignments = enumerateRoleAssignments(roleIds, nonVictims);
    const results: CaseSolution[] = [];
    for (const roleAssignment of assignments) {
      const found = solveCoreBoard(board, suspects, {
        limit: limit - results.length,
        roles: twist.roles,
        roleAssignment,
      });
      results.push(...found);
      if (results.length >= limit) break;
    }
    return results;
  }

  return [];
}

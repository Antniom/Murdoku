import type {
  CaseSolution,
  GridCoord,
  MapObject,
  RoomDef,
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
  }
): CaseSolution[] {
  const { limit, outlawId, outlawCheck, liarId, uninvolvedId, patchId } = options;
  const solutions: CaseSolution[] = [];

  // Must match N-rooks count: activeSuspects.length === board.activeRows.length === board.activeCols.length
  if (
    activeSuspects.length !== board.activeRows.length ||
    activeSuspects.length !== board.activeCols.length
  ) {
    return solutions;
  }

  const victim = activeSuspects.find((s) => s.isVictim);
  if (!victim) return solutions;

  // Pre-filter candidate open cells per suspect using unary clauses (skipping the liar's unary clauses)
  const domains: Record<string, GridCoord[]> = {};
  for (const s of activeSuspects) {
    if (s.id === liarId) {
      // Liar's conjunction of clauses must be FALSE, so if they only have 1 unary clause we can even pre-filter!
      if (s.clauses.length === 1) {
        const c0 = s.clauses[0];
        domains[s.id] = board.openCells.filter((cell) => {
          const u = evaluateUnaryClause(board, cell, c0);
          return u === null ? true : !u;
        });
      } else {
        domains[s.id] = board.openCells.slice();
      }
    } else {
      domains[s.id] = board.openCells.filter((cell) => {
        for (const cl of s.clauses) {
          const u = evaluateUnaryClause(board, cell, cl);
          if (u === false) return false;
        }
        return true;
      });
    }
    if (domains[s.id].length === 0) return solutions;
  }

  // Sort suspects by smallest domain first (MRV), putting Victim last so Victim-room pair checks cleanly
  const ordered = activeSuspects.slice().sort((a, b) => {
    if (a.isVictim !== b.isVictim) return a.isVictim ? 1 : -1;
    return domains[a.id].length - domains[b.id].length;
  });

  const usedRows = new Set<number>();
  const usedCols = new Set<number>();
  const placements: Record<string, GridCoord> = {};

  function backtrack(idx: number): void {
    if (solutions.length >= limit) return;

    if (idx === ordered.length) {
      // Final full verification
      const vPos = placements[victim!.id];
      const vRoom = board.roomGrid[vPos.r][vPos.c];
      if (!vRoom) return;

      // Victim's room must contain EXACTLY 2 people (Victim + Murderer)
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

      // Outlaw condition check
      if (outlawCheck && !outlawCheck(placements)) return;

      // Verify all active suspects' statements (liar must have statement === false, others === true)
      for (const s of activeSuspects) {
        if (s.isVictim || s.clauses.length === 0) continue;
        const allTrue = s.clauses.every((cl) =>
          evaluateClauseFull(board, s.id, cl, placements, outlawId)
        );
        if (s.id === liarId) {
          if (allTrue) return; // Liar's statement MUST be false
        } else {
          if (!allTrue) return;
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
      });
      return;
    }

    const suspect = ordered[idx];
    const candidates = domains[suspect.id];

    for (let i = 0; i < candidates.length; i++) {
      const cell = candidates[i];
      if (usedRows.has(cell.r) || usedCols.has(cell.c)) continue;

      placements[suspect.id] = cell;
      usedRows.add(cell.r);
      usedCols.add(cell.c);

      // Partial consistency check for all placed non-liar suspects
      let ok = true;
      for (let j = 0; j <= idx; j++) {
        const ps = ordered[j];
        if (ps.isVictim || ps.id === liarId) continue;
        for (const cl of ps.clauses) {
          if (!isClausePartiallyConsistent(board, ps.id, cl, placements, outlawId)) {
            ok = false;
            break;
          }
        }
        if (!ok) break;
      }

      if (ok) {
        backtrack(idx + 1);
      }

      delete placements[suspect.id];
      usedRows.delete(cell.r);
      usedCols.delete(cell.c);

      if (solutions.length >= limit) return;
    }
  }

  backtrack(0);
  return solutions;
}

/**
 * Exact CSP solver supporting Classic Book 1 rules and all 4 Book 2/3 twists.
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

  return [];
}

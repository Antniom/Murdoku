import type {
  ClueClause,
  GridCoord,
  MapObject,
  MapPatchOption,
  MissingPieceTwist,
  OutlawCondition,
  RoomDef,
} from './types';

export interface BoardIndex {
  rows: number;
  cols: number;
  voidMask: boolean[][];
  roomGrid: (string | null)[][];
  subGridGrid: ('A' | 'B' | null)[][];
  blockedMask: boolean[][];
  objectsAt: Map<string, MapObject[]>;
  /** All cells where a person is legally allowed to stand/sit */
  openCells: GridCoord[];
  /** Active (non-void) rows and cols */
  activeRows: number[];
  activeCols: number[];
  /** Precomputed set of object types orthogonally adjacent IN THE SAME ROOM for each cell */
  besideObjects: Map<string, Set<string>>;
  /** Precomputed set of object types ON the cell (walkable objects like chair, bed, carpet) */
  onObjects: Map<string, Set<string>>;
  /** Precomputed whether cell is in a room corner (at least 2 perpendicular walls/edges) */
  inCorner: boolean[][];
  /** Precomputed whether cell touches any room wall or outer boundary */
  besideWall: boolean[][];
}

export interface EvalContext {
  outlawId?: string;
  pastPlacements?: Record<string, GridCoord>;
  swappedPair?: [string, string];
  /** Map of roleId -> suspectId */
  roleAssignment?: Record<string, string>;
}

export function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

export function buildBoardIndex(
  rows: number,
  cols: number,
  rooms: RoomDef[],
  objects: MapObject[],
  voidCells: GridCoord[] = [],
  patchApply?: { twist: MissingPieceTwist; patch: MapPatchOption }
): BoardIndex {
  const voidMask: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  for (const v of voidCells) {
    if (v.r >= 0 && v.r < rows && v.c >= 0 && v.c < cols) {
      voidMask[v.r][v.c] = true;
    }
  }

  const roomGrid: (string | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  const subGridGrid: ('A' | 'B' | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (const room of rooms) {
    for (const cell of room.cells) {
      if (cell.r >= 0 && cell.r < rows && cell.c >= 0 && cell.c < cols && !voidMask[cell.r][cell.c]) {
        roomGrid[cell.r][cell.c] = room.id;
        subGridGrid[cell.r][cell.c] = room.subGridId ?? null;
      }
    }
  }

  // Merge objects, replacing patch region if missing_piece patch is applied
  let effectiveObjects = objects;
  if (patchApply) {
    const { twist, patch } = patchApply;
    const inPatch = (r: number, c: number) =>
      r >= twist.originR &&
      r < twist.originR + twist.height &&
      c >= twist.originC &&
      c < twist.originC + twist.width;

    effectiveObjects = objects.filter((o) => !inPatch(o.r, o.c)).concat(patch.objects);

    if (patch.roomOverrides) {
      for (const [k, roomId] of Object.entries(patch.roomOverrides)) {
        const [rs, cs] = k.split(',').map(Number);
        if (rs >= 0 && rs < rows && cs >= 0 && cs < cols && !voidMask[rs][cs]) {
          roomGrid[rs][cs] = roomId;
        }
      }
    }
  }

  const blockedMask: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const objectsAt = new Map<string, MapObject[]>();
  const onObjects = new Map<string, Set<string>>();

  for (const obj of effectiveObjects) {
    if (obj.r < 0 || obj.r >= rows || obj.c < 0 || obj.c >= cols || voidMask[obj.r][obj.c]) continue;
    const k = cellKey(obj.r, obj.c);
    if (!objectsAt.has(k)) objectsAt.set(k, []);
    objectsAt.get(k)!.push(obj);
    if (!onObjects.has(k)) onObjects.set(k, new Set());
    onObjects.get(k)!.add(obj.type);
    if (!obj.walkable) {
      blockedMask[obj.r][obj.c] = true;
    }
  }

  const openCells: GridCoord[] = [];
  const activeRowSet = new Set<number>();
  const activeColSet = new Set<number>();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!voidMask[r][c] && roomGrid[r][c] !== null) {
        activeRowSet.add(r);
        activeColSet.add(c);
        if (!blockedMask[r][c]) {
          openCells.push({ r, c });
        }
      }
    }
  }

  const besideObjects = new Map<string, Set<string>>();
  const inCorner: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const besideWall: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

  const dirs = [
    [-1, 0], // N
    [0, 1], // E
    [1, 0], // S
    [0, -1], // W
  ];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const room = roomGrid[r][c];
      if (voidMask[r][c] || room === null) continue;
      const k = cellKey(r, c);
      const adjObjs = new Set<string>();
      const wallFlags: boolean[] = [false, false, false, false];

      for (let d = 0; d < 4; d++) {
        const nr = r + dirs[d][0];
        const nc = c + dirs[d][1];
        const sameRoom =
          nr >= 0 &&
          nr < rows &&
          nc >= 0 &&
          nc < cols &&
          !voidMask[nr][nc] &&
          roomGrid[nr][nc] === room;

        if (!sameRoom) {
          wallFlags[d] = true;
        } else {
          const nObjs = objectsAt.get(cellKey(nr, nc));
          if (nObjs) {
            for (const o of nObjs) {
              adjObjs.add(o.type);
            }
          }
        }
      }

      besideObjects.set(k, adjObjs);
      besideWall[r][c] = wallFlags.some(Boolean);
      inCorner[r][c] =
        (wallFlags[0] && wallFlags[1]) ||
        (wallFlags[1] && wallFlags[2]) ||
        (wallFlags[2] && wallFlags[3]) ||
        (wallFlags[3] && wallFlags[0]);
    }
  }

  return {
    rows,
    cols,
    voidMask,
    roomGrid,
    subGridGrid,
    blockedMask,
    objectsAt,
    openCells,
    activeRows: Array.from(activeRowSet).sort((a, b) => a - b),
    activeCols: Array.from(activeColSet).sort((a, b) => a - b),
    besideObjects,
    onObjects,
    inCorner,
    besideWall,
  };
}

export function areSameRoomOrthogonal(board: BoardIndex, a: GridCoord, b: GridCoord): boolean {
  const dist = Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
  if (dist !== 1) return false;
  const rA = board.roomGrid[a.r][a.c];
  const rB = board.roomGrid[b.r][b.c];
  return rA !== null && rA === rB;
}

/**
 * Evaluates a unary (single-cell) clause immediately without knowing other suspects.
 * Returns null if the clause depends on other suspects' positions or twist context.
 */
export function evaluateUnaryClause(
  board: BoardIndex,
  pos: GridCoord,
  clause: ClueClause
): boolean | null {
  const k = cellKey(pos.r, pos.c);
  const room = board.roomGrid[pos.r][pos.c];

  switch (clause.kind) {
    case 'in_room':
      return room === clause.roomId;
    case 'not_in_room':
      return room !== clause.roomId;
    case 'in_subgrid':
      return board.subGridGrid[pos.r][pos.c] === clause.gridId;
    case 'beside_object':
      return board.besideObjects.get(k)?.has(clause.objectType) ?? false;
    case 'not_beside_object':
      return !(board.besideObjects.get(k)?.has(clause.objectType) ?? false);
    case 'sitting_in_chair':
      return board.onObjects.get(k)?.has('chair') ?? false;
    case 'on_object':
      return board.onObjects.get(k)?.has(clause.objectType) ?? false;
    case 'in_row':
      return pos.r === clause.row;
    case 'in_col':
      return pos.c === clause.col;
    case 'in_room_corner':
      return board.inCorner[pos.r][pos.c];
    case 'not_beside_wall':
      return !board.besideWall[pos.r][pos.c];
    default:
      return null;
  }
}

export function evaluateOutlawCondition(
  board: BoardIndex,
  outlawId: string,
  placements: Record<string, GridCoord>,
  condition: OutlawCondition
): boolean {
  const pos = placements[outlawId];
  if (!pos) return false;
  const k = cellKey(pos.r, pos.c);

  switch (condition.kind) {
    case 'sitting_in_chair':
      return board.onObjects.get(k)?.has('chair') ?? false;
    case 'beside_object':
      return board.besideObjects.get(k)?.has(condition.objectType) ?? false;
    case 'in_room_corner':
      return board.inCorner[pos.r][pos.c];
    case 'in_row':
      return pos.r === condition.row;
    case 'in_col':
      return pos.c === condition.col;
    case 'alone_in_room': {
      const room = board.roomGrid[pos.r][pos.c];
      let count = 0;
      for (const p of Object.values(placements)) {
        if (board.roomGrid[p.r][p.c] === room) count++;
      }
      return count === 1;
    }
  }
}

function normalizeCtx(ctxOrOutlaw?: string | EvalContext): EvalContext {
  if (!ctxOrOutlaw) return {};
  if (typeof ctxOrOutlaw === 'string') return { outlawId: ctxOrOutlaw };
  return ctxOrOutlaw;
}

/**
 * Evaluates a single ClueClause against a complete placement assignment.
 */
export function evaluateClauseFull(
  board: BoardIndex,
  suspectId: string,
  clause: ClueClause,
  placements: Record<string, GridCoord>,
  ctxOrOutlaw?: string | EvalContext
): boolean {
  const pos = placements[suspectId];
  if (!pos) return false;

  const unary = evaluateUnaryClause(board, pos, clause);
  if (unary !== null) return unary;

  const ctx = normalizeCtx(ctxOrOutlaw);
  const { outlawId, pastPlacements, swappedPair, roleAssignment } = ctx;
  const myRoom = board.roomGrid[pos.r][pos.c];
  const mySub = board.subGridGrid[pos.r][pos.c];
  const allEntries = Object.entries(placements);

  switch (clause.kind) {
    case 'same_room_as': {
      const other = placements[clause.targetId];
      if (!other) return false;
      return myRoom !== null && myRoom === board.roomGrid[other.r][other.c];
    }
    case 'alone_in_room': {
      let count = 0;
      for (const [, p] of allEntries) {
        if (board.roomGrid[p.r][p.c] === myRoom) count++;
      }
      return count === 1;
    }
    case 'room_occupant_count': {
      let count = 0;
      for (const [, p] of allEntries) {
        if (board.roomGrid[p.r][p.c] === myRoom) count++;
      }
      return count === clause.count;
    }
    case 'beside_person': {
      const other = placements[clause.targetId];
      if (!other) return false;
      return areSameRoomOrthogonal(board, pos, other);
    }
    case 'not_beside_person': {
      const other = placements[clause.targetId];
      if (!other) return true;
      return !areSameRoomOrthogonal(board, pos, other);
    }
    case 'north_of': {
      const other = placements[clause.targetId];
      if (!other) return false;
      if (mySub !== null && board.subGridGrid[other.r][other.c] !== mySub) return false;
      return pos.r < other.r;
    }
    case 'south_of': {
      const other = placements[clause.targetId];
      if (!other) return false;
      if (mySub !== null && board.subGridGrid[other.r][other.c] !== mySub) return false;
      return pos.r > other.r;
    }
    case 'east_of': {
      const other = placements[clause.targetId];
      if (!other) return false;
      if (mySub !== null && board.subGridGrid[other.r][other.c] !== mySub) return false;
      return pos.c > other.c;
    }
    case 'west_of': {
      const other = placements[clause.targetId];
      if (!other) return false;
      if (mySub !== null && board.subGridGrid[other.r][other.c] !== mySub) return false;
      return pos.c < other.c;
    }
    case 'same_diagonal': {
      const other = placements[clause.targetId];
      if (!other) return false;
      if (mySub !== null && board.subGridGrid[other.r][other.c] !== mySub) return false;
      return Math.abs(pos.r - other.r) === Math.abs(pos.c - other.c) && (pos.r !== other.r || pos.c !== other.c);
    }
    case 'only_person_beside': {
      const mine = board.besideObjects.get(cellKey(pos.r, pos.c))?.has(clause.objectType) ?? false;
      if (!mine) return false;
      for (const [id, p] of allEntries) {
        if (id === suspectId) continue;
        if (board.besideObjects.get(cellKey(p.r, p.c))?.has(clause.objectType)) {
          return false;
        }
      }
      return true;
    }
    case 'only_person_sitting': {
      const mine = board.onObjects.get(cellKey(pos.r, pos.c))?.has('chair') ?? false;
      if (!mine) return false;
      for (const [id, p] of allEntries) {
        if (id === suspectId) continue;
        if (board.onObjects.get(cellKey(p.r, p.c))?.has('chair')) {
          return false;
        }
      }
      return true;
    }
    // Outlaw clauses
    case 'not_the_outlaw':
      return outlawId !== undefined && suspectId !== outlawId;
    case 'same_room_as_outlaw': {
      if (!outlawId || suspectId === outlawId) return false;
      const op = placements[outlawId];
      if (!op) return false;
      return myRoom !== null && myRoom === board.roomGrid[op.r][op.c];
    }
    case 'not_same_room_as_outlaw': {
      if (!outlawId || suspectId === outlawId) return false;
      const op = placements[outlawId];
      if (!op) return false;
      return myRoom !== board.roomGrid[op.r][op.c];
    }
    case 'north_of_outlaw': {
      if (!outlawId || suspectId === outlawId) return false;
      const op = placements[outlawId];
      return !!op && pos.r < op.r;
    }
    case 'south_of_outlaw': {
      if (!outlawId || suspectId === outlawId) return false;
      const op = placements[outlawId];
      return !!op && pos.r > op.r;
    }
    case 'east_of_outlaw': {
      if (!outlawId || suspectId === outlawId) return false;
      const op = placements[outlawId];
      return !!op && pos.c > op.c;
    }
    case 'west_of_outlaw': {
      if (!outlawId || suspectId === outlawId) return false;
      const op = placements[outlawId];
      return !!op && pos.c < op.c;
    }
    case 'beside_outlaw': {
      if (!outlawId || suspectId === outlawId) return false;
      const op = placements[outlawId];
      return !!op && areSameRoomOrthogonal(board, pos, op);
    }
    // Volume 2: Time Travel clauses
    case 'stayed_in_place': {
      if (!swappedPair) return false;
      return suspectId !== swappedPair[0] && suspectId !== swappedPair[1];
    }
    case 'moved_in_time': {
      if (!swappedPair) return false;
      return suspectId === swappedPair[0] || suspectId === swappedPair[1];
    }
    case 'past_in_room': {
      const pp = pastPlacements?.[suspectId];
      if (!pp) return false;
      return board.roomGrid[pp.r][pp.c] === clause.roomId;
    }
    case 'past_beside_object': {
      const pp = pastPlacements?.[suspectId];
      if (!pp) return false;
      return board.besideObjects.get(cellKey(pp.r, pp.c))?.has(clause.objectType) ?? false;
    }
    case 'past_same_room_as': {
      const pp = pastPlacements?.[suspectId];
      const op = pastPlacements?.[clause.targetId];
      if (!pp || !op) return false;
      const r1 = board.roomGrid[pp.r][pp.c];
      return r1 !== null && r1 === board.roomGrid[op.r][op.c];
    }
    // Volume 3: Multiple Grids clauses
    case 'same_subgrid_as': {
      const other = placements[clause.targetId];
      if (!other || mySub === null) return false;
      return mySub === board.subGridGrid[other.r][other.c];
    }
    case 'different_subgrid_from': {
      const other = placements[clause.targetId];
      if (!other || mySub === null) return false;
      return mySub !== board.subGridGrid[other.r][other.c];
    }
    // Volume 3: Secret Identities clauses
    case 'has_role': {
      return roleAssignment?.[clause.roleId] === suspectId;
    }
    case 'not_role': {
      return roleAssignment !== undefined && roleAssignment[clause.roleId] !== suspectId;
    }
    case 'same_room_as_role': {
      const holderId = roleAssignment?.[clause.roleId];
      if (!holderId || holderId === suspectId) return false;
      const hp = placements[holderId];
      return !!hp && myRoom !== null && myRoom === board.roomGrid[hp.r][hp.c];
    }
    case 'north_of_role': {
      const holderId = roleAssignment?.[clause.roleId];
      if (!holderId || holderId === suspectId) return false;
      const hp = placements[holderId];
      return !!hp && pos.r < hp.r;
    }
    case 'south_of_role': {
      const holderId = roleAssignment?.[clause.roleId];
      if (!holderId || holderId === suspectId) return false;
      const hp = placements[holderId];
      return !!hp && pos.r > hp.r;
    }
    case 'east_of_role': {
      const holderId = roleAssignment?.[clause.roleId];
      if (!holderId || holderId === suspectId) return false;
      const hp = placements[holderId];
      return !!hp && pos.c > hp.c;
    }
    case 'west_of_role': {
      const holderId = roleAssignment?.[clause.roleId];
      if (!holderId || holderId === suspectId) return false;
      const hp = placements[holderId];
      return !!hp && pos.c < hp.c;
    }
    default:
      return false;
  }
}

/**
 * Partial consistency check during CSP backtracking (for speed).
 * Returns false if a clause is already provably violated by currently placed suspects.
 */
export function isClausePartiallyConsistent(
  board: BoardIndex,
  suspectId: string,
  clause: ClueClause,
  placements: Record<string, GridCoord>,
  ctxOrOutlaw?: string | EvalContext
): boolean {
  const pos = placements[suspectId];
  if (!pos) return true;

  const unary = evaluateUnaryClause(board, pos, clause);
  if (unary !== null) return unary;

  const ctx = normalizeCtx(ctxOrOutlaw);
  const { outlawId, swappedPair, roleAssignment } = ctx;
  const myRoom = board.roomGrid[pos.r][pos.c];
  const mySub = board.subGridGrid[pos.r][pos.c];

  // For Time Travel, compute pastPos for suspectId if available!
  const getPastPos = (id: string): GridCoord | undefined => {
    if (!swappedPair) return undefined;
    if (id === swappedPair[0]) return placements[swappedPair[1]];
    if (id === swappedPair[1]) return placements[swappedPair[0]];
    return placements[id];
  };

  switch (clause.kind) {
    case 'same_room_as': {
      const other = placements[clause.targetId];
      if (!other) return true;
      return myRoom === board.roomGrid[other.r][other.c];
    }
    case 'alone_in_room': {
      for (const [id, p] of Object.entries(placements)) {
        if (id !== suspectId && board.roomGrid[p.r][p.c] === myRoom) return false;
      }
      return true;
    }
    case 'room_occupant_count': {
      let count = 0;
      for (const p of Object.values(placements)) {
        if (board.roomGrid[p.r][p.c] === myRoom) count++;
      }
      return count <= clause.count;
    }
    case 'beside_person': {
      const other = placements[clause.targetId];
      if (!other) return true;
      return areSameRoomOrthogonal(board, pos, other);
    }
    case 'not_beside_person': {
      const other = placements[clause.targetId];
      if (!other) return true;
      return !areSameRoomOrthogonal(board, pos, other);
    }
    case 'north_of': {
      const other = placements[clause.targetId];
      if (!other) return true;
      if (mySub !== null && board.subGridGrid[other.r][other.c] !== mySub) return false;
      return pos.r < other.r;
    }
    case 'south_of': {
      const other = placements[clause.targetId];
      if (!other) return true;
      if (mySub !== null && board.subGridGrid[other.r][other.c] !== mySub) return false;
      return pos.r > other.r;
    }
    case 'east_of': {
      const other = placements[clause.targetId];
      if (!other) return true;
      if (mySub !== null && board.subGridGrid[other.r][other.c] !== mySub) return false;
      return pos.c > other.c;
    }
    case 'west_of': {
      const other = placements[clause.targetId];
      if (!other) return true;
      if (mySub !== null && board.subGridGrid[other.r][other.c] !== mySub) return false;
      return pos.c < other.c;
    }
    case 'same_diagonal': {
      const other = placements[clause.targetId];
      if (!other) return true;
      if (mySub !== null && board.subGridGrid[other.r][other.c] !== mySub) return false;
      return Math.abs(pos.r - other.r) === Math.abs(pos.c - other.c);
    }
    case 'only_person_beside': {
      const mine = board.besideObjects.get(cellKey(pos.r, pos.c))?.has(clause.objectType) ?? false;
      if (!mine) return false;
      for (const [id, p] of Object.entries(placements)) {
        if (id !== suspectId && board.besideObjects.get(cellKey(p.r, p.c))?.has(clause.objectType)) {
          return false;
        }
      }
      return true;
    }
    case 'only_person_sitting': {
      const mine = board.onObjects.get(cellKey(pos.r, pos.c))?.has('chair') ?? false;
      if (!mine) return false;
      for (const [id, p] of Object.entries(placements)) {
        if (id !== suspectId && board.onObjects.get(cellKey(p.r, p.c))?.has('chair')) {
          return false;
        }
      }
      return true;
    }
    case 'not_the_outlaw':
      return outlawId === undefined || suspectId !== outlawId;
    case 'same_room_as_outlaw': {
      if (!outlawId) return true;
      if (suspectId === outlawId) return false;
      const op = placements[outlawId];
      if (!op) return true;
      return myRoom === board.roomGrid[op.r][op.c];
    }
    case 'not_same_room_as_outlaw': {
      if (!outlawId) return true;
      if (suspectId === outlawId) return false;
      const op = placements[outlawId];
      if (!op) return true;
      return myRoom !== board.roomGrid[op.r][op.c];
    }
    case 'north_of_outlaw': {
      if (!outlawId) return true;
      if (suspectId === outlawId) return false;
      const op = placements[outlawId];
      return !op || pos.r < op.r;
    }
    case 'south_of_outlaw': {
      if (!outlawId) return true;
      if (suspectId === outlawId) return false;
      const op = placements[outlawId];
      return !op || pos.r > op.r;
    }
    case 'east_of_outlaw': {
      if (!outlawId) return true;
      if (suspectId === outlawId) return false;
      const op = placements[outlawId];
      return !op || pos.c > op.c;
    }
    case 'west_of_outlaw': {
      if (!outlawId) return true;
      if (suspectId === outlawId) return false;
      const op = placements[outlawId];
      return !op || pos.c < op.c;
    }
    case 'beside_outlaw': {
      if (!outlawId) return true;
      if (suspectId === outlawId) return false;
      const op = placements[outlawId];
      return !op || areSameRoomOrthogonal(board, pos, op);
    }
    // Volume 2: Time Travel
    case 'stayed_in_place':
      return !swappedPair || (suspectId !== swappedPair[0] && suspectId !== swappedPair[1]);
    case 'moved_in_time':
      return !swappedPair || suspectId === swappedPair[0] || suspectId === swappedPair[1];
    case 'past_in_room': {
      const pp = getPastPos(suspectId);
      if (!pp) return true;
      return board.roomGrid[pp.r][pp.c] === clause.roomId;
    }
    case 'past_beside_object': {
      const pp = getPastPos(suspectId);
      if (!pp) return true;
      return board.besideObjects.get(cellKey(pp.r, pp.c))?.has(clause.objectType) ?? false;
    }
    case 'past_same_room_as': {
      const pp = getPastPos(suspectId);
      const op = getPastPos(clause.targetId);
      if (!pp || !op) return true;
      return board.roomGrid[pp.r][pp.c] === board.roomGrid[op.r][op.c];
    }
    // Volume 3: Multiple Grids
    case 'same_subgrid_as': {
      const other = placements[clause.targetId];
      if (!other || mySub === null) return true;
      return mySub === board.subGridGrid[other.r][other.c];
    }
    case 'different_subgrid_from': {
      const other = placements[clause.targetId];
      if (!other || mySub === null) return true;
      return mySub !== board.subGridGrid[other.r][other.c];
    }
    // Volume 3: Secret Identities
    case 'has_role':
      return !roleAssignment || roleAssignment[clause.roleId] === suspectId;
    case 'not_role':
      return !roleAssignment || roleAssignment[clause.roleId] !== suspectId;
    case 'same_room_as_role': {
      const holderId = roleAssignment?.[clause.roleId];
      if (!holderId) return true;
      if (holderId === suspectId) return false;
      const hp = placements[holderId];
      return !hp || myRoom === board.roomGrid[hp.r][hp.c];
    }
    case 'north_of_role': {
      const holderId = roleAssignment?.[clause.roleId];
      if (!holderId) return true;
      if (holderId === suspectId) return false;
      const hp = placements[holderId];
      return !hp || pos.r < hp.r;
    }
    case 'south_of_role': {
      const holderId = roleAssignment?.[clause.roleId];
      if (!holderId) return true;
      if (holderId === suspectId) return false;
      const hp = placements[holderId];
      return !hp || pos.r > hp.r;
    }
    case 'east_of_role': {
      const holderId = roleAssignment?.[clause.roleId];
      if (!holderId) return true;
      if (holderId === suspectId) return false;
      const hp = placements[holderId];
      return !hp || pos.c > hp.c;
    }
    case 'west_of_role': {
      const holderId = roleAssignment?.[clause.roleId];
      if (!holderId) return true;
      if (holderId === suspectId) return false;
      const hp = placements[holderId];
      return !hp || pos.c < hp.c;
    }
    default:
      return true;
  }
}

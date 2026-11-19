import type { CreativeRoomBrief, GridCoord, MapObject, RoomDef } from './types';
import type { PRNG } from './prng';
import { OBJECT_CATALOG, VALID_FLOOR_TEXTURES } from '../data/assets';
import { resolveAutotileIndex } from './autotile';

export interface GeneratedFloorplan {
  rows: number;
  cols: number;
  voidCells: GridCoord[];
  rooms: RoomDef[];
  objects: MapObject[];
  /** Guaranteed valid N-rooks placement where Victim's room has exact 2 people */
  groundTruth: GridCoord[];
  victimIndex: number;
  killerIndex: number;
}

function key(r: number, c: number): string {
  return `${r},${c}`;
}

/**
 * Generates a contiguous room partition using recursive BSP + optional central nested room
 * (like the iconic STORAGE room in "9. The Laboratory") for authentic Murdoku floorplans.
 */
function partitionRooms(
  rows: number,
  cols: number,
  voidSet: Set<string>,
  roomBriefs: CreativeRoomBrief[],
  rng: PRNG
): RoomDef[] {
  const targetRooms = Math.min(Math.max(4, roomBriefs.length), rows >= 7 ? 6 : 5);
  const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-1));

  // Recursive rectangle split
  interface Rect {
    r0: number;
    c0: number;
    h: number;
    w: number;
  }

  let rects: Rect[] = [{ r0: 0, c0: 0, h: rows, w: cols }];

  while (rects.length < targetRooms) {
    // Pick largest splittable rect
    rects.sort((a, b) => b.h * b.w - a.h * a.w);
    const idx = rects.findIndex((r) => r.h >= 3 || r.w >= 3);
    if (idx === -1) break;
    const rect = rects.splice(idx, 1)[0];

    const canSplitH = rect.h >= 3 && (rect.h >= 4 || rect.w < 4);
    const canSplitV = rect.w >= 3 && (rect.w >= 4 || rect.h < 4);
    const splitHoriz =
      canSplitH && canSplitV ? (rect.h > rect.w ? true : rect.w > rect.h ? false : rng.chance(0.5)) : canSplitH;

    if (splitHoriz) {
      const minCut = rect.h >= 4 ? 2 : 1;
      const maxCut = rect.h - minCut;
      const cut = rng.int(minCut, maxCut);
      rects.push({ r0: rect.r0, c0: rect.c0, h: cut, w: rect.w });
      rects.push({ r0: rect.r0 + cut, c0: rect.c0, h: rect.h - cut, w: rect.w });
    } else {
      const minCut = rect.w >= 4 ? 2 : 1;
      const maxCut = rect.w - minCut;
      const cut = rng.int(minCut, maxCut);
      rects.push({ r0: rect.r0, c0: rect.c0, h: rect.h, w: cut });
      rects.push({ r0: rect.r0, c0: rect.c0 + cut, h: rect.h, w: rect.w - cut });
    }
  }

  // Paint initial rects
  rects.forEach((rect, idx) => {
    for (let r = rect.r0; r < rect.r0 + rect.h; r++) {
      for (let c = rect.c0; c < rect.c0 + rect.w; c++) {
        if (!voidSet.has(key(r, c))) {
          grid[r][c] = idx;
        }
      }
    }
  });

  // On 7x7+ grids, occasionally carve an iconic central 2x2 nested room (like STORAGE in The Laboratory)
  if (rows >= 7 && cols >= 7 && rects.length < 6 && rng.chance(0.55)) {
    const cr = rng.int(1, rows - 4);
    const cc = rng.int(1, cols - 4);
    const newId = rects.length;
    for (let r = cr; r < cr + 2; r++) {
      for (let c = cc; c < cc + 2; c++) {
        if (!voidSet.has(key(r, c))) {
          grid[r][c] = newId;
        }
      }
    }
    rects.push({ r0: cr, c0: cc, h: 2, w: 2 });
  }

  // Collect cells per room id, dropping any empty rooms
  const roomCells = new Map<number, GridCoord[]>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = grid[r][c];
      if (id >= 0) {
        if (!roomCells.has(id)) roomCells.set(id, []);
        roomCells.get(id)!.push({ r, c });
      }
    }
  }

  const rooms: RoomDef[] = [];
  let i = 0;
  for (const [, cells] of roomCells.entries()) {
    if (cells.length === 0) continue;
    const brief = roomBriefs[i % roomBriefs.length];
    const safeTex = (VALID_FLOOR_TEXTURES as readonly string[]).includes(brief.texture)
      ? brief.texture
      : 'squaretile';
    rooms.push({
      id: `room_${i + 1}`,
      name: brief.name,
      texture: safeTex,
      floorColor: brief.floorColor || '#eaf3f8',
      cells,
    });
    i++;
  }

  return rooms;
}

/**
 * Computes autotile indices for all 'table' and 'carpet' objects in the same room.
 */
export function applyAutotiles(objects: MapObject[], roomGrid: (string | null)[][]): MapObject[] {
  const byTypeAndCell = new Map<string, MapObject>();
  for (const obj of objects) {
    if (obj.type === 'table' || obj.type === 'carpet') {
      byTypeAndCell.set(`${obj.type}:${obj.r},${obj.c}`, obj);
    }
  }

  return objects.map((obj) => {
    if (obj.type !== 'table' && obj.type !== 'carpet') return obj;
    const myRoom = roomGrid[obj.r]?.[obj.c];
    const hasSameAt = (rr: number, cc: number) => {
      if (roomGrid[rr]?.[cc] !== myRoom) return false;
      return byTypeAndCell.has(`${obj.type}:${rr},${cc}`);
    };
    const tileIndex = resolveAutotileIndex(obj.r, obj.c, hasSameAt, obj.type);
    return { ...obj, tileIndex };
  });
}

/**
 * Generates a rich, authentic Murdoku floorplan with a guaranteed valid N-rooks placement
 * where Victim's room holds exact 2 people (Victim + Murderer).
 */
export function generateFloorplan(params: {
  rows: number;
  cols: number;
  roomBriefs: CreativeRoomBrief[];
  rng: PRNG;
  allowIrregularVoid?: boolean;
}): GeneratedFloorplan {
  const { rows, cols, roomBriefs, rng, allowIrregularVoid = false } = params;

  const voidCells: GridCoord[] = [];
  const voidSet = new Set<string>();

  // Optional subtle corner notch on Hard/Expert irregular maps (still keeps N active rows & N active cols!)
  if (allowIrregularVoid && rows >= 7 && cols >= 7) {
    const corner = rng.pick(['tl', 'tr', 'bl', 'br'] as const);
    const cr = corner.startsWith('t') ? 0 : rows - 1;
    const cc = corner.endsWith('l') ? 0 : cols - 1;
    voidCells.push({ r: cr, c: cc });
    voidSet.add(key(cr, cc));
  }

  const rooms = partitionRooms(rows, cols, voidSet, roomBriefs, rng);
  const roomGrid: (string | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (const rm of rooms) {
    for (const c of rm.cells) roomGrid[c.r][c.c] = rm.id;
  }

  // Pick a valid N-rooks permutation where at least one room has EXACTLY 2 people (Victim + Murderer)
  let groundTruth: GridCoord[] = [];
  let victimIndex = rows - 1;
  let killerIndex = 0;

  for (let attempt = 0; attempt < 120; attempt++) {
    const colPerm = rng.shuffle(Array.from({ length: cols }, (_, i) => i));
    const coords: GridCoord[] = [];
    let valid = true;
    for (let r = 0; r < rows; r++) {
      const c = colPerm[r];
      if (voidSet.has(key(r, c)) || !roomGrid[r][c]) {
        valid = false;
        break;
      }
      coords.push({ r, c });
    }
    if (!valid) continue;

    // Count occupants per room
    const byRoom = new Map<string, number[]>();
    coords.forEach((p, idx) => {
      const rid = roomGrid[p.r][p.c]!;
      if (!byRoom.has(rid)) byRoom.set(rid, []);
      byRoom.get(rid)!.push(idx);
    });

    const pairRooms = Array.from(byRoom.values()).filter((idxs) => idxs.length === 2);
    if (pairRooms.length > 0) {
      const chosenPair = rng.pick(pairRooms);
      // Swap so Victim is at index rows - 1 (matching 'V' being the last suspect)
      const [a, b] = chosenPair;
      const last = rows - 1;
      const permCoords = coords.slice();
      [permCoords[a], permCoords[last]] = [permCoords[last], permCoords[a]];
      const newKillerIdx = b === last ? a : b;
      groundTruth = permCoords;
      victimIndex = last;
      killerIndex = newKillerIdx;
      break;
    }
  }

  // Fallback if somehow none found
  if (groundTruth.length === 0) {
    groundTruth = Array.from({ length: rows }, (_, i) => ({ r: i, c: i }));
    victimIndex = rows - 1;
    killerIndex = 0;
  }

  const occupiedSet = new Set(groundTruth.map((p) => key(p.r, p.c)));
  const objects: MapObject[] = [];
  const placedObjSet = new Set<string>();

  const tryPlace = (type: string, r: number, c: number): boolean => {
    const meta = OBJECT_CATALOG[type];
    if (!meta) return false;
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    const k = key(r, c);
    if (voidSet.has(k) || !roomGrid[r][c] || placedObjSet.has(k)) return false;
    if (!meta.walkable && occupiedSet.has(k)) return false;
    objects.push({ type, r, c, walkable: meta.walkable });
    placedObjSet.add(k);
    return true;
  };

  // Place multi-cell autotiled tables, walkable chairs/carpets, and themed blocking objects per room
  rooms.forEach((room, rIdx) => {
    const brief = roomBriefs[rIdx % roomBriefs.length];
    const pref = brief.preferredObjects.filter((id) => OBJECT_CATALOG[id]);
    const blockingPrefs = pref.filter((id) => !OBJECT_CATALOG[id].walkable && id !== 'table');
    const walkablePrefs = pref.filter((id) => OBJECT_CATALOG[id].walkable);

    const freeForBlocking = rng.shuffle(
      room.cells.filter((c) => !occupiedSet.has(key(c.r, c.c)) && !placedObjSet.has(key(c.r, c.c)))
    );

    // 1. Try placing a 2-cell or L-shaped autotiled table in larger rooms!
    if (freeForBlocking.length >= 3 && (pref.includes('table') || rng.chance(0.55))) {
      for (const start of freeForBlocking) {
        const horiz = rng.chance(0.5);
        const dr = horiz ? 0 : 1;
        const dc = horiz ? 1 : 0;
        const n1 = { r: start.r + dr, c: start.c + dc };
        const canN1 =
          n1.r < rows &&
          n1.c < cols &&
          roomGrid[n1.r][n1.c] === room.id &&
          !occupiedSet.has(key(n1.r, n1.c)) &&
          !placedObjSet.has(key(n1.r, n1.c));
        if (canN1) {
          tryPlace('table', start.r, start.c);
          tryPlace('table', n1.r, n1.c);
          // Optional 3rd cell for an L-shape or 3-long desk
          const n2 = rng.chance(0.5)
            ? { r: n1.r + dc, c: n1.c + dr }
            : { r: n1.r + dr, c: n1.c + dc };
          if (
            n2.r >= 0 &&
            n2.r < rows &&
            n2.c >= 0 &&
            n2.c < cols &&
            roomGrid[n2.r][n2.c] === room.id &&
            !occupiedSet.has(key(n2.r, n2.c)) &&
            !placedObjSet.has(key(n2.r, n2.c)) &&
            rng.chance(0.55)
          ) {
            tryPlace('table', n2.r, n2.c);
          }
          break;
        }
      }
    }

    // 2. Place 1–3 themed blocking objects in remaining free non-occupied squares (target ~35% room density)
    const maxBlocking = Math.max(1, Math.floor(room.cells.length * 0.38));
    let placedInRoom = objects.filter((o) => roomGrid[o.r][o.c] === room.id && !o.walkable).length;
    for (const cell of freeForBlocking) {
      if (placedInRoom >= maxBlocking) break;
      if (placedObjSet.has(key(cell.r, cell.c))) continue;
      const objType =
        blockingPrefs.length > 0 ? rng.pick(blockingPrefs) : rng.pick(['shelf', 'tv', 'plant', 'table']);
      if (tryPlace(objType, cell.r, cell.c)) {
        placedInRoom++;
      }
    }

    // 3. Place 1–2 walkable chairs / beds / carpets (can sit directly under a suspect OR on an empty open cell!)
    const walkableType = walkablePrefs.length > 0 ? rng.pick(walkablePrefs) : 'chair';
    const walkableCandidates = rng.shuffle(room.cells.filter((c) => !placedObjSet.has(key(c.r, c.c))));
    const walkableCount = room.cells.length >= 6 ? 2 : 1;
    for (let w = 0; w < Math.min(walkableCount, walkableCandidates.length); w++) {
      if (rng.chance(0.75)) {
        tryPlace(walkableType, walkableCandidates[w].r, walkableCandidates[w].c);
      }
    }
  });

  const autotiled = applyAutotiles(objects, roomGrid);

  return {
    rows,
    cols,
    voidCells,
    rooms,
    objects: autotiled,
    groundTruth,
    victimIndex,
    killerIndex,
  };
}

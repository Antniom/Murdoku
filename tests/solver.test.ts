import { describe, expect, it } from 'vitest';
import { buildBoardIndex, evaluateClauseFull } from '../src/engine/predicates';
import type { MapObject, RoomDef } from '../src/engine/types';

describe('Official Murdoku Spatial Rules', () => {
  const rooms: RoomDef[] = [
    {
      id: 'left',
      name: { en: 'LEFT', pt: 'ESQ' },
      texture: 'squaretile',
      floorColor: '#fff',
      cells: [
        { r: 0, c: 0 }, { r: 0, c: 1 },
        { r: 1, c: 0 }, { r: 1, c: 1 },
      ],
    },
    {
      id: 'right',
      name: { en: 'RIGHT', pt: 'DIR' },
      texture: 'squaretile',
      floorColor: '#fff',
      cells: [
        { r: 0, c: 2 }, { r: 0, c: 3 },
        { r: 1, c: 2 }, { r: 1, c: 3 },
      ],
    },
  ];

  const objects: MapObject[] = [
    { type: 'table', r: 0, c: 2, walkable: false }, // right room, adjacent across wall to (0,1)
    { type: 'chair', r: 1, c: 1, walkable: true },  // left room, walkable!
    { type: 'tv', r: 0, c: 0, walkable: false },    // left room
  ];

  const board = buildBoardIndex(2, 4, rooms, objects);

  it('respects room walls and orthogonal-only adjacency for "beside"', () => {
    // (0,1) is left room; table at (0,2) is across a wall -> NOT beside table!
    expect(evaluateClauseFull(board, 'A', { kind: 'beside_object', objectType: 'table' }, { A: { r: 0, c: 1 } })).toBe(false);
    // (0,1) IS orthogonally adjacent in same room to tv at (0,0) -> TRUE
    expect(evaluateClauseFull(board, 'A', { kind: 'beside_object', objectType: 'tv' }, { A: { r: 0, c: 1 } })).toBe(true);
    // (1,1) is diagonal to tv at (0,0) -> NOT beside tv!
    expect(evaluateClauseFull(board, 'A', { kind: 'beside_object', objectType: 'tv' }, { A: { r: 1, c: 1 } })).toBe(false);
  });

  it('allows standing/sitting on walkable chairs while blocking tables and TVs', () => {
    expect(board.blockedMask[0][0]).toBe(true);  // tv
    expect(board.blockedMask[0][2]).toBe(true);  // table
    expect(board.blockedMask[1][1]).toBe(false); // chair is walkable!
    expect(evaluateClauseFull(board, 'A', { kind: 'sitting_in_chair' }, { A: { r: 1, c: 1 } })).toBe(true);
  });

  it('evaluates grid-wide directional N/S/E/W and diagonal predicates accurately', () => {
    const placements = { A: { r: 0, c: 1 }, B: { r: 1, c: 2 } };
    expect(evaluateClauseFull(board, 'A', { kind: 'north_of', targetId: 'B' }, placements)).toBe(true);
    expect(evaluateClauseFull(board, 'A', { kind: 'west_of', targetId: 'B' }, placements)).toBe(true);
    expect(evaluateClauseFull(board, 'A', { kind: 'same_diagonal', targetId: 'B' }, placements)).toBe(true);
    expect(evaluateClauseFull(board, 'B', { kind: 'south_of', targetId: 'A' }, placements)).toBe(true);
    expect(evaluateClauseFull(board, 'B', { kind: 'east_of', targetId: 'A' }, placements)).toBe(true);
  });
});

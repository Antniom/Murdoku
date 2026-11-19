/**
 * 49-tile Blob Autotiler for official Murdoku multi-cell tables and carpets.
 * Bit flags:
 *   N  = 1,  E  = 2,  S  = 4,  W  = 8
 *   NE = 16, SE = 32, SW = 64, NW = 128
 * Diagonal bits are only active when both adjacent cardinal neighbors are present.
 */

const N = 1;
const E = 2;
const S = 4;
const W = 8;
const NE = 16;
const SE = 32;
const SW = 64;
const NW = 128;

const BLOB_MASK_TO_TILE: Record<number, string> = {
  // Isolated
  0: '01',
  // 1 cardinal
  [E]: '02',
  [S]: '08',
  [W]: '14',
  [N]: '44',
  // 2 opposite cardinals
  [W | E]: '48',
  [N | S]: '42',
  // 2 adjacent cardinals (corners)
  [S | E]: '09',
  [S | E | SE]: '25',
  [S | W]: '06',
  [S | W | SW]: '21',
  [N | E]: '36',
  [N | E | NE]: '45',
  [N | W]: '49',
  [N | W | NW]: '41',
  // 3 cardinals (T-junctions / edges)
  [W | E | S]: '37',
  [W | E | S | SE]: '03',
  [W | E | S | SW]: '05',
  [W | E | S | SW | SE]: '04',

  [W | E | N]: '47',
  [W | E | N | NE]: '18',
  [W | E | N | NW]: '46',
  [W | E | N | NW | NE]: '30',

  [N | S | E]: '16',
  [N | S | E | NE]: '29',
  [N | S | E | SE]: '15',
  [N | S | E | NE | SE]: '22',

  [N | S | W]: '35',
  [N | S | W | NW]: '28',
  [N | S | W | SW]: '24',
  [N | S | W | NW | SW]: '12',

  // 4 cardinals (cross / interior)
  [N | E | S | W]: '17',
  [N | E | S | W | NE]: '10',
  [N | E | S | W | SE]: '19',
  [N | E | S | W | SW]: '38',
  [N | E | S | W | NW]: '13',
  [N | E | S | W | NE | SE]: '32',
  [N | E | S | W | SW | SE]: '20',
  [N | E | S | W | NW | SW]: '34',
  [N | E | S | W | NW | NE]: '40',
  [N | E | S | W | NE | SW]: '39',
  [N | E | S | W | NW | SE]: '31',
  [N | E | S | W | NW | SW | SE]: '23',
  [N | E | S | W | NE | SW | SE]: '26',
  [N | E | S | W | NW | NE | SW]: '27',
  [N | E | S | W | NW | NE | SE]: '11',
  [N | E | S | W | NW | NE | SW | SE]: '33',
};

export function resolveAutotileIndex(
  r: number,
  c: number,
  hasSameAt: (rr: number, cc: number) => boolean,
  kind: 'table' | 'carpet'
): string {
  const n = hasSameAt(r - 1, c);
  const e = hasSameAt(r, c + 1);
  const s = hasSameAt(r + 1, c);
  const w = hasSameAt(r, c - 1);

  let mask = 0;
  if (n) mask |= N;
  if (e) mask |= E;
  if (s) mask |= S;
  if (w) mask |= W;

  if (n && e && hasSameAt(r - 1, c + 1)) mask |= NE;
  if (s && e && hasSameAt(r + 1, c + 1)) mask |= SE;
  if (s && w && hasSameAt(r + 1, c - 1)) mask |= SW;
  if (n && w && hasSameAt(r - 1, c - 1)) mask |= NW;

  const tile = BLOB_MASK_TO_TILE[mask] ?? '01';
  if (tile === '33' && kind === 'carpet') {
    return '07';
  }
  return tile;
}

export function getAutotileSvgPath(kind: 'table' | 'carpet', tileIndex: string): string {
  if (kind === 'table') {
    return `/assets/tile/table/obj_table_tile${tileIndex}.svg`;
  }
  return `/assets/tile/carpet/obj_carpet_tile${tileIndex}.svg`;
}

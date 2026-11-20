import type {
  CaseSolution,
  ClueClause,
  CreativeBrief,
  Difficulty,
  GridCoord,
  LocalizedText,
  MapObject,
  MapPatchOption,
  MurdokuCase,
  OutlawCondition,
  RoomDef,
  SecretRoleDef,
  SubGridSpec,
  SuspectDef,
  TwistConfig,
  TwistKind,
} from './types';
import { createPRNG, type PRNG } from './prng';
import { castAlphabeticalSuspects } from '../data/characters';
import { OBJECT_CATALOG, PAPER_PALETTES } from '../data/assets';
import { applyAutotiles, generateFloorplan, generateSplitFloorplan } from './floorplanGen';
import {
  buildBoardIndex,
  cellKey,
  evaluateClauseFull,
  evaluateOutlawCondition,
  type BoardIndex,
  type EvalContext,
} from './predicates';
import { solveCSP } from './solver';
import { formatRoleClue, formatSuspectClue, type ClueFormatExtras } from './clues';
import { generateDeductionProof, simulateHumanDeduction } from './prover';
import { areClausesCompatibleOnSuspect, verifyCaseIntegrity } from './verifier';

export interface GenerateCaseOptions {
  id: string;
  number: number;
  pageLeft: number;
  pageRight: number;
  volume: 'starter' | 'daily';
  date?: string;
  seed: string;
  rows: number;
  cols: number;
  difficulty: Difficulty;
  twistKind: TwistKind;
  brief: CreativeBrief;
  allowIrregularVoid?: boolean;
  preferredSuspectIds?: Record<string, string>;
  generatedBy?: 'starter' | 'gemini' | 'fallback';
}

interface ScoredClause {
  clause: ClueClause;
  weight: number;
}

const SECRET_ROLE_POOL: Array<{ id: string; title: LocalizedText }> = [
  { id: 'explorer', title: { en: 'The Explorer', pt: 'O Explorador' } },
  { id: 'botanist', title: { en: 'The Botanist', pt: 'O Botânico' } },
  { id: 'navigator', title: { en: 'The Navigator', pt: 'O Navegador' } },
  { id: 'archivist', title: { en: 'The Archivist', pt: 'O Arquivista' } },
  { id: 'tracker', title: { en: 'The Tracker', pt: 'O Batedor' } },
  { id: 'cartographer', title: { en: 'The Cartographer', pt: 'O Cartógrafo' } },
  { id: 'archaeologist', title: { en: 'The Archaeologist', pt: 'O Arqueólogo' } },
  { id: 'naturalist', title: { en: 'The Naturalist', pt: 'O Naturalista' } },
];

/**
 * Harvests all true, natural Murdoku candidate clauses for a suspect at their ground-truth position.
 */
function harvestCandidateClauses(
  board: BoardIndex,
  suspectId: string,
  allSuspectIds: string[],
  placements: Record<string, GridCoord>,
  rooms: RoomDef[],
  difficulty: Difficulty,
  ctx: EvalContext = {},
  options: { isSplitGrid?: boolean; roles?: SecretRoleDef[] } = {}
): ScoredClause[] {
  const pos = placements[suspectId];
  if (!pos) return [];
  const k = cellKey(pos.r, pos.c);
  const myRoom = board.roomGrid[pos.r][pos.c]!;
  const mySub = board.subGridGrid[pos.r][pos.c];
  const out: ScoredClause[] = [];

  const directBias =
    difficulty === 'easy' ? 18 : difficulty === 'medium' ? 0 : difficulty === 'hard' ? -18 : -32;
  const relationalBias =
    difficulty === 'easy' ? -18 : difficulty === 'medium' ? 0 : difficulty === 'hard' ? 14 : 24;

  const addIfTrue = (clause: ClueClause, weight: number) => {
    if (evaluateClauseFull(board, suspectId, clause, placements, ctx)) {
      out.push({ clause, weight });
    }
  };

  // 1. Walkable occupancy (including era overrides like horse, boat, car!)
  if (board.onObjects.get(k)?.has('chair')) {
    addIfTrue({ kind: 'only_person_sitting' }, 90 + Math.max(0, relationalBias));
    addIfTrue({ kind: 'sitting_in_chair' }, 88 + directBias * 0.6);
  }
  for (const obj of board.onObjects.get(k) ?? []) {
    if (obj !== 'chair') {
      addIfTrue({ kind: 'on_object', objectType: obj }, 92 + directBias * 0.4);
    }
  }

  // 2. Beside objects (wall-aware orthogonal!)
  for (const obj of board.besideObjects.get(k) ?? []) {
    addIfTrue({ kind: 'only_person_beside', objectType: obj }, 86 + Math.max(0, relationalBias));
    addIfTrue({ kind: 'beside_object', objectType: obj }, 84 + directBias * 0.5);
  }

  // 3. Room clues
  addIfTrue({ kind: 'in_room', roomId: myRoom }, 80 + directBias);
  addIfTrue({ kind: 'alone_in_room' }, 84 + relationalBias * 0.5);
  let roomOcc = 0;
  for (const p of Object.values(placements)) {
    if (board.roomGrid[p.r][p.c] === myRoom) roomOcc++;
  }
  if (roomOcc >= 2) {
    addIfTrue({ kind: 'room_occupant_count', count: roomOcc }, 72 + relationalBias * 0.6);
  }
  for (const rm of rooms) {
    if (rm.id !== myRoom) {
      addIfTrue({ kind: 'not_in_room', roomId: rm.id }, 38 + relationalBias * 0.4);
    }
  }

  // 4. Geometry clues (skip raw global in_row/in_col on split_grids so phrasing stays intuitive)
  if (board.inCorner[pos.r][pos.c]) addIfTrue({ kind: 'in_room_corner' }, 76 + relationalBias * 0.4);
  if (!board.besideWall[pos.r][pos.c]) addIfTrue({ kind: 'not_beside_wall' }, 70 + relationalBias * 0.5);
  if (!options.isSplitGrid) {
    addIfTrue({ kind: 'in_row', row: pos.r }, (pos.r === 0 || pos.r === board.rows - 1 ? 75 : 58) + directBias);
    addIfTrue({ kind: 'in_col', col: pos.c }, (pos.c === 0 || pos.c === board.cols - 1 ? 75 : 58) + directBias);
  }

  // 5. Relational clues to other non-victim suspects
  for (const otherId of allSuspectIds) {
    if (otherId === suspectId || otherId === 'V') continue;
    const op = placements[otherId];
    if (!op) continue;
    addIfTrue({ kind: 'same_room_as', targetId: otherId }, 82 + relationalBias * 0.6);
    addIfTrue({ kind: 'beside_person', targetId: otherId }, 85 + relationalBias * 0.7);
    addIfTrue({ kind: 'same_diagonal', targetId: otherId }, 76 + relationalBias);
    if (pos.r < op.r) addIfTrue({ kind: 'north_of', targetId: otherId }, 76 + relationalBias * 0.7);
    if (pos.r > op.r) addIfTrue({ kind: 'south_of', targetId: otherId }, 76 + relationalBias * 0.7);
    if (pos.c > op.c) addIfTrue({ kind: 'east_of', targetId: otherId }, 76 + relationalBias * 0.7);
    if (pos.c < op.c) addIfTrue({ kind: 'west_of', targetId: otherId }, 76 + relationalBias * 0.7);

    // Split Grid cross-zone relational clues
    if (options.isSplitGrid && mySub !== null) {
      addIfTrue({ kind: 'same_subgrid_as', targetId: otherId }, 92);
      addIfTrue({ kind: 'different_subgrid_from', targetId: otherId }, 90);
    }
  }

  // 5b. Split Grid direct sub-grid clue
  if (options.isSplitGrid && mySub !== null) {
    addIfTrue({ kind: 'in_subgrid', gridId: mySub }, 94 + directBias * 0.4);
  }

  // 6. Outlaw-referencing clues
  if (ctx.outlawId && suspectId !== ctx.outlawId) {
    addIfTrue({ kind: 'same_room_as_outlaw' }, 96);
    addIfTrue({ kind: 'beside_outlaw' }, 97);
    addIfTrue({ kind: 'north_of_outlaw' }, 92);
    addIfTrue({ kind: 'south_of_outlaw' }, 92);
    addIfTrue({ kind: 'east_of_outlaw' }, 92);
    addIfTrue({ kind: 'west_of_outlaw' }, 92);
    addIfTrue({ kind: 'not_the_outlaw' }, 65);
  }

  // 7. Volume 2: Time Travel clauses
  if (ctx.swappedPair && ctx.pastPlacements) {
    const pp = ctx.pastPlacements[suspectId];
    const pastRoom = pp ? board.roomGrid[pp.r][pp.c] : null;
    const isMover = suspectId === ctx.swappedPair[0] || suspectId === ctx.swappedPair[1];
    if (isMover) {
      addIfTrue({ kind: 'moved_in_time' }, 88);
      if (pastRoom && pastRoom !== myRoom) {
        addIfTrue({ kind: 'past_in_room', roomId: pastRoom }, 98);
      }
      if (pp) {
        for (const obj of board.besideObjects.get(cellKey(pp.r, pp.c)) ?? []) {
          addIfTrue({ kind: 'past_beside_object', objectType: obj }, 95);
        }
      }
      for (const otherId of allSuspectIds) {
        if (otherId === suspectId) continue;
        addIfTrue({ kind: 'past_same_room_as', targetId: otherId }, 97);
      }
    } else {
      addIfTrue({ kind: 'stayed_in_place' }, 76);
      if (pastRoom) {
        addIfTrue({ kind: 'past_in_room', roomId: pastRoom }, 78);
      }
    }
  }

  // 8. Volume 3: Secret Identities clauses
  if (ctx.roleAssignment && options.roles) {
    for (const role of options.roles) {
      const holder = ctx.roleAssignment[role.id];
      if (holder === suspectId) {
        addIfTrue({ kind: 'has_role', roleId: role.id }, 62); // lower weight so roles are mostly deduced, not handed out
      } else {
        addIfTrue({ kind: 'not_role', roleId: role.id }, 72);
        addIfTrue({ kind: 'same_room_as_role', roleId: role.id }, 94);
        addIfTrue({ kind: 'north_of_role', roleId: role.id }, 91);
        addIfTrue({ kind: 'south_of_role', roleId: role.id }, 91);
        addIfTrue({ kind: 'east_of_role', roleId: role.id }, 91);
        addIfTrue({ kind: 'west_of_role', roleId: role.id }, 91);
      }
    }
  }

  return out;
}

/**
 * Harvests clean spatial clues describing a Secret Role's position (never referencing suspect names directly!).
 */
function harvestRoleClauses(
  board: BoardIndex,
  holderId: string,
  placements: Record<string, GridCoord>,
  rooms: RoomDef[]
): ClueClause[] {
  const pos = placements[holderId];
  if (!pos) return [];
  const k = cellKey(pos.r, pos.c);
  const myRoom = board.roomGrid[pos.r][pos.c]!;
  const out: ClueClause[] = [];

  if (board.onObjects.get(k)?.has('chair')) out.push({ kind: 'sitting_in_chair' });
  for (const obj of board.onObjects.get(k) ?? []) {
    if (obj !== 'chair') out.push({ kind: 'on_object', objectType: obj });
  }
  for (const obj of board.besideObjects.get(k) ?? []) {
    out.push({ kind: 'beside_object', objectType: obj });
  }
  out.push({ kind: 'in_room', roomId: myRoom });
  if (board.inCorner[pos.r][pos.c]) out.push({ kind: 'in_room_corner' });
  if (!board.besideWall[pos.r][pos.c]) out.push({ kind: 'not_beside_wall' });
  out.push({ kind: 'in_row', row: pos.r });
  out.push({ kind: 'in_col', col: pos.c });
  if (evaluateClauseFull(board, holderId, { kind: 'alone_in_room' }, placements)) {
    out.push({ kind: 'alone_in_room' });
  }
  for (const rm of rooms) {
    if (rm.id !== myRoom) out.push({ kind: 'not_in_room', roomId: rm.id });
  }
  return out;
}

/**
 * Harvests a clean FALSE clause for a Liar suspect (whose statement must be false at ground truth).
 */
function harvestFalseClauses(
  board: BoardIndex,
  suspectId: string,
  allSuspectIds: string[],
  placements: Record<string, GridCoord>,
  rooms: RoomDef[]
): ClueClause[] {
  const presentObjects = new Set<string>();
  for (const objs of board.objectsAt.values()) {
    for (const o of objs) presentObjects.add(o.type);
  }

  const candidates: ClueClause[] = [];
  for (const rm of rooms) {
    const cl: ClueClause = { kind: 'in_room', roomId: rm.id };
    if (!evaluateClauseFull(board, suspectId, cl, placements)) candidates.push(cl);
  }
  const checkObjs = ['table', 'chair', 'tv', 'shelf', 'plant', 'barrel', 'statue', 'painting', 'crate', 'box', 'horse', 'boat'];
  for (const obj of checkObjs) {
    if (!presentObjects.has(obj)) continue;
    const cl: ClueClause = { kind: 'beside_object', objectType: obj };
    if (!evaluateClauseFull(board, suspectId, cl, placements)) candidates.push(cl);
  }
  if (presentObjects.has('chair')) {
    const sit: ClueClause = { kind: 'sitting_in_chair' };
    if (!evaluateClauseFull(board, suspectId, sit, placements)) candidates.push(sit);
  }

  for (const otherId of allSuspectIds) {
    if (otherId === suspectId || otherId === 'V') continue;
    for (const kind of ['north_of', 'south_of', 'east_of', 'west_of', 'same_room_as'] as const) {
      const cl: ClueClause = { kind, targetId: otherId };
      if (!evaluateClauseFull(board, suspectId, cl, placements)) candidates.push(cl);
    }
  }
  return candidates;
}

function buildOutlawCondition(
  board: BoardIndex,
  outlawId: string,
  placements: Record<string, GridCoord>,
  rng: PRNG
): OutlawCondition {
  const pos = placements[outlawId];
  const k = cellKey(pos.r, pos.c);
  const options: OutlawCondition[] = [];

  if (board.onObjects.get(k)?.has('chair')) options.push({ kind: 'sitting_in_chair' });
  for (const obj of board.besideObjects.get(k) ?? []) {
    options.push({ kind: 'beside_object', objectType: obj });
  }
  if (evaluateOutlawCondition(board, outlawId, placements, { kind: 'alone_in_room' })) {
    options.push({ kind: 'alone_in_room' });
  }
  if (board.inCorner[pos.r][pos.c]) {
    options.push({ kind: 'in_room_corner' });
  }
  options.push({ kind: 'in_row', row: pos.r });
  options.push({ kind: 'in_col', col: pos.c });

  return rng.pick(options);
}

/**
 * Generates a 100% mathematically verified, uniquely solvable MurdokuCase
 * supporting Classic Book 1 and ALL Volume 2 & Volume 3 twists.
 */
export function generateVerifiedCase(options: GenerateCaseOptions): MurdokuCase {
  const {
    id,
    number,
    pageLeft,
    pageRight,
    volume,
    date,
    seed,
    rows,
    cols,
    difficulty,
    twistKind,
    brief,
    allowIrregularVoid = false,
    preferredSuspectIds,
    generatedBy = 'fallback',
  } = options;

  const baseRng = createPRNG(seed);
  const palette = PAPER_PALETTES[brief.paperTheme] ?? PAPER_PALETTES.lilac;
  const walkableOverrides = brief.walkableOverrides ?? [];

  for (let attempt = 0; attempt < 45; attempt++) {
    const rng = createPRNG(`${seed}#attempt_${attempt}`);

    // Build either a Split-Grid floorplan (Volume 3) or a Single floorplan
    let splitGridsSpec: [SubGridSpec, SubGridSpec] | undefined;
    const fp =
      twistKind === 'split_grids'
        ? (() => {
            const sizeA = rows >= 7 ? 4 : 3;
            const sizeB = 3;
            const res = generateSplitFloorplan({
              sizeA,
              sizeB,
              roomBriefs: brief.rooms,
              rng,
              walkableOverrides,
            });
            const names = brief.subGridNames ?? [
              { en: 'WEST WING', pt: 'ALA OESTE' },
              { en: 'EAST WING', pt: 'ALA ESTE' },
            ];
            splitGridsSpec = [
              { id: 'A', name: names[0], rows: sizeA, cols: sizeA, colOffset: 0 },
              { id: 'B', name: names[1], rows: sizeB, cols: sizeB, colOffset: res.colOffsetB },
            ];
            return res;
          })()
        : generateFloorplan({
            rows,
            cols,
            roomBriefs: brief.rooms,
            rng,
            allowIrregularVoid,
            walkableOverrides,
          });

    const totalPlaced = fp.groundTruth.length;
    const nonVictimCount = twistKind === 'uninvolved' ? totalPlaced : totalPlaced - 1;
    const cast = castAlphabeticalSuspects(nonVictimCount, rng, preferredSuspectIds);

    const cardBgs = rng.shuffle(palette.cardPalette);
    const suspects: SuspectDef[] = cast.suspects.map((prof, idx) => ({
      id: prof.initial,
      profileId: prof.id,
      name: prof.name,
      gender: prof.gender,
      svgPath: prof.svgPath,
      cardBg: cardBgs[idx % cardBgs.length],
      accessory:
        brief.themeAccessory !== 'none' && rng.chance(0.55) ? brief.themeAccessory : undefined,
      isVictim: false,
      clauses: [],
      clueText: { en: '', pt: '' },
    }));

    suspects.push({
      id: 'V',
      profileId: cast.victim.id,
      name: cast.victim.name,
      gender: cast.victim.gender,
      svgPath: cast.victim.svgPath,
      cardBg: '#df9b9b',
      accessory: brief.themeAccessory === 'lab_goggles' ? 'lab_goggles' : undefined,
      isVictim: true,
      clauses: [],
      clueText: { en: '', pt: '' },
    });

    const board = buildBoardIndex(fp.rows, fp.cols, fp.rooms, fp.objects, fp.voidCells);
    const roomsById = Object.fromEntries(fp.rooms.map((r) => [r.id, r]));

    // Assign ground-truth placements
    let uninvolvedId: string | undefined;
    let activeNonVictims = suspects.filter((s) => !s.isVictim);
    if (twistKind === 'uninvolved') {
      const chosenUn = rng.pick(activeNonVictims);
      uninvolvedId = chosenUn.id;
      activeNonVictims = activeNonVictims.filter((s) => s.id !== uninvolvedId);
    }

    const placements: Record<string, GridCoord> = {};
    activeNonVictims.forEach((s, idx) => {
      placements[s.id] = fp.groundTruth[idx];
    });
    placements['V'] = fp.groundTruth[fp.victimIndex];
    const activeIds = [...activeNonVictims.map((s) => s.id), 'V'];

    // Configure twist metadata & evaluation context
    let twist: TwistConfig = { kind: 'classic' };
    let outlawId: string | undefined;
    let liarId: string | undefined;
    let swappedPair: [string, string] | undefined;
    let pastPlacements: Record<string, GridCoord> | undefined;
    let secretRoles: SecretRoleDef[] | undefined;
    let roleAssignment: Record<string, string> | undefined;

    if (twistKind === 'outlaw') {
      outlawId = rng.pick(activeNonVictims).id;
      const condition = buildOutlawCondition(board, outlawId, placements, rng);
      twist = { kind: 'outlaw', condition, outlawSuspectId: outlawId };
    } else if (twistKind === 'uninvolved' && uninvolvedId) {
      twist = { kind: 'uninvolved', uninvolvedSuspectId: uninvolvedId };
    } else if (twistKind === 'liar') {
      liarId = rng.pick(activeNonVictims).id;
      twist = { kind: 'liar', mode: 'single_liar', liarSuspectId: liarId };
    } else if (twistKind === 'split_grids' && splitGridsSpec) {
      twist = { kind: 'split_grids', grids: splitGridsSpec };
    } else if (twistKind === 'time_travel') {
      // Pick 2 non-victim suspects in DIFFERENT rooms to swap across Past <-> Present!
      const shuffledNV = rng.shuffle(activeNonVictims);
      const s1 = shuffledNV[0];
      const r1 = board.roomGrid[placements[s1.id].r][placements[s1.id].c];
      const s2 =
        shuffledNV.find((s) => s.id !== s1.id && board.roomGrid[placements[s.id].r][placements[s.id].c] !== r1) ??
        shuffledNV[1];
      const pair = [s1.id, s2.id].sort() as [string, string];
      swappedPair = pair;
      pastPlacements = { ...placements, [pair[0]]: placements[pair[1]], [pair[1]]: placements[pair[0]] };
      twist = { kind: 'time_travel', swappedPair: pair };
    } else if (twistKind === 'secret_identities') {
      const roleCount = Math.min(3, activeNonVictims.length - 1);
      const chosenRoleTemplates = rng.shuffle(SECRET_ROLE_POOL).slice(0, roleCount);
      const holders = rng.shuffle(activeNonVictims).slice(0, roleCount);
      roleAssignment = {};
      secretRoles = chosenRoleTemplates.map((rt, idx) => {
        const holder = holders[idx];
        roleAssignment![rt.id] = holder.id;
        const rCandidates = rng.shuffle(harvestRoleClauses(board, holder.id, placements, fp.rooms));
        const chosenRoleClauses: ClueClause[] = [];
        for (const rc of rCandidates) {
          if (chosenRoleClauses.length >= 2) break;
          if (areClausesCompatibleOnSuspect(chosenRoleClauses, rc)) {
            chosenRoleClauses.push(rc);
          }
        }
        return {
          id: rt.id,
          title: rt.title,
          clauses: chosenRoleClauses,
          clueText: { en: '', pt: '' },
        };
      });
      twist = {
        kind: 'secret_identities',
        roles: secretRoles,
        keyRoleId: secretRoles[0].id,
      };
    }

    const evalCtx: EvalContext = {
      outlawId,
      swappedPair,
      pastPlacements,
      roleAssignment,
    };

    // Build candidate clue pools for every active non-victim suspect
    const pools: Record<string, ScoredClause[]> = {};
    for (const s of activeNonVictims) {
      if (s.id === liarId) {
        const falses = rng.shuffle(harvestFalseClauses(board, s.id, activeIds, placements, fp.rooms));
        pools[s.id] = falses.map((clause) => ({ clause, weight: 85 }));
      } else {
        const raw = harvestCandidateClauses(
          board,
          s.id,
          activeIds,
          placements,
          fp.rooms,
          difficulty,
          evalCtx,
          { isSplitGrid: twistKind === 'split_grids', roles: secretRoles }
        );
        pools[s.id] = raw
          .map((item) => ({ ...item, sortKey: item.weight + rng.int(-12, 12) }))
          .sort((a, b) => b.sortKey - a.sortKey)
          .map(({ clause, weight }) => ({ clause, weight }));
      }
    }

    if (twistKind === 'uninvolved' && uninvolvedId) {
      const unSuspect = suspects.find((s) => s.id === uninvolvedId)!;
      // Pick a row from one placed suspect and a col from another whose intersection is an OPEN square!
      let pickedPair: [GridCoord, GridCoord] | null = null;
      const shuffledActive = rng.shuffle(activeNonVictims);
      outerUn: for (let i = 0; i < shuffledActive.length; i++) {
        for (let j = 0; j < shuffledActive.length; j++) {
          if (i === j) continue;
          const pA = placements[shuffledActive[i].id];
          const pB = placements[shuffledActive[j].id];
          if (!board.voidMask[pA.r][pB.c] && !board.blockedMask[pA.r][pB.c] && board.roomGrid[pA.r][pB.c]) {
            pickedPair = [pA, pB];
            break outerUn;
          }
        }
      }
      if (!pickedPair) continue;
      unSuspect.clauses = [
        { kind: 'in_row', row: pickedPair[0].r },
        { kind: 'in_col', col: pickedPair[1].c },
      ];
    }

    // Step 1: Give every active non-victim suspect 1 strong initial clue
    for (const s of activeNonVictims) {
      if (pools[s.id].length > 0) {
        s.clauses = [pools[s.id].shift()!.clause];
      }
    }

    // Twist-specific seed clauses so the twist mechanic is genuinely central to solving the case!
    if (twistKind === 'outlaw' && outlawId) {
      const nonOutlaws = rng.shuffle(activeNonVictims.filter((s) => s.id !== outlawId));
      for (const s of nonOutlaws) {
        const idx = pools[s.id].findIndex((c) => c.clause.kind.includes('outlaw'));
        if (idx !== -1) {
          s.clauses = [pools[s.id].splice(idx, 1)[0].clause];
          break;
        }
      }
    } else if (twistKind === 'time_travel' && swappedPair) {
      // Ensure BOTH swapped suspects have a clear Past-timeline clue + compatible Present clue
      for (const moverId of swappedPair) {
        const mover = activeNonVictims.find((s) => s.id === moverId)!;
        const pastIdx = pools[moverId].findIndex(
          (c) => c.clause.kind === 'past_in_room' || c.clause.kind === 'past_same_room_as' || c.clause.kind === 'past_beside_object'
        );
        if (pastIdx !== -1) {
          const pastCl = pools[moverId].splice(pastIdx, 1)[0].clause;
          const keepPresent = mover.clauses.filter((cl) => areClausesCompatibleOnSuspect([pastCl], cl)).slice(0, 1);
          mover.clauses = [pastCl, ...keepPresent];
        }
      }
    } else if (twistKind === 'secret_identities' && secretRoles && roleAssignment) {
      // Ensure at least 2 suspects reference roles so role deduction links tightly with spatial deduction
      let roleRefs = 0;
      for (const s of rng.shuffle(activeNonVictims)) {
        if (roleRefs >= 2) break;
        const idx = pools[s.id].findIndex(
          (c) =>
            c.clause.kind === 'same_room_as_role' ||
            c.clause.kind === 'north_of_role' ||
            c.clause.kind === 'south_of_role' ||
            c.clause.kind === 'east_of_role' ||
            c.clause.kind === 'west_of_role'
        );
        if (idx !== -1) {
          s.clauses = [pools[s.id].splice(idx, 1)[0].clause];
          roleRefs++;
        }
      }
    }

    const baseTwistForSolve: TwistConfig =
      twistKind === 'missing_piece' ? { kind: 'classic' } : twist;

    let solutions = solveCSP(
      {
        rows: fp.rows,
        cols: fp.cols,
        voidCells: fp.voidCells,
        rooms: fp.rooms,
        objects: fp.objects,
        suspects,
        twist: baseTwistForSolve,
      },
      { limit: 2 }
    );

    let guard = 0;
    while (solutions.length !== 1 && guard < 32) {
      guard++;
      if (solutions.length === 0) break;

      const [solA, solB] = solutions;
      const diffSuspects = rng.shuffle(
        activeNonVictims.filter((s) => {
          const pa = solA.placements[s.id];
          const pb = solB.placements[s.id];
          if (!pa || !pb) return true;
          return pa.r !== pb.r || pa.c !== pb.c;
        })
      );

      const solBCtx: EvalContext = {
        outlawId: solB.outlawId,
        swappedPair: solB.timeSwappedPair,
        pastPlacements: solB.pastPlacements,
        roleAssignment: solB.roleAssignment,
      };

      let added = false;
      const targetOrder = diffSuspects.length > 0 ? diffSuspects : rng.shuffle(activeNonVictims);
      for (const s of targetOrder) {
        if (s.clauses.length >= 2) continue;
        if (s.id === liarId) continue;
        const pool = pools[s.id];
        if (!pool || pool.length === 0) continue;

        let chosenIdx = pool.findIndex((item) => {
          if (!areClausesCompatibleOnSuspect(s.clauses, item.clause)) return false;
          const altTrue = evaluateClauseFull(board, s.id, item.clause, solB.placements, solBCtx);
          return !altTrue;
        });
        if (chosenIdx === -1) {
          chosenIdx = pool.findIndex((item) => areClausesCompatibleOnSuspect(s.clauses, item.clause));
        }
        if (chosenIdx === -1) continue;

        const [picked] = pool.splice(chosenIdx, 1);
        s.clauses.push(picked.clause);
        added = true;
        break;
      }

      if (!added) {
        for (const s of targetOrder) {
          if (s.id === liarId || s.clauses.length >= 3) continue;
          const pool = pools[s.id];
          if (!pool || pool.length === 0) continue;
          const compatIdx = pool.findIndex((item) => areClausesCompatibleOnSuspect(s.clauses, item.clause));
          if (compatIdx !== -1) {
            s.clauses.push(pool.splice(compatIdx, 1)[0].clause);
            added = true;
            break;
          }
        }
        if (!added) break;
      }

      solutions = solveCSP(
        {
          rows: fp.rows,
          cols: fp.cols,
          voidCells: fp.voidCells,
          rooms: fp.rooms,
          objects: fp.objects,
          suspects,
          twist: baseTwistForSolve,
        },
        { limit: 2 }
      );
    }

    if (solutions.length !== 1) continue;

    // Prune redundant clauses so cards remain clean and concise
    for (const s of rng.shuffle(activeNonVictims)) {
      if (s.clauses.length <= 1) continue;
      for (let ci = s.clauses.length - 1; ci >= 0; ci--) {
        if (s.clauses.length <= 1) break;
        const removed = s.clauses.splice(ci, 1)[0];
        const check = solveCSP(
          {
            rows: fp.rows,
            cols: fp.cols,
            voidCells: fp.voidCells,
            rooms: fp.rooms,
            objects: fp.objects,
            suspects,
            twist: baseTwistForSolve,
          },
          { limit: 2 }
        );
        if (check.length !== 1) {
          s.clauses.splice(ci, 0, removed);
        }
      }
    }

    // Carve missing_piece 2x2 patches if needed
    if (twistKind === 'missing_piece') {
      const originR = rng.int(0, fp.rows - 2);
      const originC = rng.int(0, fp.cols - 2);
      const height = 2;
      const width = 2;
      const inPatch = (r: number, c: number) =>
        r >= originR && r < originR + height && c >= originC && c < originC + width;
      const trueObjects = fp.objects.filter((o) => inPatch(o.r, o.c));
      const decoyPatches: MapObject[][] = [];
      const blockerPool = ['table', 'shelf', 'tv', 'plant', 'crate', 'barrel'];

      for (let dTry = 0; dTry < 60 && decoyPatches.length < 3; dTry++) {
        const candObjs: MapObject[] = [];
        for (let r = originR; r < originR + height; r++) {
          for (let c = originC; c < originC + width; c++) {
            if (rng.chance(0.55)) {
              const type = rng.pick(blockerPool);
              candObjs.push({ type, r, c, walkable: OBJECT_CATALOG[type].walkable });
            }
          }
        }
        const sig = JSON.stringify(candObjs.map((o) => `${o.r},${o.c}:${o.type}`).sort());
        const trueSig = JSON.stringify(trueObjects.map((o) => `${o.r},${o.c}:${o.type}`).sort());
        if (sig === trueSig) continue;
        if (decoyPatches.some((d) => JSON.stringify(d.map((o) => `${o.r},${o.c}:${o.type}`).sort()) === sig)) {
          continue;
        }

        const testPatch: MapPatchOption = { id: 'B', objects: candObjs };
        const testTwist: TwistConfig = {
          kind: 'missing_piece',
          originR,
          originC,
          height,
          width,
          patches: [testPatch],
          correctPatchId: 'B',
        };
        const checkDecoy = solveCSP(
          {
            rows: fp.rows,
            cols: fp.cols,
            voidCells: fp.voidCells,
            rooms: fp.rooms,
            objects: fp.objects,
            suspects,
            twist: testTwist,
          },
          { limit: 1 }
        );
        if (checkDecoy.length === 0) {
          decoyPatches.push(candObjs);
        }
      }

      if (decoyPatches.length < 3) continue;

      const ids: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
      const correctIdx = rng.int(0, 3);
      const correctPatchId = ids[correctIdx];
      let dIdx = 0;
      const roomGrid: (string | null)[][] = Array.from({ length: fp.rows }, () => Array(fp.cols).fill(null));
      for (const rm of fp.rooms) for (const cell of rm.cells) roomGrid[cell.r][cell.c] = rm.id;

      const patches: MapPatchOption[] = ids.map((pid, i) => ({
        id: pid,
        objects: applyAutotiles(i === correctIdx ? trueObjects : decoyPatches[dIdx++], roomGrid),
      }));

      twist = {
        kind: 'missing_piece',
        originR,
        originC,
        height,
        width,
        patches,
        correctPatchId,
      };
    }

    const finalSolutions = solveCSP(
      {
        rows: fp.rows,
        cols: fp.cols,
        voidCells: fp.voidCells,
        rooms: fp.rooms,
        objects: fp.objects,
        suspects,
        twist,
      },
      { limit: 2 }
    );

    if (finalSolutions.length !== 1) continue;
    const verifiedSolution: CaseSolution = finalSolutions[0];

    const suspectsById = Object.fromEntries(
      suspects.map((s) => [s.id, { name: s.name, gender: s.gender }])
    );
    const rolesById = secretRoles ? Object.fromEntries(secretRoles.map((r) => [r.id, r])) : undefined;
    const formatExtras: ClueFormatExtras = {
      subGrids: splitGridsSpec,
      rolesById,
    };

    if (twist.kind === 'secret_identities' && secretRoles) {
      const formattedRoles = secretRoles.map((r) => ({
        ...r,
        clueText: formatRoleClue(r, roomsById, suspectsById, fp.rows, fp.cols, formatExtras),
      }));
      twist = { ...twist, roles: formattedRoles };
    }

    const formattedSuspects: SuspectDef[] = suspects.map((s) => ({
      ...s,
      clueText: formatSuspectClue(s, roomsById, suspectsById, fp.rows, fp.cols, formatExtras),
    }));

    const proofSteps = generateDeductionProof({
      rows: fp.rows,
      cols: fp.cols,
      voidCells: fp.voidCells,
      rooms: fp.rooms,
      objects: fp.objects,
      suspects: formattedSuspects,
      twist,
      solution: verifiedSolution,
    });

    const candidateCase: MurdokuCase = {
      id,
      number,
      pageLeft,
      pageRight,
      volume,
      edition: brief.edition,
      chapterLabel: brief.chapterLabel,
      cardTheme: brief.cardTheme,
      walkableOverrides: walkableOverrides.length > 0 ? walkableOverrides : undefined,
      date,
      title: brief.title,
      subtitle: brief.subtitle,
      difficulty,
      paperTheme: brief.paperTheme,
      rows: fp.rows,
      cols: fp.cols,
      voidCells: fp.voidCells.length > 0 ? fp.voidCells : undefined,
      rooms: fp.rooms,
      objects: fp.objects,
      suspects: formattedSuspects,
      twist,
      solution: verifiedSolution,
      proofSteps,
      generatedBy,
    };

    // Strict human-solvability preference so players never get stuck staring at an opaque grid
    if (attempt < 28) {
      const traceBoard =
        twist.kind === 'missing_piece'
          ? buildBoardIndex(fp.rows, fp.cols, fp.rooms, fp.objects, fp.voidCells, {
              twist,
              patch:
                twist.patches.find((p) => p.id === verifiedSolution.correctPatchId) ??
                twist.patches[0],
            })
          : board;
      const trace = simulateHumanDeduction({
        board: traceBoard,
        suspects: formattedSuspects,
        twist,
        solution: verifiedSolution,
      });
      if (difficulty === 'easy' && !trace.solvedWithoutGuessing) continue;
      if (difficulty === 'medium' && trace.branchCount > 1) continue;
      if (difficulty === 'hard' && trace.branchCount > 2) continue;
    }

    // Mandatory full mathematical + clue clarity + resolution verification gate!
    const integrity = verifyCaseIntegrity(candidateCase);
    if (!integrity.valid) continue;

    return candidateCase;
  }

  return generateVerifiedCase({
    ...options,
    seed: `${seed}_fb_${baseRng.int(1, 9999)}`,
    twistKind: twistKind === 'missing_piece' ? 'classic' : twistKind,
  });
}

export interface DailyScheduleSpec {
  rows: number;
  cols: number;
  roomCount: number;
  difficulty: Difficulty;
  twistKind: TwistKind;
  allowIrregularVoid: boolean;
}

/**
 * Repeating 4-day difficulty ladder for the Daily Mystery Volume:
 *   Day 0: Easy   (5×5, 4 rooms)
 *   Day 1: Medium (6×6, 5 rooms)
 *   Day 2: Hard   (7×7 / 6×6 twist, 5-6 rooms)
 *   Day 3: Expert (8×8 Classic or 7×7 / 6×6 Advanced Twist, 6 rooms)
 *   ...then repeats!
 * Across consecutive 4-day cycles, Medium/Hard/Expert rotate cleanly through
 * Classic Book 1 + Volume 2 (Outlaw, Time Travel) + Volume 3 (Split Grids, Secret Identities, Alibi, Torn Map, Liar).
 */
export function getDailyScheduleForDate(dateStr: string): DailyScheduleSpec {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayIndex = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  const step = ((dayIndex % 4) + 4) % 4;
  const cycle = Math.floor(dayIndex / 4);

  switch (step) {
    case 0: // Easy: compact 5x5 Classic
      return {
        rows: 5,
        cols: 5,
        roomCount: 4,
        difficulty: 'easy',
        twistKind: 'classic',
        allowIrregularVoid: false,
      };
    case 1: { // Medium: 6x6 rotating Classic / Outlaw / Split Grids / Uninvolved
      const medTwists: TwistKind[] = ['classic', 'outlaw', 'split_grids', 'uninvolved'];
      const twistKind = medTwists[((cycle % medTwists.length) + medTwists.length) % medTwists.length];
      return {
        rows: 6,
        cols: 6,
        roomCount: 5,
        difficulty: 'medium',
        twistKind,
        allowIrregularVoid: false,
      };
    }
    case 2: { // Hard: 7x7 rotating Time Travel / Missing Piece / Secret Identities / Classic
      const hardTwists: TwistKind[] = ['time_travel', 'missing_piece', 'secret_identities', 'classic'];
      const twistKind = hardTwists[((cycle % hardTwists.length) + hardTwists.length) % hardTwists.length];
      const useSix = twistKind === 'missing_piece' || twistKind === 'time_travel' || twistKind === 'secret_identities';
      return {
        rows: useSix ? 6 : 7,
        cols: useSix ? 6 : 7,
        roomCount: useSix ? 5 : 6,
        difficulty: 'hard',
        twistKind,
        allowIrregularVoid: twistKind === 'classic',
      };
    }
    case 3:
    default: { // Expert: 8x8 Classic or 7x7 Liar / Split Grids / Time Travel / Secret Identities
      const expTwists: TwistKind[] = ['classic', 'liar', 'split_grids', 'secret_identities'];
      const twistKind = expTwists[((cycle % expTwists.length) + expTwists.length) % expTwists.length];
      const isClassic = twistKind === 'classic';
      return {
        rows: isClassic ? 8 : 7,
        cols: isClassic ? 8 : 7,
        roomCount: 6,
        difficulty: 'expert',
        twistKind,
        allowIrregularVoid: isClassic,
      };
    }
  }
}

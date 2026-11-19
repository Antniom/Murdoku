import type {
  CaseSolution,
  ClueClause,
  CreativeBrief,
  Difficulty,
  GridCoord,
  MapObject,
  MapPatchOption,
  MurdokuCase,
  OutlawCondition,
  RoomDef,
  SuspectDef,
  TwistConfig,
  TwistKind,
} from './types';
import { createPRNG, type PRNG } from './prng';
import { castAlphabeticalSuspects } from '../data/characters';
import { OBJECT_CATALOG, PAPER_PALETTES } from '../data/assets';
import { applyAutotiles, generateFloorplan } from './floorplanGen';
import { buildBoardIndex, cellKey, evaluateClauseFull, evaluateOutlawCondition, type BoardIndex } from './predicates';
import { solveCSP } from './solver';
import { formatSuspectClue } from './clues';
import { generateDeductionProof } from './prover';

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
  weight: number; // higher = more interesting/authentic Murdoku book clue
}

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
  outlawId?: string
): ScoredClause[] {
  const pos = placements[suspectId];
  if (!pos) return [];
  const k = cellKey(pos.r, pos.c);
  const myRoom = board.roomGrid[pos.r][pos.c]!;
  const out: ScoredClause[] = [];

  // Difficulty-tuned weight modifiers matching real Murdoku book progression:
  // Easy = direct unary anchors; Hard/Expert = relational chains & exclusivity
  const directBias =
    difficulty === 'easy' ? 18 : difficulty === 'medium' ? 0 : difficulty === 'hard' ? -18 : -32;
  const relationalBias =
    difficulty === 'easy' ? -18 : difficulty === 'medium' ? 0 : difficulty === 'hard' ? 14 : 24;

  const addIfTrue = (clause: ClueClause, weight: number) => {
    if (evaluateClauseFull(board, suspectId, clause, placements, outlawId)) {
      out.push({ clause, weight });
    }
  };

  // 1. Walkable occupancy (classic book favorite: "sitting in a chair")
  if (board.onObjects.get(k)?.has('chair')) {
    addIfTrue({ kind: 'only_person_sitting' }, 90 + Math.max(0, relationalBias));
    addIfTrue({ kind: 'sitting_in_chair' }, 88 + directBias * 0.6);
  }
  for (const obj of board.onObjects.get(k) ?? []) {
    if (obj !== 'chair') {
      addIfTrue({ kind: 'on_object', objectType: obj }, 82 + directBias * 0.4);
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

  // 4. Geometry clues
  if (board.inCorner[pos.r][pos.c]) addIfTrue({ kind: 'in_room_corner' }, 76 + relationalBias * 0.4);
  if (!board.besideWall[pos.r][pos.c]) addIfTrue({ kind: 'not_beside_wall' }, 70 + relationalBias * 0.5);
  addIfTrue({ kind: 'in_row', row: pos.r }, (pos.r === 0 || pos.r === board.rows - 1 ? 75 : 58) + directBias);
  addIfTrue({ kind: 'in_col', col: pos.c }, (pos.c === 0 || pos.c === board.cols - 1 ? 75 : 58) + directBias);

  // 5. Relational clues to other non-victim suspects (avoid referencing Victim directly so Victim stays deduced last)
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
  }

  // 6. Outlaw-referencing clues (if outlaw twist is active and suspect is not the outlaw)
  if (outlawId && suspectId !== outlawId) {
    addIfTrue({ kind: 'same_room_as_outlaw' }, 96);
    addIfTrue({ kind: 'beside_outlaw' }, 97);
    addIfTrue({ kind: 'north_of_outlaw' }, 92);
    addIfTrue({ kind: 'south_of_outlaw' }, 92);
    addIfTrue({ kind: 'east_of_outlaw' }, 92);
    addIfTrue({ kind: 'west_of_outlaw' }, 92);
    addIfTrue({ kind: 'not_the_outlaw' }, 65);
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
  const candidates: ClueClause[] = [];
  for (const rm of rooms) {
    const cl: ClueClause = { kind: 'in_room', roomId: rm.id };
    if (!evaluateClauseFull(board, suspectId, cl, placements)) candidates.push(cl);
  }
  const checkObjs = ['table', 'chair', 'tv', 'shelf', 'plant', 'barrel', 'statue', 'painting'];
  for (const obj of checkObjs) {
    const cl: ClueClause = { kind: 'beside_object', objectType: obj };
    if (!evaluateClauseFull(board, suspectId, cl, placements)) candidates.push(cl);
  }
  const sit: ClueClause = { kind: 'sitting_in_chair' };
  if (!evaluateClauseFull(board, suspectId, sit, placements)) candidates.push(sit);

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
 * with bilingual EN/PT-PT clues and a complete Back-of-Book deduction proof.
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

  // Try up to 40 deterministic attempts to guarantee an exact unique, clean, fun puzzle
  for (let attempt = 0; attempt < 40; attempt++) {
    const rng = createPRNG(`${seed}#attempt_${attempt}`);
    const fp = generateFloorplan({
      rows,
      cols,
      roomBriefs: brief.rooms,
      rng,
      allowIrregularVoid,
    });

    // For uninvolved twist, we have N+1 total suspects (N non-victims + 1 Victim) on an N×N grid!
    const nonVictimCount = twistKind === 'uninvolved' ? rows : rows - 1;
    const cast = castAlphabeticalSuspects(nonVictimCount, rng, preferredSuspectIds);

    // Build SuspectDef shells (clauses filled below)
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

    // Configure twist metadata
    let twist: TwistConfig = { kind: 'classic' };
    let outlawId: string | undefined;
    let liarId: string | undefined;

    if (twistKind === 'outlaw') {
      outlawId = rng.pick(activeNonVictims).id;
      const condition = buildOutlawCondition(board, outlawId, placements, rng);
      twist = { kind: 'outlaw', condition, outlawSuspectId: outlawId };
    } else if (twistKind === 'uninvolved' && uninvolvedId) {
      twist = { kind: 'uninvolved', uninvolvedSuspectId: uninvolvedId };
    } else if (twistKind === 'liar') {
      liarId = rng.pick(activeNonVictims).id;
      twist = { kind: 'liar', mode: 'single_liar', liarSuspectId: liarId };
    }

    // Build candidate clue pools for every active non-victim suspect
    const pools: Record<string, ScoredClause[]> = {};
    for (const s of activeNonVictims) {
      if (s.id === liarId) {
        const falses = rng.shuffle(harvestFalseClauses(board, s.id, activeIds, placements, fp.rooms));
        pools[s.id] = falses.map((clause) => ({ clause, weight: 85 }));
      } else {
        const raw = harvestCandidateClauses(board, s.id, activeIds, placements, fp.rooms, difficulty, outlawId);
        // Shuffle within similar weight bands for rich variety
        pools[s.id] = raw
          .map((item) => ({ ...item, sortKey: item.weight + rng.int(-12, 12) }))
          .sort((a, b) => b.sortKey - a.sortKey)
          .map(({ clause, weight }) => ({ clause, weight }));
      }
    }

    // For uninvolved suspect, give a plausible-sounding clue that creates a contradiction if they WERE placed
    if (twistKind === 'uninvolved' && uninvolvedId) {
      const unSuspect = suspects.find((s) => s.id === uninvolvedId)!;
      // Pick a tight constraint (e.g. same row as an active suspect's row + same col as another) so placing them causes an instant conflict
      const sampleA = placements[activeNonVictims[0].id];
      const sampleB = placements[activeNonVictims[1].id];
      unSuspect.clauses = [
        { kind: 'in_row', row: sampleA.r },
        { kind: 'in_col', col: sampleB.c },
      ];
    }

    // Step 1: Give every active non-victim suspect 1 strong initial clue
    for (const s of activeNonVictims) {
      if (pools[s.id].length > 0) {
        s.clauses = [pools[s.id].shift()!.clause];
      }
    }

    // For outlaw twist, make sure at least 1 suspect explicitly references the outlaw
    if (twistKind === 'outlaw' && outlawId) {
      const nonOutlaws = rng.shuffle(activeNonVictims.filter((s) => s.id !== outlawId));
      for (const s of nonOutlaws) {
        const outlawClauseIdx = pools[s.id].findIndex((c) =>
          c.clause.kind.includes('outlaw')
        );
        if (outlawClauseIdx !== -1) {
          const [picked] = pools[s.id].splice(outlawClauseIdx, 1);
          s.clauses = [picked.clause];
          break;
        }
      }
    }

    // Step 2: Iteratively refine clues until solveCSP returns EXACTLY 1 solution!
    // (For missing_piece, first achieve uniqueness on the real map, then carve 1 true + 3 contradicting patches!)
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
    while (solutions.length !== 1 && guard < 28) {
      guard++;
      if (solutions.length === 0) break; // inconsistent, retry attempt

      // Find a suspect whose placement differs between solution[0] and solution[1]
      const [solA, solB] = solutions;
      const diffSuspects = rng.shuffle(
        activeNonVictims.filter((s) => {
          const pa = solA.placements[s.id];
          const pb = solB.placements[s.id];
          if (!pa || !pb) return true;
          return pa.r !== pb.r || pa.c !== pb.c;
        })
      );

      let added = false;
      const targetOrder = diffSuspects.length > 0 ? diffSuspects : rng.shuffle(activeNonVictims);
      for (const s of targetOrder) {
        if (s.clauses.length >= 2) continue;
        // Pick a clause from pool that rules out the alternate solution if possible
        const pool = pools[s.id];
        if (!pool || pool.length === 0) continue;

        let chosenIdx = pool.findIndex((item) => {
          if (s.id === liarId) return false; // keep liar to 1 crisp false clause!
          const altTrue = evaluateClauseFull(board, s.id, item.clause, solB.placements, solB.outlawId);
          return !altTrue;
        });
        if (chosenIdx === -1 && s.id !== liarId) chosenIdx = 0;
        if (chosenIdx === -1) continue;

        const [picked] = pool.splice(chosenIdx, 1);
        s.clauses.push(picked.clause);
        added = true;
        break;
      }

      if (!added) {
        // Fallback: allow 3rd clause on a suspect if needed on Expert/8x8
        const anyS = targetOrder.find((s) => s.id !== liarId && pools[s.id]?.length > 0 && s.clauses.length < 3);
        if (!anyS) break;
        anyS.clauses.push(pools[anyS.id].shift()!.clause);
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

    // Step 3: Prune redundant clauses so clues stay crisp & book-like (1–2 clauses per card)
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

    // Step 4: If twistKind === 'missing_piece', carve a 2×2 patch region and generate 3 contradicting decoys!
    if (twistKind === 'missing_piece') {
      const originR = rng.int(0, fp.rows - 2);
      const originC = rng.int(0, fp.cols - 2);
      const height = 2;
      const width = 2;

      const inPatch = (r: number, c: number) =>
        r >= originR && r < originR + height && c >= originC && c < originC + width;

      const trueObjects = fp.objects.filter((o) => inPatch(o.r, o.c));
      const decoyPatches: MapObject[][] = [];

      // Create 3 distinct decoy object layouts inside the 2x2 patch that each yield 0 solutions!
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
        // Ensure visually distinct from trueObjects & existing decoys
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

    // Final ironclad verification across the complete case (including twist!)
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

    // Format all suspect clues in both EN & PT-PT
    const suspectsById = Object.fromEntries(suspects.map((s) => [s.id, { name: s.name, gender: s.gender }]));
    const formattedSuspects: SuspectDef[] = suspects.map((s) => ({
      ...s,
      clueText: formatSuspectClue(s, roomsById, suspectsById, fp.rows, fp.cols),
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

    return {
      id,
      number,
      pageLeft,
      pageRight,
      volume,
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
  }

  // Fallback recursive call with relaxed seed if 40 attempts didn't converge (should virtually never happen)
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
 *   Day 2: Hard   (7×7, 6 rooms)
 *   Day 3: Expert (8×8 Classic or 7×7 Twist, 6 rooms)
 *   ...then repeats!
 * Across consecutive 4-day cycles, Medium/Hard/Expert rotate smoothly between
 * Classic Book 1 and all 4 Book 2/3 twists (outlaw, uninvolved, missing_piece, liar).
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
    case 1: { // Medium: 6x6 alternating Classic / Outlaw / Uninvolved
      const medTwists: TwistKind[] = ['classic', 'outlaw', 'uninvolved'];
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
    case 2: { // Hard: 7x7 alternating Classic (irregular courtyard) / Missing Piece / Outlaw
      const hardTwists: TwistKind[] = ['classic', 'missing_piece', 'outlaw'];
      const twistKind = hardTwists[((cycle % hardTwists.length) + hardTwists.length) % hardTwists.length];
      return {
        rows: twistKind === 'missing_piece' ? 6 : 7,
        cols: twistKind === 'missing_piece' ? 6 : 7,
        roomCount: twistKind === 'missing_piece' ? 5 : 6,
        difficulty: 'hard',
        twistKind,
        allowIrregularVoid: twistKind === 'classic',
      };
    }
    case 3:
    default: { // Expert: 8x8 Classic or 7x7 Liar / Uninvolved
      const expTwists: TwistKind[] = ['classic', 'liar', 'uninvolved'];
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

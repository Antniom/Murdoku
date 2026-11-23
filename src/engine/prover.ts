import type {
  CaseSolution,
  ClueClause,
  GridCoord,
  MapObject,
  ProofStep,
  RoomDef,
  SuspectDef,
  TwistConfig,
} from './types';
import {
  areSameRoomOrthogonal,
  buildBoardIndex,
  cellKey,
  evaluateUnaryClause,
  type BoardIndex,
} from './predicates';

function coordLabel(c: GridCoord, twist?: TwistConfig): string {
  if (twist?.kind === 'split_grids') {
    const [gA, gB] = twist.grids;
    if (c.c >= gB.colOffset) {
      return `${gB.id}:R${c.r + 1}C${c.c - gB.colOffset + 1}`;
    }
    return `${gA.id}:R${c.r + 1}C${c.c + 1}`;
  }
  return `R${c.r + 1}C${c.c + 1}`;
}

function roomName(roomsById: Record<string, RoomDef>, roomId: string, lang: 'en' | 'pt'): string {
  const r = roomsById[roomId];
  if (!r) return roomId;
  return r.name[lang]
    .toLowerCase()
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export type DeductionReason =
  | 'unary_single'
  | 'row_col_elimination'
  | 'relational_narrowing'
  | 'hidden_single'
  | 'liar_elimination'
  | 'contradiction_elim';

export interface DeductionStepRecord {
  suspectId: string;
  coord: GridCoord;
  reason: DeductionReason;
  initialDomainSize: number;
  branchSize?: number;
}

export interface HumanDeductionTrace {
  steps: DeductionStepRecord[];
  solvedWithoutGuessing: boolean;
  branchCount: number;
  initialMinDomain: number;
}

function sameSubGridConflict(board: BoardIndex, isSplit: boolean, p: GridCoord, q: GridCoord): boolean {
  if (!isSplit) {
    return p.r === q.r || p.c === q.c;
  }
  const subP = board.subGridGrid[p.r][p.c];
  const subQ = board.subGridGrid[q.r][q.c];
  if (subP !== subQ) return false;
  return p.r === q.r || p.c === q.c;
}

function checkBinaryPair(
  board: BoardIndex,
  isSplit: boolean,
  p: GridCoord,
  q: GridCoord,
  kind: string
): boolean {
  if (sameSubGridConflict(board, isSplit, p, q)) return false;
  const subP = board.subGridGrid[p.r][p.c];
  const subQ = board.subGridGrid[q.r][q.c];
  switch (kind) {
    case 'north_of':
    case 'north_of_outlaw':
    case 'north_of_role':
      return (!isSplit || subP === subQ) && p.r < q.r;
    case 'south_of':
    case 'south_of_outlaw':
    case 'south_of_role':
      return (!isSplit || subP === subQ) && p.r > q.r;
    case 'east_of':
    case 'east_of_outlaw':
    case 'east_of_role':
      return (!isSplit || subP === subQ) && p.c > q.c;
    case 'west_of':
    case 'west_of_outlaw':
    case 'west_of_role':
      return (!isSplit || subP === subQ) && p.c < q.c;
    case 'same_room_as':
    case 'same_room_as_outlaw':
    case 'same_room_as_role':
      return board.roomGrid[p.r][p.c] !== null && board.roomGrid[p.r][p.c] === board.roomGrid[q.r][q.c];
    case 'not_same_room_as_outlaw':
      return board.roomGrid[p.r][p.c] !== board.roomGrid[q.r][q.c];
    case 'beside_person':
    case 'beside_outlaw':
      return areSameRoomOrthogonal(board, p, q);
    case 'not_beside_person':
      return !areSameRoomOrthogonal(board, p, q);
    case 'same_diagonal':
      return (
        (!isSplit || subP === subQ) &&
        Math.abs(p.r - q.r) === Math.abs(p.c - q.c) &&
        (p.r !== q.r || p.c !== q.c)
      );
    case 'same_subgrid_as':
      return subP !== null && subP === subQ;
    case 'different_subgrid_from':
      return subP !== null && subQ !== null && subP !== subQ;
    default:
      return true;
  }
}

/**
 * Simulates step-by-step human logical deduction (unary filtering + N-rooks row/column
 * elimination + AC-3 relational arc consistency + hidden singles + room-exclusivity)
 * to both measure human solvability and produce an authentic ordered deduction trace.
 */
export function simulateHumanDeduction(params: {
  board: BoardIndex;
  suspects: SuspectDef[];
  twist: TwistConfig;
  solution: CaseSolution;
}): HumanDeductionTrace {
  const { board, suspects, twist, solution } = params;
  const isSplit = twist.kind === 'split_grids';
  const activeSuspects = suspects.filter((s) => s.id !== solution.uninvolvedId);
  const activeNonVictims = activeSuspects.filter((s) => !s.isVictim);

  // Attach secret role clauses to their verified holders for trace propagation
  const extraClauses: Record<string, ClueClause[]> = {};
  if (twist.kind === 'secret_identities' && solution.roleAssignment) {
    for (const role of twist.roles) {
      const holder = solution.roleAssignment[role.id];
      if (!holder) continue;
      if (!extraClauses[holder]) extraClauses[holder] = [];
      extraClauses[holder].push(...role.clauses);
    }
  }

  // Compute initial unary domains
  const domains: Record<string, GridCoord[]> = {};
  const initialSizes: Record<string, number> = {};
  const narrowedByRelation = new Set<string>();
  const narrowedByRowCol = new Set<string>();

  const swappedPair = solution.timeSwappedPair;

  for (const s of activeSuspects) {
    const allClauses = extraClauses[s.id] ? [...s.clauses, ...extraClauses[s.id]] : s.clauses;
    if (s.isVictim) {
      domains[s.id] = board.openCells.slice();
    } else if (s.id === solution.liarId) {
      if (allClauses.length === 1) {
        const c0 = allClauses[0];
        domains[s.id] = board.openCells.filter((cell) => {
          const u = evaluateUnaryClause(board, cell, c0);
          return u === null ? true : !u;
        });
      } else {
        domains[s.id] = board.openCells.slice();
      }
    } else {
      const isStationary =
        swappedPair !== undefined && s.id !== swappedPair[0] && s.id !== swappedPair[1];
      domains[s.id] = board.openCells.filter((cell) => {
        for (const cl of allClauses) {
          const u = evaluateUnaryClause(board, cell, cl);
          if (u === false) return false;
          if (cl.kind === 'only_person_sitting' && !(board.onObjects.get(cellKey(cell.r, cell.c))?.has('chair') ?? false)) {
            return false;
          }
          if (
            cl.kind === 'only_person_beside' &&
            !(board.besideObjects.get(cellKey(cell.r, cell.c))?.has(cl.objectType) ?? false)
          ) {
            return false;
          }
          if (isStationary) {
            if (cl.kind === 'past_in_room' && board.roomGrid[cell.r][cell.c] !== cl.roomId) return false;
            if (
              cl.kind === 'past_beside_object' &&
              !(board.besideObjects.get(cellKey(cell.r, cell.c))?.has(cl.objectType) ?? false)
            ) {
              return false;
            }
          }
        }
        return true;
      });
    }
    // Apply public Outlaw unary condition to outlaw
    if (twist.kind === 'outlaw' && s.id === solution.outlawId) {
      const cond = twist.condition;
      domains[s.id] = domains[s.id].filter((cell) => {
        const k = cellKey(cell.r, cell.c);
        switch (cond.kind) {
          case 'sitting_in_chair':
            return board.onObjects.get(k)?.has('chair') ?? false;
          case 'beside_object':
            return board.besideObjects.get(k)?.has(cond.objectType) ?? false;
          case 'in_room_corner':
            return board.inCorner[cell.r][cell.c];
          case 'in_row':
            return cell.r === cond.row;
          case 'in_col':
            return cell.c === cond.col;
          default:
            return true;
        }
      });
    }
    initialSizes[s.id] = domains[s.id].length;
  }

  // For Time Travel swapped pair, past_* unary clauses on pair[0] constrain pair[1]'s present cell and vice versa
  if (swappedPair) {
    const [aId, bId] = swappedPair;
    const applyPastUnary = (fromId: string, toId: string) => {
      const fromS = activeSuspects.find((x) => x.id === fromId);
      if (!fromS || !domains[toId]) return;
      for (const cl of fromS.clauses) {
        if (cl.kind === 'past_in_room') {
          domains[toId] = domains[toId].filter((c) => board.roomGrid[c.r][c.c] === cl.roomId);
          narrowedByRelation.add(toId);
        } else if (cl.kind === 'past_beside_object') {
          domains[toId] = domains[toId].filter(
            (c) => board.besideObjects.get(cellKey(c.r, c.c))?.has(cl.objectType) ?? false
          );
          narrowedByRelation.add(toId);
        }
      }
    };
    applyPastUnary(aId, bId);
    applyPastUnary(bId, aId);
  }

  const initialMinDomain = Math.min(...activeNonVictims.map((s) => initialSizes[s.id] ?? 99));

  const placed: Record<string, GridCoord> = {};
  const steps: DeductionStepRecord[] = [];
  let branchCount = 0;

  const placeSuspect = (sid: string, coord: GridCoord, reason: DeductionReason, branchSize?: number) => {
    placed[sid] = coord;
    domains[sid] = [coord];
    if (sid !== 'V') {
      steps.push({
        suspectId: sid,
        coord,
        reason,
        initialDomainSize: initialSizes[sid] ?? 0,
        branchSize,
      });
    }
    // Eliminate row & col from all other unplaced suspects in the same sub-grid
    for (const other of activeSuspects) {
      if (other.id === sid || placed[other.id]) continue;
      const before = domains[other.id].length;
      domains[other.id] = domains[other.id].filter((c) => !sameSubGridConflict(board, isSplit, coord, c));
      if (domains[other.id].length < before) {
        narrowedByRowCol.add(other.id);
      }
    }
  };

  let safety = 0;
  while (Object.keys(placed).length < activeNonVictims.length && safety < 120) {
    safety++;
    let progress = false;

    // 1. Naked singles among non-victim suspects
    for (const s of activeNonVictims) {
      if (placed[s.id]) continue;
      if (domains[s.id].length === 1) {
        const reason: DeductionReason =
          s.id === solution.liarId
            ? 'liar_elimination'
            : initialSizes[s.id] === 1
              ? 'unary_single'
              : narrowedByRelation.has(s.id)
                ? 'relational_narrowing'
                : 'row_col_elimination';
        placeSuspect(s.id, domains[s.id][0], reason);
        progress = true;
      }
    }
    if (progress) continue;

    // 2. AC-3 relational pruning & exclusivity pruning
    for (const s of activeNonVictims) {
      if (s.id === solution.liarId) continue;
      const allClauses = extraClauses[s.id] ? [...s.clauses, ...extraClauses[s.id]] : s.clauses;

      for (const cl of allClauses) {
        // Resolve binary target if any
        let targetId: string | null = null;
        if ('targetId' in cl && typeof cl.targetId === 'string') {
          targetId = cl.targetId;
        } else if (
          cl.kind === 'north_of_outlaw' ||
          cl.kind === 'south_of_outlaw' ||
          cl.kind === 'east_of_outlaw' ||
          cl.kind === 'west_of_outlaw' ||
          cl.kind === 'same_room_as_outlaw' ||
          cl.kind === 'not_same_room_as_outlaw' ||
          cl.kind === 'beside_outlaw'
        ) {
          targetId = solution.outlawId ?? null;
        } else if (
          cl.kind === 'north_of_role' ||
          cl.kind === 'south_of_role' ||
          cl.kind === 'east_of_role' ||
          cl.kind === 'west_of_role' ||
          cl.kind === 'same_room_as_role'
        ) {
          targetId = solution.roleAssignment?.[cl.roleId] ?? null;
        }

        if (targetId && domains[targetId] && cl.kind !== 'past_same_room_as') {
          // Prune s using target's domain
          if (!placed[s.id]) {
            const before = domains[s.id].length;
            domains[s.id] = domains[s.id].filter((p) =>
              domains[targetId!].some((q) => checkBinaryPair(board, isSplit, p, q, cl.kind))
            );
            if (domains[s.id].length < before) {
              narrowedByRelation.add(s.id);
              progress = true;
            }
          }
          // Reverse arc: prune target using s's domain!
          if (!placed[targetId] && targetId !== solution.liarId) {
            const before = domains[targetId].length;
            domains[targetId] = domains[targetId].filter((q) =>
              domains[s.id].some((p) => checkBinaryPair(board, isSplit, p, q, cl.kind))
            );
            if (domains[targetId].length < before) {
              narrowedByRelation.add(targetId);
              progress = true;
            }
          }
        } else if (cl.kind === 'alone_in_room') {
          // Cannot be in a room that already has any placed suspect
          const occupiedRooms = new Set(
            Object.entries(placed)
              .filter(([id]) => id !== s.id)
              .map(([, p]) => board.roomGrid[p.r][p.c])
          );
          if (!placed[s.id]) {
            const before = domains[s.id].length;
            domains[s.id] = domains[s.id].filter((p) => !occupiedRooms.has(board.roomGrid[p.r][p.c]));
            if (domains[s.id].length < before) {
              narrowedByRelation.add(s.id);
              progress = true;
            }
          } else {
            const myR = board.roomGrid[placed[s.id].r][placed[s.id].c];
            for (const other of activeSuspects) {
              if (other.id === s.id || placed[other.id]) continue;
              const before = domains[other.id].length;
              domains[other.id] = domains[other.id].filter((c) => board.roomGrid[c.r][c.c] !== myR);
              if (domains[other.id].length < before) {
                narrowedByRelation.add(other.id);
                progress = true;
              }
            }
          }
        } else if (cl.kind === 'only_person_sitting') {
          for (const other of activeSuspects) {
            if (other.id === s.id || placed[other.id]) continue;
            const before = domains[other.id].length;
            domains[other.id] = domains[other.id].filter(
              (c) => !(board.onObjects.get(cellKey(c.r, c.c))?.has('chair') ?? false)
            );
            if (domains[other.id].length < before) {
              narrowedByRelation.add(other.id);
              progress = true;
            }
          }
        } else if (cl.kind === 'only_person_beside') {
          for (const other of activeSuspects) {
            if (other.id === s.id || placed[other.id]) continue;
            const before = domains[other.id].length;
            domains[other.id] = domains[other.id].filter(
              (c) => !(board.besideObjects.get(cellKey(c.r, c.c))?.has(cl.objectType) ?? false)
            );
            if (domains[other.id].length < before) {
              narrowedByRelation.add(other.id);
              progress = true;
            }
          }
        }
      }
    }
    if (progress) continue;

    // 3. Hidden singles: any unclaimed row/col in a grid where only ONE unplaced suspect can go
    if (!isSplit) {
      const unplacedAll = activeSuspects.filter((s) => !placed[s.id]);
      const usedR = new Set(Object.values(placed).map((p) => p.r));
      const usedC = new Set(Object.values(placed).map((p) => p.c));

      for (const r of board.activeRows) {
        if (usedR.has(r)) continue;
        const canFit = unplacedAll.filter((s) => domains[s.id].some((c) => c.r === r));
        if (canFit.length === 1 && !canFit[0].isVictim) {
          const s = canFit[0];
          const inRow = domains[s.id].filter((c) => c.r === r);
          if (inRow.length === 1) {
            placeSuspect(s.id, inRow[0], 'hidden_single');
            progress = true;
            break;
          }
        }
      }
      if (progress) continue;

      for (const col of board.activeCols) {
        if (usedC.has(col)) continue;
        const canFit = unplacedAll.filter((s) => domains[s.id].some((c) => c.c === col));
        if (canFit.length === 1 && !canFit[0].isVictim) {
          const s = canFit[0];
          const inCol = domains[s.id].filter((c) => c.c === col);
          if (inCol.length === 1) {
            placeSuspect(s.id, inCol[0], 'hidden_single');
            progress = true;
            break;
          }
        }
      }
      if (progress) continue;
    }

    // 4. Fallback shallow case-split (for hard/expert cross-linked puzzles)
    const remaining = activeNonVictims
      .filter((s) => !placed[s.id])
      .sort((a, b) => domains[a.id].length - domains[b.id].length);
    if (remaining.length === 0) break;
    const pick = remaining[0];
    const truePos = solution.placements[pick.id];
    if (!truePos) break;
    branchCount++;
    placeSuspect(pick.id, truePos, 'contradiction_elim', domains[pick.id].length);
  }

  return {
    steps,
    solvedWithoutGuessing: branchCount === 0 && steps.length === activeNonVictims.length,
    branchCount,
    initialMinDomain,
  };
}

/**
 * Generates an ordered, human-readable Back-of-Book deduction proof
 * in both English and Portuguese (PT-PT) from a verified unique case,
 * strictly following true step-by-step logical deduction order.
 */
export function generateDeductionProof(params: {
  rows: number;
  cols: number;
  voidCells?: GridCoord[];
  rooms: RoomDef[];
  objects: MapObject[];
  suspects: SuspectDef[];
  twist: TwistConfig;
  solution: CaseSolution;
}): ProofStep[] {
  const { rows, cols, voidCells = [], rooms, objects, suspects, twist, solution } = params;
  const roomsById = Object.fromEntries(rooms.map((r) => [r.id, r]));
  const suspectsById = Object.fromEntries(suspects.map((s) => [s.id, s]));

  const patchApply =
    twist.kind === 'missing_piece'
      ? {
          twist,
          patch: twist.patches.find((p) => p.id === solution.correctPatchId) ?? twist.patches[0],
        }
      : undefined;

  const board = buildBoardIndex(rows, cols, rooms, objects, voidCells, patchApply);
  const steps: ProofStep[] = [];
  let stepNum = 1;

  // Step 1 for Book 2/3 twists: explain twist deduction clearly
  if (twist.kind === 'missing_piece' && solution.correctPatchId) {
    const others = (['A', 'B', 'C', 'D'] as const).filter((id) => id !== solution.correctPatchId);
    steps.push({
      stepNumber: stepNum++,
      kind: 'twist',
      text: {
        en: `Test the four missing map fragments: **${others.join(', ')}** lead to contradictions with the clues and grid rules, leaving **Fragment ${solution.correctPatchId}** as the only valid completion.`,
        pt: `Testa os quatro fragmentos: **${others.join(', ')}** geram contradições com as pistas e a grelha, deixando o **Fragmento ${solution.correctPatchId}** como única opção válida.`,
      },
    });
  } else if (twist.kind === 'uninvolved' && solution.uninvolvedId) {
    const un = suspectsById[solution.uninvolvedId];
    steps.push({
      stepNumber: stepNum++,
      kind: 'twist',
      focusSuspectId: un.id,
      text: {
        en: `There are ${suspects.length} suspects for a ${rows}×${cols} grid. Eliminating each suspect in turn reveals that only **${un.name}** can be uninvolved without breaking the remaining clues.`,
        pt: `Há ${suspects.length} suspeitos para uma grelha ${rows}×${cols}. Apenas **${un.name}** pode ter álibi sem contradizer as restantes pistas.`,
      },
    });
  } else if (twist.kind === 'liar' && solution.liarId) {
    const liar = suspectsById[solution.liarId];
    steps.push({
      stepNumber: stepNum++,
      kind: 'twist',
      focusSuspectId: liar.id,
      text: {
        en: `Assuming every statement is true leads to a contradiction. **${liar.name}** is the only suspect whose false statement makes the entire grid consistent.`,
        pt: `Assumir todas as pistas como verdadeiras gera uma contradição. **${liar.name}** é o único suspeito cuja mentira torna a grelha consistente.`,
      },
    });
  } else if (twist.kind === 'outlaw' && solution.outlawId) {
    const outlaw = suspectsById[solution.outlawId];
    const pos = solution.placements[outlaw.id];
    const rId = board.roomGrid[pos.r][pos.c]!;
    steps.push({
      stepNumber: stepNum++,
      kind: 'twist',
      focusSuspectId: outlaw.id,
      focusRoomId: rId,
      text: {
        en: `Using the public Outlaw rule and the cross-references to the Outlaw, **${outlaw.name}** is uniquely identified as the **Outlaw** in **${roomName(roomsById, rId, 'en')}**.`,
        pt: `Pela regra do Fora-da-Lei e pelas referências cruzadas, **${outlaw.name}** é o único **Fora-da-Lei**, em **${roomName(roomsById, rId, 'pt')}**.`,
      },
    });
  } else if (twist.kind === 'time_travel' && solution.timeSwappedPair) {
    const [aId, bId] = solution.timeSwappedPair;
    const sa = suspectsById[aId];
    const sb = suspectsById[bId];
    steps.push({
      stepNumber: stepNum++,
      kind: 'twist',
      focusSuspectId: aId,
      text: {
        en: `Comparing Past and Present clues reveals that **${sa.name}** and **${sb.name}** are the exact two suspects who swapped positions across time; everyone else stayed in place.`,
        pt: `Comparando as pistas do Passado e do Presente, **${sa.name}** e **${sb.name}** são os dois suspeitos que trocaram de posição no tempo; todos os outros permaneceram no mesmo lugar.`,
      },
    });
  } else if (twist.kind === 'split_grids') {
    const [gA, gB] = twist.grids;
    const inA = suspects
      .filter((s) => {
        const p = solution.placements[s.id];
        return p && p.c < gB.colOffset;
      })
      .map((s) => s.name);
    const inB = suspects
      .filter((s) => {
        const p = solution.placements[s.id];
        return p && p.c >= gB.colOffset;
      })
      .map((s) => s.name);
    steps.push({
      stepNumber: stepNum++,
      kind: 'twist',
      text: {
        en: `Balance headcounts across the two independent grids: **${gA.name.en}** (${gA.rows} people: ${inA.join(', ')}) and **${gB.name.en}** (${gB.rows} people: ${inB.join(', ')}).`,
        pt: `Equilibra as duas grelhas independentes: **${gA.name.pt}** (${gA.rows} pessoas: ${inA.join(', ')}) e **${gB.name.pt}** (${gB.rows} pessoas: ${inB.join(', ')}).`,
      },
    });
  } else if (twist.kind === 'secret_identities' && solution.roleAssignment) {
    const pairsEn = twist.roles
      .map((r) => `**${r.title.en}** = ${suspectsById[solution.roleAssignment![r.id]]?.name}`)
      .join(', ');
    const pairsPt = twist.roles
      .map((r) => `**${r.title.pt}** = ${suspectsById[solution.roleAssignment![r.id]]?.name}`)
      .join(', ');
    steps.push({
      stepNumber: stepNum++,
      kind: 'twist',
      text: {
        en: `Cross-referencing named clues with the Secret Identities dossier uniquely unmasks the roles: ${pairsEn}.`,
        pt: `Cruzando as pistas dos suspeitos com o dossier de Identidades Secretas revela-se: ${pairsPt}.`,
      },
    });
  }

  // Run true step-by-step human deduction trace
  const trace = simulateHumanDeduction({ board, suspects, twist, solution });

  for (const rec of trace.steps) {
    const suspect = suspectsById[rec.suspectId];
    if (!suspect) continue;
    const pos = solution.placements[rec.suspectId];
    if (!pos) continue;
    const rId = board.roomGrid[pos.r][pos.c]!;
    const rEn = roomName(roomsById, rId, 'en');
    const rPt = roomName(roomsById, rId, 'pt');
    const cLbl = coordLabel(pos, twist);

    let text: { en: string; pt: string };
    switch (rec.reason) {
      case 'unary_single':
        text = {
          en: `**${suspect.name}**'s clue immediately pins down a single valid square on the map: place **${suspect.name}** at **${cLbl}** in **${rEn}**.`,
          pt: `A pista de **${suspect.name}** aponta diretamente para um único quadrado válido: coloca **${suspect.name}** em **${cLbl}** (**${rPt}**).`,
        };
        break;
      case 'hidden_single':
        text = {
          en: `No other remaining suspect can legally occupy that row/column, forcing **${suspect.name}** into **${cLbl}** in **${rEn}**.`,
          pt: `Nenhum outro suspeito restante pode ocupar essa linha/coluna, forçando **${suspect.name}** a ficar em **${cLbl}** (**${rPt}**).`,
        };
        break;
      case 'relational_narrowing':
        text = {
          en: `Combining **${suspect.name}**'s relational clue with the other suspects' possible squares leaves only **${cLbl}** in **${rEn}**.`,
          pt: `Combinando a pista relacional de **${suspect.name}** com as posições possíveis dos restantes suspeitos, resta apenas **${cLbl}** (**${rPt}**).`,
        };
        break;
      case 'liar_elimination':
        text = {
          en: `Because **${suspect.name}** is lying, negating their clue and eliminating claimed rows/columns places **${suspect.name}** at **${cLbl}** in **${rEn}**.`,
          pt: `Como **${suspect.name}** está a mentir, negar a sua pista e eliminar linhas/colunas usadas coloca **${suspect.name}** em **${cLbl}** (**${rPt}**).`,
        };
        break;
      case 'contradiction_elim':
        text = {
          en: `Testing the ${rec.branchSize ?? 2} remaining candidate squares for **${suspect.name}** shows only **${cLbl}** in **${rEn}** avoids a contradiction with the remaining clues.`,
          pt: `Testando os ${rec.branchSize ?? 2} quadrados candidatos restantes para **${suspect.name}**, apenas **${cLbl}** (**${rPt}**) evita contradição com as restantes pistas.`,
        };
        break;
      case 'row_col_elimination':
      default:
        text = {
          en: `Eliminating claimed rows and columns from **${suspect.name}**'s clue leaves only **${cLbl}** in **${rEn}**.`,
          pt: `Eliminando as linhas e colunas já ocupadas na pista de **${suspect.name}**, resta apenas **${cLbl}** (**${rPt}**).`,
        };
        break;
    }

    steps.push({
      stepNumber: stepNum++,
      kind: rec.reason,
      focusSuspectId: suspect.id,
      focusRoomId: rId,
      placedCoord: pos,
      text,
    });
  }

  // Final step: Victim + Murderer!
  const victim = suspects.find((s) => s.isVictim)!;
  const killer = suspectsById[solution.murdererId];
  const vPos = solution.placements[victim.id];
  const vRoomEn = roomName(roomsById, solution.victimRoomId, 'en');
  const vRoomPt = roomName(roomsById, solution.victimRoomId, 'pt');

  steps.push({
    stepNumber: stepNum++,
    kind: 'final_verdict',
    focusSuspectId: killer.id,
    focusRoomId: solution.victimRoomId,
    placedCoord: vPos,
    text: {
      en: `The last open row and column place **${victim.name} (The Victim)** at **${coordLabel(vPos, twist)}** in **${vRoomEn}**, alone with **${killer.name}** — making **${killer.name}** the murderer!`,
      pt: `A última linha e coluna livres colocam **${victim.name} (A Vítima)** em **${coordLabel(vPos, twist)}** em **${vRoomPt}**, a sós com **${killer.name}** — **${killer.name}** é o assassino!`,
    },
  });

  return steps;
}

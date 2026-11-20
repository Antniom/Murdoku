import type {
  CaseSolution,
  GridCoord,
  MapObject,
  ProofStep,
  RoomDef,
  SuspectDef,
  TwistConfig,
} from './types';
import { buildBoardIndex, evaluateUnaryClause } from './predicates';

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

/**
 * Generates an ordered, human-readable Back-of-Book deduction proof
 * in both English and Portuguese (PT-PT) from a verified unique case.
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
      text: {
        en: `Test the four missing map fragments: **${others.join(', ')}** lead to contradictions with the clues and N-rooks grid, leaving **Fragment ${solution.correctPatchId}** as the only valid completion.`,
        pt: `Testa os quatro fragmentos: **${others.join(', ')}** geram contradições com as pistas e a grelha, deixando o **Fragmento ${solution.correctPatchId}** como única opção válida.`,
      },
    });
  } else if (twist.kind === 'uninvolved' && solution.uninvolvedId) {
    const un = suspectsById[solution.uninvolvedId];
    steps.push({
      stepNumber: stepNum++,
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
      focusSuspectId: liar.id,
      text: {
        en: `Assuming every statement is true leads to a contradiction. **${liar.name}** is the only suspect whose negated statement makes the entire grid consistent.`,
        pt: `Assumir todas as pistas como verdadeiras gera uma contradição. **${liar.name}** é o único suspeito cuja mentira torna a grelha consistente.`,
      },
    });
  } else if (twist.kind === 'outlaw' && solution.outlawId) {
    const outlaw = suspectsById[solution.outlawId];
    const pos = solution.placements[outlaw.id];
    const rId = board.roomGrid[pos.r][pos.c]!;
    steps.push({
      stepNumber: stepNum++,
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
      text: {
        en: `Cross-referencing named clues with the Secret Identities dossier uniquely unmasks the roles: ${pairsEn}.`,
        pt: `Cruzando as pistas dos suspeitos com o dossier de Identidades Secretas revela-se: ${pairsPt}.`,
      },
    });
  }

  // Sort active non-victim suspects by unary constraint tightness
  const activeNonVictim = suspects
    .filter((s) => !s.isVictim && s.id !== solution.uninvolvedId)
    .map((s) => {
      const unaryDomain =
        s.id === solution.liarId
          ? board.openCells
          : board.openCells.filter((cell) =>
              s.clauses.every((cl) => evaluateUnaryClause(board, cell, cl) !== false)
            );
      return { suspect: s, domainSize: unaryDomain.length };
    })
    .sort((a, b) => a.domainSize - b.domainSize);

  for (const { suspect, domainSize } of activeNonVictim) {
    const pos = solution.placements[suspect.id];
    if (!pos) continue;
    const rId = board.roomGrid[pos.r][pos.c]!;
    const rEn = roomName(roomsById, rId, 'en');
    const rPt = roomName(roomsById, rId, 'pt');

    if (suspect.id === solution.liarId) {
      steps.push({
        stepNumber: stepNum++,
        focusSuspectId: suspect.id,
        focusRoomId: rId,
        text: {
          en: `Because **${suspect.name}** is lying, negate their clue and eliminate used rows/columns to place **${suspect.name}** at **${coordLabel(pos, twist)}** in **${rEn}**.`,
          pt: `Como **${suspect.name}** está a mentir, nega a sua pista e elimina linhas/colunas usadas para colocar **${suspect.name}** em **${coordLabel(pos, twist)}** (**${rPt}**).`,
        },
      });
    } else if (domainSize <= 2) {
      steps.push({
        stepNumber: stepNum++,
        focusSuspectId: suspect.id,
        focusRoomId: rId,
        text: {
          en: `**${suspect.name}**'s clue restricts them to just ${domainSize === 1 ? 'one square' : 'two squares'}. Cross-checking rows and columns places **${suspect.name}** at **${coordLabel(pos, twist)}** in **${rEn}**.`,
          pt: `A pista de **${suspect.name}** limita-se a ${domainSize === 1 ? 'um único quadrado' : 'dois quadrados'}. Cruzando linhas e colunas, **${suspect.name}** fica em **${coordLabel(pos, twist)}** (**${rPt}**).`,
        },
      });
    } else {
      steps.push({
        stepNumber: stepNum++,
        focusSuspectId: suspect.id,
        focusRoomId: rId,
        text: {
          en: `Combine **${suspect.name}**'s clue with the rows and columns already claimed to deduce **${suspect.name}** is at **${coordLabel(pos, twist)}** in **${rEn}**.`,
          pt: `Combina a pista de **${suspect.name}** com as linhas e colunas já ocupadas para deduzir **${suspect.name}** em **${coordLabel(pos, twist)}** (**${rPt}**).`,
        },
      });
    }
  }

  // Final step: Victim + Murderer!
  const victim = suspects.find((s) => s.isVictim)!;
  const killer = suspectsById[solution.murdererId];
  const vPos = solution.placements[victim.id];
  const vRoomEn = roomName(roomsById, solution.victimRoomId, 'en');
  const vRoomPt = roomName(roomsById, solution.victimRoomId, 'pt');

  steps.push({
    stepNumber: stepNum++,
    focusSuspectId: killer.id,
    focusRoomId: solution.victimRoomId,
    text: {
      en: `The last open row and column place **${victim.name} (The Victim)** at **${coordLabel(vPos, twist)}** in **${vRoomEn}**, alone with **${killer.name}** — making **${killer.name}** the murderer!`,
      pt: `A última linha e coluna livres colocam **${victim.name} (A Vítima)** em **${coordLabel(vPos, twist)}** em **${vRoomPt}**, a sós com **${killer.name}** — **${killer.name}** é o assassino!`,
    },
  });

  return steps;
}

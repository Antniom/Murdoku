import type {
  ClueClause,
  Gender,
  LocalizedText,
  OutlawCondition,
  RoomDef,
  SuspectDef,
  TwistConfig,
} from './types';
import { OBJECT_CATALOG } from '../data/assets';

function ordinalEn(n: number): string {
  if (n === 1) return 'first';
  if (n === 2) return 'second';
  if (n === 3) return 'third';
  if (n === 4) return 'fourth';
  if (n === 5) return 'fifth';
  if (n === 6) return 'sixth';
  if (n === 7) return 'seventh';
  return `${n}th`;
}

function ordinalPtFem(n: number): string {
  return `${n}.ª`;
}

function formatRoomName(room: RoomDef, lang: 'en' | 'pt'): string {
  const raw = room.name[lang];
  return raw
    .toLowerCase()
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function objArticle(objectType: string, lang: 'en' | 'pt'): string {
  const meta = OBJECT_CATALOG[objectType];
  if (!meta) return objectType;
  return meta.articleName[lang];
}

function objLabel(objectType: string, lang: 'en' | 'pt'): string {
  const meta = OBJECT_CATALOG[objectType];
  if (!meta) return objectType;
  return meta.label[lang];
}

export function formatSingleClause(
  clause: ClueClause,
  gender: Gender,
  roomsById: Record<string, RoomDef>,
  suspectsById: Record<string, { name: string; gender: Gender }>,
  rows: number,
  cols: number
): LocalizedText {
  const he = gender === 'male' ? 'He' : 'She';
  const ele = gender === 'male' ? 'Ele' : 'Ela';
  const sentado = gender === 'male' ? 'sentado' : 'sentada';
  const sozinho = gender === 'male' ? 'sozinho' : 'sozinha';
  const unico = gender === 'male' ? 'a única pessoa' : 'a única pessoa';

  switch (clause.kind) {
    case 'in_room': {
      const rEn = roomsById[clause.roomId] ? formatRoomName(roomsById[clause.roomId], 'en') : clause.roomId;
      const rPt = roomsById[clause.roomId] ? formatRoomName(roomsById[clause.roomId], 'pt') : clause.roomId;
      return {
        en: `${he} was in the **${rEn}**.`,
        pt: `${ele} estava em **${rPt}**.`,
      };
    }
    case 'not_in_room': {
      const rEn = roomsById[clause.roomId] ? formatRoomName(roomsById[clause.roomId], 'en') : clause.roomId;
      const rPt = roomsById[clause.roomId] ? formatRoomName(roomsById[clause.roomId], 'pt') : clause.roomId;
      return {
        en: `${he} was not in the **${rEn}**.`,
        pt: `${ele} não estava em **${rPt}**.`,
      };
    }
    case 'same_room_as': {
      const t = suspectsById[clause.targetId]?.name ?? clause.targetId;
      return {
        en: `${he} was in the same room as **${t}**.`,
        pt: `${ele} estava na mesma divisão que **${t}**.`,
      };
    }
    case 'alone_in_room':
      return {
        en: `${he} was **alone** in a room.`,
        pt: `${ele} estava **${sozinho}** numa divisão.`,
      };
    case 'room_occupant_count':
      return {
        en: `${he} was in a room with **${clause.count} people**.`,
        pt: `${ele} estava numa divisão com **${clause.count} pessoas**.`,
      };
    case 'beside_object':
      return {
        en: `${he} was **beside ${objArticle(clause.objectType, 'en')}**.`,
        pt: `${ele} estava **ao lado de ${objArticle(clause.objectType, 'pt')}**.`,
      };
    case 'not_beside_object':
      return {
        en: `${he} was **not beside ${objArticle(clause.objectType, 'en')}**.`,
        pt: `${ele} **não estava ao lado de ${objArticle(clause.objectType, 'pt')}**.`,
      };
    case 'sitting_in_chair':
      return {
        en: `${he} was sitting in a **chair**.`,
        pt: `${ele} estava ${sentado} numa **cadeira**.`,
      };
    case 'on_object':
      return {
        en: `${he} was on **${objArticle(clause.objectType, 'en')}**.`,
        pt: `${ele} estava em cima de **${objArticle(clause.objectType, 'pt')}**.`,
      };
    case 'beside_person': {
      const t = suspectsById[clause.targetId]?.name ?? clause.targetId;
      return {
        en: `${he} was **beside ${t}**.`,
        pt: `${ele} estava **ao lado de ${t}**.`,
      };
    }
    case 'not_beside_person': {
      const t = suspectsById[clause.targetId]?.name ?? clause.targetId;
      return {
        en: `${he} was **not beside ${t}**.`,
        pt: `${ele} **não estava ao lado de ${t}**.`,
      };
    }
    case 'north_of': {
      const t = suspectsById[clause.targetId]?.name ?? clause.targetId;
      return {
        en: `${he} was **north of ${t}**.`,
        pt: `${ele} estava a **norte de ${t}**.`,
      };
    }
    case 'south_of': {
      const t = suspectsById[clause.targetId]?.name ?? clause.targetId;
      return {
        en: `${he} was **south of ${t}**.`,
        pt: `${ele} estava a **sul de ${t}**.`,
      };
    }
    case 'east_of': {
      const t = suspectsById[clause.targetId]?.name ?? clause.targetId;
      return {
        en: `${he} was **east of ${t}**.`,
        pt: `${ele} estava a **este de ${t}**.`,
      };
    }
    case 'west_of': {
      const t = suspectsById[clause.targetId]?.name ?? clause.targetId;
      return {
        en: `${he} was **west of ${t}**.`,
        pt: `${ele} estava a **oeste de ${t}**.`,
      };
    }
    case 'same_diagonal': {
      const t = suspectsById[clause.targetId]?.name ?? clause.targetId;
      return {
        en: `${he} was on the **same diagonal as ${t}**.`,
        pt: `${ele} estava na **mesma diagonal que ${t}**.`,
      };
    }
    case 'in_row': {
      const isLast = clause.row === rows - 1;
      const enRow = isLast ? 'last row' : `${ordinalEn(clause.row + 1)} row`;
      const ptRow = isLast ? 'última linha' : `${ordinalPtFem(clause.row + 1)} linha`;
      return {
        en: `${he} was in the **${enRow}**.`,
        pt: `${ele} estava na **${ptRow}**.`,
      };
    }
    case 'in_col': {
      const isLast = clause.col === cols - 1;
      const enCol = isLast ? 'last column' : `${ordinalEn(clause.col + 1)} column`;
      const ptCol = isLast ? 'última coluna' : `${ordinalPtFem(clause.col + 1)} coluna`;
      return {
        en: `${he} was in the **${enCol}**.`,
        pt: `${ele} estava na **${ptCol}**.`,
      };
    }
    case 'in_room_corner':
      return {
        en: `${he} was in a **corner** of a room.`,
        pt: `${ele} estava num **canto** de uma divisão.`,
      };
    case 'not_beside_wall':
      return {
        en: `${he} was **not beside a wall**.`,
        pt: `${ele} **não estava junto a uma parede**.`,
      };
    case 'only_person_beside':
      return {
        en: `${he} was the **only person beside ${objArticle(clause.objectType, 'en')}**.`,
        pt: `${ele} era **${unico} ao lado de ${objArticle(clause.objectType, 'pt')}**.`,
      };
    case 'only_person_sitting':
      return {
        en: `${he} was the **only person sitting in a chair**.`,
        pt: `${ele} era **${unico} ${sentado} numa cadeira**.`,
      };
    case 'same_room_as_outlaw':
      return {
        en: `${he} was in the same room as **the Outlaw**.`,
        pt: `${ele} estava na mesma divisão que **o Fora-da-Lei**.`,
      };
    case 'not_same_room_as_outlaw':
      return {
        en: `${he} was not in the same room as **the Outlaw**.`,
        pt: `${ele} não estava na mesma divisão que **o Fora-da-Lei**.`,
      };
    case 'north_of_outlaw':
      return {
        en: `${he} was **north of the Outlaw**.`,
        pt: `${ele} estava a **norte do Fora-da-Lei**.`,
      };
    case 'south_of_outlaw':
      return {
        en: `${he} was **south of the Outlaw**.`,
        pt: `${ele} estava a **sul do Fora-da-Lei**.`,
      };
    case 'east_of_outlaw':
      return {
        en: `${he} was **east of the Outlaw**.`,
        pt: `${ele} estava a **este do Fora-da-Lei**.`,
      };
    case 'west_of_outlaw':
      return {
        en: `${he} was **west of the Outlaw**.`,
        pt: `${ele} estava a **oeste do Fora-da-Lei**.`,
      };
    case 'not_the_outlaw':
      return {
        en: `${he} was **not the Outlaw**.`,
        pt: `${ele} **não era o Fora-da-Lei**.`,
      };
    case 'beside_outlaw':
      return {
        en: `${he} was **beside the Outlaw**.`,
        pt: `${ele} estava **ao lado do Fora-da-Lei**.`,
      };
  }
}

export function formatSuspectClue(
  suspect: Pick<SuspectDef, 'isVictim' | 'gender' | 'clauses'>,
  roomsById: Record<string, RoomDef>,
  suspectsById: Record<string, { name: string; gender: Gender }>,
  rows: number,
  cols: number
): LocalizedText {
  if (suspect.isVictim) {
    const he = suspect.gender === 'male' ? 'He' : 'She';
    const ele = suspect.gender === 'male' ? 'Ele' : 'Ela';
    const sozinho = suspect.gender === 'male' ? 'sozinho' : 'sozinha';
    return {
      en: `**The Victim.** ${he} was in the last remaining square, alone with the murderer.`,
      pt: `**A Vítima.** ${ele} estava no último quadrado livre, ${sozinho} com o assassino.`,
    };
  }

  const parts = suspect.clauses.map((cl) =>
    formatSingleClause(cl, suspect.gender, roomsById, suspectsById, rows, cols)
  );
  return {
    en: parts.map((p) => p.en).join(' '),
    pt: parts.map((p) => p.pt).join(' '),
  };
}

export function formatOutlawCondition(condition: OutlawCondition, rows: number, cols: number): LocalizedText {
  switch (condition.kind) {
    case 'sitting_in_chair':
      return { en: 'sitting in a **chair**', pt: 'sentado numa **cadeira**' };
    case 'beside_object':
      return {
        en: `**beside ${objArticle(condition.objectType, 'en')}**`,
        pt: `**ao lado de ${objArticle(condition.objectType, 'pt')}**`,
      };
    case 'alone_in_room':
      return { en: '**alone** in a room', pt: '**sozinho** numa divisão' };
    case 'in_room_corner':
      return { en: 'in a **corner** of a room', pt: 'num **canto** de uma divisão' };
    case 'in_row': {
      const enRow = condition.row === rows - 1 ? 'last row' : `${ordinalEn(condition.row + 1)} row`;
      const ptRow = condition.row === rows - 1 ? 'última linha' : `${ordinalPtFem(condition.row + 1)} linha`;
      return { en: `in the **${enRow}**`, pt: `na **${ptRow}**` };
    }
    case 'in_col': {
      const enCol = condition.col === cols - 1 ? 'last column' : `${ordinalEn(condition.col + 1)} column`;
      const ptCol = condition.col === cols - 1 ? 'última coluna' : `${ordinalPtFem(condition.col + 1)} coluna`;
      return { en: `in the **${enCol}**`, pt: `na **${ptCol}**` };
    }
  }
}

export function formatTwistBanner(twist: TwistConfig, rows: number, cols: number): LocalizedText | null {
  switch (twist.kind) {
    case 'classic':
      return null;
    case 'outlaw': {
      const cond = formatOutlawCondition(twist.condition, rows, cols);
      return {
        en: `**OUTLAW RULE:** One suspect (never the Victim) is the hidden **Outlaw**, who was ${cond.en}.`,
        pt: `**REGRA FORA-DA-LEI:** Um suspeito (nunca a Vítima) é o **Fora-da-Lei**, que estava ${cond.pt}.`,
      };
    }
    case 'uninvolved':
      return {
        en: `**ALIBI RULE:** One suspect has a solid alibi and **was not at the scene** — rule them out!`,
        pt: `**REGRA DO ÁLIBI:** Um suspeito tem álibi e **não esteve no local** — descarta-o!`,
      };
    case 'missing_piece':
      return {
        en: `**TORN MAP RULE:** A piece of the map is missing. Only **one fragment (A–D)** yields a valid solution.`,
        pt: `**PLANTA RASGADA:** Falta um pedaço do mapa. Apenas **um fragmento (A–D)** permite solução.`,
      };
    case 'liar':
      return {
        en: `**LIAR RULE:** Exactly **one suspect** (never the Victim) is lying — their entire statement is false.`,
        pt: `**REGRA DO MENTIROSO:** Exatamente **um suspeito** (nunca a Vítima) está a mentir — toda a sua pista é falsa.`,
      };
  }
}

export function getObjectLabel(objectType: string, lang: 'en' | 'pt'): string {
  return objLabel(objectType, lang);
}

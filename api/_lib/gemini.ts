import type {
  BookEdition,
  CardThemeId,
  CreativeBrief,
  PaperThemeId,
  ThemeAccessoryId,
} from '../../src/engine/types';
import type { DailyScheduleSpec } from '../../src/engine/generator';
import { VALID_FLOOR_TEXTURES, VALID_OBJECT_IDS } from '../../src/data/assets';
import { FALLBACK_THEMES } from '../../src/data/themes';
import { hashSeed } from '../../src/engine/prng';

const VALID_PAPER_THEMES: PaperThemeId[] = [
  'lilac',
  'cream',
  'sage',
  'peach',
  'powder',
  'lavender',
  'sand',
  'slate',
];

const VALID_ACCESSORIES: ThemeAccessoryId[] = [
  'none',
  'lab_goggles',
  'lab_mask',
  'western_bandana',
  'masquerade_mask',
];

const VALID_CARD_THEMES: CardThemeId[] = [
  'classic',
  'wild_west',
  'pirate',
  'egypt',
  'medieval',
  'stone_age',
  'around_world',
];

const VALID_EDITIONS: BookEdition[] = ['vol1', 'vol2', 'vol3'];

const ALLOWED_WALKABLE_OVERRIDES = ['horse', 'boat', 'rowboat', 'car'] as const;

/**
 * Calls Gemini ONCE per day as Creative Director to invent an original, witty Murdoku
 * mystery theme in BOTH English and Portuguese (PT-PT), strictly validated against our
 * verified object and floor-texture allowlists and scaled to today's difficulty tier
 * (Classic Vol. 1, Back in Time Vol. 2, or Around the World Vol. 3).
 */
export async function generateCreativeBriefWithGemini(
  dateStr: string,
  sched: DailyScheduleSpec
): Promise<{ brief: CreativeBrief; source: 'gemini' | 'fallback' }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      brief: FALLBACK_THEMES[hashSeed(dateStr) % FALLBACK_THEMES.length],
      source: 'fallback',
    };
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const twistFlavorHint =
    sched.twistKind === 'time_travel'
      ? '- Today is a VOLUME 2 (Back in Time) Time Travel case! Set it in a vivid historical era (Stone Age, Ancient Egypt, Middle Ages, Golden Age of Piracy, or Wild West) and pick matching edition="vol2", chapterLabel, and cardTheme ("stone_age"|"egypt"|"medieval"|"pirate"|"wild_west").'
      : sched.twistKind === 'split_grids'
        ? '- Today is a VOLUME 3 (Around the World) Split Crime Scenes case! Pick a memorable world destination with TWO side-by-side buildings/wings (provide "subGridNames": [wingA, wingB]), edition="vol3", chapterLabel (e.g. "Asia · Japan" / "Ásia · Japão"), and cardTheme="around_world".'
        : sched.twistKind === 'secret_identities'
          ? '- Today is a VOLUME 3 (Around the World) Secret Identities case! Pick a memorable international expedition/landmark setting with edition="vol3", chapterLabel, and cardTheme="around_world".'
          : sched.twistKind === 'outlaw'
            ? '- Today is an Outlaw case (great fit for Volume 2 Wild West, Pirate, or Medieval era with edition="vol2" and matching cardTheme).'
            : '- Pick any fresh cozy-noir setting (Classic Vol. 1, historical Vol. 2 era, or global Vol. 3 destination).';

  const prompt = `You are the Creative Director for a Murdoku murder-mystery logic puzzle book (in the witty, cozy-noir style of Manuel Garand).
Create ONE original crime-scene setting for date ${dateStr}.
Today's puzzle scale: difficulty="${sched.difficulty}", map=${sched.rows}x${sched.cols}, exact rooms=${sched.roomCount}, chapter twist="${sched.twistKind}".
- For "easy" (5x5, 4 rooms), pick a cozy compact venue (e.g. bakery, cabin, greenhouse, boutique).
- For "medium" (6x6, 5 rooms), pick a lively mid-sized venue (e.g. gallery, saloon, hotel floor, theater).
- For "hard" or "expert" (7x7 / 8x8, 6 rooms), pick a grand multi-wing venue (e.g. museum, observatory, manor, cruise deck, laboratory).
${twistFlavorHint}

Return ONLY a valid JSON object matching this exact structure:
{
  "title": { "en": "The ...", "pt": "O/A ..." },
  "subtitle": { "en": "A witty 1-sentence mystery quip.", "pt": "Uma frase curta e espirituosa em português europeu (PT-PT)." },
  "edition": one of ${JSON.stringify(VALID_EDITIONS)},
  "chapterLabel": { "en": "Short Era or Continent Label", "pt": "Etiqueta Curta de Era ou Continente" },
  "cardTheme": one of ${JSON.stringify(VALID_CARD_THEMES)},
  "paperTheme": one of ${JSON.stringify(VALID_PAPER_THEMES)},
  "themeAccessory": one of ${JSON.stringify(VALID_ACCESSORIES)},
  "walkableOverrides": optional array (empty or 1 item from ${JSON.stringify(ALLOWED_WALKABLE_OVERRIDES)} if riding horses/boats/cars fits the era),
  "subGridNames": optional 2-item array [{"en":"WEST WING","pt":"ALA OESTE"},{"en":"EAST WING","pt":"ALA ESTE"}] (required when twist="${sched.twistKind === 'split_grids' ? 'split_grids' : 'split_grids only'}"),
  "rooms": [
    {
      "name": { "en": "SHORT UPPERCASE ROOM NAME", "pt": "NOME CURTO EM MAIÚSCULAS" },
      "texture": one of ${JSON.stringify(VALID_FLOOR_TEXTURES)},
      "floorColor": "soft pastel hex like #e4f0f5 or #f2e8dc",
      "preferredObjects": [3 to 5 strings strictly chosen from ${JSON.stringify(VALID_OBJECT_IDS)}]
    }
  ]
}
Provide exactly ${sched.roomCount} distinct rooms. Keep room names concise (1-2 words, uppercase) so they fit cleanly on printed map badges.`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 14000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          responseMimeType: 'application/json',
        },
      }),
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Gemini HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty Gemini response');

    const parsed = JSON.parse(rawText) as Partial<CreativeBrief>;
    const sanitized = sanitizeCreativeBrief(parsed, dateStr, sched);
    return { brief: sanitized, source: 'gemini' };
  } catch {
    return {
      brief: FALLBACK_THEMES[hashSeed(dateStr) % FALLBACK_THEMES.length],
      source: 'fallback',
    };
  }
}

function sanitizeCreativeBrief(
  raw: Partial<CreativeBrief>,
  dateStr: string,
  sched: DailyScheduleSpec
): CreativeBrief {
  const fb = FALLBACK_THEMES[hashSeed(dateStr) % FALLBACK_THEMES.length];

  const paperTheme: PaperThemeId = VALID_PAPER_THEMES.includes(raw.paperTheme as PaperThemeId)
    ? (raw.paperTheme as PaperThemeId)
    : fb.paperTheme;

  const themeAccessory: ThemeAccessoryId = VALID_ACCESSORIES.includes(
    raw.themeAccessory as ThemeAccessoryId
  )
    ? (raw.themeAccessory as ThemeAccessoryId)
    : 'none';

  const defaultEdition: BookEdition =
    sched.twistKind === 'time_travel'
      ? 'vol2'
      : sched.twistKind === 'split_grids' || sched.twistKind === 'secret_identities'
        ? 'vol3'
        : fb.edition ?? 'vol1';

  const edition: BookEdition = VALID_EDITIONS.includes(raw.edition as BookEdition)
    ? (raw.edition as BookEdition)
    : defaultEdition;

  const defaultCardTheme: CardThemeId =
    edition === 'vol3' ? 'around_world' : edition === 'vol2' ? 'medieval' : fb.cardTheme ?? 'classic';

  const cardTheme: CardThemeId = VALID_CARD_THEMES.includes(raw.cardTheme as CardThemeId)
    ? (raw.cardTheme as CardThemeId)
    : defaultCardTheme;

  const chapterLabel =
    raw.chapterLabel?.en?.trim() && raw.chapterLabel?.pt?.trim()
      ? {
          en: raw.chapterLabel.en.trim().slice(0, 28),
          pt: raw.chapterLabel.pt.trim().slice(0, 28),
        }
      : fb.chapterLabel;

  const walkableOverrides = Array.isArray(raw.walkableOverrides)
    ? raw.walkableOverrides
        .filter((o): o is (typeof ALLOWED_WALKABLE_OVERRIDES)[number] =>
          (ALLOWED_WALKABLE_OVERRIDES as readonly string[]).includes(o)
        )
        .slice(0, 2)
    : undefined;

  const subGridNames: [CreativeBrief['title'], CreativeBrief['title']] | undefined =
    Array.isArray(raw.subGridNames) &&
    raw.subGridNames.length === 2 &&
    raw.subGridNames[0]?.en &&
    raw.subGridNames[0]?.pt &&
    raw.subGridNames[1]?.en &&
    raw.subGridNames[1]?.pt
      ? [
          {
            en: String(raw.subGridNames[0].en).trim().toUpperCase().slice(0, 18),
            pt: String(raw.subGridNames[0].pt).trim().toUpperCase().slice(0, 18),
          },
          {
            en: String(raw.subGridNames[1].en).trim().toUpperCase().slice(0, 18),
            pt: String(raw.subGridNames[1].pt).trim().toUpperCase().slice(0, 18),
          },
        ]
      : undefined;

  const validRooms = Array.isArray(raw.rooms)
    ? raw.rooms
        .filter((r) => r && r.name?.en && r.name?.pt)
        .slice(0, 6)
        .map((r, idx) => {
          const fbRoom = fb.rooms[idx % fb.rooms.length];
          const tex = (VALID_FLOOR_TEXTURES as readonly string[]).includes(r.texture)
            ? r.texture
            : fbRoom.texture;
          const objs = Array.isArray(r.preferredObjects)
            ? r.preferredObjects.filter((o) => VALID_OBJECT_IDS.includes(o))
            : [];
          const hexOk = typeof r.floorColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(r.floorColor);
          return {
            name: {
              en: String(r.name.en).trim().toUpperCase().slice(0, 18),
              pt: String(r.name.pt).trim().toUpperCase().slice(0, 18),
            },
            texture: tex,
            floorColor: hexOk ? r.floorColor : fbRoom.floorColor,
            preferredObjects: objs.length >= 2 ? objs : fbRoom.preferredObjects,
          };
        })
    : [];

  return {
    title: {
      en: raw.title?.en?.trim() || fb.title.en,
      pt: raw.title?.pt?.trim() || fb.title.pt,
    },
    subtitle: {
      en: raw.subtitle?.en?.trim() || fb.subtitle.en,
      pt: raw.subtitle?.pt?.trim() || fb.subtitle.pt,
    },
    edition,
    chapterLabel,
    cardTheme,
    paperTheme,
    themeAccessory,
    walkableOverrides: walkableOverrides && walkableOverrides.length > 0 ? walkableOverrides : undefined,
    subGridNames,
    rooms: validRooms.length >= 4 ? validRooms : fb.rooms,
  };
}

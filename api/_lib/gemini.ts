import type { CreativeBrief, PaperThemeId, ThemeAccessoryId, TwistKind } from '../../src/engine/types';
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

/**
 * Calls Gemini ONCE per day as Creative Director to invent an original, witty Murdoku
 * mystery theme in BOTH English and Portuguese (PT-PT), strictly validated against our
 * verified object and floor-texture allowlists.
 */
export async function generateCreativeBriefWithGemini(
  dateStr: string,
  twistKind: TwistKind
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

  const prompt = `You are the Creative Director for a Murdoku murder-mystery logic puzzle book (in the witty, cozy-noir style of Manuel Garand).
Create ONE original crime-scene setting for date ${dateStr} (chapter twist: ${twistKind}).
Return ONLY a valid JSON object matching this exact structure:
{
  "title": { "en": "The ...", "pt": "O/A ..." },
  "subtitle": { "en": "A witty 1-sentence mystery quip.", "pt": "Uma frase curta e espirituosa em português europeu (PT-PT)." },
  "paperTheme": one of ${JSON.stringify(VALID_PAPER_THEMES)},
  "themeAccessory": one of ${JSON.stringify(VALID_ACCESSORIES)},
  "rooms": [
    {
      "name": { "en": "SHORT UPPERCASE ROOM NAME", "pt": "NOME CURTO EM MAIÚSCULAS" },
      "texture": one of ${JSON.stringify(VALID_FLOOR_TEXTURES)},
      "floorColor": "soft pastel hex like #e4f0f5 or #f2e8dc",
      "preferredObjects": [3 to 5 strings strictly chosen from ${JSON.stringify(VALID_OBJECT_IDS)}]
    }
  ]
}
Provide 5 or 6 distinct rooms. Keep room names concise (1-2 words, uppercase) so they fit cleanly on printed map badges.`;

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
    const sanitized = sanitizeCreativeBrief(parsed, dateStr);
    return { brief: sanitized, source: 'gemini' };
  } catch {
    return {
      brief: FALLBACK_THEMES[hashSeed(dateStr) % FALLBACK_THEMES.length],
      source: 'fallback',
    };
  }
}

function sanitizeCreativeBrief(raw: Partial<CreativeBrief>, dateStr: string): CreativeBrief {
  const fb = FALLBACK_THEMES[hashSeed(dateStr) % FALLBACK_THEMES.length];

  const paperTheme: PaperThemeId = VALID_PAPER_THEMES.includes(raw.paperTheme as PaperThemeId)
    ? (raw.paperTheme as PaperThemeId)
    : fb.paperTheme;

  const themeAccessory: ThemeAccessoryId = VALID_ACCESSORIES.includes(
    raw.themeAccessory as ThemeAccessoryId
  )
    ? (raw.themeAccessory as ThemeAccessoryId)
    : 'none';

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
    paperTheme,
    themeAccessory,
    rooms: validRooms.length >= 4 ? validRooms : fb.rooms,
  };
}

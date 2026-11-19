import type { CharacterProfile, Gender } from '../engine/types';
import type { PRNG } from '../engine/prng';

const FEMALE_NAMES = new Set<string>([
  'abigail', 'adalyn', 'addison', 'alice', 'alysson', 'amara', 'amelia', 'anna', 'aubrey', 'ayla',
  'barbara', 'beatriz', 'bella', 'bianca', 'bonnie', 'brenda', 'breta', 'briana', 'brigitte', 'brittney', 'brooke',
  'camila', 'candice', 'carla', 'carly', 'carol', 'carolina', 'carolyn', 'catherine', 'chanel', 'charlotte', 'chloe', 'christa', 'claire', 'coralie', 'crystal', 'cynthia',
  'daisy', 'dakota', 'dalia', 'darla', 'dawn', 'deborah', 'delilah', 'denise', 'diana', 'diane', 'dolores', 'donna', 'dorothy',
  'edna', 'eileen', 'eliza', 'elodie', 'eloise', 'elsa', 'emelia', 'emma', 'enid', 'erin', 'esther', 'eva', 'evangeline', 'everly',
  'felicia', 'fiona', 'flavia', 'fleur', 'flor', 'floriana', 'france', 'freya',
  'gabby', 'galina', 'genevieve', 'gina', 'ginevra', 'giulia', 'grace',
  'hana', 'harper', 'hawa', 'hedwig', 'heidi', 'helen', 'helena',
  'ingrid', 'irene', 'iris', 'irma',
  'jana', 'joana',
  'kimberly',
  'lyra',
  'maeve', 'mara', 'mona',
  'nancy', 'naomi', 'nikita',
  'odelia', 'olivia',
  'vala', 'valentine', 'vanessa', 'vickie', 'vicky', 'vincenza', 'virginia', 'vivianna',
]);

const DISPLAY_OVERRIDES: Record<string, string> = {
  antnio: 'António',
  fbio: 'Fábio',
};

const ALL_SUSPECT_IDS: readonly string[] = [
  'abdallah', 'abigail', 'ace', 'adalyn', 'addison', 'adonis', 'alexander', 'alfred', 'alice', 'alysson', 'amara', 'amelia', 'amir', 'angelo', 'anna', 'anthony', 'antnio', 'antony', 'archer', 'arthur', 'ashton', 'aubrey', 'austin', 'ayla',
  'barbara', 'barry', 'bastian', 'beatriz', 'bella', 'ben', 'benjamin', 'bianca', 'blake', 'bonnie', 'bradley', 'brandon', 'brenda', 'brent', 'breta', 'briana', 'brigitte', 'brittney', 'brock', 'brooke', 'bryan', 'bryson',
  'calvin', 'camila', 'candice', 'carl', 'carla', 'carly', 'carol', 'carolina', 'carolyn', 'carson', 'cassius', 'catherine', 'chad', 'chanel', 'charlotte', 'chloe', 'christa', 'christopher', 'claire', 'clark', 'claude', 'colton', 'conrad', 'coralie', 'craig', 'cristiano', 'crystal', 'cynthia',
  'daisy', 'dakota', 'dalia', 'dalton', 'damien', 'daniel', 'darla', 'darren', 'daryl', 'david', 'dawn', 'dean', 'deborah', 'delilah', 'denise', 'derek', 'diana', 'diane', 'dolores', 'donna', 'dorothy', 'douglas', 'drew', 'dylan',
  'earl', 'edgar', 'edison', 'edmund', 'edna', 'eileen', 'elias', 'eliza', 'elliot', 'elodie', 'eloise', 'elsa', 'emelia', 'emilio', 'emma', 'emmett', 'enid', 'enrique', 'erin', 'ernie', 'esther', 'eva', 'evangeline', 'everly',
  'fabian', 'fabrice', 'falcon', 'fbio', 'felicia', 'fernando', 'finlay', 'finn', 'fiona', 'flavia', 'fleur', 'flor', 'floriana', 'floyd', 'france', 'francis', 'frank', 'frankie', 'fred', 'freya', 'friedrich', 'fritz',
  'gabby', 'galina', 'gannon', 'garrett', 'gavin', 'genevieve', 'george', 'gerald', 'giancarlo', 'gideon', 'gilbert', 'gina', 'ginevra', 'giovanni', 'giulia', 'gordon', 'grace', 'grady', 'graham', 'grant', 'greg', 'gustavo',
  'hana', 'harper', 'harrison', 'harry', 'hartley', 'hawa', 'hayden', 'hector', 'hedwig', 'heidi', 'heitor', 'helen', 'helena', 'henry', 'hilton', 'howie', 'hugh', 'hugo',
  'igor', 'ingrid', 'irene', 'iris', 'irma', 'isaak', 'ivan',
  'jana', 'jared', 'jesse', 'jim', 'joana', 'joe', 'juan',
  'kaiden', 'keegan', 'kent', 'kevin', 'kimberly', 'kobe',
  'langston', 'lars', 'leonardo', 'liam', 'lyra',
  'maeve', 'mara', 'miguel', 'mona',
  'nancy', 'naomi', 'nikita', 'niko',
  'odelia', 'oliver', 'olivia', 'oscar',
  'vala', 'valentine', 'valentino', 'valter', 'vanessa', 'vasiliy', 'vaughn', 'vickie', 'vicky', 'victor', 'vikram', 'vin', 'vincent', 'vincenza', 'vincenzo', 'vinny', 'vinson', 'viraj', 'virgil', 'virginia', 'vivianna', 'vlad',
];

function formatName(id: string): string {
  if (DISPLAY_OVERRIDES[id]) return DISPLAY_OVERRIDES[id];
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export const CHARACTER_CATALOG: CharacterProfile[] = ALL_SUSPECT_IDS.map((id) => {
  const gender: Gender = FEMALE_NAMES.has(id) ? 'female' : 'male';
  return {
    id,
    name: formatName(id),
    initial: id.charAt(0).toUpperCase(),
    gender,
    svgPath: `/assets/suspects/suspect_${id}.svg`,
  };
});

export const CHARACTER_BY_ID: Record<string, CharacterProfile> = Object.fromEntries(
  CHARACTER_CATALOG.map((c) => [c.id, c])
);

export const CHARACTERS_BY_INITIAL: Record<string, CharacterProfile[]> = {};
for (const c of CHARACTER_CATALOG) {
  if (!CHARACTERS_BY_INITIAL[c.initial]) {
    CHARACTERS_BY_INITIAL[c.initial] = [];
  }
  CHARACTERS_BY_INITIAL[c.initial].push(c);
}

const ALPHABET_POOL = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'] as const;

/**
 * Casts `nonVictimCount` suspects in strict alphabetical order (A, B, C, ...)
 * plus 1 Victim always starting with 'V', balanced across genders and zero duplicates.
 */
export function castAlphabeticalSuspects(
  nonVictimCount: number,
  rng: PRNG,
  preferredIds?: Record<string, string>
): { suspects: CharacterProfile[]; victim: CharacterProfile } {
  const suspects: CharacterProfile[] = [];
  for (let i = 0; i < nonVictimCount; i++) {
    const letter = ALPHABET_POOL[i];
    const prefId = preferredIds?.[letter];
    if (prefId && CHARACTER_BY_ID[prefId]) {
      suspects.push(CHARACTER_BY_ID[prefId]);
    } else {
      const pool = CHARACTERS_BY_INITIAL[letter];
      // Encourage pleasant gender mix across the cast
      const targetGender: Gender = i % 2 === 0 ? (rng.chance(0.55) ? 'male' : 'female') : (rng.chance(0.55) ? 'female' : 'male');
      const genderPool = pool.filter((c) => c.gender === targetGender);
      const chosen = genderPool.length > 0 ? rng.pick(genderPool) : rng.pick(pool);
      suspects.push(chosen);
    }
  }

  const prefVictim = preferredIds?.['V'];
  const victim =
    prefVictim && CHARACTER_BY_ID[prefVictim]
      ? CHARACTER_BY_ID[prefVictim]
      : rng.pick(CHARACTERS_BY_INITIAL['V']);

  return { suspects, victim };
}

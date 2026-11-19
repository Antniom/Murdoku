import type { CreativeBrief } from '../engine/types';

/**
 * Rich built-in fallback creative briefs used if GEMINI_API_KEY is unset
 * or Gemini temporarily fails during daily generation.
 */
export const FALLBACK_THEMES: CreativeBrief[] = [
  {
    title: { en: 'The Clockmaker’s Workshop', pt: 'A Oficina do Relojoeiro' },
    subtitle: {
      en: 'Someone stopped more than just the grandfather clock.',
      pt: 'Alguém parou bem mais do que o relógio de pêndulo.',
    },
    paperTheme: 'cream',
    themeAccessory: 'none',
    rooms: [
      { name: { en: 'WORKBENCH', pt: 'BANCADA' }, texture: 'woodentile', floorColor: '#f2e8d6', preferredObjects: ['table', 'chair', 'shelf'] },
      { name: { en: 'SHOWROOM', pt: 'EXPOSIÇÃO' }, texture: 'diamond', floorColor: '#e6ece4', preferredObjects: ['carpet', 'statue', 'painting', 'chair'] },
      { name: { en: 'VAULT', pt: 'COFRE' }, texture: 'limestone', floorColor: '#e2e6ec', preferredObjects: ['box', 'crate', 'shelf'] },
      { name: { en: 'OFFICE', pt: 'ESCRITÓRIO' }, texture: 'bigwood', floorColor: '#efe2d8', preferredObjects: ['table', 'chair', 'plant', 'tv'] },
      { name: { en: 'ARCHIVE', pt: 'ARQUIVO' }, texture: 'smalltiles', floorColor: '#e9e4f0', preferredObjects: ['shelf', 'box', 'chair'] },
    ],
  },
  {
    title: { en: 'The Midnight Conservatory', pt: 'O Conservatório da Meia-Noite' },
    subtitle: {
      en: 'Not every specimen in this greenhouse is harmless.',
      pt: 'Nem todas as espécies nesta estufa são inofensivas.',
    },
    paperTheme: 'sage',
    themeAccessory: 'none',
    rooms: [
      { name: { en: 'ORCHID HOUSE', pt: 'ORQUIDÁRIO' }, texture: 'squaretile', floorColor: '#e2f0e6', preferredObjects: ['plant', 'flowers', 'chair', 'bonsai'] },
      { name: { en: 'PALM COURT', pt: 'PÁTIO PALMAS' }, texture: 'grass', floorColor: '#dff0dc', preferredObjects: ['palmtree', 'shrub', 'chair', 'puddle'] },
      { name: { en: 'POTTING SHED', pt: 'BARRACÃO' }, texture: 'woodentile_scrap', floorColor: '#eee6d6', preferredObjects: ['table', 'barrel', 'crate'] },
      { name: { en: 'CACTUS DOME', pt: 'CACTÁRIO' }, texture: 'sand', floorColor: '#f3ebd4', preferredObjects: ['cactus', 'rock', 'chair'] },
      { name: { en: 'TEA TERRACE', pt: 'TERRAÇO' }, texture: 'limestone', floorColor: '#e6edf0', preferredObjects: ['table', 'chair', 'plant'] },
    ],
  },
  {
    title: { en: 'The Velvet Theatre', pt: 'O Teatro de Veludo' },
    subtitle: {
      en: 'The final act ended long before the curtain fell.',
      pt: 'O último ato terminou muito antes de o pano cair.',
    },
    paperTheme: 'peach',
    themeAccessory: 'masquerade_mask',
    rooms: [
      { name: { en: 'STAGE', pt: 'PALCO' }, texture: 'bigwood', floorColor: '#f2e4d8', preferredObjects: ['carpet', 'chair', 'statue', 'painting'] },
      { name: { en: 'BACKSTAGE', pt: 'BASTIDORES' }, texture: 'woodentile_scrap', floorColor: '#e8e2dc', preferredObjects: ['crate', 'box', 'table', 'camera'] },
      { name: { en: 'DRESSING ROOM', pt: 'CAMARIM' }, texture: 'diamond', floorColor: '#f3e2e6', preferredObjects: ['chair', 'table', 'plant', 'present'] },
      { name: { en: 'FOYER', pt: 'ÁTRIO' }, texture: 'rich', floorColor: '#ebe4f0', preferredObjects: ['carpet', 'register', 'plant'] },
      { name: { en: 'PROP ROOM', pt: 'ADEREÇOS' }, texture: 'smalltiles', floorColor: '#e2eaf0', preferredObjects: ['shelf', 'easel', 'barrel'] },
    ],
  },
  {
    title: { en: 'The Coastal Lighthouse', pt: 'O Farol da Costa' },
    subtitle: {
      en: 'A storm rolled in, and someone switched off the beam.',
      pt: 'A tempestade chegou e alguém apagou a luz do farol.',
    },
    paperTheme: 'powder',
    themeAccessory: 'none',
    rooms: [
      { name: { en: 'LANTERN DECK', pt: 'LANTERNA' }, texture: 'minitiles', floorColor: '#e0ecf5', preferredObjects: ['table', 'chair', 'camera'] },
      { name: { en: 'BOATHOUSE', pt: 'CASA BARCOS' }, texture: 'woodentile', floorColor: '#eae3d6', preferredObjects: ['rowboat', 'barrel', 'crate'] },
      { name: { en: 'QUARTERS', pt: 'ALOJAMENTO' }, texture: 'bigwood', floorColor: '#ede6de', preferredObjects: ['bed', 'chair', 'table', 'shelf'] },
      { name: { en: 'COVE', pt: 'ENSEADA' }, texture: 'sand', floorColor: '#f3ecd8', preferredObjects: ['shell', 'rock', 'puddle', 'boat'] },
      { name: { en: 'RADIO ROOM', pt: 'RÁDIO' }, texture: 'squaretile', floorColor: '#e3e8f2', preferredObjects: ['tv', 'table', 'chair'] },
    ],
  },
  {
    title: { en: 'The Frontier Outpost', pt: 'O Posto da Fronteira' },
    subtitle: {
      en: 'Dust settled on the boardwalk, but one shadow stayed behind.',
      pt: 'A poeira assentou na rua, mas uma sombra ficou para trás.',
    },
    paperTheme: 'sand',
    themeAccessory: 'western_bandana',
    rooms: [
      { name: { en: 'SALOON', pt: 'SALOON' }, texture: 'woodentile', floorColor: '#f1e4cf', preferredObjects: ['table', 'chair', 'barrel'] },
      { name: { en: 'STABLES', pt: 'ESTÁBULO' }, texture: 'sand', floorColor: '#efe6d2', preferredObjects: ['horse', 'barrel', 'crate'] },
      { name: { en: 'GENERAL STORE', pt: 'MERCEARIA' }, texture: 'bigwood', floorColor: '#eadfd2', preferredObjects: ['register', 'shelf', 'box'] },
      { name: { en: 'DESERT YARD', pt: 'PÁTIO' }, texture: 'rocks', floorColor: '#f2e8d4', preferredObjects: ['cactus', 'rock', 'chair'] },
      { name: { en: 'SHERIFF OFFICE', pt: 'XERIFE' }, texture: 'woodentile_scrap', floorColor: '#e6e2da', preferredObjects: ['table', 'chair', 'shelf'] },
    ],
  },
];

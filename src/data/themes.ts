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
    edition: 'vol2',
    chapterLabel: { en: 'Wild West', pt: 'Velho Oeste' },
    cardTheme: 'wild_west',
    walkableOverrides: ['horse'],
    rooms: [
      { name: { en: 'SALOON', pt: 'SALOON' }, texture: 'woodentile', floorColor: '#f1e4cf', preferredObjects: ['table', 'chair', 'barrel'] },
      { name: { en: 'STABLES', pt: 'ESTÁBULO' }, texture: 'sand', floorColor: '#efe6d2', preferredObjects: ['horse', 'barrel', 'crate'] },
      { name: { en: 'GENERAL STORE', pt: 'MERCEARIA' }, texture: 'bigwood', floorColor: '#eadfd2', preferredObjects: ['register', 'shelf', 'box'] },
      { name: { en: 'DESERT YARD', pt: 'PÁTIO' }, texture: 'rocks', floorColor: '#f2e8d4', preferredObjects: ['cactus', 'rock', 'chair'] },
      { name: { en: 'SHERIFF OFFICE', pt: 'XERIFE' }, texture: 'woodentile_scrap', floorColor: '#e6e2da', preferredObjects: ['table', 'chair', 'shelf'] },
    ],
  },
  {
    title: { en: 'The Nile Sanctuary', pt: 'O Santuário do Nilo' },
    subtitle: {
      en: 'Hieroglyphs remember every footstep across the sandstone court.',
      pt: 'Os hieróglifos recordam cada passo pelo pátio de arenito.',
    },
    paperTheme: 'sand',
    themeAccessory: 'none',
    edition: 'vol2',
    chapterLabel: { en: 'Ancient Egypt', pt: 'Antigo Egito' },
    cardTheme: 'egypt',
    rooms: [
      { name: { en: 'SANCTUARY', pt: 'SANTUÁRIO' }, texture: 'limestone', floorColor: '#f2e6cf', preferredObjects: ['statue', 'carpet', 'chair'] },
      { name: { en: 'OASIS COURT', pt: 'OÁSIS' }, texture: 'sand', floorColor: '#f4ecd4', preferredObjects: ['palmtree', 'rock', 'puddle'] },
      { name: { en: 'TREASURY', pt: 'TESOURO' }, texture: 'bigdiamond', floorColor: '#efe3d4', preferredObjects: ['box', 'crate', 'statue'] },
      { name: { en: 'SCRIBE HALL', pt: 'ESCRIBAS' }, texture: 'brick_large', floorColor: '#eae3d6', preferredObjects: ['table', 'chair', 'shelf'] },
      { name: { en: 'RIVER QUAY', pt: 'CAIS NILO' }, texture: 'water', floorColor: '#dceef2', preferredObjects: ['rowboat', 'boat', 'crocodile'] },
    ],
  },
  {
    title: { en: 'The Citadel Courtyard', pt: 'O Pátio da Cidadela' },
    subtitle: {
      en: 'Before the joust began, one rider never returned to the pavilion.',
      pt: 'Antes de o torneio começar, um cavaleiro nunca regressou à tenda.',
    },
    paperTheme: 'cream',
    themeAccessory: 'none',
    edition: 'vol2',
    chapterLabel: { en: 'Middle Ages', pt: 'Idade Média' },
    cardTheme: 'medieval',
    walkableOverrides: ['horse'],
    rooms: [
      { name: { en: 'JOUST FIELD', pt: 'LIÇA' }, texture: 'grass', floorColor: '#e4efe0', preferredObjects: ['horse', 'catapult', 'chair'] },
      { name: { en: 'GREAT HALL', pt: 'SALÃO REAL' }, texture: 'limestone', floorColor: '#efe7da', preferredObjects: ['table', 'chair', 'carpet'] },
      { name: { en: 'ARMORY', pt: 'ARMEIRO' }, texture: 'brick_large', floorColor: '#e8e2da', preferredObjects: ['barrel', 'crate', 'shelf'] },
      { name: { en: 'STABLE YARD', pt: 'CAVALARIÇA' }, texture: 'sand', floorColor: '#f1e9d5', preferredObjects: ['horse', 'barrel', 'rock'] },
      { name: { en: 'ROYAL TENT', pt: 'TENDA REAL' }, texture: 'rich', floorColor: '#f0e2e4', preferredObjects: ['carpet', 'chair', 'table'] },
    ],
  },
  {
    title: { en: 'The Polar Research Outpost', pt: 'A Base Polar Internacional' },
    subtitle: {
      en: 'Two wings on the ice shelf, one radio silence too long.',
      pt: 'Duas alas no gelo e um silêncio de rádio demasiado longo.',
    },
    paperTheme: 'powder',
    themeAccessory: 'none',
    edition: 'vol3',
    chapterLabel: { en: 'Antarctica', pt: 'Antártida' },
    cardTheme: 'around_world',
    subGridNames: [
      { en: 'WEST LAB', pt: 'LAB OESTE' },
      { en: 'EAST DOCK', pt: 'CAIS ESTE' },
    ],
    rooms: [
      { name: { en: 'WEATHER LAB', pt: 'METEOROLOGIA' }, texture: 'squaretile', floorColor: '#e2edf5', preferredObjects: ['tv', 'table', 'chair'] },
      { name: { en: 'BUNK ROOM', pt: 'BELICHES' }, texture: 'woodentile', floorColor: '#ebe6dc', preferredObjects: ['bed', 'chair', 'shelf'] },
      { name: { en: 'SUPPLY BAY', pt: 'PROVISÕES' }, texture: 'minitiles', floorColor: '#e4eaf2', preferredObjects: ['crate', 'box', 'barrel'] },
      { name: { en: 'ICE PIER', pt: 'CAIS GELO' }, texture: 'water', floorColor: '#d9edf5', preferredObjects: ['penguin', 'boat', 'rock'] },
      { name: { en: 'RADIO DECK', pt: 'RÁDIO' }, texture: 'smalltiles', floorColor: '#e5ecf2', preferredObjects: ['tv', 'camera', 'chair'] },
    ],
  },
];

import type { CreativeBrief, Difficulty, MurdokuCase, TwistKind } from '../engine/types';
import { generateVerifiedCase } from '../engine/generator';

interface StarterSpec {
  id: string;
  number: number;
  seed: string;
  rows: number;
  cols: number;
  difficulty: Difficulty;
  twistKind: TwistKind;
  allowIrregularVoid?: boolean;
  preferredSuspectIds?: Record<string, string>;
  brief: CreativeBrief;
}

const STARTER_SPECS: StarterSpec[] = [
  {
    id: 'starter-01',
    number: 1,
    seed: 'murdoku-starter-01-greenhouse',
    rows: 5,
    cols: 5,
    difficulty: 'easy',
    twistKind: 'classic',
    brief: {
      title: { en: 'The Greenhouse', pt: 'A Estufa' },
      subtitle: {
        en: 'Someone pruned more than the prize-winning orchids.',
        pt: 'Alguém podou bem mais do que as orquídeas premiadas.',
      },
      paperTheme: 'sage',
      themeAccessory: 'none',
      rooms: [
        { name: { en: 'ORCHID HOUSE', pt: 'ORQUIDÁRIO' }, texture: 'squaretile', floorColor: '#e2f0e6', preferredObjects: ['plant', 'flowers', 'chair'] },
        { name: { en: 'POTTING SHED', pt: 'BARRACÃO' }, texture: 'woodentile', floorColor: '#efe7d6', preferredObjects: ['table', 'barrel', 'crate'] },
        { name: { en: 'BOTANICAL HALL', pt: 'SALA BOTÂNICA' }, texture: 'limestone', floorColor: '#e7f0ec', preferredObjects: ['bonsai', 'chair', 'shelf'] },
        { name: { en: 'CACTUS WING', pt: 'ALA DOS CATOS' }, texture: 'sand', floorColor: '#f3ebd8', preferredObjects: ['cactus', 'rock', 'chair'] },
      ],
    },
  },
  {
    id: 'starter-02',
    number: 2,
    seed: 'murdoku-starter-02-foyer',
    rows: 6,
    cols: 6,
    difficulty: 'easy',
    twistKind: 'classic',
    brief: {
      title: { en: 'The Grand Foyer', pt: 'O Grande Átrio' },
      subtitle: {
        en: 'The dinner guests arrived early; one never made it to dessert.',
        pt: 'Os convidados chegaram cedo; um deles nunca chegou à sobremesa.',
      },
      paperTheme: 'cream',
      themeAccessory: 'none',
      rooms: [
        { name: { en: 'FOYER', pt: 'ÁTRIO' }, texture: 'bigdiamond', floorColor: '#f2eadc', preferredObjects: ['carpet', 'statue', 'plant', 'chair'] },
        { name: { en: 'PARLOR', pt: 'SALÃO' }, texture: 'woodentile', floorColor: '#ece4d8', preferredObjects: ['table', 'chair', 'painting', 'tv'] },
        { name: { en: 'STUDY', pt: 'ESCRITÓRIO' }, texture: 'bigwood', floorColor: '#e7e2ea', preferredObjects: ['shelf', 'table', 'chair'] },
        { name: { en: 'CLOAKROOM', pt: 'BENGALEIRO' }, texture: 'smalltiles', floorColor: '#e6ece4', preferredObjects: ['box', 'shelf', 'chair'] },
        { name: { en: 'GALLERY', pt: 'GALERIA' }, texture: 'rich', floorColor: '#f0e2dd', preferredObjects: ['painting', 'statue', 'chair'] },
      ],
    },
  },
  {
    id: 'starter-03',
    number: 3,
    seed: 'murdoku-starter-03-laboratory',
    rows: 7,
    cols: 7,
    difficulty: 'medium',
    twistKind: 'classic',
    preferredSuspectIds: {
      A: 'ashton',
      C: 'carla',
      D: 'delilah',
      F: 'frank',
      V: 'vaughn',
    },
    brief: {
      title: { en: 'The Laboratory', pt: 'O Laboratório' },
      subtitle: {
        en: "There's a limit to what safety goggles can protect you from.",
        pt: 'Há um limite para o que os óculos de proteção conseguem evitar.',
      },
      paperTheme: 'lilac',
      themeAccessory: 'lab_goggles',
      rooms: [
        { name: { en: 'EXPERIMENTATION', pt: 'EXPERIMENTAÇÃO' }, texture: 'squaretile', floorColor: '#e4f0f5', preferredObjects: ['table', 'chair', 'tv'] },
        { name: { en: 'STORAGE', pt: 'ARMAZÉM' }, texture: 'minitiles', floorColor: '#e0ecf4', preferredObjects: ['shelf', 'box'] },
        { name: { en: 'DECONTAMINATION', pt: 'DESCONTAMINAÇÃO' }, texture: 'squaretile', floorColor: '#e5f2f7', preferredObjects: ['table', 'shelf', 'chair'] },
        { name: { en: 'DATA ANALYSIS', pt: 'ANÁLISE DADOS' }, texture: 'smalltiles', floorColor: '#e8eef7', preferredObjects: ['tv', 'table', 'chair'] },
        { name: { en: 'OFFICE', pt: 'ESCRITÓRIO' }, texture: 'squaretile', floorColor: '#e2f1ef', preferredObjects: ['table', 'chair', 'plant'] },
        { name: { en: 'FREEZER', pt: 'CÂMARA FRIA' }, texture: 'minitiles', floorColor: '#dceaf5', preferredObjects: ['shelf', 'box', 'tv'] },
      ],
    },
  },
  {
    id: 'starter-04',
    number: 4,
    seed: 'murdoku-starter-04-gallery',
    rows: 6,
    cols: 6,
    difficulty: 'medium',
    twistKind: 'classic',
    brief: {
      title: { en: 'The Art Gallery', pt: 'A Galeria de Arte' },
      subtitle: {
        en: 'Everyone is a critic, though some take it too far.',
        pt: 'Todos são críticos de arte, mas alguns foram longe demais.',
      },
      paperTheme: 'peach',
      themeAccessory: 'none',
      rooms: [
        { name: { en: 'SCULPTURE HALL', pt: 'ESCULTURAS' }, texture: 'limestone', floorColor: '#f2e8e0', preferredObjects: ['statue', 'chair', 'plant'] },
        { name: { en: 'STUDIO', pt: 'ATELIER' }, texture: 'woodentile', floorColor: '#f0e4d8', preferredObjects: ['easel', 'table', 'chair'] },
        { name: { en: 'MODERN WING', pt: 'ALA MODERNA' }, texture: 'diamond', floorColor: '#e6ecf2', preferredObjects: ['painting', 'camera', 'chair'] },
        { name: { en: 'STORAGE', pt: 'DEPÓSITO' }, texture: 'woodentile_scrap', floorColor: '#eae3dc', preferredObjects: ['crate', 'box', 'shelf'] },
        { name: { en: 'RECEPTION', pt: 'RECEÇÃO' }, texture: 'rich', floorColor: '#eee3ee', preferredObjects: ['register', 'table', 'plant'] },
      ],
    },
  },
  {
    id: 'starter-05',
    number: 5,
    seed: 'murdoku-starter-05-harbor',
    rows: 7,
    cols: 7,
    difficulty: 'medium',
    twistKind: 'classic',
    brief: {
      title: { en: 'The Harbor Pier', pt: 'O Cais do Porto' },
      subtitle: {
        en: 'Low tide revealed a secret that was meant to stay at sea.',
        pt: 'A maré baixa revelou um segredo que devia ter ficado no mar.',
      },
      paperTheme: 'powder',
      themeAccessory: 'none',
      rooms: [
        { name: { en: 'NORTH DOCK', pt: 'CAIS NORTE' }, texture: 'bigwood', floorColor: '#e3edf4', preferredObjects: ['boat', 'barrel', 'crate', 'chair'] },
        { name: { en: 'BOATHOUSE', pt: 'CASA BARCOS' }, texture: 'woodentile', floorColor: '#eae3d6', preferredObjects: ['rowboat', 'table', 'shelf'] },
        { name: { en: 'FISH MARKET', pt: 'LOTA' }, texture: 'smalltiles', floorColor: '#e0ecf0', preferredObjects: ['table', 'register', 'barrel'] },
        { name: { en: 'CAPTAIN OFFICE', pt: 'CAPITANIA' }, texture: 'woodentile_scrap', floorColor: '#e6e8f2', preferredObjects: ['table', 'chair', 'tv', 'shelf'] },
        { name: { en: 'SHORELINE', pt: 'MARGEM' }, texture: 'sand', floorColor: '#f2ebd6', preferredObjects: ['shell', 'puddle', 'rock'] },
        { name: { en: 'WAREHOUSE', pt: 'ARMAZÉM' }, texture: 'brick_large', floorColor: '#eae2dc', preferredObjects: ['crate', 'box', 'barrel'] },
      ],
    },
  },
  {
    id: 'starter-06',
    number: 6,
    seed: 'murdoku-starter-06-courtyard',
    rows: 7,
    cols: 7,
    difficulty: 'hard',
    twistKind: 'classic',
    allowIrregularVoid: true,
    brief: {
      title: { en: 'The Botanical Courtyard', pt: 'O Pátio Botânico' },
      subtitle: {
        en: 'Between the stone paths and tall palms, an alibi withered.',
        pt: 'Entre os caminhos de pedra e palmeiras, um álibi murchou.',
      },
      paperTheme: 'sage',
      themeAccessory: 'none',
      rooms: [
        { name: { en: 'SUNKEN GARDEN', pt: 'JARDIM' }, texture: 'grass', floorColor: '#e2f0df', preferredObjects: ['flowers', 'tree', 'chair', 'shrub'] },
        { name: { en: 'KOI POND', pt: 'LAGO' }, texture: 'water', floorColor: '#dcf0f4', preferredObjects: ['lily_pad', 'rock', 'bonsai'] },
        { name: { en: 'VERANDA', pt: 'VARANDA' }, texture: 'limestone', floorColor: '#f0eadb', preferredObjects: ['table', 'chair', 'plant'] },
        { name: { en: 'PALM GROVE', pt: 'PALMAR' }, texture: 'grass_tall', floorColor: '#e5f0dc', preferredObjects: ['palmtree', 'shrub', 'chair'] },
        { name: { en: 'TEA PAVILION', pt: 'PAVILHÃO' }, texture: 'woodentile', floorColor: '#efe5d8', preferredObjects: ['table', 'carpet', 'chair'] },
        { name: { en: 'TOOL ROOM', pt: 'FERRAMENTAS' }, texture: 'brick_large', floorColor: '#ebe3dc', preferredObjects: ['barrel', 'crate', 'shelf'] },
      ],
    },
  },
  {
    id: 'starter-07',
    number: 7,
    seed: 'murdoku-starter-07-observatory',
    rows: 8,
    cols: 8,
    difficulty: 'expert',
    twistKind: 'classic',
    brief: {
      title: { en: 'The Grand Observatory', pt: 'O Grande Observatório' },
      subtitle: {
        en: 'The stars aligned for everyone except tonight’s victim.',
        pt: 'Os astros alinharam-se para todos, exceto para a vítima desta noite.',
      },
      paperTheme: 'slate',
      themeAccessory: 'none',
      rooms: [
        { name: { en: 'MAIN DOME', pt: 'CÚPULA' }, texture: 'bigdiamond', floorColor: '#e2e8f2', preferredObjects: ['camera', 'chair', 'table', 'tv'] },
        { name: { en: 'CHART ROOM', pt: 'CARTOGRAFIA' }, texture: 'woodentile', floorColor: '#ece6db', preferredObjects: ['table', 'shelf', 'chair'] },
        { name: { en: 'LIBRARY', pt: 'BIBLIOTECA' }, texture: 'bigwood', floorColor: '#eae3df', preferredObjects: ['shelf', 'carpet', 'chair'] },
        { name: { en: 'OPTICS LAB', pt: 'ÓTICA' }, texture: 'squaretile', floorColor: '#e0edf2', preferredObjects: ['table', 'tv', 'box'] },
        { name: { en: 'SLEEPING PODS', pt: 'DORMITÓRIO' }, texture: 'smalltiles', floorColor: '#e9e4f2', preferredObjects: ['bed', 'chair', 'plant'] },
        { name: { en: 'ARCHIVE', pt: 'ARQUIVO' }, texture: 'limestone', floorColor: '#e4ebe8', preferredObjects: ['shelf', 'crate', 'chair'] },
      ],
    },
  },
  {
    id: 'starter-08',
    number: 8,
    seed: 'murdoku-starter-08-saloon',
    rows: 6,
    cols: 6,
    difficulty: 'medium',
    twistKind: 'outlaw',
    brief: {
      title: { en: 'High Noon Saloon', pt: 'Saloon ao Meio-Dia' },
      subtitle: {
        en: 'This town ain’t big enough for both of them — and one is an Outlaw.',
        pt: 'Esta vila não chega para ambos — e há um Fora-da-Lei à solta.',
      },
      paperTheme: 'sand',
      themeAccessory: 'western_bandana',
      rooms: [
        { name: { en: 'SALOON', pt: 'SALOON' }, texture: 'woodentile', floorColor: '#f2e5cf', preferredObjects: ['table', 'chair', 'barrel'] },
        { name: { en: 'STABLES', pt: 'ESTÁBULO' }, texture: 'sand', floorColor: '#efe7d2', preferredObjects: ['horse', 'barrel', 'crate'] },
        { name: { en: 'STORE', pt: 'MERCEARIA' }, texture: 'bigwood', floorColor: '#ece0d4', preferredObjects: ['register', 'shelf', 'box'] },
        { name: { en: 'COURTYARD', pt: 'PÁTIO' }, texture: 'rocks', floorColor: '#f3e9d6', preferredObjects: ['cactus', 'rock', 'chair'] },
        { name: { en: 'SHERIFF', pt: 'XERIFE' }, texture: 'woodentile_scrap', floorColor: '#e8e2da', preferredObjects: ['table', 'chair', 'shelf'] },
      ],
    },
  },
  {
    id: 'starter-09',
    number: 9,
    seed: 'murdoku-starter-09-express',
    rows: 7,
    cols: 7,
    difficulty: 'hard',
    twistKind: 'outlaw',
    brief: {
      title: { en: 'The Midnight Express', pt: 'O Expresso da Meia-Noite' },
      subtitle: {
        en: 'Six carriages, one hidden Outlaw, and no stops until dawn.',
        pt: 'Seis carruagens, um Fora-da-Lei oculto e sem paragens até amanhecer.',
      },
      paperTheme: 'cream',
      themeAccessory: 'western_bandana',
      rooms: [
        { name: { en: 'DINING CAR', pt: 'RESTAURANTE' }, texture: 'rich', floorColor: '#f2e4da', preferredObjects: ['table', 'chair', 'plant'] },
        { name: { en: 'SLEEPER CAR', pt: 'CAMAROTES' }, texture: 'woodentile', floorColor: '#ebe4ec', preferredObjects: ['bed', 'chair', 'box'] },
        { name: { en: 'LOUNGE', pt: 'SALÃO' }, texture: 'diamond', floorColor: '#e4ece8', preferredObjects: ['carpet', 'chair', 'table', 'tv'] },
        { name: { en: 'BAGGAGE', pt: 'BAGAGEM' }, texture: 'woodentile_scrap', floorColor: '#ece6d8', preferredObjects: ['crate', 'box', 'barrel'] },
        { name: { en: 'CABOOSE', pt: 'FURGÃO' }, texture: 'bigwood', floorColor: '#e6eaf2', preferredObjects: ['table', 'chair', 'shelf'] },
        { name: { en: 'BAR CAR', pt: 'BAR' }, texture: 'bigdiamond', floorColor: '#f2e8d6', preferredObjects: ['barrel', 'chair', 'register'] },
      ],
    },
  },
  {
    id: 'starter-10',
    number: 10,
    seed: 'murdoku-starter-10-masquerade',
    rows: 6,
    cols: 6,
    difficulty: 'medium',
    twistKind: 'uninvolved',
    brief: {
      title: { en: 'The Masquerade Alibi', pt: 'O Álibi do Baile' },
      subtitle: {
        en: 'Seven invitations were sent, yet one guest never crossed the threshold.',
        pt: 'Foram enviados sete convites, mas um convidado nunca apareceu.',
      },
      paperTheme: 'lavender',
      themeAccessory: 'masquerade_mask',
      rooms: [
        { name: { en: 'BALLROOM', pt: 'SALÃO DE BAILE' }, texture: 'bigdiamond', floorColor: '#eee5f4', preferredObjects: ['carpet', 'statue', 'chair', 'plant'] },
        { name: { en: 'BANQUET', pt: 'BANQUETE' }, texture: 'rich', floorColor: '#f4e6e0', preferredObjects: ['table', 'chair', 'present'] },
        { name: { en: 'BALCONY', pt: 'VARANDA' }, texture: 'limestone', floorColor: '#e4eef4', preferredObjects: ['plant', 'flowers', 'chair'] },
        { name: { en: 'LOUNGE', pt: 'SALA DE ESTAR' }, texture: 'woodentile', floorColor: '#efe8da', preferredObjects: ['table', 'painting', 'chair'] },
        { name: { en: 'VESTIBULE', pt: 'VESTÍBULO' }, texture: 'smalltiles', floorColor: '#e6ede9', preferredObjects: ['statue', 'shelf', 'box'] },
      ],
    },
  },
  {
    id: 'starter-11',
    number: 11,
    seed: 'murdoku-starter-11-blueprint',
    rows: 6,
    cols: 6,
    difficulty: 'hard',
    twistKind: 'missing_piece',
    brief: {
      title: { en: 'The Torn Blueprint', pt: 'A Planta Rasgada' },
      subtitle: {
        en: 'The architect tore out a vital corner before vanishing.',
        pt: 'O arquiteto rasgou um pedaço vital da planta antes de desaparecer.',
      },
      paperTheme: 'powder',
      themeAccessory: 'none',
      rooms: [
        { name: { en: 'DRAFTING ROOM', pt: 'DESENHO' }, texture: 'squaretile', floorColor: '#e2edf5', preferredObjects: ['table', 'chair', 'easel'] },
        { name: { en: 'MODEL HALL', pt: 'MAQUETES' }, texture: 'minitiles', floorColor: '#e7eaf4', preferredObjects: ['table', 'statue', 'box'] },
        { name: { en: 'OFFICE', pt: 'ESCRITÓRIO' }, texture: 'woodentile', floorColor: '#efe8dc', preferredObjects: ['table', 'chair', 'tv', 'plant'] },
        { name: { en: 'VAULT', pt: 'ARQUIVO' }, texture: 'limestone', floorColor: '#e4eee9', preferredObjects: ['shelf', 'crate', 'box'] },
        { name: { en: 'LOBBY', pt: 'ENTRADA' }, texture: 'diamond', floorColor: '#f0e6e4', preferredObjects: ['carpet', 'chair', 'plant'] },
      ],
    },
  },
  {
    id: 'starter-12',
    number: 12,
    seed: 'murdoku-starter-12-confessional',
    rows: 7,
    cols: 7,
    difficulty: 'expert',
    twistKind: 'liar',
    brief: {
      title: { en: 'The Confessional Library', pt: 'A Biblioteca das Confissões' },
      subtitle: {
        en: 'Every alibi sounds airtight — except one bold-faced lie.',
        pt: 'Todos os álibis parecem sólidos — exceto uma mentira descarada.',
      },
      paperTheme: 'lilac',
      themeAccessory: 'none',
      rooms: [
        { name: { en: 'READING ROOM', pt: 'LEITURA' }, texture: 'bigwood', floorColor: '#eee6da', preferredObjects: ['table', 'chair', 'carpet'] },
        { name: { en: 'RARE BOOKS', pt: 'LIVROS RAROS' }, texture: 'woodentile', floorColor: '#eae4f2', preferredObjects: ['shelf', 'chair', 'statue'] },
        { name: { en: 'STUDY', pt: 'GABINETE' }, texture: 'diamond', floorColor: '#e5eef0', preferredObjects: ['table', 'chair', 'tv'] },
        { name: { en: 'MAP ARCHIVE', pt: 'MAPOTECA' }, texture: 'smalltiles', floorColor: '#f0e6e6', preferredObjects: ['table', 'shelf', 'box'] },
        { name: { en: 'CONSERVATORY', pt: 'JARDIM INT.' }, texture: 'squaretile', floorColor: '#e4efe8', preferredObjects: ['plant', 'bonsai', 'chair'] },
        { name: { en: 'BINDERY', pt: 'ENCADERNAÇÃO' }, texture: 'woodentile_scrap', floorColor: '#efe7de', preferredObjects: ['crate', 'table', 'shelf'] },
      ],
    },
  },
];

let cachedStarterVolume: MurdokuCase[] | null = null;

export function getStarterVolume(): MurdokuCase[] {
  if (cachedStarterVolume) return cachedStarterVolume;
  cachedStarterVolume = STARTER_SPECS.map((spec, idx) =>
    generateVerifiedCase({
      id: spec.id,
      number: spec.number,
      pageLeft: 8 + idx * 2,
      pageRight: 9 + idx * 2,
      volume: 'starter',
      seed: spec.seed,
      rows: spec.rows,
      cols: spec.cols,
      difficulty: spec.difficulty,
      twistKind: spec.twistKind,
      allowIrregularVoid: spec.allowIrregularVoid,
      preferredSuspectIds: spec.preferredSuspectIds,
      brief: spec.brief,
      generatedBy: 'starter',
    })
  );
  return cachedStarterVolume;
}

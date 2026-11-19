import type { LocalizedText, PaperThemeId } from '../engine/types';

export interface ObjectMeta {
  id: string;
  svgPath: string;
  walkable: boolean;
  /** Singular with indefinite article in EN and PT-PT for natural clues */
  articleName: LocalizedText;
  /** Plural or bare noun */
  label: LocalizedText;
  /** Whether this object supports 49-tile multi-cell autotiling */
  autotile?: 'table' | 'carpet';
}

export const OBJECT_CATALOG: Record<string, ObjectMeta> = {
  table: {
    id: 'table',
    svgPath: '/assets/objects/obj_table.svg',
    walkable: false,
    autotile: 'table',
    articleName: { en: 'a table', pt: 'uma mesa' },
    label: { en: 'table', pt: 'mesa' },
  },
  chair: {
    id: 'chair',
    svgPath: '/assets/objects/obj_chair.svg',
    walkable: true,
    articleName: { en: 'a chair', pt: 'uma cadeira' },
    label: { en: 'chair', pt: 'cadeira' },
  },
  tv: {
    id: 'tv',
    svgPath: '/assets/objects/obj_tv.svg',
    walkable: false,
    articleName: { en: 'a TV', pt: 'uma televisão' },
    label: { en: 'TV', pt: 'televisão' },
  },
  shelf: {
    id: 'shelf',
    svgPath: '/assets/objects/obj_shelf.svg',
    walkable: false,
    articleName: { en: 'a shelf', pt: 'uma estante' },
    label: { en: 'shelf', pt: 'estante' },
  },
  plant: {
    id: 'plant',
    svgPath: '/assets/objects/obj_plant.svg',
    walkable: false,
    articleName: { en: 'a plant', pt: 'uma planta' },
    label: { en: 'plant', pt: 'planta' },
  },
  bonsai: {
    id: 'bonsai',
    svgPath: '/assets/objects/obj_bonsai.svg',
    walkable: false,
    articleName: { en: 'a bonsai', pt: 'um bonsai' },
    label: { en: 'bonsai', pt: 'bonsai' },
  },
  bed: {
    id: 'bed',
    svgPath: '/assets/objects/obj_bed.svg',
    walkable: true,
    articleName: { en: 'a bed', pt: 'uma cama' },
    label: { en: 'bed', pt: 'cama' },
  },
  carpet: {
    id: 'carpet',
    svgPath: '/assets/objects/obj_carpet.svg',
    walkable: true,
    autotile: 'carpet',
    articleName: { en: 'a carpet', pt: 'um tapete' },
    label: { en: 'carpet', pt: 'tapete' },
  },
  painting: {
    id: 'painting',
    svgPath: '/assets/objects/obj_painting.svg',
    walkable: false,
    articleName: { en: 'a painting', pt: 'um quadro' },
    label: { en: 'painting', pt: 'quadro' },
  },
  easel: {
    id: 'easel',
    svgPath: '/assets/objects/obj_easel.svg',
    walkable: false,
    articleName: { en: 'an easel', pt: 'um cavalete' },
    label: { en: 'easel', pt: 'cavalete' },
  },
  statue: {
    id: 'statue',
    svgPath: '/assets/objects/obj_statue.svg',
    walkable: false,
    articleName: { en: 'a statue', pt: 'uma estátua' },
    label: { en: 'statue', pt: 'estátua' },
  },
  barrel: {
    id: 'barrel',
    svgPath: '/assets/objects/obj_barrel.svg',
    walkable: false,
    articleName: { en: 'a barrel', pt: 'um barril' },
    label: { en: 'barrel', pt: 'barril' },
  },
  crate: {
    id: 'crate',
    svgPath: '/assets/objects/obj_crate.svg',
    walkable: false,
    articleName: { en: 'a crate', pt: 'um caixote' },
    label: { en: 'crate', pt: 'caixote' },
  },
  box: {
    id: 'box',
    svgPath: '/assets/objects/obj_box.svg',
    walkable: false,
    articleName: { en: 'a box', pt: 'uma caixa' },
    label: { en: 'box', pt: 'caixa' },
  },
  cactus: {
    id: 'cactus',
    svgPath: '/assets/objects/obj_cactus.svg',
    walkable: false,
    articleName: { en: 'a cactus', pt: 'um cato' },
    label: { en: 'cactus', pt: 'cato' },
  },
  horse: {
    id: 'horse',
    svgPath: '/assets/objects/obj_horse.svg',
    walkable: false,
    articleName: { en: 'a horse', pt: 'um cavalo' },
    label: { en: 'horse', pt: 'cavalo' },
  },
  car: {
    id: 'car',
    svgPath: '/assets/objects/obj_car.svg',
    walkable: false,
    articleName: { en: 'a car', pt: 'um carro' },
    label: { en: 'car', pt: 'carro' },
  },
  boat: {
    id: 'boat',
    svgPath: '/assets/objects/obj_boat.svg',
    walkable: false,
    articleName: { en: 'a boat', pt: 'um barco' },
    label: { en: 'boat', pt: 'barco' },
  },
  rowboat: {
    id: 'rowboat',
    svgPath: '/assets/objects/obj_rowboat.svg',
    walkable: false,
    articleName: { en: 'a rowboat', pt: 'um barco a remos' },
    label: { en: 'rowboat', pt: 'barco a remos' },
  },
  camera: {
    id: 'camera',
    svgPath: '/assets/objects/obj_camera.svg',
    walkable: false,
    articleName: { en: 'a camera', pt: 'uma câmara' },
    label: { en: 'camera', pt: 'câmara' },
  },
  register: {
    id: 'register',
    svgPath: '/assets/objects/obj_register.svg',
    walkable: false,
    articleName: { en: 'a cash register', pt: 'uma caixa registadora' },
    label: { en: 'cash register', pt: 'caixa registadora' },
  },
  trashcan: {
    id: 'trashcan',
    svgPath: '/assets/objects/obj_trashcan.svg',
    walkable: false,
    articleName: { en: 'a trash can', pt: 'um caixote do lixo' },
    label: { en: 'trash can', pt: 'caixote do lixo' },
  },
  tree: {
    id: 'tree',
    svgPath: '/assets/objects/obj_tree.svg',
    walkable: false,
    articleName: { en: 'a tree', pt: 'uma árvore' },
    label: { en: 'tree', pt: 'árvore' },
  },
  palmtree: {
    id: 'palmtree',
    svgPath: '/assets/objects/obj_palmtree.svg',
    walkable: false,
    articleName: { en: 'a palm tree', pt: 'uma palmeira' },
    label: { en: 'palm tree', pt: 'palmeira' },
  },
  shrub: {
    id: 'shrub',
    svgPath: '/assets/objects/obj_shrub.svg',
    walkable: false,
    articleName: { en: 'a shrub', pt: 'um arbusto' },
    label: { en: 'shrub', pt: 'arbusto' },
  },
  flowers: {
    id: 'flowers',
    svgPath: '/assets/objects/obj_flowers.svg',
    walkable: true,
    articleName: { en: 'flowers', pt: 'flores' },
    label: { en: 'flowers', pt: 'flores' },
  },
  rock: {
    id: 'rock',
    svgPath: '/assets/objects/obj_rock.svg',
    walkable: false,
    articleName: { en: 'a rock', pt: 'uma rocha' },
    label: { en: 'rock', pt: 'rocha' },
  },
  boulder: {
    id: 'boulder',
    svgPath: '/assets/objects/obj_boulder.svg',
    walkable: false,
    articleName: { en: 'a boulder', pt: 'um rochedo' },
    label: { en: 'boulder', pt: 'rochedo' },
  },
  punching_bag: {
    id: 'punching_bag',
    svgPath: '/assets/objects/obj_punching_bag.svg',
    walkable: false,
    articleName: { en: 'a punching bag', pt: 'um saco de boxe' },
    label: { en: 'punching bag', pt: 'saco de boxe' },
  },
  present: {
    id: 'present',
    svgPath: '/assets/objects/obj_present.svg',
    walkable: false,
    articleName: { en: 'a gift box', pt: 'um presente' },
    label: { en: 'gift box', pt: 'presente' },
  },
  pumpkin: {
    id: 'pumpkin',
    svgPath: '/assets/objects/obj_pumpkin.svg',
    walkable: false,
    articleName: { en: 'a pumpkin', pt: 'uma abóbora' },
    label: { en: 'pumpkin', pt: 'abóbora' },
  },
  teddy_bear: {
    id: 'teddy_bear',
    svgPath: '/assets/objects/obj_teddy_bear.svg',
    walkable: false,
    articleName: { en: 'a teddy bear', pt: 'um urso de peluche' },
    label: { en: 'teddy bear', pt: 'urso de peluche' },
  },
  shell: {
    id: 'shell',
    svgPath: '/assets/objects/obj_shell.svg',
    walkable: false,
    articleName: { en: 'a shell', pt: 'uma concha' },
    label: { en: 'shell', pt: 'concha' },
  },
  puddle: {
    id: 'puddle',
    svgPath: '/assets/objects/obj_puddle.svg',
    walkable: true,
    articleName: { en: 'a puddle', pt: 'uma poça' },
    label: { en: 'puddle', pt: 'poça' },
  },
  lily_pad: {
    id: 'lily_pad',
    svgPath: '/assets/objects/obj_lily_pad.svg',
    walkable: true,
    articleName: { en: 'a lily pad', pt: 'um nenúfar' },
    label: { en: 'lily pad', pt: 'nenúfar' },
  },
  golf_cart: {
    id: 'golf_cart',
    svgPath: '/assets/objects/obj_golf_cart.svg',
    walkable: false,
    articleName: { en: 'a golf cart', pt: 'um carrinho de golfe' },
    label: { en: 'golf cart', pt: 'carrinho de golfe' },
  },
  lion: {
    id: 'lion',
    svgPath: '/assets/objects/obj_lion.svg',
    walkable: false,
    articleName: { en: 'a lion', pt: 'um leão' },
    label: { en: 'lion', pt: 'leão' },
  },
  bear: {
    id: 'bear',
    svgPath: '/assets/objects/obj_bear.svg',
    walkable: false,
    articleName: { en: 'a bear', pt: 'um urso' },
    label: { en: 'bear', pt: 'urso' },
  },
  elephant: {
    id: 'elephant',
    svgPath: '/assets/objects/obj_elephant.svg',
    walkable: false,
    articleName: { en: 'an elephant', pt: 'um elefante' },
    label: { en: 'elephant', pt: 'elefante' },
  },
  penguin: {
    id: 'penguin',
    svgPath: '/assets/objects/obj_penguin.svg',
    walkable: false,
    articleName: { en: 'a penguin', pt: 'um pinguim' },
    label: { en: 'penguin', pt: 'pinguim' },
  },
  shark: {
    id: 'shark',
    svgPath: '/assets/objects/obj_shark.svg',
    walkable: false,
    articleName: { en: 'a shark', pt: 'um tubarão' },
    label: { en: 'shark', pt: 'tubarão' },
  },
  crocodile: {
    id: 'crocodile',
    svgPath: '/assets/objects/obj_crocodile.svg',
    walkable: false,
    articleName: { en: 'a crocodile', pt: 'um crocodilo' },
    label: { en: 'crocodile', pt: 'crocodilo' },
  },
  boar: {
    id: 'boar',
    svgPath: '/assets/objects/obj_boar.svg',
    walkable: false,
    articleName: { en: 'a boar', pt: 'um javali' },
    label: { en: 'boar', pt: 'javali' },
  },
  catapult: {
    id: 'catapult',
    svgPath: '/assets/objects/obj_catapult.svg',
    walkable: false,
    articleName: { en: 'a catapult', pt: 'uma catapulta' },
    label: { en: 'catapult', pt: 'catapulta' },
  },
  rubble: {
    id: 'rubble',
    svgPath: '/assets/objects/obj_rubble.svg',
    walkable: false,
    articleName: { en: 'rubble', pt: 'escombros' },
    label: { en: 'rubble', pt: 'escombros' },
  },
};

export const VALID_OBJECT_IDS = Object.keys(OBJECT_CATALOG);

export const VALID_FLOOR_TEXTURES = [
  'squaretile',
  'smalltiles',
  'minitiles',
  'woodentile',
  'woodentile_scrap',
  'bigwood',
  'diamond',
  'bigdiamond',
  'brick_large',
  'limestone',
  'rich',
  'grass',
  'grass_tall',
  'sand',
  'rocks',
  'water',
] as const;

export type FloorTextureId = (typeof VALID_FLOOR_TEXTURES)[number];

export function getFloorTexturePath(texture: string): string {
  const safe = (VALID_FLOOR_TEXTURES as readonly string[]).includes(texture)
    ? texture
    : 'squaretile';
  return `/assets/textures/texture_floor_${safe}.svg`;
}

export type ObjectTintRole =
  | 'chair'
  | 'table'
  | 'foliage'
  | 'flowers'
  | 'carpet'
  | 'stone'
  | 'vehicle';

export type SceneObjectColors = Record<ObjectTintRole, string>;

export interface PaperPalette {
  id: PaperThemeId;
  pageBg: string;
  pageEdge: string;
  gutterShadow: string;
  accentBg: string;
  cardPalette: string[];
  objectColors: SceneObjectColors;
}

const OBJECT_TINT_ROLE_MAP: Record<string, ObjectTintRole> = {
  chair: 'chair',
  table: 'table',
  shelf: 'table',
  plant: 'foliage',
  shrub: 'foliage',
  palmtree: 'foliage',
  tree: 'foliage',
  cactus: 'foliage',
  flowers: 'flowers',
  carpet: 'carpet',
  bed: 'carpet',
  bed_top: 'carpet',
  rock: 'stone',
  car: 'vehicle',
  rowboat: 'vehicle',
  shark: 'vehicle',
};

export function getObjectTintRole(objectType: string): ObjectTintRole | null {
  return OBJECT_TINT_ROLE_MAP[objectType] ?? null;
}

export function hexToTintMatrix(hex: string): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  return `${r.toFixed(4)} 0 0 0 0  0 ${g.toFixed(4)} 0 0 0  0 0 ${b.toFixed(4)} 0 0  0 0 0 1 0`;
}

export const PAPER_PALETTES: Record<PaperThemeId, PaperPalette> = {
  lilac: {
    id: 'lilac',
    pageBg: '#ece9f5',
    pageEdge: '#e0dcee',
    gutterShadow: 'rgba(38, 32, 62, 0.14)',
    accentBg: '#dcd7ec',
    cardPalette: ['#dceef4', '#f2e8e6', '#e4f0e8', '#e5e3f3', '#f3ecdc', '#dfeaf5'],
    objectColors: {
      chair: '#b894d6',
      table: '#d2b28c',
      foliage: '#7cb585',
      flowers: '#e694b4',
      carpet: '#9f87c4',
      stone: '#b4b2bf',
      vehicle: '#8a9cd4',
    },
  },
  cream: {
    id: 'cream',
    pageBg: '#f4efe5',
    pageEdge: '#e8e0d1',
    gutterShadow: 'rgba(54, 42, 26, 0.14)',
    accentBg: '#e8dfce',
    cardPalette: ['#e6ece0', '#f0e2d8', '#dde8ee', '#ede4f0', '#f4ebd4', '#e0ebe7'],
    objectColors: {
      chair: '#d99b66',
      table: '#cca374',
      foliage: '#84b572',
      flowers: '#eb9a7e',
      carpet: '#c97b6d',
      stone: '#beb5a6',
      vehicle: '#7e9fb8',
    },
  },
  sage: {
    id: 'sage',
    pageBg: '#e8f1eb',
    pageEdge: '#dae7df',
    gutterShadow: 'rgba(28, 50, 38, 0.14)',
    accentBg: '#d6e6dc',
    cardPalette: ['#f3ebd8', '#dcebf0', '#f0e2df', '#e5e2f2', '#e4efe0', '#e9e6d8'],
    objectColors: {
      chair: '#df9478',
      table: '#d4ae7e',
      foliage: '#72ba76',
      flowers: '#ed8fa4',
      carpet: '#7db094',
      stone: '#b5b8ae',
      vehicle: '#76a5b8',
    },
  },
  peach: {
    id: 'peach',
    pageBg: '#f5eae4',
    pageEdge: '#eadbd3',
    gutterShadow: 'rgba(60, 36, 28, 0.14)',
    accentBg: '#ebd8ce',
    cardPalette: ['#dfe9f0', '#e4eee5', '#ece2f0', '#f4ead2', '#dfecec', '#f0e0dd'],
    objectColors: {
      chair: '#d47482',
      table: '#c99874',
      foliage: '#7eb57d',
      flowers: '#f094a8',
      carpet: '#c76d7c',
      stone: '#bfb2ab',
      vehicle: '#c98874',
    },
  },
  powder: {
    id: 'powder',
    pageBg: '#e7eff6',
    pageEdge: '#d8e4ef',
    gutterShadow: 'rgba(26, 44, 64, 0.14)',
    accentBg: '#d5e3f0',
    cardPalette: ['#f2eadc', '#e6ece1', '#f1e3e6', '#e6e3f3', '#dfeeea', '#f4e6d8'],
    objectColors: {
      chair: '#7ca8d4',
      table: '#cdb28e',
      foliage: '#72b88c',
      flowers: '#eb9eb0',
      carpet: '#6e9ec2',
      stone: '#aebbc7',
      vehicle: '#6898c9',
    },
  },
  lavender: {
    id: 'lavender',
    pageBg: '#f1ebf5',
    pageEdge: '#e5dced',
    gutterShadow: 'rgba(48, 30, 58, 0.14)',
    accentBg: '#e3d8eb',
    cardPalette: ['#dfecf0', '#f2ead9', '#e2eee6', '#f2e3e2', '#e1e7f4', '#efe8d8'],
    objectColors: {
      chair: '#c78ec7',
      table: '#cfa984',
      foliage: '#7bb882',
      flowers: '#eb96c2',
      carpet: '#b084bd',
      stone: '#bbb2c2',
      vehicle: '#9296cf',
    },
  },
  sand: {
    id: 'sand',
    pageBg: '#f2eadb',
    pageEdge: '#e5dac6',
    gutterShadow: 'rgba(58, 44, 24, 0.15)',
    accentBg: '#e5d8c0',
    cardPalette: ['#dfe8ed', '#e5ece0', '#f0e0d9', '#e8e2ee', '#dcebe6', '#f2e6cf'],
    objectColors: {
      chair: '#d6925c',
      table: '#c79a67',
      foliage: '#87b36b',
      flowers: '#eb9f6e',
      carpet: '#c7825a',
      stone: '#c4b49b',
      vehicle: '#b8845c',
    },
  },
  slate: {
    id: 'slate',
    pageBg: '#e9edf2',
    pageEdge: '#dce2ea',
    gutterShadow: 'rgba(28, 36, 48, 0.15)',
    accentBg: '#d8e0ea',
    cardPalette: ['#f0e8db', '#e2eee7', '#eee2e6', '#e3e4f2', '#dfecf0', '#f0e4d8'],
    objectColors: {
      chair: '#849eb8',
      table: '#c4ad92',
      foliage: '#73b088',
      flowers: '#e096a8',
      carpet: '#7993ad',
      stone: '#a8b2bd',
      vehicle: '#7896b5',
    },
  },
};

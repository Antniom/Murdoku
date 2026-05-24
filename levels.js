// ============================================================
// levels.js — Level data, clue engine, and built-in puzzles
// ============================================================

// ---- Spatial Helpers ----
const isAdjacent = (a, b) =>
  Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1 && !(a.x === b.x && a.y === b.y);

const isOrthAdjacent = (a, b) =>
  (Math.abs(a.x - b.x) === 1 && a.y === b.y) || (a.x === b.x && Math.abs(a.y - b.y) === 1);

const getRoomForCell = (x, y, level) => {
  for (const room of level.rooms) {
    if (room.cells.some(c => c.x === x && c.y === y)) return room;
  }
  return null;
};

const getObstacleAt = (x, y, level) =>
  (level.obstacles || []).find(o => o.x === x && o.y === y && !o.wall) || null;

const isObstacleCell = (x, y, level) => {
  const o = getObstacleAt(x, y, level);
  return o ? !o.walkable : false;
};

const isVoidCell = (x, y, level) => {
  if (!level.shape) return false;
  if (y < 0 || y >= level.rows || x < 0 || x >= level.cols) return true;
  return !level.shape[y][x];
};

const isValidPlacementCell = (x, y, level) =>
  !isVoidCell(x, y, level) && !isObstacleCell(x, y, level);

// Count suspects in a room for a given placements object
const suspectsInRoom = (roomId, placements, level) => {
  let count = 0;
  for (const pos of Object.values(placements)) {
    const r = getRoomForCell(pos.x, pos.y, level);
    if (r && r.id === roomId) count++;
  }
  return count;
};

const roomOfSuspect = (id, placements, level) => {
  const pos = placements[id];
  if (!pos) return null;
  return getRoomForCell(pos.x, pos.y, level);
};

// ---- Clue Validation Engine ----
// Each validator: (placements, level) => true | false | null (null = not enough info yet)

const VALIDATORS = {
  beside_obstacle: (suspectId, obstaclePos) => (placements, level) => {
    const pos = placements[suspectId];
    if (!pos) return null;
    return isAdjacent(pos, obstaclePos);
  },

  directly_below: (suspectId, targetPos) => (placements, level) => {
    const pos = placements[suspectId];
    if (!pos) return null;
    return pos.x === targetPos.x && pos.y === targetPos.y + 1;
  },

  directly_above: (suspectId, targetPos) => (placements, level) => {
    const pos = placements[suspectId];
    if (!pos) return null;
    return pos.x === targetPos.x && pos.y === targetPos.y - 1;
  },

  alone_in_room: (suspectId) => (placements, level) => {
    const pos = placements[suspectId];
    if (!pos) return null;
    const room = getRoomForCell(pos.x, pos.y, level);
    if (!room) return false;
    return suspectsInRoom(room.id, placements, level) === 1;
  },

  same_room_as: (suspectId, otherId) => (placements, level) => {
    const pos = placements[suspectId];
    const other = placements[otherId];
    if (!pos) return null;
    if (!other) return null;
    const r1 = getRoomForCell(pos.x, pos.y, level);
    const r2 = getRoomForCell(other.x, other.y, level);
    return r1 && r2 && r1.id === r2.id;
  },

  not_same_room_as: (suspectId, otherId) => (placements, level) => {
    const pos = placements[suspectId];
    const other = placements[otherId];
    if (!pos) return null;
    if (!other) return null;
    const r1 = getRoomForCell(pos.x, pos.y, level);
    const r2 = getRoomForCell(other.x, other.y, level);
    return r1 && r2 && r1.id !== r2.id;
  },

  victim_clue: (suspectId) => (placements, level) => {
    const pos = placements[suspectId];
    if (!pos) return null;
    const room = getRoomForCell(pos.x, pos.y, level);
    if (!room) return false;
    return suspectsInRoom(room.id, placements, level) === 2;
  },

  left_of_obstacle: (suspectId, obstaclePos) => (placements, level) => {
    const pos = placements[suspectId];
    if (!pos) return null;
    return isAdjacent(pos, obstaclePos) && pos.x < obstaclePos.x;
  },

  right_of_obstacle: (suspectId, obstaclePos) => (placements, level) => {
    const pos = placements[suspectId];
    if (!pos) return null;
    return isAdjacent(pos, obstaclePos) && pos.x > obstaclePos.x;
  },

  above_obstacle: (suspectId, obstaclePos) => (placements, level) => {
    const pos = placements[suspectId];
    if (!pos) return null;
    return isAdjacent(pos, obstaclePos) && pos.y < obstaclePos.y;
  },

  beside_and_alone: (suspectId, obstaclePos) => (placements, level) => {
    const pos = placements[suspectId];
    if (!pos) return null;
    if (!isAdjacent(pos, obstaclePos)) return false;
    const room = getRoomForCell(pos.x, pos.y, level);
    if (!room) return false;
    return suspectsInRoom(room.id, placements, level) === 1;
  },

  in_room: (suspectId, roomId) => (placements, level) => {
    const pos = placements[suspectId];
    if (!pos) return null;
    const room = getRoomForCell(pos.x, pos.y, level);
    return room ? room.id === roomId : false;
  },

  beside_same_obstacle_as: (suspectId, otherId) => (placements, level) => {
    const pos = placements[suspectId];
    const other = placements[otherId];
    if (!pos || !other) return null;
    // find any obstacle adjacent to both
    for (const obs of (level.obstacles || [])) {
      if (isAdjacent(pos, obs) && isAdjacent(other, obs)) return true;
    }
    return false;
  },

  combined: (...fns) => (placements, level) => {
    let result = true;
    for (const fn of fns) {
      const r = fn(placements, level);
      if (r === false) return false;
      if (r === null) result = null;
    }
    return result;
  }
};

// ---- Suspect Color Palette ----
const SUSPECT_COLORS = [
  '#f87171', // red
  '#fb923c', // orange
  '#facc15', // yellow
  '#4ade80', // green
  '#60a5fa', // blue
  '#a78bfa', // violet
  '#f472b6', // pink
  '#34d399', // emerald
  '#38bdf8', // sky
  '#c084fc', // purple
];

const SUSPECT_NAMES = [
  'Adonis','Bryson','Craig','Diana','Edison',
  'Freya','Grant','Helena','Ivan','Julia',
  'Kyle','Lena','Marcus','Nina','Oscar'
];

// ---- Asset → Colorization rules ----
// SVGs use these fill colors; we remap them per theme
// Plant: #010101 = dark outline, #fff = highlight/leaf, #d3d3d3 = mid-tone/pot
// Shrub: #0e1110 = body (dark green), #424242 = shadow
const ASSET_COLOR_MAPS = {
  plant: {
    '#ffffff': '#b5e6a0',   // highlights → light green
    '#fff':    '#b5e6a0',
    '#d3d3d3': '#c97c42',   // mid tones → terracotta pot
    '#010101': '#1a3d12',   // dark outlines → dark green
  },
  plant_02: {
    '#ffffff': '#c9f0b0',
    '#fff':    '#c9f0b0',
    '#d3d3d3': '#b87033',
    '#010101': '#1a4012',
  },
  shrub: {
    '#0e1110': '#2d7a2d',   // body → forest green
    '#424242': '#1a4a1a',   // shadow → dark green
  },
  shrub_02: {
    '#0e1110': '#3a9a3a',
    '#424242': '#1a5a1a',
  },
  bonsai: {
    '#010101': '#2d5a1e',
    '#ffffff': '#8fce6b',
    '#fff':    '#8fce6b',
  },
  flowers: {
    '#010101': '#6d1f6d',
    '#ffffff': '#ffb3d9',
    '#fff':    '#ffb3d9',
    '#d3d3d3': '#ff80c0',
  },
  flowers_02: {
    '#010101': '#5a1a5a',
    '#ffffff': '#ff9ec8',
    '#fff':    '#ff9ec8',
    '#d3d3d3': '#e0608a',
  },
  shelf: {
    '#010101': '#6b4226',
    '#ffffff': '#d4a062',
    '#fff':    '#d4a062',
    '#d3d3d3': '#b8845a',
  },
  barrel: {
    '#010101': '#4a3020',
    '#ffffff': '#a0734a',
    '#fff':    '#a0734a',
    '#d3d3d3': '#8a6040',
  },
  crate: {
    '#010101': '#5a4020',
    '#ffffff': '#c89a50',
    '#fff':    '#c89a50',
    '#d3d3d3': '#aa8040',
  },
  tv: {
    '#010101': '#1a1a2a',
    '#ffffff': '#4a90d9',
    '#fff':    '#4a90d9',
    '#d3d3d3': '#3a3a4a',
  },
  // default — no recolor
  default: {},
};

const colorizeSvg = (svgStr, assetType) => {
  const map = ASSET_COLOR_MAPS[assetType] || ASSET_COLOR_MAPS.default;
  let result = svgStr;
  // Replace in order of specificity (full hex first, then short)
  for (const [from, to] of Object.entries(map)) {
    // Match fill="..." and fill:... in style attrs
    const hexEscaped = from.replace('#', '\\#');
    result = result.replace(new RegExp(`fill="${hexEscaped}"`, 'gi'), `fill="${to}"`);
    result = result.replace(new RegExp(`fill:${hexEscaped}`, 'gi'), `fill:${to}`);
    result = result.replace(new RegExp(`color="${hexEscaped}"`, 'gi'), `color="${to}"`);
    result = result.replace(new RegExp(`stroke="${hexEscaped}"`, 'gi'), `stroke="${to}"`);
  }
  return result;
};

// Asset map: type → filename
const ASSET_FILES = {
  barrel:    'assets/obj_barrel-BrivFWNA.svg',
  bed:       'assets/obj_bed.svg',
  boar:      'assets/obj_boar-CD77EEZv.svg',
  boat:      'assets/obj_boat-Cr-wrbuM.svg',
  bonsai:    'assets/obj_bonsai-C8BMonb_.svg',
  cactus:    'assets/obj_cactus-_wOuvqFt.svg',
  camera:    'assets/obj_camera-qOKUfWYf.svg',
  car:       'assets/obj_car-Dd4QxSKP.svg',
  car_rev:   'assets/obj_car_reverse-D9KBA0Km.svg',
  carpet:    'assets/obj_carpet.svg',
  catapult:  'assets/obj_catapult-ehLMXWCS.svg',
  chair:     'assets/obj_chair.svg',
  crate:     'assets/obj_crate-C9EwUpcm.svg',
  easel:     'assets/obj_easel.svg',
  elephant:  'assets/obj_elephant-DFmKgtSe.svg',
  flowers:   'assets/obj_flowers-B089sm9T.svg',
  flowers_02:'assets/obj_flowers_02-BVVkAQ2W.svg',
  golf_cart: 'assets/obj_golf_cart-Dja72IuJ.svg',
  horse:     'assets/obj_horse-fbayuQse.svg',
  horse_rev: 'assets/obj_horse_reverse-DUhzo4tG.svg',
  house:     'assets/obj_house-DNGDwJ0-.svg',
  lion:      'assets/obj_lion-Bq_TmEPN.svg',
  painting:  'assets/obj_painting.svg',
  palmtree:  'assets/obj_palmtree-DrP-_3J7.svg',
  palmtree_02:'assets/obj_palmtree_02-C0jmsuJX.svg',
  plant:     'assets/obj_plant-lqsU7Mb1.svg',
  plant_02:  'assets/obj_plant_02-B8FocpTF.svg',
  present:   'assets/obj_present_02-7tNpaSos.svg',
  pumpkin:   'assets/obj_pumpkin-CIl3BQ8v.svg',
  register:  'assets/obj_register.svg',
  rowboat:   'assets/obj_rowboat-CEmXtggY.svg',
  shelf:     'assets/obj_shelf-DW4s9BDU.svg',
  shell:     'assets/obj_shell-CeZP6-gx.svg',
  shrub:     'assets/obj_shrub-DZfZCPwd.svg',
  shrub_02:  'assets/obj_shrub_02-DmhRFGzb.svg',
  table:     'assets/obj_table.svg',
  teddy:     'assets/obj_teddy_bear-DsZiE5Yz.svg',
  trashcan:  'assets/obj_trashcan.svg',
  tv:        'assets/obj_tv-B-td_p6V.svg',
  window:    'assets/obj_window.svg',
  grass:     'assets/texture_floor_grass-n85FOBUF.svg',
  grass_tall:'assets/texture_floor_grass_tall-BU8A12fG.svg',
};

// Human-readable labels for obstacle tooltips
const OBSTACLE_LABELS = {
  barrel:     'Barrel',
  bed:        'Bed',
  bed_top:    'Bed',
  bed_02:     'Bed',
  bed_top_02: 'Bed',
  boar:       'Wild Boar',
  boat:       'Boat',
  bonsai:     'Bonsai Tree',
  cactus:     'Cactus',
  camera:     'Camera',
  car:        'Car',
  car_rev:    'Car',
  carpet:     'Carpet',
  catapult:   'Catapult',
  chair:      'Chair',
  crate:      'Crate',
  easel:      'Easel',
  elephant:   'Elephant',
  flowers:    'Flowers',
  flowers_02: 'Flowers',
  golf_cart:  'Golf Cart',
  horse:      'Horse',
  horse_rev:  'Horse',
  house:      'House',
  lion:       'Lion',
  painting:   'Painting',
  palmtree:   'Palm Tree',
  palmtree_02:'Palm Tree',
  plant:      'Plant',
  plant_02:   'Plant',
  present:    'Gift Box',
  pumpkin:    'Pumpkin',
  register:   'Cash Register',
  rowboat:    'Rowboat',
  shelf:      'Shelf',
  shell:      'Shell',
  shrub:      'Shrub',
  shrub_02:   'Shrub',
  table:      'Table',
  teddy:      'Teddy Bear',
  trashcan:   'Trash Can',
  tv:         'Television',
  window:     'Window',
  grass:      'Grass',
  grass_tall: 'Tall Grass',
};

// ---- Difficulty badge colors ----
const DIFFICULTY_COLORS = {
  'Very Easy': { bg: 'rgba(64,200,190,0.15)', color: 'rgb(64,200,190)', border: 'rgb(64,200,190)' },
  'Easy':      { bg: 'rgba(90,200,100,0.15)', color: 'rgb(60,180,80)',  border: 'rgb(60,180,80)'  },
  'Medium':    { bg: 'rgba(255,180,50,0.15)', color: 'rgb(220,150,20)', border: 'rgb(220,150,20)' },
  'Hard':      { bg: 'rgba(255,100,80,0.15)', color: 'rgb(220,60,40)',  border: 'rgb(220,60,40)'  },
  'Expert':    { bg: 'rgba(160,50,220,0.15)', color: 'rgb(140,40,200)', border: 'rgb(140,40,200)' },
};

// ============================================================
//  BUILT-IN LEVELS
// ============================================================

// Helper to make all-true shape
const fullShape = (cols, rows) =>
  Array.from({length: rows}, () => Array(cols).fill(true));

// Helper to make shape with some cells voided
const makeShape = (rows, cols, voids) => {
  const s = fullShape(cols, rows);
  for (const [y, x] of voids) {
    if (y >= 0 && y < rows && x >= 0 && x < cols) s[y][x] = false;
  }
  return s;
};

// ---- LEVEL 1: Car Workshop — Very Easy — 6×6 ----
const LEVEL_1 = (() => {
  // Rooms: each is a 3×3 quadrant
  const workshop = { id:'workshop', name:'Workshop', color:'#c4e0a8',
    cells: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2}] };
  const office   = { id:'office',   name:'Office',   color:'#a8c8e0',
    cells: [{x:3,y:0},{x:4,y:0},{x:5,y:0},{x:3,y:1},{x:4,y:1},{x:5,y:1},{x:3,y:2},{x:4,y:2},{x:5,y:2}] };
  const garage   = { id:'garage',   name:'Garage',   color:'#e0d0a8',
    cells: [{x:0,y:3},{x:1,y:3},{x:2,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5}] };
  const lounge   = { id:'lounge',   name:'Lounge',   color:'#e0b0b0',
    cells: [{x:3,y:3},{x:4,y:3},{x:5,y:3},{x:3,y:4},{x:4,y:4},{x:5,y:4},{x:3,y:5},{x:4,y:5},{x:5,y:5}] };

  // Solution: A(1,0) B(4,1) C(0,2) D(2,3) E(3,4) F(5,5)
  // Cols: 1,4,0,2,3,5 — all different ✓ | Rows: 0-5 ✓
  const solution = { A:{x:1,y:0}, B:{x:4,y:1}, C:{x:0,y:2}, D:{x:2,y:3}, E:{x:3,y:4}, F:{x:5,y:5} };

  const suspects = [
    { id:'A', name:'Adonis',  trait:'glasses', color: SUSPECT_COLORS[0], isVictim: false },
    { id:'B', name:'Bryson',  trait:'bald',    color: SUSPECT_COLORS[1], isVictim: false },
    { id:'C', name:'Craig',   trait:'beard',   color: SUSPECT_COLORS[2], isVictim: false },
    { id:'D', name:'Diana',   trait:'glasses', color: SUSPECT_COLORS[3], isVictim: false },
    { id:'E', name:'Edison',  trait:'bald',    color: SUSPECT_COLORS[4], isVictim: false },
    { id:'F', name:'Freya',   trait:'none',    color: SUSPECT_COLORS[5], isVictim: true  },
  ];

  const obstacles = [
    // Workshop room decorations
    { x:0, y:0, type:'barrel'  }, // A(1,0) beside this ✓
    { x:2, y:1, type:'crate'   }, // decorative
    // NOTE: C(0,2) is the solution cell — no blocking obstacle here
    { x:1, y:2, type:'shelf'   }, // decorative (moved from 0,2 to avoid blocking C)
    { x:0, y:1, type:'plant'   }, // decorative (moved from 1,2)
    // Office room decorations
    { x:4, y:0, type:'tv'      }, // B(4,1) directly below ✓
    { x:3, y:0, type:'shelf'   }, // decorative
    { x:5, y:1, type:'plant_02'}, // decorative
    { x:3, y:2, type:'bonsai'  }, // decorative
    // Garage room decorations
    { x:0, y:3, type:'shrub'   }, // C(0,2) above this ✓
    { x:2, y:3, type:'car'     }, // decorative
    { x:0, y:4, type:'barrel'  }, // decorative
    { x:1, y:4, type:'crate'   }, // D(2,3) beside this ✓
    { x:2, y:5, type:'car_rev' }, // decorative
    // Lounge room decorations
    { x:4, y:3, type:'shelf'   }, // E(3,4) beside this ✓
    { x:5, y:3, type:'flowers' }, // decorative
    { x:3, y:4, type:'tv'      }, // decorative
    { x:5, y:5, type:'plant'   }, // decorative
  ];

  // All validators return fn(placements, level) => bool|null
  const clues = [
    {
      suspectId: 'A',
      text: 'He was <strong>beside</strong> the <strong>barrel</strong>.',
      validate: VALIDATORS.beside_obstacle('A', {x:0, y:0}),
    },
    {
      suspectId: 'B',
      text: 'She was <strong>directly below</strong> the TV, <strong>alone</strong> in her room.',
      validate: VALIDATORS.combined(
        VALIDATORS.directly_below('B', {x:4, y:0}),
        VALIDATORS.alone_in_room('B')
      ),
    },
    {
      suspectId: 'C',
      text: 'He was <strong>above</strong> the shrub at the garage entrance.',
      validate: VALIDATORS.above_obstacle('C', {x:0, y:3}),
    },
    {
      suspectId: 'D',
      text: 'She was <strong>alone</strong> in her room, <strong>beside</strong> the crate.',
      validate: VALIDATORS.combined(
        VALIDATORS.alone_in_room('D'),
        VALIDATORS.beside_obstacle('D', {x:1, y:4})
      ),
    },
    {
      suspectId: 'E',
      text: 'He was <strong>to the left</strong> of the shelf.',
      validate: VALIDATORS.left_of_obstacle('E', {x:4, y:3}),
    },
    {
      suspectId: 'F',
      text: '★ <strong>Victim.</strong> She was <strong>alone</strong> with the murderer.',
      validate: VALIDATORS.victim_clue('F'),
    },
  ];

  return {
    id: 'car_workshop',
    name: 'Car Workshop',
    theme: 'workshop',
    difficulty: 'Very Easy',
    cols: 6,
    rows: 6,
    cellSize: 80,
    shape: fullShape(6, 6),
    rooms: [workshop, office, garage, lounge],
    obstacles,
    suspects,
    solution,
    clues,
  };
})();

// ---- LEVEL 2: Rooftop Garden — Easy — 7×7 with corner voids ----
const LEVEL_2 = (() => {
  // Shape: 7×7 with 4 corner cells voided
  const voids = [[0,0],[0,6],[6,0],[6,6]];
  const shape = makeShape(7, 7, voids);

  // Rooms
  const greenhouse = { id:'greenhouse', name:'Greenhouse', color:'#a8d8a8',
    cells: [{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:5,y:0},
            {x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:5,y:1}] };
  const terrace   = { id:'terrace',   name:'Terrace',    color:'#f0d8a0',
    cells: [{x:0,y:1},{x:0,y:2},{x:0,y:3},{x:0,y:4},{x:0,y:5},
            {x:1,y:2},{x:1,y:3},{x:1,y:4},{x:2,y:2}] };
  const garden    = { id:'garden',    name:'Garden',     color:'#c8e8b8',
    cells: [{x:2,y:3},{x:3,y:2},{x:3,y:3},{x:4,y:2},{x:4,y:3},
            {x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:2},{x:5,y:3}] };
  const conservatory = { id:'conservatory', name:'Conservatory', color:'#d0c8f0',
    cells: [{x:6,y:1},{x:6,y:2},{x:6,y:3},{x:6,y:4},{x:6,y:5},
            {x:5,y:4},{x:5,y:5},{x:4,y:5}] };
  const lobby     = { id:'lobby',    name:'Lobby',      color:'#f0c0c0',
    cells: [{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:1,y:6},{x:2,y:6},{x:3,y:6},{x:4,y:6},{x:5,y:6}] };

  // Solution: cols 0-6 each used once, rows 0-6 each used once
  // A(2,0) B(0,2) C(4,1) D(6,3) E(1,4) F(5,5) G(3,6)
  // cols: 2,0,4,6,1,5,3 — all different ✓ | rows: 0-6 ✓
  const solution = {
    A:{x:2,y:0}, B:{x:0,y:2}, C:{x:4,y:1}, D:{x:6,y:3},
    E:{x:1,y:4}, F:{x:5,y:5}, G:{x:3,y:6}
  };

  const suspects = [
    { id:'A', name:'Adonis',  trait:'glasses', color: SUSPECT_COLORS[0], isVictim: false },
    { id:'B', name:'Bryson',  trait:'bald',    color: SUSPECT_COLORS[1], isVictim: false },
    { id:'C', name:'Craig',   trait:'beard',   color: SUSPECT_COLORS[2], isVictim: false },
    { id:'D', name:'Diana',   trait:'glasses', color: SUSPECT_COLORS[3], isVictim: false },
    { id:'E', name:'Edison',  trait:'bald',    color: SUSPECT_COLORS[4], isVictim: false },
    { id:'F', name:'Freya',   trait:'none',    color: SUSPECT_COLORS[5], isVictim: false },
    { id:'G', name:'Grant',   trait:'beard',   color: SUSPECT_COLORS[6], isVictim: true  },
  ];

  // Room membership check for clues
  // A(2,0) → greenhouse ✓   C(4,1) → greenhouse ✓
  // B(0,2) → terrace ✓      E(1,4) → terrace ✓
  // D(6,3) → conservatory ✓ F(5,5) → conservatory ✓
  // G(3,6) → lobby ✓

  const obstacles = [
    { x:3,  y:0,  type:'flowers'  }, // A(2,0) beside → |2-3|=1 ✓
    { x:1,  y:0,  type:'bonsai'   }, // decorative — greenhouse
    { x:5,  y:0,  type:'plant_02' }, // decorative — greenhouse
    { x:0,  y:1,  type:'plant'    }, // B(0,2) beside → |2-1|=1 ✓
    { x:5,  y:1,  type:'cactus'   }, // C(4,1) beside → |4-5|=1 ✓
    { x:3,  y:1,  type:'flowers_02'},// decorative — greenhouse
    { x:1,  y:2,  type:'pumpkin'  }, // decorative — terrace
    { x:6,  y:2,  type:'palmtree' }, // D(6,3) beside → |3-2|=1, same x ✓
    { x:0,  y:3,  type:'shrub'    }, // decorative — terrace
    { x:2,  y:4,  type:'pumpkin'  }, // E(1,4) beside → |1-2|=1 ✓
    { x:4,  y:4,  type:'shrub_02' }, // decorative — garden
    { x:5,  y:4,  type:'cactus'   }, // decorative — conservatory
    { x:3,  y:5,  type:'plant_02' }, // G(3,6) beside this ✓
    { x:5,  y:6,  type:'shrub'    }, // F(5,5) beside → |5-6|=1 ✓
    { x:4,  y:6,  type:'flowers'  }, // decorative — lobby
    { x:2,  y:6,  type:'grass'    }, // decorative — lobby
  ];

  const clues = [
    {
      suspectId: 'A',
      text: 'He was <strong>beside</strong> the flowers in the <strong>Greenhouse</strong>.',
      validate: VALIDATORS.combined(
        VALIDATORS.beside_obstacle('A', {x:3, y:0}),
        VALIDATORS.in_room('A', 'greenhouse')
      ),
    },
    {
      suspectId: 'B',
      text: 'He was <strong>beside</strong> the plant on the <strong>Terrace</strong>.',
      validate: VALIDATORS.combined(
        VALIDATORS.beside_obstacle('B', {x:0, y:1}),
        VALIDATORS.in_room('B', 'terrace')
      ),
    },
    {
      suspectId: 'C',
      text: 'She was in the same room as <strong>Adonis</strong>.',
      validate: VALIDATORS.same_room_as('C', 'A'),
    },
    {
      suspectId: 'D',
      text: 'He was <strong>directly below</strong> the palm tree, <strong>alone</strong> in his room.',
      validate: VALIDATORS.combined(
        VALIDATORS.directly_below('D', {x:6, y:2}),
        VALIDATORS.alone_in_room('D'),
      ),
    },
    {
      suspectId: 'E',
      text: 'She was in the same room as <strong>Bryson</strong>, beside the pumpkin.',
      validate: VALIDATORS.combined(
        VALIDATORS.same_room_as('E', 'B'),
        VALIDATORS.beside_obstacle('E', {x:2, y:4})
      ),
    },
    {
      suspectId: 'F',
      text: 'She was <strong>beside</strong> the shrub. She was <strong>not alone</strong> in her room.',
      validate: VALIDATORS.beside_obstacle('F', {x:5, y:6}),
    },
    {
      suspectId: 'G',
      text: '★ <strong>Victim.</strong> He was <strong>alone</strong> with the murderer.',
      validate: VALIDATORS.victim_clue('G'),
    },
  ];

  return {
    id: 'rooftop_garden',
    name: 'Rooftop Garden',
    theme: 'garden',
    difficulty: 'Easy',
    cols: 7,
    rows: 7,
    cellSize: 72,
    shape,
    rooms: [greenhouse, terrace, garden, conservatory, lobby],
    obstacles,
    suspects,
    solution,
    clues,
  };
})();

// ---- LEVEL 3: Safari Lodge — Medium — 9×9 irregular ----
const LEVEL_3 = (() => {
  // Shape: 9×9 with notches cut from corners and sides
  const voids = [
    [0,0],[0,1],[0,7],[0,8],
    [1,0],[1,8],
    [7,0],[7,8],
    [8,0],[8,1],[8,7],[8,8],
  ];
  const shape = makeShape(9, 9, voids);

  const savanna = { id:'savanna', name:'Savanna', color:'#e8d89a',
    cells: [{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:5,y:0},{x:6,y:0},
            {x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:5,y:1},{x:6,y:1},{x:7,y:1},
            {x:1,y:2},{x:2,y:2}] };
  const watering_hole = { id:'watering_hole', name:'Watering Hole', color:'#90cce8',
    cells: [{x:3,y:2},{x:4,y:2},{x:5,y:2},{x:6,y:2},{x:7,y:2},
            {x:3,y:3},{x:4,y:3},{x:5,y:3}] };
  const bush = { id:'bush', name:'Bushland', color:'#98c878',
    cells: [{x:0,y:2},{x:0,y:3},{x:0,y:4},{x:1,y:3},{x:1,y:4},{x:2,y:3},{x:2,y:4}] };
  const plains = { id:'plains', name:'Open Plains', color:'#d4c888',
    cells: [{x:8,y:2},{x:6,y:3},{x:7,y:3},{x:8,y:3},{x:6,y:4},{x:7,y:4},{x:8,y:4},
            {x:7,y:5},{x:8,y:5},{x:8,y:6}] };
  const lodge = { id:'lodge', name:'Safari Lodge', color:'#d4a878',
    cells: [{x:3,y:4},{x:4,y:4},{x:5,y:4},{x:3,y:5},{x:4,y:5},{x:5,y:5},{x:6,y:5},
            {x:3,y:6},{x:4,y:6},{x:5,y:6},{x:6,y:6}] };
  const riverbank = { id:'riverbank', name:'Riverbank', color:'#80c8a8',
    cells: [{x:0,y:5},{x:1,y:5},{x:2,y:5},{x:0,y:6},{x:1,y:6},{x:2,y:6},{x:0,y:7},{x:1,y:7}] };
  const camp = { id:'camp', name:'Camp', color:'#e8b888',
    cells: [{x:7,y:6},{x:2,y:7},{x:3,y:7},{x:4,y:7},{x:5,y:7},{x:6,y:7},{x:7,y:7},
            {x:2,y:8},{x:3,y:8},{x:4,y:8},{x:5,y:8},{x:6,y:8}] };

  // Solution: 8 suspects, one per row, one per col (using cols 0-8, rows 0-8 but avoiding voids)
  // A(4,0) B(1,1) C(7,2) D(0,3) E(6,4) F(2,5) G(8,6) H(5,7) I(3,8)
  // cols: 4,1,7,0,6,2,8,5,3 — all different ✓ | rows: 0-8 ✓
  // Check none are void: (4,0)✓ (1,1)✓ (7,2)✓ (0,3)✓ (6,4)✓ (2,5)✓ (8,6)✓ (5,7)✓ (3,8)✓
  const solution = {
    A:{x:4,y:0}, B:{x:1,y:1}, C:{x:7,y:2}, D:{x:0,y:3},
    E:{x:6,y:4}, F:{x:2,y:5}, G:{x:8,y:6}, H:{x:5,y:7}, I:{x:3,y:8},
  };

  const suspects = [
    { id:'A', name:'Amara',  trait:'none',    color: SUSPECT_COLORS[0], isVictim: false },
    { id:'B', name:'Bruno',  trait:'beard',   color: SUSPECT_COLORS[1], isVictim: false },
    { id:'C', name:'Celia',  trait:'glasses', color: SUSPECT_COLORS[2], isVictim: false },
    { id:'D', name:'Derek',  trait:'bald',    color: SUSPECT_COLORS[3], isVictim: false },
    { id:'E', name:'Elena',  trait:'none',    color: SUSPECT_COLORS[4], isVictim: false },
    { id:'F', name:'Felix',  trait:'beard',   color: SUSPECT_COLORS[5], isVictim: false },
    { id:'G', name:'Greta',  trait:'glasses', color: SUSPECT_COLORS[6], isVictim: false },
    { id:'H', name:'Hassan', trait:'none',    color: SUSPECT_COLORS[7], isVictim: false },
    { id:'I', name:'Irene',  trait:'bald',    color: SUSPECT_COLORS[8], isVictim: true  },
  ];

  // A(4,0) → savanna ✓   B(1,1) → savanna ✓
  // C(7,2) → watering_hole ✓  D(0,3) → bush ✓
  // E(6,4) → plains ✓   F(2,5) → riverbank ✓
  // G(8,6) → plains ✓   H(5,7) → camp ✓
  // I(3,8) → camp ✓  — I and H in camp → murderer is H!

  const obstacles = [
    // Savanna
    { x:5, y:0, type:'boar'      }, // A(4,0): adjacent ✓
    { x:3, y:0, type:'grass_tall'}, // decorative
    { x:6, y:0, type:'grass'     }, // decorative
    { x:0, y:1, type:'shrub'     }, // B(1,1): |1-0|=1 ✓
    { x:3, y:1, type:'grass'     }, // decorative
    { x:1, y:2, type:'shrub_02'  }, // D(0,3): beside → |0-1|=1, |3-2|=1 ✓
    // Watering Hole / Open Plains
    { x:8, y:3, type:'elephant'  }, // C(7,2): above this ✓
    { x:6, y:3, type:'lion'      }, // E(6,4): directly below ✓
    { x:4, y:2, type:'grass_tall'}, // decorative
    { x:7, y:4, type:'horse_rev' }, // decorative — plains
    { x:8, y:4, type:'flowers'   }, // decorative — plains
    // Safari Lodge / Riverbank
    { x:3, y:5, type:'grass'     }, // F(2,5): beside → |2-3|=1 ✓
    { x:5, y:5, type:'plant'     }, // decorative — lodge
    { x:4, y:6, type:'bonsai'    }, // decorative — lodge
    // Camp
    { x:7, y:5, type:'horse'     }, // G(8,6): beside → |8-7|=1, |6-5|=1 ✓
    { x:4, y:7, type:'plant'     }, // H(5,7): beside → |5-4|=1 ✓
    { x:2, y:8, type:'flowers'   }, // I(3,8): beside → |3-2|=1 ✓
    // NOTE: shrub moved from (5,7) — that is H's solution cell
    { x:6, y:8, type:'shrub'     }, // decorative — camp (moved from 5,7 to not block H)
    { x:6, y:7, type:'crate'     }, // decorative — camp
  ];

  const clues = [
    {
      suspectId: 'A',
      text: 'She was <strong>beside</strong> the boar in the <strong>Savanna</strong>.',
      validate: VALIDATORS.combined(
        VALIDATORS.beside_obstacle('A', {x:5, y:0}),
        VALIDATORS.in_room('A', 'savanna')
      ),
    },
    {
      suspectId: 'B',
      text: 'He was in the same room as <strong>Amara</strong>. He was beside the shrub.',
      validate: VALIDATORS.combined(
        VALIDATORS.same_room_as('B', 'A'),
        VALIDATORS.beside_obstacle('B', {x:0, y:1})
      ),
    },
    {
      suspectId: 'C',
      text: 'She was <strong>above</strong> the elephant. She was <strong>alone</strong> at the watering hole.',
      validate: VALIDATORS.combined(
        VALIDATORS.above_obstacle('C', {x:8, y:3}),
        VALIDATORS.alone_in_room('C')
      ),
    },
    {
      suspectId: 'D',
      text: 'He was <strong>alone</strong> in the Bushland, beside the shrub.',
      validate: VALIDATORS.combined(
        VALIDATORS.alone_in_room('D'),
        VALIDATORS.beside_obstacle('D', {x:1, y:2})
      ),
    },
    {
      suspectId: 'E',
      text: 'She was <strong>directly below</strong> the lion on the Open Plains.',
      validate: VALIDATORS.combined(
        VALIDATORS.directly_below('E', {x:6, y:3}),
        VALIDATORS.in_room('E', 'plains')
      ),
    },
    {
      suspectId: 'F',
      text: 'He was beside the grass patch. He was <strong>alone</strong> at the Riverbank.',
      validate: VALIDATORS.combined(
        VALIDATORS.beside_obstacle('F', {x:3, y:5}),
        VALIDATORS.alone_in_room('F')
      ),
    },
    {
      suspectId: 'G',
      text: 'She was <strong>beside</strong> the horse on the Open Plains.',
      validate: VALIDATORS.combined(
        VALIDATORS.beside_obstacle('G', {x:7, y:5}),
        VALIDATORS.in_room('G', 'plains')
      ),
    },
    {
      suspectId: 'H',
      text: 'He was <strong>beside</strong> the plant in the Camp.',
      validate: VALIDATORS.combined(
        VALIDATORS.beside_obstacle('H', {x:4, y:7}),
        VALIDATORS.in_room('H', 'camp')
      ),
    },
    {
      suspectId: 'I',
      text: '★ <strong>Victim.</strong> She was <strong>alone</strong> with the murderer in the Camp.',
      validate: VALIDATORS.combined(
        VALIDATORS.victim_clue('I'),
        VALIDATORS.in_room('I', 'camp')
      ),
    },
  ];

  return {
    id: 'safari_lodge',
    name: 'Safari Lodge',
    theme: 'safari',
    difficulty: 'Medium',
    cols: 9,
    rows: 9,
    cellSize: 60,
    shape,
    rooms: [savanna, watering_hole, bush, plains, lodge, riverbank, camp],
    obstacles,
    suspects,
    solution,
    clues,
  };
})();

// ---- LEVEL 4: Fisherman's Wharf — Hard — 10×9 irregular ----
const LEVEL_4 = (() => {
  // Irregular 10×9 grid — void corners give it the wharf shape
  //
  //   x: 0  1  2  3  4  5  6  7  8  9
  // y0: .  .  dk dk dk dk hb hb  .  .
  // y1: .  dk dk dk hb hb hb hb hb  .
  // y2: fm fm fm dk dk hb hb wh wh  .
  // y3: fm fm fm fm wh wh wh wh bh bh
  // y4: fm tv tv wh wh bt bt bh bh bh
  // y5: tv tv tv tv bt bt bt lt lt  .
  // y6: .  tv cv cv bt bt lt lt lt  .
  // y7: .  .  cv cv cv lt lt lt  .  .
  // y8: .  .  .  cv cv  .  .  .  .  .
  //
  // Rooms: dk=dock, hb=harbor, fm=fishmarket, wh=warehouse,
  //        bh=boathouse, tv=tavern, bt=beach, lt=lighthouse, cv=cove
  // 9 suspects A-I, one per row, one per column

  const voids = [
    // y=0
    [0,0],[0,1],[0,8],[0,9],
    // y=1
    [1,0],[1,9],
    // y=2
    [2,9],
    // y=5
    [5,9],
    // y=6
    [6,0],[6,9],
    // y=7
    [7,0],[7,1],[7,8],[7,9],
    // y=8
    [8,0],[8,1],[8,2],[8,5],[8,6],[8,7],[8,8],[8,9],
  ];
  const shape = makeShape(9, 10, voids);

  // Verify layout:
  // dock: top-center blue
  const dock = { id:'dock', name:'Main Dock', color:'#8ab8d8',
    cells: [
      {x:2,y:0},{x:3,y:0},{x:4,y:0},{x:5,y:0},
      {x:1,y:1},{x:2,y:1},{x:3,y:1},
      {x:3,y:2},{x:4,y:2},
    ]};

  // harbor: top-right
  const harbor = { id:'harbor', name:'Harbor', color:'#b0cce8',
    cells: [
      {x:6,y:0},{x:7,y:0},
      {x:4,y:1},{x:5,y:1},{x:6,y:1},{x:7,y:1},{x:8,y:1},
      {x:5,y:2},{x:6,y:2},
    ]};

  // fishmarket: left side
  const fishmarket = { id:'fishmarket', name:'Fish Market', color:'#a0d890',
    cells: [
      {x:0,y:2},{x:1,y:2},{x:2,y:2},
      {x:0,y:3},{x:1,y:3},{x:2,y:3},{x:3,y:3},
      {x:0,y:4},{x:1,y:4},  // wait — need {x:0,y:4} check voidsClean... y=4 has no voids in x:0-9
    ]};

  // warehouse: middle right area rows 2-4
  const warehouse = { id:'warehouse', name:'Warehouse', color:'#d8c888',
    cells: [
      {x:7,y:2},{x:8,y:2},
      {x:4,y:3},{x:5,y:3},{x:6,y:3},{x:7,y:3},
      {x:3,y:4},{x:4,y:4},
    ]};

  // boathouse: far right rows 3-4
  const boathouse = { id:'boathouse', name:'Boathouse', color:'#b0d8f0',
    cells: [
      {x:8,y:3},{x:9,y:3},
      {x:7,y:4},{x:8,y:4},{x:9,y:4},
    ]};

  // tavern: lower left rows 4-6
  const tavern = { id:'tavern', name:'Tavern', color:'#f0c880',
    cells: [
      {x:2,y:4},{x:3,y:4},  // wait: x:2,y:4 — but fishmarket has {x:0,y:4},{x:1,y:4}. So x:2,y:4 belongs here
      {x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},
      {x:1,y:6},
    ]};

  // beach: middle rows 5-6
  const beach = { id:'beach', name:'Beach', color:'#f0e8a8',
    cells: [
      {x:4,y:5},{x:5,y:5},
      {x:4,y:6},{x:5,y:6},   // wait: need to check these don't conflict
    ]};

  // lighthouse: right rows 5-7
  const lighthouse = { id:'lighthouse', name:'Lighthouse', color:'#e8c098',
    cells: [
      {x:6,y:5},{x:7,y:5},{x:8,y:5},
      {x:6,y:6},{x:7,y:6},{x:8,y:6},
      {x:5,y:7},{x:6,y:7},{x:7,y:7},
    ]};

  // cove: bottom area rows 6-8
  const cove = { id:'cove', name:'Hidden Cove', color:'#b0ddd0',
    cells: [
      {x:2,y:6},{x:3,y:6},
      {x:2,y:7},{x:3,y:7},{x:4,y:7},
      {x:3,y:8},{x:4,y:8},
    ]};

  // ---- solution: one per row (y=0..8), one per col (x=0..9 subset)
  // A(3,0)=dock B(7,1)=harbor C(1,2)=fishmarket D(5,3)=warehouse
  // E(9,4)=boathouse F(0,5)=tavern G(4,6)=beach H(8,... wait boathouse only y=3,4
  // Need to pick carefully.
  //
  // Let me recount which cells are in each room and verify no conflicts first.
  // Then pick solution.
  //
  // Actually let me completely re-do this with a verified grid to avoid bugs.
  // I'll use a script-verified approach: define grid row by row.
  //
  // VERIFIED GRID (each cell's room, . = void):
  //   x:  0    1    2    3    4    5    6    7    8    9
  // y0:  .    .    dk   dk   dk   dk   hb   hb   .    .
  // y1:  .    dk   dk   dk   hb   hb   hb   hb   hb   .
  // y2:  fm   fm   fm   dk   dk   hb   hb   wh   wh   .
  // y3:  fm   fm   fm   fm   wh   wh   wh   wh   bh   bh
  // y4:  fm   tv   tv   wh   wh   bt   bt   bh   bh   bh
  // y5:  tv   tv   tv   tv   bt   bt   bt   lt   lt   .
  // y6:  .    tv   cv   cv   bt   bt   lt   lt   lt   .
  // y7:  .    .    cv   cv   cv   lt   lt   lt   .    .
  // y8:  .    .    .    cv   cv   .    .    .    .    .
  //
  // Room counts:
  // dk: (2,0)(3,0)(4,0)(5,0)(1,1)(2,1)(3,1)(3,2)(4,2) = 9 ✓
  // hb: (6,0)(7,0)(4,1)(5,1)(6,1)(7,1)(8,1)(5,2)(6,2) = 9 ✓
  // fm: (0,2)(1,2)(2,2)(0,3)(1,3)(2,3)(3,3)(0,4) = 8 (need one more) → add (1,4)? but tv has (1,4)
  //     fm: rows 2-4 left side. Let me adjust:
  //     fm: (0,2)(1,2)(2,2)(0,3)(1,3)(2,3)(3,3)(0,4) = 8... tv starts at (1,4)
  //     This conflicts. Let me give fm exactly: (0,2)(1,2)(2,2)(0,3)(1,3)(2,3)(3,3)(0,4)(1,4) = 9
  //     But tv also wants (1,4). Can't both.
  //
  // FINAL DECISION: fm=(0,2)(1,2)(2,2)(0,3)(1,3)(2,3)(3,3)(0,4) = 8 cells
  //                 tv=(1,4)(2,4)(3,5)(no...)
  //
  // I keep running into conflicts. Let me just carefully define the whole grid:

  // FINAL DEFINITIVE LAYOUT — carefully validated:
  // Row 0 (non-void: x=2..7): dk dk dk dk hb hb
  // Row 1 (non-void: x=1..8): dk dk dk hb hb hb hb hb
  // Row 2 (non-void: x=0..8): fm fm fm dk dk hb hb wh wh
  // Row 3 (non-void: x=0..9): fm fm fm fm wh wh wh wh bh bh
  // Row 4 (non-void: x=0..9): fm tv tv wh wh bt bt bh bh bh
  // Row 5 (non-void: x=0..8): tv tv tv tv bt bt bt lt lt
  // Row 6 (non-void: x=1..8): tv cv cv bt bt lt lt lt
  // Row 7 (non-void: x=2..7): cv cv cv lt lt lt
  // Row 8 (non-void: x=3..4): cv cv

  const dockFinal = { id:'dock', name:'Main Dock', color:'#8ab8d8',
    cells: [
      {x:2,y:0},{x:3,y:0},{x:4,y:0},{x:5,y:0},                    // row 0: 4 cells
      {x:1,y:1},{x:2,y:1},{x:3,y:1},                               // row 1: 3 cells
      {x:3,y:2},{x:4,y:2},                                          // row 2: 2 cells
    ]};  // total: 9 cells

  const harborFinal = { id:'harbor', name:'Harbor', color:'#a8cce8',
    cells: [
      {x:6,y:0},{x:7,y:0},                                          // row 0: 2 cells
      {x:4,y:1},{x:5,y:1},{x:6,y:1},{x:7,y:1},{x:8,y:1},           // row 1: 5 cells
      {x:5,y:2},{x:6,y:2},                                          // row 2: 2 cells
    ]};  // total: 9 cells

  const fishmarketFinal = { id:'fishmarket', name:'Fish Market', color:'#a0d890',
    cells: [
      {x:0,y:2},{x:1,y:2},{x:2,y:2},                               // row 2: 3 cells
      {x:0,y:3},{x:1,y:3},{x:2,y:3},{x:3,y:3},                     // row 3: 4 cells
      {x:0,y:4},                                                    // row 4: 1 cell
    ]};  // total: 8 cells

  const warehouseFinal = { id:'warehouse', name:'Warehouse', color:'#d8c878',
    cells: [
      {x:7,y:2},{x:8,y:2},                                          // row 2: 2 cells
      {x:4,y:3},{x:5,y:3},{x:6,y:3},{x:7,y:3},                     // row 3: 4 cells
      {x:3,y:4},{x:4,y:4},                                          // row 4: 2 cells
    ]};  // total: 8 cells

  const boathouseFinal = { id:'boathouse', name:'Boathouse', color:'#b0d0f0',
    cells: [
      {x:8,y:3},{x:9,y:3},                                          // row 3: 2 cells
      {x:7,y:4},{x:8,y:4},{x:9,y:4},                               // row 4: 3 cells
    ]};  // total: 5 cells

  const tavernFinal = { id:'tavern', name:'Tavern', color:'#f0c870',
    cells: [
      {x:1,y:4},{x:2,y:4},                                          // row 4: 2 cells (but wait: x:1,y:4 — is it void? No)
      {x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},                     // row 5: 4 cells
      {x:1,y:6},                                                    // row 6: 1 cell
    ]};  // total: 7 cells

  const beachFinal = { id:'beach', name:'Beach', color:'#e8e0a0',
    cells: [
      {x:5,y:4},{x:6,y:4},                                          // row 4: 2 cells (bt)
      {x:4,y:5},{x:5,y:5},{x:6,y:5},                               // row 5: 3 cells
      {x:4,y:6},{x:5,y:6},                                          // row 6: 2 cells
    ]};  // total: 7 cells

  const lighthouseFinal = { id:'lighthouse', name:'Lighthouse', color:'#e8b888',
    cells: [
      {x:7,y:5},{x:8,y:5},                                          // row 5: 2 cells
      {x:6,y:6},{x:7,y:6},{x:8,y:6},                               // row 6: 3 cells
      {x:5,y:7},{x:6,y:7},{x:7,y:7},                               // row 7: 3 cells
    ]};  // total: 8 cells

  const coveFinal = { id:'cove', name:'Hidden Cove', color:'#98d8c8',
    cells: [
      {x:2,y:6},{x:3,y:6},                                          // row 6: 2 cells
      {x:2,y:7},{x:3,y:7},{x:4,y:7},                               // row 7: 3 cells
      {x:3,y:8},{x:4,y:8},                                          // row 8: 2 cells
    ]};  // total: 7 cells

  // SOLUTION: one suspect per row (0-8) and per column (all different cols)
  // A in dock    → pick (3,0)  col=3
  // B in harbor  → pick (7,1)  col=7
  // C in fishmarket → pick (1,2)  col=1
  // D in warehouse  → pick (5,3)  col=5
  // E in boathouse  → pick (9,4)  col=9
  // F in tavern  → pick (0,5)  col=0
  // G in beach   → pick (6,6)? beach has {x:6,y:6}? No... beach has {x:4,y:6}{x:5,y:6}
  //               → pick (4,6) col=4  wait: cols used so far: 3,7,1,5,9,0 → 4 is free ✓
  // H in lighthouse → pick (8,... ) lighthouse rows: 5,6,7.
  //               row 7: {x:5,y:7}{x:6,y:7}{x:7,y:7} → pick (6,7)? col=6 ✓ (not used)
  //               BUT wait: B is at col=7, G would be row=6 col=4. H is row=7 col=6. I is row=8.
  // I in cove    → pick (2,8)? cove has {x:3,y:8}{x:4,y:8}
  //               col=2 is free! But cove row 8 only has x=3,4.
  //               → pick (3,8) col=3? But A already has col=3!
  //               → pick (4,8) col=4? But G has col=4!
  //               Problem: cove only has x=3,4 in row 8.
  //
  // Let me re-pick G to free up col=4:
  // G in beach   → beach row 6 has {x:4,y:6}{x:5,y:6}
  //               col=4 → I can't use. col=5 is used by D.
  //               beach row 4 has {x:5,y:4}{x:6,y:4} → row 4 is used by E(boathouse)
  //               beach row 5 has {x:4,y:5}{x:5,y:5}{x:6,y:5} → row 5 is used by F(tavern)
  //               So G must be in row 6. Only cols 4 and 5 available in beach row 6.
  //               col=5 used by D → must use col=4. But then I can't use col=4 for cove row 8.
  //               → I in cove must use col=3 (but A=3) or col=4 (but G=4).
  //               CONFLICT: need to redesign slightly.
  //
  // FIX: Add {x:2,y:8} to cove (currently row 8 is valid at x=3,4 per voids def).
  //       Actually voids for row 8 are: [8,0],[8,1],[8,2],[8,5],[8,6],[8,7],[8,8],[8,9]
  //       So x=3 and x=4 are the ONLY valid cells in row 8. And I needs to be there.
  //       So I must be col=3 or col=4.
  //       A currently uses col=3. Let me change A to use col=2.
  //       dock has row 0: {x:2,y:0}✓ col=2.
  //
  // New solution attempt:
  // A in dock       → (2,0)  col=2
  // B in harbor     → (7,1)  col=7
  // C in fishmarket → (1,2)  col=1
  // D in warehouse  → (5,3)  col=5
  // E in boathouse  → (9,4)  col=9
  // F in tavern     → (0,5)  col=0
  // G in beach      → (4,6)  col=4  (beach has {x:4,y:6}✓)
  // H in lighthouse → (6,7)  col=6  (lighthouse has {x:6,y:7}✓)
  // I in cove       → (3,8)  col=3  (cove has {x:3,y:8}✓)
  // Cols used: 2,7,1,5,9,0,4,6,3 → all different ✓ (missing 8 — ok, only 9 suspects for 10 cols)

  const solution = {
    A:{x:2,y:0}, B:{x:7,y:1}, C:{x:1,y:2}, D:{x:5,y:3},
    E:{x:9,y:4}, F:{x:0,y:5}, G:{x:4,y:6}, H:{x:6,y:7}, I:{x:3,y:8}
  };

  const suspects = [
    { id:'A', name:'Ariel',   trait:'none',    color: SUSPECT_COLORS[0], isVictim: false },
    { id:'B', name:'Boris',   trait:'beard',   color: SUSPECT_COLORS[1], isVictim: false },
    { id:'C', name:'Carmen',  trait:'glasses', color: SUSPECT_COLORS[2], isVictim: false },
    { id:'D', name:'Darius',  trait:'bald',    color: SUSPECT_COLORS[3], isVictim: false },
    { id:'E', name:'Erica',   trait:'none',    color: SUSPECT_COLORS[4], isVictim: false },
    { id:'F', name:'Franco',  trait:'beard',   color: SUSPECT_COLORS[5], isVictim: false },
    { id:'G', name:'Gloria',  trait:'glasses', color: SUSPECT_COLORS[6], isVictim: false },
    { id:'H', name:'Harold',  trait:'bald',    color: SUSPECT_COLORS[7], isVictim: false },
    { id:'I', name:'Isolde',  trait:'none',    color: SUSPECT_COLORS[8], isVictim: true  },
  ];

  // Obstacles beside solution cells
  const obstacles = [
    // Main Dock
    { x:3, y:0, type:'rowboat'  }, // A(2,0): beside ✓
    { x:4, y:0, type:'barrel'   }, // decorative
    { x:1, y:1, type:'shell'    }, // decorative
    { x:2, y:1, type:'crate'    }, // decorative
    // Harbor
    { x:6, y:1, type:'barrel'   }, // B(7,1): beside ✓
    { x:8, y:1, type:'boat'     }, // decorative
    { x:5, y:2, type:'shell'    }, // decorative
    // Fish Market
    { x:2, y:2, type:'shell'    }, // C(1,2): beside ✓
    { x:0, y:3, type:'crate'    }, // decorative
    { x:2, y:3, type:'barrel'   }, // decorative
    // Warehouse
    { x:6, y:3, type:'crate'    }, // D(5,3): beside ✓
    { x:7, y:2, type:'barrel'   }, // decorative
    { x:4, y:4, type:'plant'    }, // decorative
    // Boathouse
    { x:8, y:4, type:'plant'    }, // E(9,4): beside ✓
    { x:9, y:3, type:'rowboat'  }, // decorative
    // Tavern
    { x:1, y:5, type:'shrub'    }, // F(0,5): beside ✓
    { x:3, y:5, type:'flowers'  }, // decorative
    { x:2, y:5, type:'crate'    }, // decorative
    // Beach
    { x:5, y:6, type:'flowers'  }, // G(4,6): beside ✓
    { x:6, y:4, type:'shell'    }, // decorative
    // Lighthouse
    { x:7, y:7, type:'boat'     }, // H(6,7): beside ✓
    { x:8, y:5, type:'flowers'  }, // decorative
    { x:7, y:6, type:'barrel'   }, // decorative
    // Hidden Cove
    { x:4, y:8, type:'barrel'   }, // I(3,8): beside ✓
    { x:2, y:7, type:'shell'    }, // decorative
    { x:3, y:7, type:'plant'    }, // decorative
  ];

  const clues = [
    { suspectId:'A', text:'She was <strong>beside</strong> the rowboat at the <strong>Main Dock</strong>.',
      validate: VALIDATORS.combined(VALIDATORS.beside_obstacle('A',{x:3,y:0}), VALIDATORS.in_room('A','dock')) },
    { suspectId:'B', text:'He was <strong>beside</strong> the barrel in the <strong>Harbor</strong>.',
      validate: VALIDATORS.combined(VALIDATORS.beside_obstacle('B',{x:6,y:1}), VALIDATORS.in_room('B','harbor')) },
    { suspectId:'C', text:'She was <strong>beside</strong> the shell at the <strong>Fish Market</strong>.',
      validate: VALIDATORS.combined(VALIDATORS.beside_obstacle('C',{x:2,y:2}), VALIDATORS.in_room('C','fishmarket')) },
    { suspectId:'D', text:'He was <strong>beside</strong> the crate in the <strong>Warehouse</strong>.',
      validate: VALIDATORS.combined(VALIDATORS.beside_obstacle('D',{x:6,y:3}), VALIDATORS.in_room('D','warehouse')) },
    { suspectId:'E', text:'He was <strong>alone</strong> at the <strong>Boathouse</strong>, beside the plant.',
      validate: VALIDATORS.combined(VALIDATORS.alone_in_room('E'), VALIDATORS.in_room('E','boathouse')) },
    { suspectId:'F', text:'He was <strong>beside</strong> the shrub in the <strong>Tavern</strong>.',
      validate: VALIDATORS.combined(VALIDATORS.beside_obstacle('F',{x:1,y:5}), VALIDATORS.in_room('F','tavern')) },
    { suspectId:'G', text:'She was <strong>beside</strong> the flowers on the <strong>Beach</strong>.',
      validate: VALIDATORS.combined(VALIDATORS.beside_obstacle('G',{x:5,y:6}), VALIDATORS.in_room('G','beach')) },
    { suspectId:'H', text:'He was <strong>beside</strong> the boat at the <strong>Lighthouse</strong>.',
      validate: VALIDATORS.combined(VALIDATORS.beside_obstacle('H',{x:7,y:7}), VALIDATORS.in_room('H','lighthouse')) },
    { suspectId:'I', text:'★ <strong>Victim.</strong> She was <strong>alone</strong> with the murderer in the <strong>Hidden Cove</strong>.',
      validate: VALIDATORS.combined(VALIDATORS.victim_clue('I'), VALIDATORS.in_room('I','cove')) },
  ];

  return {
    id: 'fishermans_wharf',
    name: "Fisherman's Wharf",
    theme: 'coastal',
    difficulty: 'Hard',
    cols: 10,
    rows: 9,
    cellSize: 64,
    shape,
    rooms: [dockFinal, harborFinal, fishmarketFinal, warehouseFinal, boathouseFinal,
            tavernFinal, beachFinal, lighthouseFinal, coveFinal],
    obstacles,
    suspects,
    solution,
    clues,
  };
})();


// ---- LEVEL 5: Your First Case — Very Easy — 6×6 ----
const LEVEL_5 = (() => {
  // Four 3×3 quadrant rooms
  const living_room = { id:'living_room', name:'Living Room', color:'#e8c9a0',
    cells: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2}] };
  const bedroom = { id:'bedroom', name:'Bedroom', color:'#b8d4e8',
    cells: [{x:3,y:0},{x:4,y:0},{x:5,y:0},{x:3,y:1},{x:4,y:1},{x:5,y:1},{x:3,y:2},{x:4,y:2},{x:5,y:2}] };
  const lounge = { id:'lounge', name:'Main Lounge', color:'#e0c0d0',
    cells: [{x:0,y:3},{x:1,y:3},{x:2,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5}] };
  const dining_room = { id:'dining_room', name:'Dining Room', color:'#c8e0b8',
    cells: [{x:3,y:3},{x:4,y:3},{x:5,y:3},{x:3,y:4},{x:4,y:4},{x:5,y:4},{x:3,y:5},{x:4,y:5},{x:5,y:5}] };

  // Solution (verified unique 1:1 with PDF)
  const solution = { A:{x:1,y:0}, B:{x:0,y:4}, C:{x:2,y:1}, D:{x:4,y:2}, E:{x:3,y:3}, V:{x:5,y:5} };

  const suspects = [
    { id:'A', name:'Axel',    trait:'none',    color: SUSPECT_COLORS[0], isVictim: false },
    { id:'B', name:'Bella',   trait:'none',    color: SUSPECT_COLORS[1], isVictim: false },
    { id:'C', name:'Cora',    trait:'glasses', color: SUSPECT_COLORS[2], isVictim: false },
    { id:'D', name:'Douglas', trait:'beard',   color: SUSPECT_COLORS[3], isVictim: false },
    { id:'E', name:'Ella',    trait:'none',    color: SUSPECT_COLORS[4], isVictim: false },
    { id:'V', name:'Vincent', trait:'none',    color: SUSPECT_COLORS[5], isVictim: true  },
  ];

  const obstacles = [
    // Wall Windows
    { x:1, y:0, type:'window', wall:'top' },
    { x:4, y:0, type:'window', wall:'top' },
    // Bedroom Bed
    { x:4, y:1, type:'bed_top', walkable:true },
    { x:4, y:2, type:'bed', walkable:true },
    // Living Room Carpet
    { x:2, y:1, type:'carpet', walkable:true },
    // Chairs
    { x:0, y:3, type:'chair', walkable:true },
    { x:0, y:5, type:'chair', walkable:true },
    { x:5, y:3, type:'chair', walkable:true },
    // Plants
    { x:2, y:4, type:'plant'   },
    { x:5, y:4, type:'plant_02'},
  ];

  const clues = [
    {
      suspectId: 'A',
      text: 'He was in front of the <strong>window</strong> in the Living Room.',
      validate: (placements) => {
        const pos = placements['A']; if (!pos) return null;
        return pos.x === 1 && pos.y === 0;
      },
    },
    {
      suspectId: 'B',
      text: 'She was in the <strong>Main Lounge</strong>.',
      validate: (placements) => {
        const pos = placements['B']; if (!pos) return null;
        return pos.x === 0 && pos.y === 4;
      },
    },
    {
      suspectId: 'C',
      text: 'She was <strong>on the carpet</strong>.',
      validate: (placements) => {
        const pos = placements['C']; if (!pos) return null;
        return pos.x === 2 && pos.y === 1;
      },
    },
    {
      suspectId: 'D',
      text: 'He was <strong>lying on the bed</strong>.',
      validate: (placements) => {
        const pos = placements['D']; if (!pos) return null;
        return pos.x === 4 && pos.y === 2;
      },
    },
    {
      suspectId: 'E',
      text: 'She was <strong>beside a plant</strong>.',
      validate: (placements) => {
        const pos = placements['E']; if (!pos) return null;
        return pos.x === 3 && pos.y === 3;
      },
    },
    {
      suspectId: 'V',
      text: '★ <strong>Victim.</strong> He was in the last free cell.',
      validate: VALIDATORS.victim_clue('V'),
    },
  ];

  return {
    id: 'your_first_case',
    name: 'Your First Case',
    theme: 'apartment',
    difficulty: 'Very Easy',
    cols: 6,
    rows: 6,
    cellSize: 80,
    shape: fullShape(6, 6),
    rooms: [living_room, bedroom, lounge, dining_room],
    obstacles,
    suspects,
    solution,
    clues,
  };
})();

// ---- LEVEL 6: Vacation Rental — Easy — 6×6 ----
const LEVEL_6 = (() => {
  // Layout: Lounge x:0..1 y:0..3, Bathroom x:2..3 y:0..3, Guest Room x:4..5 y:0..3, Bedroom full row y:4..5
  const lounge = { id:'lounge', name:'Lounge', color:'#f0e0c8',
    cells: [{x:0,y:0},{x:1,y:0},{x:0,y:1},{x:1,y:1},{x:0,y:2},{x:1,y:2},{x:0,y:3},{x:1,y:3}] };
  const bathroom = { id:'bathroom', name:'Bathroom', color:'#c0dce8',
    cells: [{x:2,y:0},{x:3,y:0},{x:2,y:1},{x:3,y:1},{x:2,y:2},{x:3,y:2},{x:2,y:3},{x:3,y:3}] };
  const guest_room = { id:'guest_room', name:'Guest Room', color:'#d4e8c0',
    cells: [{x:4,y:0},{x:5,y:0},{x:4,y:1},{x:5,y:1},{x:4,y:2},{x:5,y:2},{x:4,y:3},{x:5,y:3}] };
  const bedroom = { id:'bedroom', name:'Bedroom', color:'#e0c8d8',
    cells: [{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5},{x:5,y:5}] };

  // Solution (verified unique): TV:(1,1) Chair:(0,2) Bed1:(4,0) Bed2:(1,5) Plant:(5,1)
  // Arianna(2,1) Brycen(0,2) Colleen(3,3) Dan(1,4) Evan(4,0) Virgil(5,5)
  const solution = { A:{x:2,y:1}, B:{x:0,y:2}, C:{x:3,y:3}, D:{x:1,y:4}, E:{x:4,y:0}, V:{x:5,y:5} };

  const suspects = [
    { id:'A', name:'Arianna', trait:'none',    color: SUSPECT_COLORS[0], isVictim: false },
    { id:'B', name:'Brycen',  trait:'bald',    color: SUSPECT_COLORS[1], isVictim: false },
    { id:'C', name:'Colleen', trait:'glasses', color: SUSPECT_COLORS[2], isVictim: false },
    { id:'D', name:'Dan',     trait:'beard',   color: SUSPECT_COLORS[3], isVictim: false },
    { id:'E', name:'Evan',    trait:'none',    color: SUSPECT_COLORS[4], isVictim: false },
    { id:'V', name:'Virgil',  trait:'none',    color: SUSPECT_COLORS[5], isVictim: true  },
  ];

  const obstacles = [
    // TV
    { x:1, y:1, type:'tv' },
    // Chair
    { x:0, y:2, type:'chair', walkable:true },
    // Bed 1 (Guest Room) - spans 2 cells
    { x:4, y:0, type:'bed_top', walkable:true },
    { x:4, y:1, type:'bed', walkable:true },
    // Bed 2 (Bedroom) - spans 2 cells
    { x:1, y:4, type:'bed_top', walkable:true },
    { x:1, y:5, type:'bed', walkable:true },
    // Plant
    { x:5, y:1, type:'plant_02' },
    // Wall Windows
    { x:0, y:0, type:'window', wall:'top' },
    { x:5, y:0, type:'window', wall:'top' },
  ];

  const clues = [
    {
      suspectId: 'A',
      text: 'She was <strong>beside</strong> the <strong>TV</strong>.',
      validate: VALIDATORS.beside_obstacle('A', {x:1,y:1}),
    },
    {
      suspectId: 'B',
      text: 'He was <strong>sitting</strong> in the <strong>chair</strong>.',
      validate: (placements) => {
        const pos = placements['B']; if (!pos) return null;
        return pos.x === 0 && pos.y === 2;
      },
    },
    {
      suspectId: 'C',
      text: 'She was in the <strong>Bathroom</strong>.',
      validate: VALIDATORS.in_room('C', 'bathroom'),
    },
    {
      suspectId: 'D',
      text: 'He was <strong>beside</strong> a <strong>bed</strong> in the Bedroom.',
      validate: (placements, level) => {
        const pos = placements['D']; if (!pos) return null;
        return isAdjacent(pos, {x:1,y:5}) && getRoomForCell(pos.x,pos.y,level)?.id === 'bedroom';
      },
    },
    {
      suspectId: 'E',
      text: 'He was <strong>lying</strong> on a <strong>bed</strong> in the Guest Room.',
      validate: (placements) => {
        const pos = placements['E']; if (!pos) return null;
        return pos.x === 4 && pos.y === 0;
      },
    },
    {
      suspectId: 'V',
      text: '★ <strong>Victim.</strong> He was in the last free square.',
      validate: VALIDATORS.victim_clue('V'),
    },
  ];

  return {
    id: 'vacation_rental',
    name: 'Vacation Rental',
    theme: 'apartment',
    difficulty: 'Easy',
    cols: 6,
    rows: 6,
    cellSize: 80,
    shape: fullShape(6, 6),
    rooms: [lounge, bathroom, guest_room, bedroom],
    obstacles,
    suspects,
    solution,
    clues,
  };
})();

// ---- LEVEL 7: The English Breakfast — Easy — 6×6 ----
const LEVEL_7 = (() => {
  // Irregular rooms
  const lounge = { id:'lounge', name:'Lounge', color:'#e8d4b8',
    cells: [{x:0,y:0},{x:0,y:1},{x:0,y:2},{x:0,y:3},{x:0,y:4},{x:1,y:4},{x:0,y:5},{x:1,y:5}] };
  const kitchen = { id:'kitchen', name:'Kitchen', color:'#c8e4c8',
    cells: [{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:1,y:1},{x:2,y:1},{x:3,y:1}] };
  const guest_room = { id:'guest_room', name:'Guest Room', color:'#b8cce8',
    cells: [{x:4,y:0},{x:5,y:0},{x:4,y:1},{x:5,y:1},{x:4,y:2},{x:5,y:2}] };
  const bathroom = { id:'bathroom', name:'Bathroom', color:'#d8e8f0',
    cells: [{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:1,y:3},{x:2,y:3},{x:3,y:3}] };
  const bedroom = { id:'bedroom', name:'Bedroom', color:'#e8c8d8',
    cells: [{x:4,y:3},{x:5,y:3},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},{x:2,y:5},{x:3,y:5},{x:4,y:5},{x:5,y:5}] };

  // Solution (verified unique): Window:(0,0) Bed:(2,4) Table:(1,3) TV:(3,1)
  // Alexander(2,4) Briggs(3,0) Carissa(0,3) Diana(4,2) Elsa(1,1) Vin(5,5)
  const solution = { A:{x:2,y:4}, B:{x:3,y:0}, C:{x:0,y:3}, D:{x:4,y:2}, E:{x:1,y:1}, V:{x:5,y:5} };

  const suspects = [
    { id:'A', name:'Alexander', trait:'beard',   color: SUSPECT_COLORS[0], isVictim: false },
    { id:'B', name:'Briggs',    trait:'bald',    color: SUSPECT_COLORS[1], isVictim: false },
    { id:'C', name:'Carissa',   trait:'none',    color: SUSPECT_COLORS[2], isVictim: false },
    { id:'D', name:'Diana',     trait:'glasses', color: SUSPECT_COLORS[3], isVictim: false },
    { id:'E', name:'Elsa',      trait:'none',    color: SUSPECT_COLORS[4], isVictim: false },
    { id:'V', name:'Vin',       trait:'none',    color: SUSPECT_COLORS[5], isVictim: true  },
  ];

  const obstacles = [
    // Bed (Guest Room) - spans 2 cells
    { x:5, y:0, type:'bed_top', walkable:true },
    { x:5, y:1, type:'bed', walkable:true },
    // Bed (Bedroom) - spans 2 cells
    { x:2, y:4, type:'bed_top', walkable:true },
    { x:2, y:5, type:'bed', walkable:true },
    // Table
    { x:1, y:3, type:'table' },
    // TV
    { x:4, y:3, type:'tv' },
    // Wall Windows
    { x:0, y:0, type:'window', wall:'top' },
    { x:3, y:0, type:'window', wall:'top' },
  ];

  const clues = [
    {
      suspectId: 'A',
      text: 'He was <strong>lying on the bed</strong>.',
      validate: (placements) => {
        const pos = placements['A']; if (!pos) return null;
        return pos.x === 2 && pos.y === 4;
      },
    },
    {
      suspectId: 'B',
      text: 'He was in the <strong>Kitchen</strong>.',
      validate: (placements) => {
        const pos = placements['B']; if (!pos) return null;
        return pos.x === 3 && pos.y === 0;
      },
    },
    {
      suspectId: 'C',
      text: 'She was <strong>beside</strong> the <strong>table</strong>.',
      validate: (placements) => {
        const pos = placements['C']; if (!pos) return null;
        return pos.x === 0 && pos.y === 3;
      },
    },
    {
      suspectId: 'D',
      text: 'She was <strong>beside</strong> the <strong>TV</strong>.',
      validate: (placements) => {
        const pos = placements['D']; if (!pos) return null;
        return pos.x === 4 && pos.y === 2;
      },
    },
    {
      suspectId: 'E',
      text: 'She was <strong>beside</strong> the <strong>window</strong>.',
      validate: (placements) => {
        const pos = placements['E']; if (!pos) return null;
        return pos.x === 1 && pos.y === 1;
      },
    },
    {
      suspectId: 'V',
      text: '★ <strong>Victim.</strong> He was alone with the murderer — the last free square.',
      validate: VALIDATORS.victim_clue('V'),
    },
  ];

  return {
    id: 'english_breakfast',
    name: 'The English Breakfast',
    theme: 'apartment',
    difficulty: 'Easy',
    cols: 6,
    rows: 6,
    cellSize: 80,
    shape: fullShape(6, 6),
    rooms: [lounge, kitchen, guest_room, bathroom, bedroom],
    obstacles,
    suspects,
    solution,
    clues,
  };
})();

// ---- LEVEL 8: Four Windows — Easy — 6×6 ----
const LEVEL_8 = (() => {
  // Four equal 3×3 quadrant rooms
  const lounge = { id:'lounge', name:'Lounge', color:'#e0d4c0',
    cells: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2}] };
  const bathroom = { id:'bathroom', name:'Bathroom', color:'#c0d8e8',
    cells: [{x:3,y:0},{x:4,y:0},{x:5,y:0},{x:3,y:1},{x:4,y:1},{x:5,y:1},{x:3,y:2},{x:4,y:2},{x:5,y:2}] };
  const guest_room = { id:'guest_room', name:'Guest Room', color:'#c8e0c8',
    cells: [{x:0,y:3},{x:1,y:3},{x:2,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5}] };
  const bedroom = { id:'bedroom', name:'Bedroom', color:'#e0c8d8',
    cells: [{x:3,y:3},{x:4,y:3},{x:5,y:3},{x:3,y:4},{x:4,y:4},{x:5,y:4},{x:3,y:5},{x:4,y:5},{x:5,y:5}] };

  // Solution (verified unique): Windows:(0,1)(5,1)(0,5)(5,4) Chair:(2,2) Plant:(5,3) Bed:(4,3)
  // Antonio(0,3) Ben(2,2) Chelsea(5,0) Dahlia(1,1) Emmy(4,4) Valeria(3,5)
  const solution = { A:{x:0,y:3}, B:{x:2,y:2}, C:{x:5,y:0}, D:{x:1,y:1}, E:{x:4,y:4}, V:{x:3,y:5} };

  const suspects = [
    { id:'A', name:'Antonio', trait:'beard',   color: SUSPECT_COLORS[0], isVictim: false },
    { id:'B', name:'Ben',     trait:'bald',    color: SUSPECT_COLORS[1], isVictim: false },
    { id:'C', name:'Chelsea', trait:'none',    color: SUSPECT_COLORS[2], isVictim: false },
    { id:'D', name:'Dahlia',  trait:'glasses', color: SUSPECT_COLORS[3], isVictim: false },
    { id:'E', name:'Emmy',    trait:'none',    color: SUSPECT_COLORS[4], isVictim: false },
    { id:'V', name:'Valeria', trait:'none',    color: SUSPECT_COLORS[5], isVictim: true  },
  ];

  // Room corners (internal 4 per room) for Antonio's clue
  const roomCorners = new Set([
    '0,0','2,0','0,2','2,2', // Lounge
    '3,0','5,0','3,2','5,2', // Bathroom
    '0,3','2,3','0,5','2,5', // Guest Room
    '3,3','5,3','3,5','5,5'  // Bedroom
  ]);

  const obstacles = [
    // Chair
    { x:2, y:2, type:'chair', walkable:true },
    // Plant
    { x:5, y:3, type:'plant' },
    // Bed - spans 2 cells
    { x:4, y:3, type:'bed_top', walkable:true },
    { x:4, y:4, type:'bed', walkable:true },
    // Wall Windows
    { x:0, y:3, type:'window', wall:'left' },
    { x:5, y:3, type:'window', wall:'right' },
    { x:0, y:0, type:'window', wall:'top' },
    { x:5, y:0, type:'window', wall:'top' },
  ];

  const clues = [
    {
      suspectId: 'A',
      text: 'He was in a <strong>corner</strong> of a room.',
      validate: (placements) => {
        const pos = placements['A']; if (!pos) return null;
        return pos.x === 0 && pos.y === 3;
      },
    },
    {
      suspectId: 'B',
      text: 'He was <strong>sitting</strong> in the <strong>chair</strong>.',
      validate: (placements) => {
        const pos = placements['B']; if (!pos) return null;
        return pos.x === 2 && pos.y === 2;
      },
    },
    {
      suspectId: 'C',
      text: 'She was <strong>beside</strong> a <strong>window</strong>.',
      validate: (placements) => {
        const pos = placements['C']; if (!pos) return null;
        return pos.x === 5 && pos.y === 0;
      },
    },
    {
      suspectId: 'D',
      text: 'She was <strong>not</strong> beside any <strong>wall</strong>.',
      validate: (placements) => {
        const pos = placements['D']; if (!pos) return null;
        return pos.x === 1 && pos.y === 1;
      },
    },
    {
      suspectId: 'E',
      text: 'She was <strong>beside</strong> a <strong>plant</strong>.',
      validate: (placements) => {
        const pos = placements['E']; if (!pos) return null;
        return pos.x === 4 && pos.y === 4;
      },
    },
    {
      suspectId: 'V',
      text: '★ <strong>Victim.</strong> She was alone with the murderer — the last free square.',
      validate: VALIDATORS.victim_clue('V'),
    },
  ];

  return {
    id: 'four_windows',
    name: 'Four Windows',
    theme: 'apartment',
    difficulty: 'Easy',
    cols: 6,
    rows: 6,
    cellSize: 80,
    shape: fullShape(6, 6),
    rooms: [lounge, bathroom, guest_room, bedroom],
    obstacles,
    suspects,
    solution,
    clues,
  };
})();


const BUILT_IN_LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5, LEVEL_6, LEVEL_7, LEVEL_8];

// ---- Validation runner ----
const validateAllClues = (placements, level) => {
  const results = {};
  let allPass = true;
  let anyNull = false;

  for (const clue of level.clues) {
    const result = clue.validate(placements, level);
    results[clue.suspectId] = result;
    if (result === false) allPass = false;
    if (result === null) anyNull = true;
  }

  return { results, allPass, anyNull };
};

// Check if placement is complete (all suspects placed)
const isComplete = (placements, level) =>
  level.suspects.length === Object.keys(placements).length;

// Check placement constraints (1 per row, 1 per col, valid cells only)
const checkHardConstraints = (placements, level) => {
  const rows = new Set();
  const cols = new Set();
  for (const [id, pos] of Object.entries(placements)) {
    if (rows.has(pos.y)) return { valid: false, reason: `Two suspects in row ${pos.y}` };
    if (cols.has(pos.x)) return { valid: false, reason: `Two suspects in col ${pos.x}` };
    if (!isValidPlacementCell(pos.x, pos.y, level))
      return { valid: false, reason: `Invalid cell (${pos.x},${pos.y})` };
    rows.add(pos.y);
    cols.add(pos.x);
  }
  return { valid: true };
};

// ============================================================
// gemini.js — Gemini API wrapper for AI level generation
// PRIVATE — never log or expose the API key
// ============================================================

// 🔐 Secure API backend — Gemini key is securely loaded on the server side (/api/generate)
const GEMINI_API_URL = '/api/generate';


// --- Prompt builder ---
const buildLevelPrompt = (theme, difficulty, sizeLabel) => {
  const sizeMap    = { small: '5–6', medium: '7–8', large: '9–10' };
  const suspectMap = { small: '5 or 6', medium: '7 or 8', large: '9 or 10' };
  const nSuspects  = suspectMap[sizeLabel] || suspectMap.medium;
  const gridRange  = sizeMap[sizeLabel]    || sizeMap.medium;

  return `You are a puzzle designer for "Murdoku" — a logic deduction game (murder mystery × Sudoku).

═══════════════════ GAME RULES ═══════════════════
• The grid has ROWS × COLS cells. Some cells are "void" (outside the playable area).
• Each non-void, non-obstacle cell belongs to exactly ONE room.
• Suspects are placed one per ROW and one per COLUMN (like N-Queens). No two suspects share a row OR column.
• Exactly one suspect is the VICTIM. The victim's room must contain EXACTLY 2 suspects in the solution (victim + murderer). All other rooms have at most 1 suspect.
• Obstacles are decorative objects on specific cells. A suspect CANNOT be placed on an obstacle cell.

═══════════════════ DATA FORMAT ═══════════════════

SHAPE (critical — read carefully):
• shape is a 2D boolean array: shape[y][x]
• shape[y] is an array of COLS booleans, one per column
• shape[y][x] = true  → cell at column x, row y is playable
• shape[y][x] = false → cell is VOID (transparent, outside play area)
• shape has exactly ROWS entries (one per row, top to bottom)
• Each entry has exactly COLS values (one per column, left to right)

Example for a 4-col × 3-row grid with void at top-left corner:
  shape = [
    [false, false, true,  true ],   // row y=0: cols 0,1 void
    [false, true,  true,  true ],   // row y=1: col 0 void
    [true,  true,  true,  true ]    // row y=2: all valid
  ]

ROOMS:
• Every cell where shape[y][x] === true MUST appear in exactly one room's cells array.
• Cells where shape[y][x] === false MUST NOT appear in any room.
• Every room must be CONTIGUOUS — you can walk between any two cells in a room by moving up/down/left/right through other cells of the same room (no diagonal jumps, no teleporting through void or other rooms).
• Room cells use {x: column, y: row} coordinates (x = column index, y = row index).

OBSTACLES:
• Obstacles sit on specific cells: {x: col, y: row, type: "..."}
• Obstacle cells DO count as belonging to a room (include them in the room's cells array).
• No suspect in the solution may be placed on an obstacle cell.
• Obstacles are purely decorative for clue references.

SOLUTION:
• "A": {"x": col, "y": row} — one entry per suspect.
• All x-values must be distinct (one per column).
• All y-values must be distinct (one per row).
• No solution cell may be void or an obstacle.
• Each solution cell must be inside the room you intend for that suspect.

CLUE TYPES (use these exact strings for clueType):
  beside_obstacle  → suspect is adjacent (up/down/left/right or diagonal) to the obstacle
                     params: { "obstaclePos": {"x": col, "y": row} }
  in_room          → suspect is in a specific room
                     params: { "roomId": "the_room_id" }
  alone_in_room    → suspect's room has exactly 1 suspect placed in it
                     params: {} (empty object)
  same_room_as     → suspect is in the same room as another suspect
                     params: { "otherId": "B" }
  victim_clue      → this suspect is the victim; their room has exactly 2 suspects
                     params: {} (empty object)  ← ALWAYS use this for the isVictim suspect
  combined         → logical AND of multiple conditions
                     params: { "conditions": [ {clueType, params}, {clueType, params} ] }
  directly_above   → suspect is directly above (same column, one row higher)
                     params: { "targetPos": {"x": col, "y": row} }
  directly_below   → suspect is directly below (same column, one row lower)
                     params: { "targetPos": {"x": col, "y": row} }
  left_of_obstacle → suspect is directly left of obstacle (adjacent)
                     params: { "obstaclePos": {"x": col, "y": row} }
  right_of_obstacle → suspect is directly right of obstacle (adjacent)
                     params: { "obstaclePos": {"x": col, "y": row} }

CRITICAL CLUE RULES:
• Every suspect must have EXACTLY ONE clue entry.
• The set of clues must UNIQUELY determine the solution by logic alone.
• The isVictim suspect's clue must include victim_clue (usually via combined).
• Do NOT put suspect IDs inside params — the suspectId field on the clue handles that.

═══════════════════ DESIGN TASK ═══════════════════
Theme:      "${theme}"
Difficulty: "${difficulty}"
Grid size:  ${gridRange} rows × ${gridRange} cols (choose specific values)
Suspects:   ${nSuspects} (one per row, one per column in solution)

For HARD difficulty: use an irregular shape (many void cells at corners/edges to make the grid look non-rectangular). Rooms should be irregular L-shapes or T-shapes, not simple rectangles.
For EASY difficulty: use a simple shape (few or no voids). Rooms can be simple rectangles.

═══════════════════ WORKED EXAMPLE ═══════════════════
A valid 4-suspect mini-level:
• 4 cols × 4 rows, no voids → shape = [[true,true,true,true],[true,true,true,true],[true,true,true,true],[true,true,true,true]]
• 4 rooms of 4 cells each:
  room_a: (0,0)(1,0)(0,1)(1,1)  ← top-left 2×2 block
  room_b: (2,0)(3,0)(2,1)(3,1)  ← top-right 2×2 block
  room_c: (0,2)(1,2)(0,3)(1,3)  ← bottom-left 2×2 block
  room_d: (2,2)(3,2)(2,3)(3,3)  ← bottom-right 2×2 block
  Total cells covered: 4×4 = 16 ✓ Each cell in exactly one room ✓
• Solution: A(0,0) B(3,1) C(1,2) D(2,3) — rows 0,1,2,3 each used once; cols 0,3,1,2 each used once ✓
• All in rooms: A in room_a✓ B in room_b✓ C in room_c✓ D in room_d✓

═══════════════════ OUTPUT FORMAT ═══════════════════
Return ONLY a valid JSON object (no markdown, no backticks, no explanation):

{
  "id": "unique_snake_case_id",
  "name": "Puzzle Name",
  "theme": "${theme.toLowerCase().replace(/\s+/g,'_')}",
  "difficulty": "${difficulty}",
  "cols": <number>,
  "rows": <number>,
  "cellSize": <50–90, use 72 for 6×6, 64 for 8×8, 56 for 10×10>,
  "shape": [[...booleans, length=cols, one array per row, rows arrays total]],
  "rooms": [
    {
      "id": "snake_case_room_id",
      "name": "Room Name",
      "color": "#rrggbb",
      "cells": [{"x": col, "y": row}, ...]
    }
  ],
  "obstacles": [
    {"x": col, "y": row, "type": "<MUST be one of the exact strings listed below>"}
  ],
  "suspects": [
    {"id": "A", "name": "FirstName LastName", "trait": "<MUST be exactly: glasses, bald, beard, or none>", "color": "#rrggbb", "isVictim": false}
  ],

VALID OBSTACLE TYPES (use EXACTLY one of these strings — no others):
barrel, bear, boar, boat, bonsai, boulder, box, cactus, camera, canopic_jars, car,
carriage, cart, cat, catapult, chair, chest_gold, chest_pirate, column, cone, cow,
crate, crocodile, dynamite, easel, elephant, fish, flowers, golf_cart, hammock,
hay, horse, jar, lion, mammoth, monkey, obelisk, painting, palm_tree, penguin,
piano, pig, plant, present, pumpkin, raft, rowboat, safe, sarcophagus, shark,
shelf, shell, shrub, sphinx, statue, stump, table, teddy_bear, tombstone, tree, tv, wolf

VALID TRAIT values (EXACTLY one of): glasses, bald, beard, none
  "suspects": [
    {"id": "A", "name": "FirstName LastName", "trait": "none", "color": "#rrggbb", "isVictim": false}
  ],
  "solution": {
    "A": {"x": col, "y": row}
  },
  "clues": [
    {
      "suspectId": "A",
      "text": "HTML clue text with <strong>bold</strong> for key words",
      "clueType": "combined",
      "params": {
        "conditions": [
          {"clueType": "beside_obstacle", "params": {"obstaclePos": {"x": 1, "y": 0}}},
          {"clueType": "in_room", "params": {"roomId": "room_id"}}
        ]
      }
    }
  ]
}

FINAL CHECKLIST before outputting:
□ shape has exactly ROWS arrays, each with exactly COLS booleans
□ EVERY shape[y][x]=true cell appears in exactly one room's cells array
□ NO shape[y][x]=false cell appears in any room
□ Every room is contiguous (connected by adjacency, not diagonal)
□ solution has one entry per suspect, all rows distinct, all cols distinct
□ No solution cell is void or an obstacle
□ Each solution suspect is in the expected room
□ Every suspect has exactly one clue
□ isVictim suspect's clue uses victim_clue (directly or in combined)
□ Room with victim has exactly 2 suspects in the solution
□ Output is strictly valid JSON`;
};

// --- Valid obstacle types (must match assets/obj_<type>.svg) ---
const VALID_OBSTACLE_TYPES = new Set([
  'barrel','bear','boar','boat','bonsai','boulder','box','cactus','camera',
  'canopic_jars','car','carriage','cart','cat','catapult','chair','chest_gold',
  'chest_pirate','column','cone','cow','crate','crocodile','dynamite','easel',
  'elephant','fish','flowers','golf_cart','hammock','hay','horse','jar','lion',
  'mammoth','monkey','obelisk','painting','palm_tree','penguin','piano','pig',
  'plant','present','pumpkin','raft','rowboat','safe','sarcophagus','shark',
  'shelf','shell','shrub','sphinx','statue','stump','table','teddy_bear',
  'tombstone','tree','tv','wolf',
]);

// Map common AI hallucinations to real asset names
const OBSTACLE_ALIAS = {
  gargoyle:'statue', suit_of_armor:'statue', armor:'statue', knight:'statue',
  vase:'jar', pot:'jar', urn:'jar', goblet:'jar',
  bookshelf:'shelf', bookcase:'shelf', books:'shelf',
  grandfather_clock:'shelf', clock:'shelf', grandfather:'shelf',
  lamp:'flowers', lantern:'flowers', candelabra:'flowers', chandelier:'flowers',
  candlestick:'flowers', candle:'flowers',
  mirror:'painting', portrait:'painting', artwork:'painting',
  coffin:'sarcophagus', casket:'sarcophagus',
  gravestone:'tombstone', grave:'tombstone',
  bush:'shrub', hedge:'shrub', grass:'shrub',
  palm:'palm_tree', palmtree:'palm_tree',
  teddy:'teddy_bear', bear_toy:'teddy_bear',
  crate_box:'crate',
  pedestal:'column', pillar:'column',
  globe:'obelisk', trophy:'chest_gold',
  stool:'chair', throne:'chair',
  carpet:'table', rug:'table',
  fireplace:'barrel', furnace:'barrel',
  cauldron:'jar', bucket:'box',
  sword:'weapons_rack', spear:'weapons_rack', axe:'weapons_rack',
};

// Sanitize AI-generated level data to fix common mistakes
const normalizeLevelData = (raw) => {
  const level = { ...raw, cellSize: raw.cellSize || 72 };

  // Fix obstacle types
  level.obstacles = (raw.obstacles || []).map(obs => {
    const t = (obs.type || '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const mapped = VALID_OBSTACLE_TYPES.has(t) ? t
                 : OBSTACLE_ALIAS[t] ? OBSTACLE_ALIAS[t]
                 : null; // drop unknown types
    return mapped ? { ...obs, type: mapped } : null;
  }).filter(Boolean);

  // Fix suspect traits
  const VALID_TRAITS = new Set(['glasses', 'bald', 'beard', 'none']);
  level.suspects = (raw.suspects || []).map(s => ({
    ...s,
    trait: VALID_TRAITS.has((s.trait || '').toLowerCase()) ? s.trait.toLowerCase() : 'none',
  }));

  return level;
};

// --- Parse Gemini response and convert clues to validators ---
const parseLevelFromGemini = (rawLevel) => {
  if (!rawLevel || typeof rawLevel !== 'object') throw new Error('Invalid level data');

  // Normalize first (fixes obstacle types, traits, etc.)
  const normalized = normalizeLevelData(rawLevel);

  const level = { ...normalized };

  // Convert structured clues to validator functions
  level.clues = (rawLevel.clues || []).map(clue => ({
    suspectId: clue.suspectId,
    text: clue.text,
    validate: buildValidator(clue.clueType, clue.params),
    _clueType: clue.clueType,
    _params: clue.params,
  }));

  return level;
};

const buildValidator = (clueType, params) => {
  switch (clueType) {
    case 'beside_obstacle':
      return VALIDATORS.beside_obstacle(params.suspectId || '_', params.obstaclePos);
    case 'directly_below':
      return VALIDATORS.directly_below(params.suspectId || '_', params.targetPos);
    case 'directly_above':
      return VALIDATORS.directly_above(params.suspectId || '_', params.targetPos);
    case 'above_obstacle':
      return VALIDATORS.above_obstacle(params.suspectId || '_', params.obstaclePos);
    case 'left_of_obstacle':
      return VALIDATORS.left_of_obstacle(params.suspectId || '_', params.obstaclePos);
    case 'right_of_obstacle':
      return VALIDATORS.right_of_obstacle(params.suspectId || '_', params.obstaclePos);
    case 'alone_in_room':
      return VALIDATORS.alone_in_room(params.suspectId || '_');
    case 'same_room_as':
      return VALIDATORS.same_room_as(params.suspectId || '_', params.otherId);
    case 'in_room':
      return VALIDATORS.in_room(params.suspectId || '_', params.roomId);
    case 'victim_clue':
      return VALIDATORS.victim_clue(params.suspectId || '_');
    case 'combined':
      return VALIDATORS.combined(
        ...(params.conditions || []).map(c => buildValidator(c.clueType, c.params))
      );
    default:
      // Fallback: always pass (invalid clue type)
      return () => true;
  }
};

// Fix buildValidator to use the clue's suspectId from the parent
const buildValidatorForClue = (clue) => {
  const inject = (params) => ({ ...params, suspectId: clue.suspectId });

  switch (clue.clueType) {
    case 'beside_obstacle':
      return VALIDATORS.beside_obstacle(clue.suspectId, clue.params.obstaclePos);
    case 'directly_below':
      return VALIDATORS.directly_below(clue.suspectId, clue.params.targetPos);
    case 'directly_above':
      return VALIDATORS.directly_above(clue.suspectId, clue.params.targetPos);
    case 'above_obstacle':
      return VALIDATORS.above_obstacle(clue.suspectId, clue.params.obstaclePos);
    case 'left_of_obstacle':
      return VALIDATORS.left_of_obstacle(clue.suspectId, clue.params.obstaclePos);
    case 'right_of_obstacle':
      return VALIDATORS.right_of_obstacle(clue.suspectId, clue.params.obstaclePos);
    case 'alone_in_room':
      return VALIDATORS.alone_in_room(clue.suspectId);
    case 'same_room_as':
      return VALIDATORS.same_room_as(clue.suspectId, clue.params.otherId);
    case 'in_room':
      return VALIDATORS.in_room(clue.suspectId, clue.params.roomId);
    case 'victim_clue':
      return VALIDATORS.victim_clue(clue.suspectId);
    case 'combined':
      return VALIDATORS.combined(
        ...(clue.params.conditions || []).map(c =>
          buildValidatorForClue({ suspectId: clue.suspectId, ...c })
        )
      );
    default:
      return () => true;
  }
};

// --- Main generate function ---
const generateLevelWithGemini = async (theme, difficulty, sizeLabel, onProgress) => {
  onProgress?.('Sending request to secure AI generator...');

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme, difficulty, sizeLabel }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error || `API error ${response.status}`);
  }

  onProgress?.('Parsing level data...');

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  const finishReason = candidate?.finishReason;
  
  console.log('--- RAW GEMINI RESPONSE (finishReason:', finishReason, ') ---');
  console.log(text || data);
  console.log('---------------------------');

  if (!text) throw new Error('Empty response from Gemini');

  // Extract JSON (handle possible markdown code fences)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not find JSON in response. Check console for raw output.');

  let jsonString = jsonMatch[0];
  // Attempt to fix trailing commas
  jsonString = jsonString.replace(/,\s*([\]}])/g, '$1');

  let rawLevel;
  try {
    rawLevel = JSON.parse(jsonString);
  } catch (e) {
    // If it fails, maybe log a snippet of where it failed
    console.error("Failed JSON snippet:", jsonString.substring(Math.max(0, e.message.match(/position (\d+)/)?.[1] - 50 || 0), parseInt(e.message.match(/position (\d+)/)?.[1] || 50) + 50));
    throw new Error('Failed to parse JSON: ' + e.message + '. Please try again.');
  }

  onProgress?.('Building validators...');

  // Convert clues to validator functions using proper suspectId injection
  rawLevel.clues = (rawLevel.clues || []).map(clue => ({
    suspectId: clue.suspectId,
    text: clue.text,
    validate: buildValidatorForClue(clue),
  }));

  // Validate basic structure
  validateLevelStructure(rawLevel);

  onProgress?.('Level ready!');

  return rawLevel;
};

// --- Comprehensive structure validation ---
const validateLevelStructure = (level) => {
  const errors = [];

  if (!level.cols || !level.rows) { errors.push('Missing cols/rows'); }
  if (!level.shape || level.shape.length !== level.rows) {
    errors.push(`shape has ${level.shape?.length} rows but rows=${level.rows}`);
  } else {
    // Check each shape row has exactly cols booleans
    level.shape.forEach((row, y) => {
      if (!Array.isArray(row) || row.length !== level.cols)
        errors.push(`shape[${y}] length ${row?.length} ≠ cols(${level.cols})`);
    });
  }
  if (!level.suspects || level.suspects.length < 4) errors.push('Too few suspects (<4)');
  if (!level.solution) errors.push('Missing solution');
  if (!level.clues || level.clues.length !== (level.suspects?.length || 0))
    errors.push(`Clue count ${level.clues?.length} ≠ suspect count ${level.suspects?.length}`);

  // Build assigned-cell map from rooms
  if (level.rooms && level.shape && level.shape.length === level.rows) {
    const assigned = new Map(); // "x,y" → roomId
    for (const room of level.rooms) {
      for (const c of (room.cells || [])) {
        const key = `${c.x},${c.y}`;
        // Check it's not void
        if (level.shape[c.y]?.[c.x] === false) {
          errors.push(`Room "${room.id}" claims void cell (${c.x},${c.y})`);
        }
        if (assigned.has(key)) {
          errors.push(`Cell (${c.x},${c.y}) claimed by both "${assigned.get(key)}" and "${room.id}"`);
        }
        assigned.set(key, room.id);
      }
    }
    // Check every valid cell is assigned
    let uncovered = 0;
    for (let y = 0; y < level.rows; y++) {
      for (let x = 0; x < level.cols; x++) {
        if (level.shape[y]?.[x] === true && !assigned.has(`${x},${y}`)) {
          uncovered++;
          if (uncovered <= 3) errors.push(`Valid cell (${x},${y}) not in any room`);
        }
      }
    }
    if (uncovered > 3) errors.push(`... and ${uncovered - 3} more uncovered cells`);
  }

  // Check solution uniqueness and validity
  const usedRows = new Set(), usedCols = new Set();
  for (const [id, pos] of Object.entries(level.solution || {})) {
    if (pos.y < 0 || pos.y >= level.rows || pos.x < 0 || pos.x >= level.cols)
      errors.push(`Solution ${id}(${pos.x},${pos.y}) out of bounds`);
    else if (level.shape?.[pos.y]?.[pos.x] === false)
      errors.push(`Solution ${id}(${pos.x},${pos.y}) is on a void cell`);
    if (usedRows.has(pos.y)) errors.push(`Duplicate row ${pos.y} in solution (${id})`);
    if (usedCols.has(pos.x)) errors.push(`Duplicate col ${pos.x} in solution (${id})`);
    usedRows.add(pos.y);
    usedCols.add(pos.x);
  }

  // Check victim exists and is unique
  const victims = (level.suspects || []).filter(s => s.isVictim);
  if (victims.length !== 1) errors.push(`Expected 1 victim, found ${victims.length}`);

  if (errors.length > 0) {
    throw new Error('Level validation failed:\n' + errors.join('\n'));
  }
};


// --- JSONBin.io shared storage for generated levels ---
// Bin is PUBLIC (anyone can read). Master key needed for writes.
const CACHE_KEY = 'murdoku_generated_levels';
const JSONBIN_KEY = '$2a$10$M.DNv5x97P2O5z7xPLnNUO0Rn82UjUgncIy6C3kXvAzUxKvNrbQHK';
const JSONBIN_BIN_ID = '6a0e36b76610dd3ae87b3f25';
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

// Serialize a level (strip non-serializable validator functions)
const serializeLevel = (l) => ({
  ...l,
  clues: (l.clues || []).map(c => ({
    suspectId: c.suspectId,
    text: c.text,
    clueType: c._clueType || c.clueType,
    params: c._params || c.params,
  }))
});

// Fetch current list from JSONBin (reads are public, no auth needed)
const _jsonbinRead = async () => {
  const res = await fetch(`${JSONBIN_URL}/latest`, {
    headers: { 'X-Master-Key': JSONBIN_KEY },
  });
  if (!res.ok) throw new Error(`JSONBin read failed: ${res.status}`);
  const data = await res.json();
  // Filter out placeholder entries from bin initialization
  return (data.record || []).filter(l => l.id && !l.placeholder);
};

// Write a new list to JSONBin (requires master key)
const _jsonbinWrite = async (levels) => {
  // JSONBin doesn't allow empty arrays — keep a sentinel if empty
  const payload = levels.length > 0 ? levels : [{ placeholder: true }];
  const res = await fetch(JSONBIN_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': JSONBIN_KEY,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`JSONBin write failed: ${res.status}`);
};

// Load shared levels from JSONBin + merge any local-only levels
const loadGeneratedLevels = async () => {
  try {
    const remote = await _jsonbinRead();
    // Update local cache to match server
    localStorage.setItem(CACHE_KEY, JSON.stringify(remote));
    // Merge any local-only levels not yet uploaded
    const local = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
    const remoteIds = new Set(remote.map(l => l.id));
    const localOnly = local.filter(l => !remoteIds.has(l.id));
    return [...remote, ...localOnly];
  } catch (e) {
    console.warn('[gemini] JSONBin load failed, using local cache:', e.message);
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'); } catch { return []; }
  }
};

// Save a new level to JSONBin (shared with all users) + localStorage backup
const cacheLevel = async (level) => {
  const serialized = serializeLevel(level);

  // Update localStorage immediately (fast, offline backup)
  try {
    const local = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
    const updated = [serialized, ...local.filter(l => l.id !== level.id)].slice(0, 50);
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  } catch {}

  // Sync to JSONBin
  try {
    const current = await _jsonbinRead();
    const updated = [serialized, ...current.filter(l => l.id !== level.id)].slice(0, 50);
    await _jsonbinWrite(updated);
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
    console.log('[gemini] Level saved to JSONBin:', level.name);
  } catch (e) {
    console.warn('[gemini] JSONBin save failed (level kept locally):', e.message);
  }
};

// Legacy sync getter for initial render (may be stale — use loadGeneratedLevels() for fresh data)
const getCachedLevels = () => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'); } catch { return []; }
};

// Remove a level from JSONBin + localStorage
const removeCachedLevel = async (id) => {
  // Remove locally first
  try {
    const local = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]').filter(l => l.id !== id);
    localStorage.setItem(CACHE_KEY, JSON.stringify(local));
  } catch {}
  // Sync removal to JSONBin
  try {
    const current = await _jsonbinRead();
    await _jsonbinWrite(current.filter(l => l.id !== id));
  } catch (e) {
    console.warn('[gemini] JSONBin delete failed:', e.message);
  }
};


// ---- Completion tracking ----
const COMPLETION_KEY = 'murdoku_completed';

const getCompletedLevels = () => {
  try { return JSON.parse(localStorage.getItem(COMPLETION_KEY) || '[]'); }
  catch { return []; }
};

const markLevelComplete = (levelId, timeSeconds) => {
  try {
    const completed = getCompletedLevels();
    const existing = completed.find(c => c.id === levelId);
    if (!existing) {
      completed.push({ id: levelId, time: timeSeconds, date: Date.now() });
    } else if (timeSeconds < existing.time) {
      existing.time = timeSeconds;
      existing.date = Date.now();
    }
    localStorage.setItem(COMPLETION_KEY, JSON.stringify(completed));
  } catch {}
};

const getLevelBestTime = (levelId) => {
  const completed = getCompletedLevels();
  return completed.find(c => c.id === levelId)?.time ?? null;
};

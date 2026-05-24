// api/generate.js — Vercel Serverless Function for Gemini AI Level Generation

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

OBSTACLE DENSITY: Every room should have at least 2–3 obstacle objects placed inside it for visual richness. Obstacles make the grid feel alive and give suspects interesting things to be "beside".

═══════════════════ CLUE TEXT RULES ═══════════════════
Clue text must read like natural English flavor text — NOT coordinates.

✅ CORRECT: "She was beside the <strong>cactus</strong>."
✅ CORRECT: "He was <strong>alone</strong> in the <strong>Library</strong>."
✅ CORRECT: "She was <strong>directly below</strong> the <strong>barrel</strong>."
❌ WRONG:   "Kevin was seen directly below the water dispenser at (1,4)."
❌ WRONG:   "Creed was seen directly below the vent at (6,7)."
❌ WRONG:   Any mention of grid coordinates like (x,y), column X, row Y, position (n,m).

NEVER include raw grid coordinates or position numbers in clue text.
Describe WHERE suspects are using room names and obstacle references ONLY.

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

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    return res.status(200).end();
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { theme, difficulty, sizeLabel } = req.body;
  if (!theme || !difficulty || !sizeLabel) {
    return res.status(400).json({ error: 'Missing theme, difficulty, or sizeLabel' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY environment variable is not configured. Please add it to your Vercel project environment variables.'
    });
  }

  const prompt = buildLevelPrompt(theme, difficulty, sizeLabel);
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 65536,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: err?.error?.message || `Gemini API returned status ${response.status}`
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    console.error('Serverless function error:', e);
    return res.status(500).json({ error: 'Internal server error: ' + e.message });
  }
}

// server.js — Express server for Murdoku (ESM)
import express from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 8080;
const LEVELS_FILE = join(__dirname, 'generated_levels.json');

// Ensure generated_levels.json exists
if (!existsSync(LEVELS_FILE)) {
  writeFileSync(LEVELS_FILE, '[]', 'utf8');
}

app.use(express.json({ limit: '2mb' }));

// CORS headers for local dev
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// GET /api/levels — returns all shared generated levels
app.get('/api/levels', (req, res) => {
  try {
    const levels = JSON.parse(readFileSync(LEVELS_FILE, 'utf8'));
    res.json(levels);
  } catch {
    res.json([]);
  }
});

// POST /api/levels — save a new generated level (shared with everyone)
app.post('/api/levels', (req, res) => {
  try {
    const level = req.body;
    if (!level || !level.id || !level.name) {
      return res.status(400).json({ error: 'Invalid level data' });
    }
    const levels = JSON.parse(readFileSync(LEVELS_FILE, 'utf8'));
    const filtered = levels.filter(l => l.id !== level.id);
    filtered.unshift(level); // newest first
    writeFileSync(LEVELS_FILE, JSON.stringify(filtered, null, 2), 'utf8');
    console.log(`[server] Saved level: "${level.name}" (${level.id})`);
    res.json({ ok: true, total: filtered.length });
  } catch (err) {
    console.error('[server] Save error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/levels/:id — delete a level
app.delete('/api/levels/:id', (req, res) => {
  try {
    const levels = JSON.parse(readFileSync(LEVELS_FILE, 'utf8'));
    const filtered = levels.filter(l => l.id !== req.params.id);
    writeFileSync(LEVELS_FILE, JSON.stringify(filtered, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static files (no cache in dev)
app.use(express.static(__dirname, {
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-store')
}));


app.listen(PORT, () => {
  console.log(`\n🔍 Murdoku server running at http://localhost:${PORT}`);
  console.log(`📁 Shared levels stored in: generated_levels.json`);
  console.log(`🌐 API: GET/POST http://localhost:${PORT}/api/levels\n`);
});

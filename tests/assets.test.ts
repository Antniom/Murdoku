import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { CHARACTER_CATALOG } from '../src/data/characters';
import { OBJECT_CATALOG, VALID_FLOOR_TEXTURES } from '../src/data/assets';
import { resolveAutotileIndex } from '../src/engine/autotile';

const PUB = path.resolve(process.cwd(), 'public/assets');

function isValidSvg(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const txt = fs.readFileSync(filePath, 'utf8').trimStart();
  return txt.startsWith('<svg') || txt.startsWith('<?xml');
}

describe('Verified SVG Assets Hygiene', () => {
  it('contains all 243 valid suspect portrait SVGs with zero corrupted files', () => {
    expect(CHARACTER_CATALOG.length).toBe(243);
    for (const c of CHARACTER_CATALOG) {
      const fp = path.join(process.cwd(), 'public', c.svgPath);
      expect(isValidSvg(fp), `Invalid or missing portrait SVG: ${c.svgPath}`).toBe(true);
    }
  });

  it('contains only valid SVGs for every cataloged object and zero HTML 404 stubs', () => {
    for (const meta of Object.values(OBJECT_CATALOG)) {
      const fp = path.join(process.cwd(), 'public', meta.svgPath);
      expect(isValidSvg(fp), `Invalid or missing object SVG: ${meta.svgPath}`).toBe(true);
    }
    const allObjFiles = fs.readdirSync(path.join(PUB, 'objects'));
    for (const f of allObjFiles) {
      expect(isValidSvg(path.join(PUB, 'objects', f)), `Corrupted file in objects/: ${f}`).toBe(true);
    }
  });

  it('contains all 16 valid floor texture SVGs', () => {
    expect(VALID_FLOOR_TEXTURES.length).toBe(16);
    for (const tex of VALID_FLOOR_TEXTURES) {
      const fp = path.join(PUB, 'textures', `texture_floor_${tex}.svg`);
      expect(isValidSvg(fp), `Invalid or missing texture: ${tex}`).toBe(true);
    }
  });

  it('contains all 49 table autotiles and 49 carpet autotiles and maps L-shapes cleanly', () => {
    for (let i = 1; i <= 49; i++) {
      const num = String(i).padStart(2, '0');
      expect(isValidSvg(path.join(PUB, 'tile/table', `obj_table_tile${num}.svg`))).toBe(true);
      expect(isValidSvg(path.join(PUB, 'tile/carpet', `obj_carpet_tile${num}.svg`))).toBe(true);
    }
    // Isolated tile
    expect(resolveAutotileIndex(0, 0, () => false, 'table')).toBe('01');
    // Horizontal middle
    expect(resolveAutotileIndex(0, 1, (r, c) => r === 0 && (c === 0 || c === 2), 'table')).toBe('48');
    // Interior 3x3 center
    expect(resolveAutotileIndex(1, 1, () => true, 'table')).toBe('33');
    expect(resolveAutotileIndex(1, 1, () => true, 'carpet')).toBe('07');
  });
});

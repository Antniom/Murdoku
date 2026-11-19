import React, { useMemo } from 'react';
import type { Lang, MapObject, MissingPieceTwist, MurdokuCase, RoomDef } from '../engine/types';
import {
  getFloorTexturePath,
  getObjectTintRole,
  hexToTintMatrix,
  OBJECT_CATALOG,
  PAPER_PALETTES,
  type ObjectTintRole,
} from '../data/assets';
import { getAutotileSvgPath } from '../engine/autotile';

const CELL = 64;
const PAD = 10;

function getObjectSvgHref(obj: MapObject): string {
  if ((obj.type === 'table' || obj.type === 'carpet') && obj.tileIndex) {
    return getAutotileSvgPath(obj.type, obj.tileIndex);
  }
  return OBJECT_CATALOG[obj.type]?.svgPath ?? '/assets/objects/obj_box.svg';
}

interface RoomBadgePos {
  room: RoomDef;
  cx: number;
  cy: number;
}

function computeRoomBadges(rooms: RoomDef[], rows: number): RoomBadgePos[] {
  return rooms.map((room) => {
    // Find bottom-most row of this room, and take the horizontal center of its widest contiguous run
    let maxR = -1;
    for (const cell of room.cells) {
      if (cell.r > maxR) maxR = cell.r;
    }
    const bottomCols = room.cells
      .filter((c) => c.r === maxR)
      .map((c) => c.c)
      .sort((a, b) => a - b);

    // Find widest contiguous horizontal segment on bottom row
    let bestStart = bottomCols[0];
    let bestLen = 1;
    let curStart = bottomCols[0];
    let curLen = 1;
    for (let i = 1; i < bottomCols.length; i++) {
      if (bottomCols[i] === bottomCols[i - 1] + 1) {
        curLen++;
      } else {
        if (curLen > bestLen) {
          bestStart = curStart;
          bestLen = curLen;
        }
        curStart = bottomCols[i];
        curLen = 1;
      }
    }
    if (curLen > bestLen) {
      bestStart = curStart;
      bestLen = curLen;
    }

    const cx = PAD + (bestStart + bestLen / 2) * CELL;
    // Sit right on the room's bottom wall (or slightly tucked inward if on outer bottom edge)
    const cy = PAD + (maxR + 1) * CELL - (maxR === rows - 1 ? 2 : 0);
    return { room, cx, cy };
  });
}

export interface FloorplanSVGProps {
  murdokuCase: MurdokuCase;
  lang: Lang;
  /** Optional preview patch for Missing Map Piece twist */
  previewPatchId?: 'A' | 'B' | 'C' | 'D';
  /** Optional solution overlay (for Back-of-Book view) */
  showSolution?: boolean;
}

export const FloorplanSVG: React.FC<FloorplanSVGProps> = ({
  murdokuCase,
  lang,
  previewPatchId,
  showSolution = false,
}) => {
  const { rows, cols, rooms, objects, voidCells = [], twist, solution } = murdokuCase;
  const width = cols * CELL + PAD * 2;
  const height = rows * CELL + PAD * 2;

  const { roomGrid, voidSet, wallSegments, badges, visibleObjects } = useMemo(() => {
    const vSet = new Set(voidCells.map((v) => `${v.r},${v.c}`));
    const rGrid: (string | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
    for (const rm of rooms) {
      for (const cell of rm.cells) {
        if (!vSet.has(`${cell.r},${cell.c}`)) {
          rGrid[cell.r][cell.c] = rm.id;
        }
      }
    }

    // Thick black wall segments wherever adjacent cells belong to different rooms (or outer edge)
    const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rid = rGrid[r][c];
        if (!rid) continue;
        const x = PAD + c * CELL;
        const y = PAD + r * CELL;

        // Top
        if (r === 0 || rGrid[r - 1][c] !== rid) {
          segs.push({ x1: x, y1: y, x2: x + CELL, y2: y });
        }
        // Bottom
        if (r === rows - 1 || rGrid[r + 1][c] !== rid) {
          segs.push({ x1: x, y1: y + CELL, x2: x + CELL, y2: y + CELL });
        }
        // Left
        if (c === 0 || rGrid[r][c - 1] !== rid) {
          segs.push({ x1: x, y1: y, x2: x, y2: y + CELL });
        }
        // Right
        if (c === cols - 1 || rGrid[r][c + 1] !== rid) {
          segs.push({ x1: x + CELL, y1: y, x2: x + CELL, y2: y + CELL });
        }
      }
    }

    let effObjs = objects;
    if (twist.kind === 'missing_piece') {
      const inPatch = (r: number, c: number) =>
        r >= twist.originR &&
        r < twist.originR + twist.height &&
        c >= twist.originC &&
        c < twist.originC + twist.width;

      const base = objects.filter((o) => !inPatch(o.r, o.c));
      const activePatchId = showSolution ? solution.correctPatchId : previewPatchId;
      if (activePatchId) {
        const patch = twist.patches.find((p) => p.id === activePatchId);
        effObjs = patch ? base.concat(patch.objects) : base;
      } else {
        effObjs = base;
      }
    }

    // Render walkable carpets/flowers underneath tables/chairs
    const sortedObjs = effObjs.slice().sort((a, b) => {
      const za = a.type === 'carpet' || a.type === 'flowers' || a.type === 'puddle' ? 0 : 1;
      const zb = b.type === 'carpet' || b.type === 'flowers' || b.type === 'puddle' ? 0 : 1;
      return za - zb;
    });

    return {
      roomGrid: rGrid,
      voidSet: vSet,
      wallSegments: segs,
      badges: computeRoomBadges(rooms, rows),
      visibleObjects: sortedObjs,
    };
  }, [rows, cols, rooms, objects, voidCells, twist, previewPatchId, showSolution, solution.correctPatchId]);

  const missingTwist: MissingPieceTwist | null =
    twist.kind === 'missing_piece' && !showSolution ? twist : null;

  const objectColors = (PAPER_PALETTES[murdokuCase.paperTheme] ?? PAPER_PALETTES.lilac).objectColors;
  const tintRoles = Object.keys(objectColors) as ObjectTintRole[];
  const filterPrefix = `tint-${murdokuCase.id}-${showSolution ? 'sol' : 'map'}`;

  return (
    <svg
      className="floorplan-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={murdokuCase.title[lang]}
    >
      <defs>
        {rooms.map((rm) => (
          <pattern
            key={rm.id}
            id={`tex-${murdokuCase.id}-${showSolution ? 'sol' : 'map'}-${rm.id}`}
            patternUnits="userSpaceOnUse"
            width={CELL}
            height={CELL}
          >
            <rect width={CELL} height={CELL} fill={rm.floorColor} />
            <image
              href={getFloorTexturePath(rm.texture)}
              width={CELL}
              height={CELL}
              opacity="0.34"
              preserveAspectRatio="none"
            />
          </pattern>
        ))}
        {tintRoles.map((role) => (
          <filter
            key={role}
            id={`${filterPrefix}-${role}`}
            colorInterpolationFilters="sRGB"
          >
            <feColorMatrix type="matrix" values={hexToTintMatrix(objectColors[role])} />
          </filter>
        ))}
      </defs>

      {/* 1. Room Floor Cells with Real Pastel-Tinted Textures */}
      {rooms.map((rm) =>
        rm.cells.map((cell) => {
          if (voidSet.has(`${cell.r},${cell.c}`)) return null;
          return (
            <rect
              key={`${rm.id}-${cell.r}-${cell.c}`}
              x={PAD + cell.c * CELL}
              y={PAD + cell.r * CELL}
              width={CELL}
              height={CELL}
              fill={`url(#tex-${murdokuCase.id}-${showSolution ? 'sol' : 'map'}-${rm.id})`}
            />
          );
        })
      )}

      {/* 2. Thin Crisp Inner Cell Gridlines */}
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((__, c) => {
          if (!roomGrid[r][c]) return null;
          return (
            <rect
              key={`grid-${r}-${c}`}
              x={PAD + c * CELL}
              y={PAD + r * CELL}
              width={CELL}
              height={CELL}
              fill="none"
              stroke="rgba(36, 40, 48, 0.45)"
              strokeWidth="1"
            />
          );
        })
      )}

      {/* 3. Furniture & Autotiled Tables/Carpets — tinted to match the scene palette */}
      {visibleObjects.map((obj, idx) => {
        const isAutotile = (obj.type === 'table' || obj.type === 'carpet') && !!obj.tileIndex;
        const inset = isAutotile ? 0 : 4;
        const tintRole = getObjectTintRole(obj.type);
        return (
          <image
            key={`obj-${idx}-${obj.r}-${obj.c}-${obj.type}`}
            href={getObjectSvgHref(obj)}
            x={PAD + obj.c * CELL + inset}
            y={PAD + obj.r * CELL + inset}
            width={CELL - inset * 2}
            height={CELL - inset * 2}
            preserveAspectRatio="xMidYMid meet"
            filter={tintRole ? `url(#${filterPrefix}-${tintRole})` : undefined}
          />
        );
      })}

      {/* 4. Book 3 Missing Map Piece Cutout Overlay (when no patch preview selected) */}
      {missingTwist && !previewPatchId && (
        <g>
          <rect
            x={PAD + missingTwist.originC * CELL + 2}
            y={PAD + missingTwist.originR * CELL + 2}
            width={missingTwist.width * CELL - 4}
            height={missingTwist.height * CELL - 4}
            fill="#f7f4ec"
            stroke="#8a372a"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            rx="4"
          />
          <text
            x={PAD + (missingTwist.originC + missingTwist.width / 2) * CELL}
            y={PAD + (missingTwist.originR + missingTwist.height / 2) * CELL + 8}
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontWeight="800"
            fontSize="26"
            fill="#8a372a"
          >
            ?
          </text>
        </g>
      )}

      {/* 4b. Highlight frame when previewing a Missing Map Patch */}
      {missingTwist && previewPatchId && (
        <rect
          x={PAD + missingTwist.originC * CELL + 1.5}
          y={PAD + missingTwist.originR * CELL + 1.5}
          width={missingTwist.width * CELL - 3}
          height={missingTwist.height * CELL - 3}
          fill="none"
          stroke="#2563ab"
          strokeWidth="2.5"
          strokeDasharray="5 3"
          rx="2"
        />
      )}

      {/* 5. Thick Black Room & Exterior Walls */}
      <g stroke="#111114" strokeWidth="4.6" strokeLinecap="square">
        {wallSegments.map((s, idx) => (
          <line key={idx} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
        ))}
      </g>

      {/* 6. Official White Pill Room Name Badges sitting on bottom room walls */}
      {badges.map(({ room, cx, cy }) => {
        const label = room.name[lang].toUpperCase();
        const badgeW = Math.max(54, label.length * 7.6 + 18);
        const badgeH = 19;
        const clampedX = Math.max(PAD + badgeW / 2 + 2, Math.min(width - PAD - badgeW / 2 - 2, cx));
        const clampedY = Math.min(height - PAD - 2, cy);
        return (
          <g key={`badge-${room.id}`} transform={`translate(${clampedX}, ${clampedY})`}>
            <rect
              x={-badgeW / 2}
              y={-badgeH / 2}
              width={badgeW}
              height={badgeH}
              rx={badgeH / 2}
              fill="#ffffff"
              stroke="#111114"
              strokeWidth="1.6"
            />
            <text
              x={0}
              y={4.2}
              textAnchor="middle"
              fontFamily="var(--font-badge)"
              fontWeight="700"
              fontSize="11.5"
              letterSpacing="0.03em"
              fill="#111114"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* 7. Optional Solution Overlay (for Back-of-Book view) */}
      {showSolution &&
        Object.entries(solution.placements).map(([suspectId, pos]) => {
          const isVictim = suspectId === 'V';
          const isMurderer = suspectId === solution.murdererId;
          const cx = PAD + (pos.c + 0.5) * CELL;
          const cy = PAD + (pos.r + 0.5) * CELL;
          return (
            <g key={`sol-${suspectId}`}>
              <circle
                cx={cx}
                cy={cy}
                r={20}
                fill={isVictim ? '#d22c2c' : isMurderer ? '#1b1920' : '#ffffff'}
                stroke={isMurderer ? '#d22c2c' : '#1b1920'}
                strokeWidth={isMurderer ? 3 : 2}
              />
              <text
                x={cx}
                y={cy + 7}
                textAnchor="middle"
                fontFamily="var(--font-display)"
                fontWeight="800"
                fontSize="20"
                fill={isVictim || isMurderer ? '#ffffff' : '#18181b'}
              >
                {suspectId}
              </text>
            </g>
          );
        })}
    </svg>
  );
};

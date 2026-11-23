import React, { useMemo } from 'react';
import type { Lang, MapObject, MissingPieceTwist, MurdokuCase, RoomDef } from '../engine/types';
import type { FloorplanHintOverlay } from '../engine/hintVisualizer';
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

function computeRoomBadges(
  rooms: RoomDef[],
  rows: number,
  cellX: (c: number) => number,
  cellY: (r: number) => number
): RoomBadgePos[] {
  return rooms.map((room) => {
    let maxR = -1;
    for (const cell of room.cells) {
      if (cell.r > maxR) maxR = cell.r;
    }
    const bottomCols = room.cells
      .filter((c) => c.r === maxR)
      .map((c) => c.c)
      .sort((a, b) => a - b);

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

    const leftEdge = cellX(bestStart);
    const rightEdge = cellX(bestStart + bestLen - 1) + CELL;
    const cx = (leftEdge + rightEdge) / 2;
    const cy = cellY(maxR) + CELL - (maxR === rows - 1 ? 2 : 0);
    return { room, cx, cy };
  });
}

export interface FloorplanSVGProps {
  murdokuCase: MurdokuCase;
  lang: Lang;
  previewPatchId?: 'A' | 'B' | 'C' | 'D';
  showSolution?: boolean;
  showCoords?: boolean;
  hintOverlay?: FloorplanHintOverlay;
  instanceTag?: string;
}

export const FloorplanSVG: React.FC<FloorplanSVGProps> = ({
  murdokuCase,
  lang,
  previewPatchId,
  showSolution = false,
  showCoords = false,
  hintOverlay,
  instanceTag,
}) => {
  const { rows, cols, rooms, objects, voidCells = [], twist, solution } = murdokuCase;

  const isSplit = twist.kind === 'split_grids';
  const splitGap = isSplit ? 30 : 0;
  const topHeader = isSplit ? 24 : 0;
  const coordLeft = showCoords ? 22 : 0;
  const coordTop = showCoords ? 18 : 0;
  const colOffsetB = isSplit ? twist.grids[1].colOffset : cols;

  const cellX = (c: number) => PAD + coordLeft + c * CELL + (isSplit && c >= colOffsetB ? splitGap : 0);
  const cellY = (r: number) => PAD + topHeader + coordTop + r * CELL;

  const width = cols * CELL + PAD * 2 + splitGap + coordLeft;
  const height = rows * CELL + PAD * 2 + topHeader + coordTop;

  const effectivePatchId = showSolution
    ? solution.correctPatchId
    : hintOverlay?.revealPatchId ?? previewPatchId;

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

    const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rid = rGrid[r][c];
        if (!rid) continue;
        const x = cellX(c);
        const y = cellY(r);

        if (r === 0 || rGrid[r - 1][c] !== rid) {
          segs.push({ x1: x, y1: y, x2: x + CELL, y2: y });
        }
        if (r === rows - 1 || rGrid[r + 1][c] !== rid) {
          segs.push({ x1: x, y1: y + CELL, x2: x + CELL, y2: y + CELL });
        }
        if (c === 0 || rGrid[r][c - 1] !== rid || (isSplit && c === colOffsetB)) {
          segs.push({ x1: x, y1: y, x2: x, y2: y + CELL });
        }
        if (c === cols - 1 || rGrid[r][c + 1] !== rid || (isSplit && c === colOffsetB - 1)) {
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
      if (effectivePatchId) {
        const patch = twist.patches.find((p) => p.id === effectivePatchId);
        effObjs = patch ? base.concat(patch.objects) : base;
      } else {
        effObjs = base;
      }
    }

    const sortedObjs = effObjs.slice().sort((a, b) => {
      const za = a.type === 'carpet' || a.type === 'flowers' || a.type === 'puddle' ? 0 : 1;
      const zb = b.type === 'carpet' || b.type === 'flowers' || b.type === 'puddle' ? 0 : 1;
      return za - zb;
    });

    return {
      roomGrid: rGrid,
      voidSet: vSet,
      wallSegments: segs,
      badges: computeRoomBadges(rooms, rows, cellX, cellY),
      visibleObjects: sortedObjs,
    };
  }, [rows, cols, rooms, objects, voidCells, twist, effectivePatchId, isSplit, colOffsetB, showCoords]);

  const missingTwist: MissingPieceTwist | null =
    twist.kind === 'missing_piece' && !showSolution ? twist : null;

  const objectColors = (PAPER_PALETTES[murdokuCase.paperTheme] ?? PAPER_PALETTES.lilac).objectColors;
  const tintRoles = Object.keys(objectColors) as ObjectTintRole[];
  const tag = instanceTag ?? (showSolution ? 'sol' : hintOverlay ? 'hint' : 'map');
  const filterPrefix = `tint-${murdokuCase.id}-${tag}`;
  const arrowMarkerId = `hint-arrow-${murdokuCase.id}-${tag}`;
  const swapMarkerId = `hint-swap-${murdokuCase.id}-${tag}`;

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
            id={`tex-${murdokuCase.id}-${tag}-${rm.id}`}
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
        {hintOverlay && (
          <>
            <marker
              id={arrowMarkerId}
              viewBox="0 0 10 10"
              refX="7.5"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" fill="#b45309" />
            </marker>
            <marker
              id={swapMarkerId}
              viewBox="0 0 10 10"
              refX="7.5"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" fill="#6b46a8" />
            </marker>
          </>
        )}
      </defs>

      {/* Volume 3 Split-Grid Header Banners */}
      {twist.kind === 'split_grids' &&
        twist.grids.map((g) => {
          const xStart = cellX(g.colOffset);
          const gWidth = g.cols * CELL;
          const cx = xStart + gWidth / 2;
          return (
            <g key={`subhdr-${g.id}`}>
              <text
                x={cx}
                y={PAD + 14}
                textAnchor="middle"
                fontFamily="var(--font-badge)"
                fontWeight="700"
                fontSize="13.5"
                letterSpacing="0.06em"
                fill="#1b1c22"
              >
                {g.name[lang].toUpperCase()} ({g.rows}×{g.cols})
              </text>
            </g>
          );
        })}

      {/* Optional Row / Column Coordinate Rulers (Hints & Official Solution) */}
      {showCoords && (
        <g
          fontFamily="var(--font-display)"
          fontWeight="700"
          fontSize="11"
          fill="#5c5966"
          textAnchor="middle"
        >
          {Array.from({ length: cols }).map((_, c) => {
            const colNum = isSplit && c >= colOffsetB ? c - colOffsetB + 1 : c + 1;
            return (
              <text key={`col-lbl-${c}`} x={cellX(c) + CELL / 2} y={PAD + topHeader + 12}>
                C{colNum}
              </text>
            );
          })}
          {Array.from({ length: rows }).map((_, r) => (
            <text
              key={`row-lbl-${r}`}
              x={PAD + coordLeft / 2 - 2}
              y={cellY(r) + CELL / 2 + 4}
            >
              R{r + 1}
            </text>
          ))}
        </g>
      )}

      {/* 1. Room Floor Cells with Real Pastel-Tinted Textures */}
      {rooms.map((rm) =>
        rm.cells.map((cell) => {
          if (voidSet.has(`${cell.r},${cell.c}`)) return null;
          const isHighlightedRoom = hintOverlay?.highlightRoomId === rm.id;
          return (
            <g key={`${rm.id}-${cell.r}-${cell.c}`}>
              <rect
                x={cellX(cell.c)}
                y={cellY(cell.r)}
                width={CELL}
                height={CELL}
                fill={`url(#tex-${murdokuCase.id}-${tag}-${rm.id})`}
              />
              {isHighlightedRoom && (
                <rect
                  x={cellX(cell.c)}
                  y={cellY(cell.r)}
                  width={CELL}
                  height={CELL}
                  fill={
                    hintOverlay?.highlightRoomTone === 'crime'
                      ? 'rgba(210, 44, 44, 0.22)'
                      : 'rgba(245, 184, 46, 0.28)'
                  }
                />
              )}
            </g>
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
              x={cellX(c)}
              y={cellY(r)}
              width={CELL}
              height={CELL}
              fill="none"
              stroke="rgba(36, 40, 48, 0.45)"
              strokeWidth="1"
            />
          );
        })
      )}

      {/* 3. Furniture & Autotiled Tables/Carpets */}
      {visibleObjects.map((obj, idx) => {
        const isAutotile = (obj.type === 'table' || obj.type === 'carpet') && !!obj.tileIndex;
        const inset = isAutotile ? 0 : 4;
        const tintRole = getObjectTintRole(obj.type);
        return (
          <image
            key={`obj-${idx}-${obj.r}-${obj.c}-${obj.type}`}
            href={getObjectSvgHref(obj)}
            x={cellX(obj.c) + inset}
            y={cellY(obj.r) + inset}
            width={CELL - inset * 2}
            height={CELL - inset * 2}
            preserveAspectRatio="xMidYMid meet"
            filter={tintRole ? `url(#${filterPrefix}-${tintRole})` : undefined}
          />
        );
      })}

      {/* 4. Book 3 Missing Map Piece Cutout Overlay */}
      {missingTwist && !effectivePatchId && (
        <g>
          <rect
            x={cellX(missingTwist.originC) + 2}
            y={cellY(missingTwist.originR) + 2}
            width={missingTwist.width * CELL - 4}
            height={missingTwist.height * CELL - 4}
            fill="#f7f4ec"
            stroke="#8a372a"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            rx="4"
          />
          <text
            x={cellX(missingTwist.originC) + (missingTwist.width / 2) * CELL}
            y={cellY(missingTwist.originR) + (missingTwist.height / 2) * CELL + 8}
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

      {missingTwist && effectivePatchId && (
        <g>
          <rect
            x={cellX(missingTwist.originC) + 1.5}
            y={cellY(missingTwist.originR) + 1.5}
            width={missingTwist.width * CELL - 3}
            height={missingTwist.height * CELL - 3}
            fill="none"
            stroke={hintOverlay?.revealPatchId ? '#2b7a4b' : '#2563ab'}
            strokeWidth="2.8"
            strokeDasharray="5 3"
            rx="2"
          />
          {hintOverlay?.revealPatchId && (
            <g
              transform={`translate(${cellX(missingTwist.originC) + (missingTwist.width / 2) * CELL}, ${
                cellY(missingTwist.originR) + 12
              })`}
            >
              <rect x="-34" y="-9" width="68" height="18" rx="9" fill="#2b7a4b" />
              <text
                x="0"
                y="4"
                textAnchor="middle"
                fontFamily="var(--font-display)"
                fontWeight="800"
                fontSize="10.5"
                fill="#ffffff"
              >
                ✓ {hintOverlay.revealPatchId}
              </text>
            </g>
          )}
        </g>
      )}

      {/* 5. Thick Black Room & Exterior Walls */}
      <g stroke="#111114" strokeWidth="4.6" strokeLinecap="square">
        {wallSegments.map((s, idx) => (
          <line key={idx} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
        ))}
      </g>

      {/* 6. Official White Pill Room Name Badges */}
      {badges.map(({ room, cx, cy }) => {
        const label = room.name[lang].toUpperCase();
        const badgeW = Math.max(54, label.length * 7.4 + 16);
        const badgeH = 19;
        const clampedX = Math.max(
          PAD + coordLeft + badgeW / 2 + 2,
          Math.min(width - PAD - badgeW / 2 - 2, cx)
        );
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
              fontSize="11.2"
              letterSpacing="0.03em"
              fill="#111114"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* 7. Progressive Visual Hint Overlay (Back-of-Book Step-by-Step Walkthrough) */}
      {hintOverlay && !showSolution && (
        <g>
          {/* 7a. Subtle X marks for rows/cols already ruled out in earlier steps */}
          {hintOverlay.priorEliminatedCells.length > 0 && (
            <g stroke="#4a5063" strokeWidth="2.6" strokeLinecap="round" opacity="0.34">
              {hintOverlay.priorEliminatedCells.map((cell) => {
                const x = cellX(cell.c);
                const y = cellY(cell.r);
                return (
                  <g key={`pelim-${cell.r}-${cell.c}`}>
                    <line x1={x + 21} y1={y + 21} x2={x + CELL - 21} y2={y + CELL - 21} />
                    <line x1={x + CELL - 21} y1={y + 21} x2={x + 21} y2={y + CELL - 21} />
                  </g>
                );
              })}
            </g>
          )}

          {/* 7b. Crisp Rules-style Blue X marks along newly eliminated Row */}
          {hintOverlay.activeRowEliminatedCells.length > 0 && (
            <g stroke="#245ca8" strokeWidth="3.6" strokeLinecap="round" opacity="0.86">
              {hintOverlay.activeRowEliminatedCells.map((cell) => {
                const x = cellX(cell.c);
                const y = cellY(cell.r);
                return (
                  <g key={`relim-${cell.r}-${cell.c}`}>
                    <line x1={x + 19} y1={y + 19} x2={x + CELL - 19} y2={y + CELL - 19} />
                    <line x1={x + CELL - 19} y1={y + 19} x2={x + 19} y2={y + CELL - 19} />
                  </g>
                );
              })}
            </g>
          )}

          {/* 7c. Crisp Rules-style Purple X marks along newly eliminated Column */}
          {hintOverlay.activeColEliminatedCells.length > 0 && (
            <g stroke="#6b46a8" strokeWidth="3.6" strokeLinecap="round" opacity="0.86">
              {hintOverlay.activeColEliminatedCells.map((cell) => {
                const x = cellX(cell.c);
                const y = cellY(cell.r);
                return (
                  <g key={`celim-${cell.r}-${cell.c}`}>
                    <line x1={x + 19} y1={y + 19} x2={x + CELL - 19} y2={y + CELL - 19} />
                    <line x1={x + CELL - 19} y1={y + 19} x2={x + 19} y2={y + CELL - 19} />
                  </g>
                );
              })}
            </g>
          )}

          {/* 7d. Highlight frame around the active step's deduced cell */}
          {hintOverlay.highlightCell && (
            <rect
              x={cellX(hintOverlay.highlightCell.c) + 3}
              y={cellY(hintOverlay.highlightCell.r) + 3}
              width={CELL - 6}
              height={CELL - 6}
              rx="8"
              fill={
                hintOverlay.highlightRoomTone === 'crime'
                  ? 'rgba(210, 44, 44, 0.16)'
                  : 'rgba(245, 184, 46, 0.28)'
              }
              stroke={hintOverlay.highlightRoomTone === 'crime' ? '#c82323' : '#d97706'}
              strokeWidth="3.2"
            />
          )}

          {/* 7e. Dashed Clue-Link / Time-Swap Arrows between referenced suspects */}
          {hintOverlay.arrows.map((arrow, idx) => {
            const x1 = cellX(arrow.from.c) + CELL / 2;
            const y1 = cellY(arrow.from.r) + CELL / 2;
            const x2 = cellX(arrow.to.c) + CELL / 2;
            const y2 = cellY(arrow.to.r) + CELL / 2;
            const dx = x2 - x1;
            const dy = y2 - y1;
            const dist = Math.hypot(dx, dy);
            if (dist < 1) return null;
            const padStart = 21;
            const padEnd = 24;
            const sx = x1 + (dx / dist) * padStart;
            const sy = y1 + (dy / dist) * padStart;
            const ex = x2 - (dx / dist) * Math.min(padEnd, dist * 0.45);
            const ey = y2 - (dy / dist) * Math.min(padEnd, dist * 0.45);
            const isSwap = arrow.variant === 'swap';
            return (
              <line
                key={`arrow-${idx}`}
                x1={sx}
                y1={sy}
                x2={ex}
                y2={ey}
                stroke={isSwap ? '#6b46a8' : '#b45309'}
                strokeWidth="3"
                strokeDasharray="6 4"
                strokeLinecap="round"
                markerEnd={`url(#${isSwap ? swapMarkerId : arrowMarkerId})`}
                markerStart={isSwap ? `url(#${swapMarkerId})` : undefined}
              />
            );
          })}

          {/* 7f. Progressive Suspect Tokens (Prior -> Active -> Victim/Murderer) */}
          {hintOverlay.placements.map((p) => {
            const cx = cellX(p.coord.c) + CELL / 2;
            const cy = cellY(p.coord.r) + CELL / 2;
            const isVictim = p.variant === 'victim';
            const isMurderer = p.variant === 'murderer';
            const isActive = p.variant === 'active';
            const fill = isVictim
              ? '#d22c2c'
              : isMurderer
                ? '#1b1920'
                : isActive
                  ? '#f5b82e'
                  : '#ffffff';
            const stroke = isMurderer
              ? '#d22c2c'
              : isActive
                ? '#1b1920'
                : '#1b1920';
            const textColor = isVictim || isMurderer ? '#ffffff' : '#18181b';
            return (
              <g key={`hint-tok-${p.suspectId}`}>
                {(isActive || isVictim || isMurderer) && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={25}
                    fill="none"
                    stroke={isVictim || isMurderer ? 'rgba(210, 44, 44, 0.55)' : 'rgba(217, 119, 6, 0.65)'}
                    strokeWidth="3"
                    strokeDasharray="4 3"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isActive || isVictim || isMurderer ? 20.5 : 18.5}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isMurderer || isActive ? 3 : 2}
                />
                <text
                  x={cx}
                  y={cy + 7}
                  textAnchor="middle"
                  fontFamily="var(--font-display)"
                  fontWeight="800"
                  fontSize={isActive || isVictim || isMurderer ? '20' : '18.5'}
                  fill={textColor}
                >
                  {p.suspectId}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {/* 8. Optional Solution Overlay (for Back-of-Book Official Solution view) */}
      {showSolution &&
        Object.entries(solution.placements).map(([suspectId, pos]) => {
          const isVictim = suspectId === 'V';
          const isMurderer = suspectId === solution.murdererId;
          const cx = cellX(pos.c) + CELL / 2;
          const cy = cellY(pos.r) + CELL / 2;
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

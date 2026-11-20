import React, { useMemo, useState } from 'react';
import type { Lang, MapObject, MurdokuCase } from '../engine/types';
import { OBJECT_CATALOG } from '../data/assets';
import { getAutotileSvgPath } from '../engine/autotile';
import { UI_STRINGS } from '../data/i18n';
import { IconClose, IconEraser } from './Icons';

const CELL = 38;
const PAD = 4;

function getWorkingGridObjHref(obj: MapObject): string {
  if ((obj.type === 'table' || obj.type === 'carpet') && obj.tileIndex) {
    return getAutotileSvgPath(obj.type, obj.tileIndex);
  }
  return OBJECT_CATALOG[obj.type]?.svgPath ?? '/assets/objects/obj_box.svg';
}

export interface TornWorkingGridProps {
  murdokuCase: MurdokuCase;
  lang?: Lang;
  /** Book 2/3 optional aid: grey out blocked furniture squares with actual asset outlines */
  showObstacleAid: boolean;
  /** Optional Stamp Grid mode for finger/mouse users */
  tapAssistEnabled: boolean;
  tapMarks: Record<string, string>;
  onUpdateTapMark: (cellKey: string, mark: string | null) => void;
  /** Preview patch id for Missing Map Piece twist */
  previewPatchId?: 'A' | 'B' | 'C' | 'D';
}

export const TornWorkingGrid: React.FC<TornWorkingGridProps> = ({
  murdokuCase,
  lang = 'en',
  showObstacleAid,
  tapAssistEnabled,
  tapMarks,
  onUpdateTapMark,
  previewPatchId,
}) => {
  const { rows, cols, rooms, objects, voidCells = [], twist, suspects } = murdokuCase;
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const t = UI_STRINGS[lang];

  const isSplit = twist.kind === 'split_grids';
  const splitGap = isSplit ? 16 : 0;
  const topHeader = isSplit ? 14 : 0;
  const colOffsetB = isSplit ? twist.grids[1].colOffset : cols;
  const cellX = (c: number) => PAD + c * CELL + (isSplit && c >= colOffsetB ? splitGap : 0);
  const cellY = (r: number) => PAD + topHeader + r * CELL;

  const width = cols * CELL + PAD * 2 + splitGap;
  const height = rows * CELL + PAD * 2 + topHeader;
  const outlineFilterId = `aid-outline-${murdokuCase.id}`;

  const { roomGrid, blockedObjsByCell, wallSegments } = useMemo(() => {
    const vSet = new Set(voidCells.map((v) => `${v.r},${v.c}`));
    const rGrid: (string | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
    for (const rm of rooms) {
      for (const c of rm.cells) {
        if (!vSet.has(`${c.r},${c.c}`)) rGrid[c.r][c.c] = rm.id;
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
      if (previewPatchId) {
        const patch = twist.patches.find((p) => p.id === previewPatchId);
        effObjs = patch ? base.concat(patch.objects) : base;
      } else {
        effObjs = base;
      }
    }

    const bMap = new Map<string, MapObject[]>();
    for (const o of effObjs) {
      if (!o.walkable) {
        const key = `${o.r},${o.c}`;
        const list = bMap.get(key) ?? [];
        list.push(o);
        bMap.set(key, list);
      }
    }

    const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rid = rGrid[r][c];
        if (!rid) continue;
        const x = cellX(c);
        const y = cellY(r);
        if (r === 0 || rGrid[r - 1][c] !== rid) segs.push({ x1: x, y1: y, x2: x + CELL, y2: y });
        if (r === rows - 1 || rGrid[r + 1][c] !== rid) segs.push({ x1: x, y1: y + CELL, x2: x + CELL, y2: y + CELL });
        if (c === 0 || rGrid[r][c - 1] !== rid || (isSplit && c === colOffsetB)) segs.push({ x1: x, y1: y, x2: x, y2: y + CELL });
        if (c === cols - 1 || rGrid[r][c + 1] !== rid || (isSplit && c === colOffsetB - 1)) segs.push({ x1: x + CELL, y1: y, x2: x + CELL, y2: y + CELL });
      }
    }

    return { roomGrid: rGrid, blockedObjsByCell: bMap, wallSegments: segs };
  }, [rows, cols, rooms, objects, voidCells, twist, previewPatchId, isSplit, colOffsetB]);

  const handleCellClick = (r: number, c: number) => {
    if (!tapAssistEnabled) return;
    const key = `${r},${c}`;
    setActiveCell((prev) => (prev === key ? null : key));
  };

  return (
    <div className="torn-grid-wrap">
      {tapAssistEnabled && !activeCell && (
        <div className="tap-grid-banner" role="status">
          {t.tapGridHint}
        </div>
      )}

      {tapAssistEnabled && activeCell && (
        <div className="tap-picker" role="menu">
          <button
            type="button"
            className="tap-picker__x"
            onClick={() => {
              onUpdateTapMark(activeCell, tapMarks[activeCell] === 'X' ? null : 'X');
              setActiveCell(null);
            }}
            aria-label="Mark empty"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <IconClose size={13} />
          </button>
          {suspects.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onUpdateTapMark(activeCell, s.id);
                setActiveCell(null);
              }}
            >
              {s.id}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onUpdateTapMark(activeCell, null);
              setActiveCell(null);
            }}
            aria-label="Clear cell"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <IconEraser size={13} />
          </button>
        </div>
      )}

      <div className={`torn-grid-shell ${tapAssistEnabled ? 'torn-grid-shell--tap-active' : ''}`}>
        <svg className="working-grid-svg" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            {/* Extracts crisp monochrome line-art outlines from the actual board object SVGs */}
            <filter id={outlineFilterId} colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  -1.4 -1.4 -1.4 1.1 0"
                result="linesOnly"
              />
              <feFlood floodColor="#697182" floodOpacity="0.72" result="ink" />
              <feComposite in="ink" in2="linesOnly" operator="in" />
            </filter>
          </defs>

          {twist.kind === 'split_grids' &&
            twist.grids.map((g) => (
              <text
                key={`wg-hdr-${g.id}`}
                x={cellX(g.colOffset) + (g.cols * CELL) / 2}
                y={PAD + 9}
                textAnchor="middle"
                fontFamily="var(--font-display)"
                fontWeight="700"
                fontSize="9"
                fill="#6b707c"
              >
                {g.name[lang].toUpperCase()}
              </text>
            ))}

          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((__, c) => {
              if (!roomGrid[r][c]) return null;
              const key = `${r},${c}`;
              const blockedObjs = blockedObjsByCell.get(key);
              const isBlocked = !!blockedObjs && blockedObjs.length > 0;
              const mark = tapMarks[key];
              const x = cellX(c);
              const y = cellY(r);

              return (
                <g key={key} onClick={() => handleCellClick(r, c)}>
                  <rect
                    x={x}
                    y={y}
                    width={CELL}
                    height={CELL}
                    fill={showObstacleAid && isBlocked ? '#e4e7ef' : '#ffffff'}
                    stroke="#dcdfe6"
                    strokeWidth="1"
                    className={
                      tapAssistEnabled ? 'working-grid-cell working-grid-cell--interactive' : 'working-grid-cell'
                    }
                  />
                  {showObstacleAid &&
                    isBlocked &&
                    blockedObjs.map((obj, oIdx) => {
                      const isAutotile = (obj.type === 'table' || obj.type === 'carpet') && !!obj.tileIndex;
                      const inset = isAutotile ? 0 : 3;
                      return (
                        <image
                          key={`${key}-aid-${oIdx}-${obj.type}`}
                          href={getWorkingGridObjHref(obj)}
                          x={x + inset}
                          y={y + inset}
                          width={CELL - inset * 2}
                          height={CELL - inset * 2}
                          preserveAspectRatio="xMidYMid meet"
                          filter={`url(#${outlineFilterId})`}
                          pointerEvents="none"
                        />
                      );
                    })}
                  {activeCell === key && (
                    <rect
                      x={x + 1}
                      y={y + 1}
                      width={CELL - 2}
                      height={CELL - 2}
                      fill="rgba(37, 99, 171, 0.1)"
                      stroke="#2563ab"
                      strokeWidth="1.5"
                    />
                  )}
                  {mark === 'X' && (
                    <g stroke="#b84242" strokeWidth="2" strokeLinecap="round" opacity="0.72">
                      <line x1={x + 10} y1={y + 10} x2={x + CELL - 10} y2={y + CELL - 10} />
                      <line x1={x + CELL - 10} y1={y + 10} x2={x + 10} y2={y + CELL - 10} />
                    </g>
                  )}
                  {mark && mark !== 'X' && (
                    <text
                      x={x + CELL / 2}
                      y={y + CELL / 2 + 6}
                      textAnchor="middle"
                      fontFamily="var(--font-display)"
                      fontWeight="800"
                      fontSize="17"
                      fill={mark === 'V' ? '#c63636' : '#254a8a'}
                    >
                      {mark}
                    </text>
                  )}
                </g>
              );
            })
          )}

          {/* Room boundary lines in soft printed graphite gray */}
          <g stroke="#bfc4ce" strokeWidth="2.2" strokeLinecap="square" pointerEvents="none">
            {wallSegments.map((s, idx) => (
              <line key={idx} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
};

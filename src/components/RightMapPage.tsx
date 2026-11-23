import React from 'react';
import type { Lang, MapObject, MissingPieceTwist, MurdokuCase } from '../engine/types';
import {
  getObjectTintRole,
  hexToTintMatrix,
  OBJECT_CATALOG,
  PAPER_PALETTES,
  type ObjectTintRole,
} from '../data/assets';
import { getAutotileSvgPath } from '../engine/autotile';
import { UI_STRINGS } from '../data/i18n';
import { FloorplanSVG } from './FloorplanSVG';
import { TornWorkingGrid } from './TornWorkingGrid';

function patchObjHref(obj: MapObject): string {
  if ((obj.type === 'table' || obj.type === 'carpet') && obj.tileIndex) {
    return getAutotileSvgPath(obj.type, obj.tileIndex);
  }
  return OBJECT_CATALOG[obj.type]?.svgPath ?? '/assets/objects/obj_box.svg';
}

const MissingPatchesStrip: React.FC<{
  twist: MissingPieceTwist;
  paperTheme: MurdokuCase['paperTheme'];
  caseId: string;
  lang: Lang;
  selectedPatchId?: 'A' | 'B' | 'C' | 'D';
  onSelectPatch: (id: 'A' | 'B' | 'C' | 'D') => void;
}> = ({ twist, paperTheme, caseId, lang, selectedPatchId, onSelectPatch }) => {
  const t = UI_STRINGS[lang];
  const cell = 32;
  const objectColors = (PAPER_PALETTES[paperTheme] ?? PAPER_PALETTES.lilac).objectColors;
  const tintRoles = Object.keys(objectColors) as ObjectTintRole[];

  return (
    <div className="patches-strip">
      <div className="patches-strip__title">{t.missingPatchesLabel}</div>
      <div className="patches-grid">
        {twist.patches.map((patch) => {
          const isSel = selectedPatchId === patch.id;
          return (
            <button
              key={patch.id}
              type="button"
              className={`patch-option ${isSel ? 'selected' : ''}`}
              onClick={() => onSelectPatch(patch.id)}
            >
              <svg
                width={twist.width * cell}
                height={twist.height * cell}
                viewBox={`0 0 ${twist.width * cell} ${twist.height * cell}`}
                style={{ maxWidth: '100%', height: 'auto' }}
              >
                <defs>
                  {tintRoles.map((role) => (
                    <filter
                      key={role}
                      id={`patch-tint-${caseId}-${patch.id}-${role}`}
                      colorInterpolationFilters="sRGB"
                    >
                      <feColorMatrix type="matrix" values={hexToTintMatrix(objectColors[role])} />
                    </filter>
                  ))}
                </defs>
                {Array.from({ length: twist.height }).map((_, dr) =>
                  Array.from({ length: twist.width }).map((__, dc) => (
                    <rect
                      key={`${dr}-${dc}`}
                      x={dc * cell}
                      y={dr * cell}
                      width={cell}
                      height={cell}
                      fill="#eef4f8"
                      stroke="#5a606c"
                      strokeWidth="1"
                    />
                  ))
                )}
                {patch.objects.map((o, idx) => {
                  const role = getObjectTintRole(o.type);
                  return (
                    <image
                      key={idx}
                      href={patchObjHref(o)}
                      x={(o.c - twist.originC) * cell + 2}
                      y={(o.r - twist.originR) * cell + 2}
                      width={cell - 4}
                      height={cell - 4}
                      filter={role ? `url(#patch-tint-${caseId}-${patch.id}-${role})` : undefined}
                    />
                  );
                })}
              </svg>
              <span className="patch-option__label">{patch.id}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const REGIONAL_STAMP_OBJECTS = new Set([
  'horse', 'boat', 'rowboat', 'car', 'golf_cart', 'elephant', 'lion', 'bear', 'penguin',
  'shark', 'crocodile', 'boar', 'catapult', 'statue', 'cactus', 'bonsai', 'palmtree',
  'flowers', 'lily_pad', 'puddle', 'bed', 'carpet',
]);

/** Volume 3 Occupancy Stamps: visual tile guides removing walkability ambiguity */
const OccupancyStampsStrip: React.FC<{ murdokuCase: MurdokuCase; lang: Lang }> = ({
  murdokuCase,
  lang,
}) => {
  const t = UI_STRINGS[lang];
  const overrideSet = new Set(murdokuCase.walkableOverrides ?? []);
  const seen = new Map<string, boolean>();

  for (const obj of murdokuCase.objects) {
    if (seen.has(obj.type)) continue;
    if (overrideSet.has(obj.type) || REGIONAL_STAMP_OBJECTS.has(obj.type)) {
      seen.set(obj.type, obj.walkable);
    }
  }

  // Only show strip if case is Vol 2/3, has overrides, or has >= 2 regional/special objects
  const entries = Array.from(seen.entries())
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 5);

  if (entries.length === 0) return null;
  if (
    murdokuCase.edition !== 'vol2' &&
    murdokuCase.edition !== 'vol3' &&
    overrideSet.size === 0 &&
    entries.length < 2
  ) {
    return null;
  }

  const objectColors = (PAPER_PALETTES[murdokuCase.paperTheme] ?? PAPER_PALETTES.lilac).objectColors;

  return (
    <div className="occupancy-stamps" aria-label="Occupancy stamps">
      {entries.map(([objType, walkable]) => {
        const meta = OBJECT_CATALOG[objType];
        if (!meta) return null;
        const role = getObjectTintRole(objType);
        const fid = `stamp-${murdokuCase.id}-${objType}`;
        return (
          <span
            key={objType}
            className={`occ-stamp ${walkable ? 'occ-stamp--can' : 'occ-stamp--cannot'}`}
            title={walkable ? t.occupancyCan : t.occupancyCannot}
          >
            <svg width="20" height="20" viewBox="0 0 64 64" aria-hidden="true">
              {role && (
                <defs>
                  <filter id={fid} colorInterpolationFilters="sRGB">
                    <feColorMatrix type="matrix" values={hexToTintMatrix(objectColors[role])} />
                  </filter>
                </defs>
              )}
              <image
                href={meta.svgPath}
                x="4"
                y="4"
                width="56"
                height="56"
                filter={role ? `url(#${fid})` : undefined}
              />
            </svg>
            <span className="occ-stamp__tile" aria-hidden="true">
              {walkable ? '✓' : '✕'}
            </span>
          </span>
        );
      })}
    </div>
  );
};

export interface RightMapPageProps {
  murdokuCase: MurdokuCase;
  lang: Lang;
  solved: boolean;
  showObstacleAid: boolean;
  tapAssistEnabled: boolean;
  tapMarks: Record<string, string>;
  selectedPatchId?: 'A' | 'B' | 'C' | 'D';
  onUpdateTapMark: (cellKey: string, mark: string | null) => void;
  onSelectPatch: (id: 'A' | 'B' | 'C' | 'D') => void;
  onOpenVerdict: () => void;
}

export const RightMapPage: React.FC<RightMapPageProps> = ({
  murdokuCase,
  lang,
  solved,
  showObstacleAid,
  tapAssistEnabled,
  tapMarks,
  selectedPatchId,
  onUpdateTapMark,
  onSelectPatch,
  onOpenVerdict,
}) => {
  const t = UI_STRINGS[lang];
  const killerName =
    murdokuCase.suspects.find((s) => s.id === murdokuCase.solution.murdererId)?.name ?? '';

  return (
    <>
      <div
        className={`floorplan-wrap ${
          murdokuCase.twist.kind === 'missing_piece' ? 'floorplan-wrap--with-patches' : ''
        }`}
      >
        <FloorplanSVG
          murdokuCase={murdokuCase}
          lang={lang}
          previewPatchId={selectedPatchId}
        />

        <OccupancyStampsStrip murdokuCase={murdokuCase} lang={lang} />

        {murdokuCase.twist.kind === 'missing_piece' && (
          <MissingPatchesStrip
            twist={murdokuCase.twist}
            paperTheme={murdokuCase.paperTheme}
            caseId={murdokuCase.id}
            lang={lang}
            selectedPatchId={selectedPatchId}
            onSelectPatch={onSelectPatch}
          />
        )}
      </div>

      <div className="right-bottom">
        <TornWorkingGrid
          murdokuCase={murdokuCase}
          lang={lang}
          showObstacleAid={showObstacleAid}
          tapAssistEnabled={tapAssistEnabled}
          tapMarks={tapMarks}
          onUpdateTapMark={onUpdateTapMark}
          previewPatchId={selectedPatchId}
        />

        <button
          type="button"
          className="verdict-slip verdict-cta-btn"
          onClick={onOpenVerdict}
          aria-label={t.accuseTitle}
        >
          <span className="verdict-slip__label">{t.theMurdererIs}</span>
          {solved && <div className="verdict-slip__solved">{killerName}</div>}
          <div className="verdict-slip__line" />
        </button>
      </div>

      <span className="page-number page-number--right">{murdokuCase.pageRight}</span>
    </>
  );
};

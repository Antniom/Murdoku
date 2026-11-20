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
      <div className="floorplan-wrap">
        <FloorplanSVG
          murdokuCase={murdokuCase}
          lang={lang}
          previewPatchId={selectedPatchId}
        />

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
          className="verdict-slip"
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

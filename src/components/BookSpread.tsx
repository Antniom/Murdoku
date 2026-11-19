import React from 'react';
import type { Lang, MurdokuCase } from '../engine/types';
import type { InkStroke } from '../services/inkStorage';
import { PAPER_PALETTES } from '../data/assets';
import { UI_STRINGS } from '../data/i18n';
import { LeftCasePage } from './LeftCasePage';
import { RightMapPage } from './RightMapPage';
import { PencilCanvasLayer, type PencilSettings } from './PencilCanvasLayer';

export interface BookSpreadProps {
  murdokuCase: MurdokuCase;
  lang: Lang;
  mobilePage: 'left' | 'right';
  solved: boolean;
  strokes: InkStroke[];
  pencilSettings: PencilSettings;
  showObstacleAid: boolean;
  tapAssistEnabled: boolean;
  tapMarks: Record<string, string>;
  selectedPatchId?: 'A' | 'B' | 'C' | 'D';
  onAddStroke: (stroke: InkStroke) => void;
  onEraseStrokeIds: (ids: string[]) => void;
  onPenDetected: () => void;
  onUpdateTapMark: (cellKey: string, mark: string | null) => void;
  onSelectPatch: (id: 'A' | 'B' | 'C' | 'D') => void;
  onOpenVerdict: () => void;
}

export const BookSpread: React.FC<BookSpreadProps> = ({
  murdokuCase,
  lang,
  mobilePage,
  solved,
  strokes,
  pencilSettings,
  showObstacleAid,
  tapAssistEnabled,
  tapMarks,
  selectedPatchId,
  onAddStroke,
  onEraseStrokeIds,
  onPenDetected,
  onUpdateTapMark,
  onSelectPatch,
  onOpenVerdict,
}) => {
  const palette = PAPER_PALETTES[murdokuCase.paperTheme] ?? PAPER_PALETTES.lilac;
  const t = UI_STRINGS[lang];

  const handleAutoDetectPen = (e: React.PointerEvent) => {
    if (e.pointerType === 'pen') {
      onPenDetected();
    }
  };

  return (
    <main
      className="book-spread"
      data-mobile-page={mobilePage}
      style={{
        ['--page-bg' as string]: palette.pageBg,
        ['--page-edge' as string]: palette.pageEdge,
        ['--gutter-shadow' as string]: palette.gutterShadow,
      }}
      onPointerDownCapture={handleAutoDetectPen}
    >
      <div className="book-gutter" aria-hidden="true" />

      <section className="book-page book-page--left">
        <LeftCasePage
          murdokuCase={murdokuCase}
          lang={lang}
          solved={solved}
          solvedLabel={t.solvedStamp}
        />
        <PencilCanvasLayer
          page="left"
          strokes={strokes}
          settings={pencilSettings}
          onAddStroke={onAddStroke}
          onEraseStrokeIds={onEraseStrokeIds}
          onPenDetected={onPenDetected}
        />
      </section>

      <section className="book-page book-page--right">
        <RightMapPage
          murdokuCase={murdokuCase}
          lang={lang}
          solved={solved}
          showObstacleAid={showObstacleAid}
          tapAssistEnabled={tapAssistEnabled}
          tapMarks={tapMarks}
          selectedPatchId={selectedPatchId}
          onUpdateTapMark={onUpdateTapMark}
          onSelectPatch={onSelectPatch}
          onOpenVerdict={onOpenVerdict}
        />
        <PencilCanvasLayer
          page="right"
          strokes={strokes}
          settings={pencilSettings}
          onAddStroke={onAddStroke}
          onEraseStrokeIds={onEraseStrokeIds}
          onPenDetected={onPenDetected}
        />
      </section>
    </main>
  );
};

import React, { useRef } from 'react';
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
  onStrokeStart: () => void;
  onToggleEraser: () => void;
  onGestureUndo: () => void;
  onGestureRedo: () => void;
  onUpdateTapMark: (cellKey: string, mark: string | null) => void;
  onSelectPatch: (id: 'A' | 'B' | 'C' | 'D') => void;
  onOpenVerdict: () => void;
}

export const BookSpread: React.FC<BookSpreadProps> = ({
  murdokuCase,
  lang,
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
  onStrokeStart,
  onToggleEraser,
  onGestureUndo,
  onGestureRedo,
  onUpdateTapMark,
  onSelectPatch,
  onOpenVerdict,
}) => {
  const palette = PAPER_PALETTES[murdokuCase.paperTheme] ?? PAPER_PALETTES.lilac;
  const t = UI_STRINGS[lang];

  // iPadOS-style 2-finger tap (Undo) and 3-finger tap (Redo) gesture tracking
  const multiTapRef = useRef<{
    startTime: number;
    maxFingers: number;
    moved: boolean;
    starts: Map<number, { x: number; y: number }>;
  } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Ignore stylus touches for multi-finger tap gestures
    const directTouches = Array.from(e.touches).filter(
      (touch) => (touch as unknown as { touchType?: string }).touchType !== 'stylus'
    );
    if (directTouches.length < 2) {
      if (directTouches.length === 1 && !multiTapRef.current) {
        const starts = new Map<number, { x: number; y: number }>();
        starts.set(directTouches[0].identifier, {
          x: directTouches[0].clientX,
          y: directTouches[0].clientY,
        });
        multiTapRef.current = {
          startTime: Date.now(),
          maxFingers: 1,
          moved: false,
          starts,
        };
      }
      return;
    }

    const state = multiTapRef.current ?? {
      startTime: Date.now(),
      maxFingers: directTouches.length,
      moved: false,
      starts: new Map<number, { x: number; y: number }>(),
    };
    state.maxFingers = Math.max(state.maxFingers, directTouches.length);
    for (const dt of directTouches) {
      if (!state.starts.has(dt.identifier)) {
        state.starts.set(dt.identifier, { x: dt.clientX, y: dt.clientY });
      }
    }
    multiTapRef.current = state;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const state = multiTapRef.current;
    if (!state || state.moved) return;
    for (const touch of Array.from(e.changedTouches)) {
      const origin = state.starts.get(touch.identifier);
      if (origin && Math.hypot(touch.clientX - origin.x, touch.clientY - origin.y) > 20) {
        state.moved = true;
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const state = multiTapRef.current;
    if (!state) return;
    if (e.touches.length > 0) return;

    const elapsed = Date.now() - state.startTime;
    multiTapRef.current = null;
    if (state.moved || elapsed > 340) return;

    if (state.maxFingers === 2) {
      onGestureUndo();
    } else if (state.maxFingers === 3) {
      onGestureRedo();
    }
  };

  return (
    <main
      className="book-spread"
      style={{
        ['--page-bg' as string]: palette.pageBg,
        ['--page-edge' as string]: palette.pageEdge,
        ['--gutter-shadow' as string]: palette.gutterShadow,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        multiTapRef.current = null;
      }}
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
          onStrokeStart={onStrokeStart}
          onToggleEraser={onToggleEraser}
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
          onStrokeStart={onStrokeStart}
          onToggleEraser={onToggleEraser}
        />
      </section>
    </main>
  );
};

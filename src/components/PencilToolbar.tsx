import React, { useState } from 'react';
import type { Lang } from '../engine/types';
import type { InkTool } from '../services/inkStorage';
import { UI_STRINGS } from '../data/i18n';
import type { PencilSettings } from './PencilCanvasLayer';
import {
  IconClose,
  IconEraser,
  IconHand,
  IconHighlighter,
  IconPencil,
  IconPenNib,
  IconRedo,
  IconStylus,
  IconTrash,
  IconUndo,
} from './Icons';

const SWATCHES = [
  { id: 'graphite', color: '#2b2c30', label: 'Graphite' },
  { id: 'black', color: '#111114', label: 'Ink' },
  { id: 'crimson', color: '#c93838', label: 'Crimson' },
  { id: 'blue', color: '#2563ab', label: 'Blue' },
  { id: 'gold', color: '#f3cf47', label: 'Highlighter Gold' },
  { id: 'emerald', color: '#247a52', label: 'Emerald' },
];

const SIZES = [1.8, 3.0, 4.8];

export interface PencilToolbarProps {
  lang: Lang;
  settings: PencilSettings;
  canUndo: boolean;
  canRedo: boolean;
  onChangeSettings: (next: PencilSettings) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearPage: (scope: 'left' | 'right' | 'both') => void;
}

export const PencilToolbar: React.FC<PencilToolbarProps> = ({
  lang,
  settings,
  canUndo,
  canRedo,
  onChangeSettings,
  onUndo,
  onRedo,
  onClearPage,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const t = UI_STRINGS[lang];

  if (collapsed) {
    return (
      <div className="pencil-dock pencil-dock--collapsed">
        <button
          type="button"
          className={`dock-btn ${settings.allowTouchAndMouseDraw ? 'active' : ''}`}
          onClick={() => setCollapsed(false)}
          title={t.pencilDock}
          aria-label={t.pencilDock}
        >
          <IconPencil size={14} />
          <span>{t.pencilDock}</span>
        </button>
      </div>
    );
  }

  const setTool = (tool: InkTool) => {
    const nextColor =
      tool === 'highlighter' && settings.color === '#2b2c30' ? '#f3cf47' : settings.color;
    onChangeSettings({
      ...settings,
      tool,
      color: nextColor,
      allowTouchAndMouseDraw: true,
    });
  };

  return (
    <div className="pencil-dock" role="toolbar" aria-label={t.pencilDock}>
      <button
        type="button"
        className={`dock-btn ${settings.allowTouchAndMouseDraw ? 'active' : ''}`}
        onClick={() =>
          onChangeSettings({
            ...settings,
            allowTouchAndMouseDraw: !settings.allowTouchAndMouseDraw,
          })
        }
        title={settings.allowTouchAndMouseDraw ? t.fingerDraw : t.penOnly}
      >
        {settings.allowTouchAndMouseDraw ? (
          <>
            <IconHand size={14} />
            <span>{t.fingerDraw}</span>
          </>
        ) : (
          <>
            <IconStylus size={14} />
            <span>{t.penOnly}</span>
          </>
        )}
      </button>

      <span className="dock-sep" />

      <button
        type="button"
        className={`dock-btn ${settings.tool === 'pencil' && settings.allowTouchAndMouseDraw ? 'active' : ''}`}
        onClick={() => setTool('pencil')}
      >
        <IconPencil size={14} />
        <span>{t.toolPencil}</span>
      </button>
      <button
        type="button"
        className={`dock-btn ${settings.tool === 'pen' && settings.allowTouchAndMouseDraw ? 'active' : ''}`}
        onClick={() => setTool('pen')}
      >
        <IconPenNib size={14} />
        <span>{t.toolPen}</span>
      </button>
      <button
        type="button"
        className={`dock-btn ${settings.tool === 'highlighter' && settings.allowTouchAndMouseDraw ? 'active' : ''}`}
        onClick={() => setTool('highlighter')}
      >
        <IconHighlighter size={14} />
        <span>{t.toolHighlighter}</span>
      </button>
      <button
        type="button"
        className={`dock-btn ${settings.tool === 'eraser' && settings.allowTouchAndMouseDraw ? 'active' : ''}`}
        onClick={() => setTool('eraser')}
      >
        <IconEraser size={14} />
        <span>{t.toolEraser}</span>
      </button>

      <span className="dock-sep" />

      <div className="swatch-row">
        {SWATCHES.map((sw) => (
          <button
            key={sw.id}
            type="button"
            className={`swatch-dot ${settings.color === sw.color ? 'active' : ''}`}
            style={{ backgroundColor: sw.color }}
            title={sw.label}
            aria-label={sw.label}
            onClick={() =>
              onChangeSettings({
                ...settings,
                color: sw.color,
                tool: settings.tool === 'eraser' ? 'pencil' : settings.tool,
                allowTouchAndMouseDraw: true,
              })
            }
          />
        ))}
      </div>

      <span className="dock-sep" />

      {SIZES.map((sz) => (
        <button
          key={sz}
          type="button"
          className={`size-dot ${settings.size === sz ? 'active' : ''}`}
          onClick={() => onChangeSettings({ ...settings, size: sz })}
          aria-label={`Stroke size ${sz}`}
        >
          <span style={{ width: `${sz * 2.4}px`, height: `${sz * 2.4}px` }} />
        </button>
      ))}

      <span className="dock-sep" />

      <button type="button" className="dock-btn" disabled={!canUndo} onClick={onUndo} title={t.undo} aria-label={t.undo}>
        <IconUndo size={15} />
      </button>
      <button type="button" className="dock-btn" disabled={!canRedo} onClick={onRedo} title={t.redo} aria-label={t.redo}>
        <IconRedo size={15} />
      </button>
      <button
        type="button"
        className="dock-btn"
        onClick={() => onClearPage('both')}
        title={t.clearSpread}
        aria-label={t.clearSpread}
      >
        <IconTrash size={14} />
      </button>

      <button
        type="button"
        className="dock-btn"
        onClick={() => setCollapsed(true)}
        title={t.close}
        aria-label={t.close}
      >
        <IconClose size={14} />
      </button>
    </div>
  );
};

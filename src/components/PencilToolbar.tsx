import React, { useState } from 'react';
import type { Lang } from '../engine/types';
import type { InkTool } from '../services/inkStorage';
import { UI_STRINGS } from '../data/i18n';
import type { PencilSettings } from './PencilCanvasLayer';

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
          ✏️ {t.pencilDock}
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
        {settings.allowTouchAndMouseDraw ? `✍️ ${t.fingerDraw}` : `👆 ${t.penOnly}`}
      </button>

      <span className="dock-sep" />

      <button
        type="button"
        className={`dock-btn ${settings.tool === 'pencil' && settings.allowTouchAndMouseDraw ? 'active' : ''}`}
        onClick={() => setTool('pencil')}
      >
        ✏️ {t.toolPencil}
      </button>
      <button
        type="button"
        className={`dock-btn ${settings.tool === 'pen' && settings.allowTouchAndMouseDraw ? 'active' : ''}`}
        onClick={() => setTool('pen')}
      >
        ✒️ {t.toolPen}
      </button>
      <button
        type="button"
        className={`dock-btn ${settings.tool === 'highlighter' && settings.allowTouchAndMouseDraw ? 'active' : ''}`}
        onClick={() => setTool('highlighter')}
      >
        🖍️ {t.toolHighlighter}
      </button>
      <button
        type="button"
        className={`dock-btn ${settings.tool === 'eraser' && settings.allowTouchAndMouseDraw ? 'active' : ''}`}
        onClick={() => setTool('eraser')}
      >
        ⌫ {t.toolEraser}
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

      <button type="button" className="dock-btn" disabled={!canUndo} onClick={onUndo} title={t.undo}>
        ↶
      </button>
      <button type="button" className="dock-btn" disabled={!canRedo} onClick={onRedo} title={t.redo}>
        ↷
      </button>
      <button
        type="button"
        className="dock-btn"
        onClick={() => onClearPage('both')}
        title={t.clearSpread}
      >
        🗑
      </button>

      <button
        type="button"
        className="dock-btn"
        onClick={() => setCollapsed(true)}
        title={t.close}
        aria-label={t.close}
      >
        ✕
      </button>
    </div>
  );
};

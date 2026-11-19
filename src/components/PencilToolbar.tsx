import React, { useEffect, useRef, useState } from 'react';
import type { Lang } from '../engine/types';
import type { InkTool } from '../services/inkStorage';
import { UI_STRINGS } from '../data/i18n';
import type { PencilSettings } from './PencilCanvasLayer';
import { IconRedo, IconUndo } from './Icons';

const PRESET_SWATCHES = [
  { id: 'black', color: '#18181b', label: 'Black' },
  { id: 'blue', color: '#0a84ff', label: 'Blue' },
  { id: 'green', color: '#34c759', label: 'Green' },
  { id: 'yellow', color: '#ffcc00', label: 'Yellow' },
  { id: 'red', color: '#ff3b30', label: 'Red' },
];

const SIZES = [
  { value: 1.8, dot: 6 },
  { value: 3.0, dot: 10 },
  { value: 4.8, dot: 15 },
];

export interface PencilToolbarProps {
  lang: Lang;
  settings: PencilSettings;
  collapsed: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onToggleCollapsed: (next: boolean) => void;
  onChangeSettings: (next: PencilSettings) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearPage: (scope: 'left' | 'right' | 'both') => void;
}

/** Realistic upright Apple PencilKit-style tool SVG */
const PencilKitToolSvg: React.FC<{ tool: InkTool; color: string; uid: string }> = ({
  tool,
  color,
  uid,
}) => {
  const barrelId = `pk-barrel-${uid}-${tool}`;
  const eraserId = `pk-eraser-${uid}`;

  if (tool === 'pencil') {
    return (
      <svg viewBox="0 0 36 74" className="pk-tool-svg" aria-hidden="true">
        <defs>
          <linearGradient id={barrelId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d8dadf" />
            <stop offset="28%" stopColor="#ffffff" />
            <stop offset="68%" stopColor="#f6f7f9" />
            <stop offset="100%" stopColor="#cfd2d8" />
          </linearGradient>
        </defs>
        {/* Tapered white cone + body */}
        <path
          d="M18 6 L10 31 L10 74 L26 74 L26 31 Z"
          fill={`url(#${barrelId})`}
          stroke="rgba(0,0,0,0.09)"
          strokeWidth="0.7"
        />
        {/* Colored graphite tip */}
        <path d="M18 6 L15.1 15.2 Q18 16.4 20.9 15.2 Z" fill={color} />
        {/* Colored collar band */}
        <rect x="10" y="31" width="16" height="4.2" fill={color} />
        {/* Subtle highlight sheen */}
        <rect x="13.5" y="35.2" width="3" height="38.8" fill="rgba(255,255,255,0.45)" />
      </svg>
    );
  }

  if (tool === 'pen') {
    return (
      <svg viewBox="0 0 36 74" className="pk-tool-svg" aria-hidden="true">
        <defs>
          <linearGradient id={barrelId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d5d8de" />
            <stop offset="30%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#f5f6f8" />
            <stop offset="100%" stopColor="#cdd0d7" />
          </linearGradient>
        </defs>
        {/* Fine metal nib */}
        <rect x="17" y="10" width="2" height="6.5" rx="0.8" fill={color} />
        <path d="M15.2 16.5 L20.8 16.5 L22.2 25 L13.8 25 Z" fill={`url(#${barrelId})`} stroke="rgba(0,0,0,0.1)" strokeWidth="0.7" />
        {/* Stepped shoulder */}
        <path d="M12.2 25 L23.8 25 L25 32 L11 32 Z" fill={`url(#${barrelId})`} stroke="rgba(0,0,0,0.09)" strokeWidth="0.7" />
        {/* Barrel */}
        <rect x="11" y="32" width="14" height="42" fill={`url(#${barrelId})`} stroke="rgba(0,0,0,0.09)" strokeWidth="0.7" />
        {/* Color indicator stripe */}
        <rect x="11" y="42" width="14" height="3.2" fill={color} />
      </svg>
    );
  }

  if (tool === 'highlighter') {
    const hlColor = color === '#18181b' ? '#ffcc00' : color;
    return (
      <svg viewBox="0 0 36 74" className="pk-tool-svg" aria-hidden="true">
        <defs>
          <linearGradient id={barrelId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d6d9df" />
            <stop offset="28%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#f6f7f9" />
            <stop offset="100%" stopColor="#cfd3da" />
          </linearGradient>
        </defs>
        {/* Chisel tip */}
        <path d="M14 14.5 L22 11.5 L22 21 L14 21 Z" fill={hlColor} opacity="0.88" />
        {/* Collar */}
        <path d="M12.5 21 L23.5 21 L26 30 L10 30 Z" fill={`url(#${barrelId})`} stroke="rgba(0,0,0,0.09)" strokeWidth="0.7" />
        {/* Broad marker body */}
        <rect x="9.5" y="30" width="17" height="44" fill={`url(#${barrelId})`} stroke="rgba(0,0,0,0.09)" strokeWidth="0.7" />
        {/* Translucent color band */}
        <rect x="9.5" y="38" width="17" height="6.5" fill={hlColor} opacity="0.85" />
        {/* Opacity mark like Apple PencilKit */}
        <text
          x="18"
          y="58"
          textAnchor="middle"
          fontSize="7.5"
          fontWeight="600"
          fill="#6e7076"
          fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
        >
          80
        </text>
      </svg>
    );
  }

  // Eraser (coral-pink cap + x mark like IMG_0812)
  return (
    <svg viewBox="0 0 36 74" className="pk-tool-svg" aria-hidden="true">
      <defs>
        <linearGradient id={barrelId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#d6d9df" />
          <stop offset="30%" stopColor="#ffffff" />
          <stop offset="72%" stopColor="#f5f6f8" />
          <stop offset="100%" stopColor="#cfd3da" />
        </linearGradient>
        <linearGradient id={eraserId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e88a8c" />
          <stop offset="35%" stopColor="#f9b0b2" />
          <stop offset="75%" stopColor="#f29597" />
          <stop offset="100%" stopColor="#de7d7f" />
        </linearGradient>
      </defs>
      {/* Rounded pink eraser tip */}
      <path d="M11 22 C11 16 12.5 14 18 14 C23.5 14 25 16 25 22 L25 29 L11 29 Z" fill={`url(#${eraserId})`} />
      {/* White sleeve */}
      <rect x="10.5" y="29" width="15" height="45" fill={`url(#${barrelId})`} stroke="rgba(0,0,0,0.09)" strokeWidth="0.7" />
      {/* Subtle pink X badge */}
      <path
        d="M15.4 37.4 L20.6 42.6 M20.6 37.4 L15.4 42.6"
        stroke="#e07a7c"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const PencilToolbar: React.FC<PencilToolbarProps> = ({
  lang,
  settings,
  collapsed,
  canUndo,
  canRedo,
  onToggleCollapsed,
  onChangeSettings,
  onUndo,
  onRedo,
  onClearPage,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [sizePopoverOpen, setSizePopoverOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const t = UI_STRINGS[lang];

  // Close popovers when collapsing or tapping outside the dock
  useEffect(() => {
    if (collapsed) {
      setMoreOpen(false);
      setSizePopoverOpen(false);
    }
  }, [collapsed]);

  useEffect(() => {
    if (!moreOpen && !sizePopoverOpen) return;
    const handleOutside = (e: PointerEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
        setSizePopoverOpen(false);
      }
    };
    window.addEventListener('pointerdown', handleOutside);
    return () => window.removeEventListener('pointerdown', handleOutside);
  }, [moreOpen, sizePopoverOpen]);

  const isCustomColor = !PRESET_SWATCHES.some(
    (sw) => sw.color.toLowerCase() === settings.color.toLowerCase()
  );

  // Minimized floating circular button (IMG_0813 style)
  if (collapsed) {
    return (
      <div className="pencil-dock-wrap" ref={dockRef}>
        <button
          type="button"
          className="pk-minimized-btn"
          onClick={() => onToggleCollapsed(false)}
          title={t.pencilDock}
          aria-label={t.pencilDock}
        >
          <div className="pk-minimized-tool">
            <PencilKitToolSvg tool={settings.tool} color={settings.color} uid="min" />
          </div>
          {settings.pencilDetected && <span className="pk-pen-dot" aria-hidden="true" />}
        </button>
      </div>
    );
  }

  const handleSelectTool = (tool: InkTool) => {
    setMoreOpen(false);
    if (settings.tool === tool && tool !== 'eraser') {
      // Tapping the active tool toggles the Stroke Width popover (PencilKit behavior)
      setSizePopoverOpen((v) => !v);
      return;
    }
    setSizePopoverOpen(false);
    const nextColor =
      tool === 'highlighter' && settings.color === '#18181b' ? '#ffcc00' : settings.color;
    onChangeSettings({
      ...settings,
      tool,
      color: nextColor,
    });
  };

  const handleSelectColor = (color: string) => {
    onChangeSettings({
      ...settings,
      color,
      tool: settings.tool === 'eraser' ? 'pencil' : settings.tool,
    });
  };

  return (
    <div className="pencil-dock-wrap" ref={dockRef}>
      {/* Stroke Width Popover (opens when tapping active tool) */}
      {sizePopoverOpen && settings.tool !== 'eraser' && (
        <div className="pk-popover pk-popover--size" role="dialog" aria-label={t.strokeWidthLabel}>
          <span className="pk-popover-label">{t.strokeWidthLabel}</span>
          <div className="pk-size-row">
            {SIZES.map((sz) => (
              <button
                key={sz.value}
                type="button"
                className={`pk-size-btn ${settings.size === sz.value ? 'active' : ''}`}
                onClick={() => {
                  onChangeSettings({ ...settings, size: sz.value });
                  setSizePopoverOpen(false);
                }}
                aria-label={`${t.strokeWidthLabel} ${sz.value}`}
              >
                <span
                  style={{
                    width: sz.dot,
                    height: sz.dot,
                    background: settings.color,
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Three-Dots (•••) Options Popover */}
      {moreOpen && (
        <div className="pk-popover pk-popover--more" role="menu" aria-label={t.moreOptions}>
          <div className="pk-popover-status">
            <span className={`pk-status-led ${settings.pencilDetected ? 'connected' : ''}`} />
            <span>
              {settings.pencilDetected ? t.pencilDetectedLabel : t.pencilReadyLabel}
            </span>
          </div>

          <div className="pk-popover-sep" />

          {/* Draw with Finger toggle (hidden here, OFF by default) */}
          <label className="pk-toggle-row">
            <span>{t.fingerDraw}</span>
            <input
              type="checkbox"
              className="pk-switch"
              checked={settings.allowTouchAndMouseDraw}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  allowTouchAndMouseDraw: e.target.checked,
                })
              }
            />
          </label>

          {/* Auto-Minimize toggle (ON by default) */}
          <label className="pk-toggle-row">
            <span>{t.autoMinimize}</span>
            <input
              type="checkbox"
              className="pk-switch"
              checked={settings.autoMinimize}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  autoMinimize: e.target.checked,
                })
              }
            />
          </label>

          <div className="pk-popover-sep" />

          {/* Clear page actions */}
          <div className="pk-clear-row">
            <button
              type="button"
              className="pk-menu-btn"
              onClick={() => {
                onClearPage('left');
                setMoreOpen(false);
              }}
            >
              {t.clearPageLeft}
            </button>
            <button
              type="button"
              className="pk-menu-btn"
              onClick={() => {
                onClearPage('right');
                setMoreOpen(false);
              }}
            >
              {t.clearPageRight}
            </button>
          </div>
          <button
            type="button"
            className="pk-menu-btn pk-menu-btn--danger"
            onClick={() => {
              onClearPage('both');
              setMoreOpen(false);
            }}
          >
            {t.clearSpread}
          </button>

          <div className="pk-popover-hint">{t.gesturesHint}</div>
        </div>
      )}

      {/* Main Frosted PencilKit Pill (IMG_0812 style) */}
      <div className="pencil-dock pk-pill" role="toolbar" aria-label={t.pencilDock}>
        {/* Top grabber bar — tap to minimize */}
        <button
          type="button"
          className="pk-grabber-btn"
          onClick={() => onToggleCollapsed(true)}
          title={t.close}
          aria-label={t.close}
        >
          <span className="pk-grabber" />
        </button>

        {/* Left: Undo / Redo circular buttons */}
        <div className="pk-actions">
          <button
            type="button"
            className="pk-circle-btn"
            disabled={!canUndo}
            onClick={onUndo}
            title={t.undo}
            aria-label={t.undo}
          >
            <IconUndo size={15} />
          </button>
          <button
            type="button"
            className="pk-circle-btn"
            disabled={!canRedo}
            onClick={onRedo}
            title={t.redo}
            aria-label={t.redo}
          >
            <IconRedo size={15} />
          </button>
        </div>

        {/* Center: Upright PencilKit tools rising from bottom edge */}
        <div className="pk-tools">
          {(
            [
              { id: 'pencil', label: t.toolPencil },
              { id: 'pen', label: t.toolPen },
              { id: 'highlighter', label: t.toolHighlighter },
              { id: 'eraser', label: t.toolEraser },
            ] as const
          ).map((item) => {
            const active = settings.tool === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`pk-tool-slot ${active ? 'active' : ''}`}
                onClick={() => handleSelectTool(item.id)}
                title={item.label}
                aria-label={item.label}
                aria-pressed={active}
              >
                <PencilKitToolSvg tool={item.id} color={settings.color} uid="bar" />
              </button>
            );
          })}
        </div>

        {/* Right: 2x3 Color Swatch Grid + Rainbow Color Wheel */}
        <div className="pk-swatch-grid">
          {PRESET_SWATCHES.map((sw) => {
            const active = settings.color.toLowerCase() === sw.color.toLowerCase();
            return (
              <button
                key={sw.id}
                type="button"
                className={`pk-swatch ${active ? 'active' : ''}`}
                style={{ backgroundColor: sw.color }}
                title={sw.label}
                aria-label={sw.label}
                aria-pressed={active}
                onClick={() => handleSelectColor(sw.color)}
              />
            );
          })}
          <label
            className={`pk-swatch pk-swatch--wheel ${isCustomColor ? 'active' : ''}`}
            title="Custom Color"
            aria-label="Custom Color"
          >
            <input
              type="color"
              value={settings.color}
              onChange={(e) => handleSelectColor(e.target.value)}
            />
          </label>
        </div>

        {/* Far Right: Three-Dots (•••) button */}
        <button
          type="button"
          className={`pk-circle-btn pk-more-btn ${moreOpen ? 'active' : ''}`}
          onClick={() => {
            setSizePopoverOpen(false);
            setMoreOpen((v) => !v);
          }}
          title={t.moreOptions}
          aria-label={t.moreOptions}
          aria-expanded={moreOpen}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="2.2" />
            <circle cx="12" cy="12" r="2.2" />
            <circle cx="19" cy="12" r="2.2" />
          </svg>
        </button>
      </div>
    </div>
  );
};

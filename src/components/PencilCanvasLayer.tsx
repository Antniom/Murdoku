import React, { useCallback, useEffect, useRef } from 'react';
import type { InkPoint, InkStroke, InkTool } from '../services/inkStorage';

export interface PencilSettings {
  tool: InkTool;
  color: string;
  size: number;
  allowTouchAndMouseDraw: boolean;
  autoMinimize: boolean;
  pencilDetected: boolean;
}

export interface PencilCanvasLayerProps {
  page: 'left' | 'right';
  strokes: InkStroke[];
  settings: PencilSettings;
  onAddStroke: (stroke: InkStroke) => void;
  onEraseStrokeIds: (ids: string[]) => void;
  onPenDetected: () => void;
  onStrokeStart?: () => void;
  onToggleEraser?: () => void;
}

function drawSingleStroke(
  ctx: CanvasRenderingContext2D,
  stroke: InkStroke,
  w: number,
  h: number
): void {
  const pts = stroke.points;
  if (pts.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (stroke.tool === 'highlighter') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size * 5.2;
  } else if (stroke.tool === 'pencil') {
    ctx.globalAlpha = 0.84;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
  } else {
    ctx.globalAlpha = 0.96;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size * 1.15;
  }

  if (pts.length === 1) {
    ctx.beginPath();
    ctx.fillStyle = stroke.color;
    ctx.arc(pts[0].x * w, pts[0].y * h, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (stroke.tool === 'pencil') {
    // Pressure + Apple Pencil tilt-sensitive graphite shading segments
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const pressure = Math.max(0.35, Math.min(1.4, ((p0.p + p1.p) / 2) * 1.35));
      const tilt = ((p0.t ?? 0) + (p1.t ?? 0)) / 2;
      const tiltBoost = tilt > 0.35 ? 1 + (tilt - 0.35) * 3.2 : 1;
      ctx.globalAlpha = tilt > 0.35 ? Math.max(0.36, 0.84 - (tilt - 0.35) * 0.55) : 0.84;
      ctx.beginPath();
      ctx.lineWidth = Math.max(1, stroke.size * pressure * tiltBoost);
      ctx.moveTo(p0.x * w, p0.y * h);
      ctx.lineTo(p1.x * w, p1.y * h);
      ctx.stroke();
    }
  } else {
    // Smooth quadratic midpoint path
    ctx.beginPath();
    ctx.moveTo(pts[0].x * w, pts[0].y * h);
    for (let i = 1; i < pts.length - 1; i++) {
      const midX = ((pts[i].x + pts[i + 1].x) / 2) * w;
      const midY = ((pts[i].y + pts[i + 1].y) / 2) * h;
      ctx.quadraticCurveTo(pts[i].x * w, pts[i].y * h, midX, midY);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x * w, last.y * h);
    ctx.stroke();
  }

  ctx.restore();
}

export const PencilCanvasLayer: React.FC<PencilCanvasLayerProps> = ({
  page,
  strokes,
  settings,
  onAddStroke,
  onEraseStrokeIds,
  onPenDetected,
  onStrokeStart,
  onToggleEraser,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeStrokeRef = useRef<InkStroke | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const erasingRef = useRef(false);
  const hoverPointRef = useRef<{ x: number; y: number } | null>(null);

  // Keep latest props in refs so native capture listeners never go stale
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const pageStrokes = strokes.filter((s) => s.page === page);
  const pageStrokesRef = useRef(pageStrokes);
  pageStrokesRef.current = pageStrokes;
  const callbacksRef = useRef({
    onAddStroke,
    onEraseStrokeIds,
    onPenDetected,
    onStrokeStart,
    onToggleEraser,
  });
  callbacksRef.current = {
    onAddStroke,
    onEraseStrokeIds,
    onPenDetected,
    onStrokeStart,
    onToggleEraser,
  };

  const renderAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const targetW = Math.max(1, Math.round(rect.width * dpr));
    const targetH = Math.max(1, Math.round(rect.height * dpr));

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    for (const s of pageStrokesRef.current) {
      drawSingleStroke(ctx, s, rect.width, rect.height);
    }
    if (activeStrokeRef.current) {
      drawSingleStroke(ctx, activeStrokeRef.current, rect.width, rect.height);
    }

    // Apple Pencil Hover cursor ring (iPad Pro / Air M2+)
    if (hoverPointRef.current && activePointerIdRef.current === null) {
      const { x, y } = hoverPointRef.current;
      const s = settingsRef.current;
      const radius =
        s.tool === 'eraser'
          ? 12
          : s.tool === 'highlighter'
            ? Math.max(7, (s.size * 5.2) / 2)
            : Math.max(3.5, s.size * 1.4);
      ctx.save();
      ctx.beginPath();
      ctx.arc(x * rect.width, y * rect.height, radius, 0, Math.PI * 2);
      ctx.strokeStyle = s.tool === 'eraser' ? 'rgba(235, 90, 105, 0.75)' : s.color;
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    }
  }, []);

  useEffect(() => {
    renderAll();
  }, [strokes, page, settings.tool, settings.color, settings.size, renderAll]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => renderAll());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [renderAll]);

  // Attach native capture-phase listeners on the parent .book-page so Apple Pencil draws
  // seamlessly on the VERY FIRST stroke even while "Draw with Finger" is OFF (fingers still scroll & tap).
  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    const toNormalizedPoint = (e: PointerEvent): InkPoint | null => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      const tiltMag =
        typeof e.tiltX === 'number' && typeof e.tiltY === 'number'
          ? Math.min(1, Math.hypot(e.tiltX, e.tiltY) / 90)
          : 0;
      return {
        x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
        p: e.pressure && e.pressure > 0 ? e.pressure : 0.55,
        t: tiltMag > 0.05 ? Number(tiltMag.toFixed(2)) : undefined,
      };
    };

    const eraseNear = (pt: InkPoint) => {
      const threshold = 0.028;
      const hitIds: string[] = [];
      for (const s of pageStrokesRef.current) {
        for (const sp of s.points) {
          const dx = sp.x - pt.x;
          const dy = sp.y - pt.y;
          if (dx * dx + dy * dy <= threshold * threshold) {
            hitIds.push(s.id);
            break;
          }
        }
      }
      if (hitIds.length > 0) {
        callbacksRef.current.onEraseStrokeIds(hitIds);
      }
    };

    // Safari iPadOS: prevent scrolling/selection ONLY for Apple Pencil (stylus) touches when Finger Draw is OFF
    const onTouchStartCapture = (e: TouchEvent) => {
      const isStylusTouch = Array.from(e.changedTouches).some(
        (t) => (t as Touch & { touchType?: string }).touchType === 'stylus'
      );
      if (isStylusTouch) {
        const target = e.target as HTMLElement | null;
        if (!target?.closest('.verdict-cta-btn, .pencil-dock, .top-bar')) {
          e.preventDefault();
        }
      }
    };

    const onPointerDownCapture = (e: PointerEvent) => {
      const isPen = e.pointerType === 'pen';
      const s = settingsRef.current;

      if (isPen) {
        callbacksRef.current.onPenDetected();
      }

      if (!isPen && !s.allowTouchAndMouseDraw) {
        return;
      }

      // Keep critical UI buttons tappable even with Apple Pencil
      const target = e.target as HTMLElement | null;
      if (target?.closest('.verdict-cta-btn, .pencil-dock, .top-bar')) {
        return;
      }

      // Stylus secondary barrel button toggles Eraser <-> last drawing tool
      if (isPen && e.button === 2) {
        e.preventDefault();
        callbacksRef.current.onToggleEraser?.();
        return;
      }

      e.preventDefault();
      hoverPointRef.current = null;
      activePointerIdRef.current = e.pointerId;
      callbacksRef.current.onStrokeStart?.();

      const pt = toNormalizedPoint(e);
      if (!pt) return;

      // Hardware stylus eraser end/button (button 5 / bitmask 32) or selected Eraser tool
      const hardwareEraser = e.button === 5 || (e.buttons & 32) !== 0;
      if (s.tool === 'eraser' || hardwareEraser) {
        erasingRef.current = true;
        eraseNear(pt);
        return;
      }

      activeStrokeRef.current = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        page,
        tool: s.tool,
        color: s.color,
        size: s.size,
        points: [pt],
      };
      renderAll();
    };

    const onPointerMoveCapture = (e: PointerEvent) => {
      // Apple Pencil Hover detection & preview cursor
      if (e.pointerType === 'pen' && activePointerIdRef.current === null && e.buttons === 0) {
        callbacksRef.current.onPenDetected();
        const pt = toNormalizedPoint(e);
        hoverPointRef.current = pt ? { x: pt.x, y: pt.y } : null;
        renderAll();
        return;
      }

      if (activePointerIdRef.current !== e.pointerId) return;
      e.preventDefault();

      const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];

      if (erasingRef.current) {
        for (const ev of events) {
          const pt = toNormalizedPoint(ev);
          if (pt) eraseNear(pt);
        }
        return;
      }

      if (!activeStrokeRef.current) return;
      for (const ev of events) {
        const pt = toNormalizedPoint(ev);
        if (pt) {
          const pts = activeStrokeRef.current.points;
          const prev = pts[pts.length - 1];
          if (!prev || Math.hypot(pt.x - prev.x, pt.y - prev.y) > 0.0018) {
            pts.push(pt);
          }
        }
      }
      renderAll();
    };

    const finishPointer = (e: PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      activePointerIdRef.current = null;
      erasingRef.current = false;

      const finished = activeStrokeRef.current;
      activeStrokeRef.current = null;
      if (finished && finished.points.length > 0) {
        callbacksRef.current.onAddStroke(finished);
      }
      renderAll();
    };

    const onPointerLeave = (e: PointerEvent) => {
      if (e.pointerType === 'pen' && hoverPointRef.current) {
        hoverPointRef.current = null;
        renderAll();
      }
    };

    host.addEventListener('touchstart', onTouchStartCapture, { passive: false, capture: true });
    host.addEventListener('pointerdown', onPointerDownCapture, { passive: false, capture: true });
    host.addEventListener('pointermove', onPointerMoveCapture, { passive: false, capture: true });
    host.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('pointerup', finishPointer);
    window.addEventListener('pointercancel', finishPointer);

    return () => {
      host.removeEventListener('touchstart', onTouchStartCapture, { capture: true });
      host.removeEventListener('pointerdown', onPointerDownCapture, { capture: true });
      host.removeEventListener('pointermove', onPointerMoveCapture, { capture: true });
      host.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('pointerup', finishPointer);
      window.removeEventListener('pointercancel', finishPointer);
    };
  }, [page, renderAll]);

  const interactive = settings.allowTouchAndMouseDraw;

  return (
    <canvas
      ref={canvasRef}
      className={`ink-canvas ${interactive ? '' : 'ink-canvas--passthrough'}`}
      aria-hidden="true"
    />
  );
};

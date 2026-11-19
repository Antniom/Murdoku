import React, { useCallback, useEffect, useRef } from 'react';
import type { InkPoint, InkStroke, InkTool } from '../services/inkStorage';

export interface PencilSettings {
  tool: InkTool;
  color: string;
  size: number;
  allowTouchAndMouseDraw: boolean;
}

export interface PencilCanvasLayerProps {
  page: 'left' | 'right';
  strokes: InkStroke[];
  settings: PencilSettings;
  onAddStroke: (stroke: InkStroke) => void;
  onEraseStrokeIds: (ids: string[]) => void;
  onPenDetected: () => void;
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
    ctx.globalAlpha = 0.42;
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
    // Pressure-sensitive variable-width quadratic segments
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const pressure = Math.max(0.35, Math.min(1.4, (p0.p + p1.p) / 2 * 1.35));
      ctx.beginPath();
      ctx.lineWidth = Math.max(1, stroke.size * pressure);
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
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeStrokeRef = useRef<InkStroke | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const erasingRef = useRef(false);

  const pageStrokes = strokes.filter((s) => s.page === page);

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

    for (const s of pageStrokes) {
      drawSingleStroke(ctx, s, rect.width, rect.height);
    }
    if (activeStrokeRef.current) {
      drawSingleStroke(ctx, activeStrokeRef.current, rect.width, rect.height);
    }
  }, [pageStrokes]);

  useEffect(() => {
    renderAll();
  }, [renderAll]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => renderAll());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [renderAll]);

  const toNormalizedPoint = (e: PointerEvent | React.PointerEvent): InkPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
      p: e.pressure && e.pressure > 0 ? e.pressure : 0.55,
    };
  };

  const eraseNear = (pt: InkPoint) => {
    const threshold = 0.028;
    const hitIds: string[] = [];
    for (const s of pageStrokes) {
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
      onEraseStrokeIds(hitIds);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const isPen = e.pointerType === 'pen';
    if (isPen) {
      onPenDetected();
    }
    if (!isPen && !settings.allowTouchAndMouseDraw) {
      return;
    }

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerIdRef.current = e.pointerId;

    const pt = toNormalizedPoint(e);
    if (!pt) return;

    if (settings.tool === 'eraser') {
      erasingRef.current = true;
      eraseNear(pt);
      return;
    }

    activeStrokeRef.current = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      page,
      tool: settings.tool,
      color: settings.color,
      size: settings.size,
      points: [pt],
    };
    renderAll();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();

    const native = e.nativeEvent;
    const events = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [native];

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

  const finishPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    activePointerIdRef.current = null;
    erasingRef.current = false;

    const finished = activeStrokeRef.current;
    activeStrokeRef.current = null;
    if (finished && finished.points.length > 0) {
      onAddStroke(finished);
    }
    renderAll();
  };

  // When allowTouchAndMouseDraw is OFF, we still want Apple Pencil to draw seamlessly!
  // On iPadOS, pointer-events: auto with palm rejection works best when drawing mode is active;
  // when passthrough is active (e.g. Tap Assist or navigating), clicking buttons beneath works seamlessly.
  const interactive = settings.allowTouchAndMouseDraw;

  return (
    <canvas
      ref={canvasRef}
      className={`ink-canvas ${interactive ? '' : 'ink-canvas--passthrough'}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      aria-hidden="true"
    />
  );
};

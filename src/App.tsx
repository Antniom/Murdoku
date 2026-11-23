import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Lang, MurdokuCase } from './engine/types';
import { getStarterCaseById, getStarterSummaries } from './data/starterVolume';
import { UI_STRINGS } from './data/i18n';
import { fetchDailyArchive } from './services/api';
import {
  createEmptyProgress,
  loadCaseProgress,
  loadSolvedCaseIds,
  saveCaseProgress,
  type CaseProgressState,
  type InkStroke,
} from './services/inkStorage';
import { BookCover } from './components/BookCover';
import { TableOfContents } from './components/TableOfContents';
import { RulesSpread } from './components/RulesSpread';
import { BookSpread } from './components/BookSpread';
import { PencilToolbar } from './components/PencilToolbar';
import { VerdictModal } from './components/VerdictModal';
import { BackOfBookDrawer } from './components/BackOfBookDrawer';
import type { PencilSettings } from './components/PencilCanvasLayer';
import {
  IconBookClosed,
  IconBookOpen,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconContents,
  IconGrid,
  IconRules,
} from './components/Icons';

type AppView = 'cover' | 'toc' | 'rules' | 'case';

export const App: React.FC = () => {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('murdoku_lang');
      if (saved === 'en' || saved === 'pt') return saved;
    } catch {
      // ignore
    }
    return 'en';
  });

  const starterSummaries = useMemo(() => getStarterSummaries(), []);
  const [dailyCases, setDailyCases] = useState<MurdokuCase[]>([]);
  const [todayDate, setTodayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dailyLoading, setDailyLoading] = useState(true);

  const [view, setView] = useState<AppView>('cover');
  const [activeCase, setActiveCase] = useState<MurdokuCase | null>(null);

  const [solvedIds, setSolvedIds] = useState<Set<string>>(() => loadSolvedCaseIds());
  const [progress, setProgress] = useState<CaseProgressState | null>(null);
  const [undoStack, setUndoStack] = useState<InkStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<InkStroke[][]>([]);

  const [showObstacleAid, setShowObstacleAid] = useState(false);
  const [tapAssistEnabled, setTapAssistEnabled] = useState(false);
  const [verdictOpen, setVerdictOpen] = useState(false);
  const [backOfBookOpen, setBackOfBookOpen] = useState(false);

  const [pencilSettings, setPencilSettings] = useState<PencilSettings>({
    tool: 'pencil',
    color: '#18181b',
    size: 2.2,
    allowTouchAndMouseDraw: false,
    autoMinimize: true,
    pencilDetected: false,
  });
  const [pencilDockCollapsed, setPencilDockCollapsed] = useState(true);
  const [gestureToast, setGestureToast] = useState<string | null>(null);
  const lastDrawToolRef = useRef<'pencil' | 'pen' | 'highlighter'>('pencil');
  const toastTimerRef = useRef<number | null>(null);

  const saveTimerRef = useRef<number | null>(null);
  const t = UI_STRINGS[lang];

  const showGestureToast = useCallback((label: string) => {
    setGestureToast(label);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setGestureToast(null), 950);
  }, []);

  // Best-effort landscape orientation lock for supporting browsers / installed PWAs
  useEffect(() => {
    const orient = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    orient?.lock?.('landscape')?.catch(() => {
      // iPadOS Safari ignores orientation.lock; CSS portrait-lock-overlay enforces landscape cleanly
    });
  }, []);

  // Fetch daily archive on mount
  useEffect(() => {
    let mounted = true;
    fetchDailyArchive().then((res) => {
      if (!mounted) return;
      setDailyCases(res.cases);
      setTodayDate(res.today);
      setDailyLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Persist language preference
  useEffect(() => {
    try {
      localStorage.setItem('murdoku_lang', lang);
    } catch {
      // ignore
    }
  }, [lang]);

  // Load ink & progress whenever activeCase changes
  useEffect(() => {
    if (!activeCase) return;
    let active = true;
    setUndoStack([]);
    setRedoStack([]);
    loadCaseProgress(activeCase.id).then((loaded) => {
      if (active) setProgress(loaded);
    });
    return () => {
      active = false;
    };
  }, [activeCase]);

  // Debounced persist of progress
  const updateProgress = useCallback((updater: (prev: CaseProgressState) => CaseProgressState) => {
    setProgress((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        saveCaseProgress(next);
      }, 250);
      return next;
    });
  }, []);

  const openCase = (c: MurdokuCase) => {
    setActiveCase(c);
    setProgress(createEmptyProgress(c.id));
    setView('case');
  };

  const openStarterById = (id: string) => {
    const resolved = getStarterCaseById(id);
    if (resolved) openCase(resolved);
  };

  // Volume navigation list (Daily or Starter) for Prev/Next spread flipping
  const { hasPrev, hasNext, openPrev, openNext } = useMemo(() => {
    if (!activeCase) {
      return { hasPrev: false, hasNext: false, openPrev: () => {}, openNext: () => {} };
    }
    if (activeCase.volume === 'daily') {
      const idx = dailyCases.findIndex((c) => c.id === activeCase.id);
      const prev = idx > 0 ? dailyCases[idx - 1] : null;
      const next = idx >= 0 && idx < dailyCases.length - 1 ? dailyCases[idx + 1] : null;
      return {
        hasPrev: !!prev,
        hasNext: !!next,
        openPrev: () => prev && openCase(prev),
        openNext: () => next && openCase(next),
      };
    }
    const idx = starterSummaries.findIndex((c) => c.id === activeCase.id);
    const prevId = idx > 0 ? starterSummaries[idx - 1].id : null;
    const nextId = idx >= 0 && idx < starterSummaries.length - 1 ? starterSummaries[idx + 1].id : null;
    return {
      hasPrev: !!prevId,
      hasNext: !!nextId,
      openPrev: () => prevId && openStarterById(prevId),
      openNext: () => nextId && openStarterById(nextId),
    };
  }, [activeCase, dailyCases, starterSummaries]);

  // Stroke handlers with undo/redo
  const handleAddStroke = useCallback(
    (stroke: InkStroke) => {
      updateProgress((prev) => {
        setUndoStack((u) => [...u.slice(-49), prev.strokes]);
        setRedoStack([]);
        return { ...prev, strokes: [...prev.strokes, stroke] };
      });
    },
    [updateProgress]
  );

  const handleEraseStrokeIds = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      updateProgress((prev) => {
        const filtered = prev.strokes.filter((s) => !idSet.has(s.id));
        if (filtered.length === prev.strokes.length) return prev;
        setUndoStack((u) => [...u.slice(-49), prev.strokes]);
        setRedoStack([]);
        return { ...prev, strokes: filtered };
      });
    },
    [updateProgress]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || !progress) return;
    const previousStrokes = undoStack[undoStack.length - 1];
    setUndoStack((u) => u.slice(0, -1));
    setRedoStack((r) => [...r, progress.strokes]);
    updateProgress((prev) => ({ ...prev, strokes: previousStrokes }));
  }, [undoStack, progress, updateProgress]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || !progress) return;
    const restored = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((u) => [...u, progress.strokes]);
    updateProgress((prev) => ({ ...prev, strokes: restored }));
  }, [redoStack, progress, updateProgress]);

  const handleGestureUndo = useCallback(() => {
    if (undoStack.length === 0 || !progress) return;
    handleUndo();
    showGestureToast(t.undo);
  }, [undoStack.length, progress, handleUndo, showGestureToast, t.undo]);

  const handleGestureRedo = useCallback(() => {
    if (redoStack.length === 0 || !progress) return;
    handleRedo();
    showGestureToast(t.redo);
  }, [redoStack.length, progress, handleRedo, showGestureToast, t.redo]);

  const handleClearPage = (scope: 'left' | 'right' | 'both') => {
    if (!progress || progress.strokes.length === 0) return;
    setUndoStack((u) => [...u.slice(-49), progress.strokes]);
    setRedoStack([]);
    updateProgress((prev) => ({
      ...prev,
      strokes: scope === 'both' ? [] : prev.strokes.filter((s) => s.page !== scope),
    }));
  };

  // Automatically detect Apple Pencil (hover or touch) WITHOUT turning on Draw with Finger
  const handlePenDetected = useCallback(() => {
    setPencilSettings((prev) => (prev.pencilDetected ? prev : { ...prev, pencilDetected: true }));
  }, []);

  // Auto-minimize PencilKit pill as soon as the user begins drawing a stroke
  const handleStrokeStart = useCallback(() => {
    if (pencilSettings.autoMinimize) {
      setPencilDockCollapsed(true);
    }
  }, [pencilSettings.autoMinimize]);

  // Toggle Eraser <-> last drawing tool (used by stylus barrel button & keyboard 'E')
  const handleToggleEraser = useCallback(() => {
    setPencilSettings((prev) => {
      if (prev.tool === 'eraser') {
        const restored = lastDrawToolRef.current;
        const label =
          restored === 'pen' ? t.toolPen : restored === 'highlighter' ? t.toolHighlighter : t.toolPencil;
        showGestureToast(label);
        return { ...prev, tool: restored };
      }
      lastDrawToolRef.current = prev.tool;
      showGestureToast(t.toolEraser);
      return { ...prev, tool: 'eraser' };
    });
  }, [showGestureToast, t.toolEraser, t.toolHighlighter, t.toolPen, t.toolPencil]);

  // Keyboard shortcuts for Undo / Redo / Eraser toggle while solving a case
  useEffect(() => {
    if (view !== 'case') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleGestureRedo();
        else handleGestureUndo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleGestureRedo();
      } else if (!mod && !e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleToggleEraser();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [view, handleGestureUndo, handleGestureRedo, handleToggleEraser]);

  const handleMarkSolved = () => {
    if (!activeCase) return;
    setSolvedIds((prev) => {
      const next = new Set(prev);
      next.add(activeCase.id);
      return next;
    });
    updateProgress((prev) => ({ ...prev, solved: true }));
  };

  const todayCase = dailyCases[0] ?? null;

  return (
    <div className="app-shell">
      {/* Horizontal Landscape Lock Overlay (automatically shown when device is vertical) */}
      <div className="portrait-lock-overlay" role="dialog" aria-live="polite">
        <div className="portrait-lock-card">
          <svg
            className="portrait-lock-icon"
            viewBox="0 0 64 64"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="16" y="8" width="32" height="48" rx="5" />
            <line x1="28" y1="50" x2="36" y2="50" />
            <path d="M54 22a22 22 0 0 1 0 20" strokeDasharray="4 4" />
            <polyline points="50 38 54 42 58 38" />
          </svg>
          <h2 className="portrait-lock-title">{t.rotateTitle}</h2>
          <p className="portrait-lock-body">{t.rotateBody}</p>
        </div>
      </div>

      {/* Whisper-thin Top Book Navigation Bar (hidden on Cover) */}
      {view !== 'cover' && (
        <nav className="top-bar" aria-label="Book navigation">
          <button type="button" className="top-btn" onClick={() => setView('cover')}>
            <IconBookClosed size={14} />
            <span>{t.backToCover}</span>
          </button>
          <button
            type="button"
            className={`top-btn ${view === 'toc' ? 'active' : ''}`}
            onClick={() => setView('toc')}
          >
            <IconContents size={14} />
            <span>{t.tableOfContents}</span>
          </button>
          <button
            type="button"
            className={`top-btn ${view === 'rules' ? 'active' : ''}`}
            onClick={() => setView('rules')}
          >
            <IconRules size={14} />
            <span>{t.howToPlay}</span>
          </button>

          {view === 'case' && activeCase && (
            <>
              <span className="top-divider" />
              <button
                type="button"
                className="top-btn"
                disabled={!hasPrev}
                onClick={openPrev}
              >
                <IconChevronLeft size={14} />
                <span>{t.prevSpread}</span>
              </button>
              <button
                type="button"
                className="top-btn"
                disabled={!hasNext}
                onClick={openNext}
              >
                <span>{t.nextSpread}</span>
                <IconChevronRight size={14} />
              </button>
              <span className="top-divider" />
              <button
                type="button"
                className={`top-btn ${showObstacleAid ? 'active' : ''}`}
                title={t.gridAidTooltip}
                onClick={() => setShowObstacleAid((v) => !v)}
              >
                <IconGrid size={14} />
                <span>{t.gridAid}</span>
              </button>
              <button
                type="button"
                className={`top-btn ${tapAssistEnabled ? 'active' : ''}`}
                title={t.tapAssistTooltip}
                onClick={() => {
                  setTapAssistEnabled((v) => {
                    const next = !v;
                    if (next) {
                      setPencilSettings((p) => ({ ...p, allowTouchAndMouseDraw: false }));
                    }
                    return next;
                  });
                }}
              >
                <IconCheck size={14} />
                <span>{t.tapAssist}</span>
              </button>
              <button
                type="button"
                className="top-btn"
                onClick={() => setBackOfBookOpen(true)}
              >
                <IconBookOpen size={14} />
                <span>{t.backOfBook}</span>
              </button>
            </>
          )}

          <span className="top-divider" />
          <button
            type="button"
            className="lang-pill"
            onClick={() => setLang((l) => (l === 'en' ? 'pt' : 'en'))}
          >
            {lang.toUpperCase()}
          </button>
        </nav>
      )}

      {/* Main Content Stage */}
      {view === 'cover' ? (
        <BookCover
          lang={lang}
          todayCase={todayCase}
          dailyLoading={dailyLoading}
          solvedCount={starterSummaries.filter((c) => solvedIds.has(c.id)).length}
          totalStarter={starterSummaries.length}
          onOpenToday={() => todayCase && openCase(todayCase)}
          onOpenToc={() => setView('toc')}
          onOpenRules={() => setView('rules')}
          onToggleLang={() => setLang((l) => (l === 'en' ? 'pt' : 'en'))}
        />
      ) : (
        <div className="book-stage">
          {view === 'toc' && (
            <TableOfContents
              lang={lang}
              dailyCases={dailyCases}
              starterSummaries={starterSummaries}
              todayDate={todayDate}
              solvedIds={solvedIds}
              onSelectDailyCase={openCase}
              onSelectStarterId={openStarterById}
            />
          )}

          {view === 'rules' && <RulesSpread lang={lang} />}

          {view === 'case' && activeCase && progress && (
            <BookSpread
              murdokuCase={activeCase}
              lang={lang}
              solved={progress.solved || solvedIds.has(activeCase.id)}
              strokes={progress.strokes}
              pencilSettings={pencilSettings}
              showObstacleAid={showObstacleAid}
              tapAssistEnabled={tapAssistEnabled}
              tapMarks={progress.tapMarks}
              selectedPatchId={progress.selectedPatchId}
              onAddStroke={handleAddStroke}
              onEraseStrokeIds={handleEraseStrokeIds}
              onPenDetected={handlePenDetected}
              onStrokeStart={handleStrokeStart}
              onToggleEraser={handleToggleEraser}
              onGestureUndo={handleGestureUndo}
              onGestureRedo={handleGestureRedo}
              onUpdateTapMark={(cellKey, mark) =>
                updateProgress((prev) => {
                  const nextMarks = { ...prev.tapMarks };
                  if (mark === null) delete nextMarks[cellKey];
                  else nextMarks[cellKey] = mark;
                  return { ...prev, tapMarks: nextMarks };
                })
              }
              onSelectPatch={(patchId) =>
                updateProgress((prev) => ({
                  ...prev,
                  selectedPatchId: prev.selectedPatchId === patchId ? undefined : patchId,
                }))
              }
              onOpenVerdict={() => setVerdictOpen(true)}
            />
          )}
        </div>
      )}

      {/* Transient iPadOS Gesture Toast (Undo / Redo / Tool Switch) */}
      {gestureToast && (
        <div className="pk-gesture-toast" role="status" aria-live="polite">
          {gestureToast}
        </div>
      )}

      {/* Collapsible iPadOS PencilKit-Style Dock on Case Spreads */}
      {view === 'case' && activeCase && (
        <PencilToolbar
          lang={lang}
          settings={pencilSettings}
          collapsed={pencilDockCollapsed}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onToggleCollapsed={setPencilDockCollapsed}
          onChangeSettings={(next) => {
            if (next.tool !== 'eraser') {
              lastDrawToolRef.current = next.tool;
            }
            if (next.allowTouchAndMouseDraw) setTapAssistEnabled(false);
            setPencilSettings(next);
          }}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClearPage={handleClearPage}
        />
      )}

      {/* Spoiler-Free Verdict Verification Modal */}
      {verdictOpen && activeCase && (
        <VerdictModal
          murdokuCase={activeCase}
          lang={lang}
          initialPatchId={progress?.selectedPatchId}
          onClose={() => setVerdictOpen(false)}
          onSolved={handleMarkSolved}
          onOpenBackOfBook={() => setBackOfBookOpen(true)}
          onNextCase={hasNext ? openNext : undefined}
        />
      )}

      {/* Back-of-Book Progressive Hints & Full Solution Drawer */}
      {backOfBookOpen && activeCase && progress && (
        <BackOfBookDrawer
          murdokuCase={activeCase}
          lang={lang}
          revealedHints={progress.revealedHints}
          tapMarks={progress.tapMarks}
          onRevealNextHint={() =>
            updateProgress((prev) => ({
              ...prev,
              revealedHints: Math.min(activeCase.proofSteps.length, prev.revealedHints + 1),
            }))
          }
          onClose={() => setBackOfBookOpen(false)}
        />
      )}
    </div>
  );
};

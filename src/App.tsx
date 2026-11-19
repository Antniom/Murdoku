import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Lang, MurdokuCase } from './engine/types';
import { getStarterVolume } from './data/starterVolume';
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

  const starterCases = useMemo(() => getStarterVolume(), []);
  const [dailyCases, setDailyCases] = useState<MurdokuCase[]>([]);
  const [todayDate, setTodayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dailyLoading, setDailyLoading] = useState(true);

  const [view, setView] = useState<AppView>('cover');
  const [activeCase, setActiveCase] = useState<MurdokuCase | null>(null);
  const [mobilePage, setMobilePage] = useState<'left' | 'right'>('left');

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
    color: '#2b2c30',
    size: 2.2,
    allowTouchAndMouseDraw: false,
  });

  const saveTimerRef = useRef<number | null>(null);
  const t = UI_STRINGS[lang];

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
    setMobilePage('left');
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

  // Volume navigation list (Daily or Starter) for Prev/Next spread flipping
  const currentList = useMemo(() => {
    if (!activeCase) return [];
    return activeCase.volume === 'daily' ? dailyCases : starterCases;
  }, [activeCase, dailyCases, starterCases]);

  const currentIndex = activeCase ? currentList.findIndex((c) => c.id === activeCase.id) : -1;
  const prevCase = currentIndex > 0 ? currentList[currentIndex - 1] : null;
  const nextCase = currentIndex >= 0 && currentIndex < currentList.length - 1 ? currentList[currentIndex + 1] : null;

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

  const handleUndo = () => {
    if (undoStack.length === 0 || !progress) return;
    const previousStrokes = undoStack[undoStack.length - 1];
    setUndoStack((u) => u.slice(0, -1));
    setRedoStack((r) => [...r, progress.strokes]);
    updateProgress((prev) => ({ ...prev, strokes: previousStrokes }));
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || !progress) return;
    const restored = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((u) => [...u, progress.strokes]);
    updateProgress((prev) => ({ ...prev, strokes: restored }));
  };

  const handleClearPage = (scope: 'left' | 'right' | 'both') => {
    if (!progress || progress.strokes.length === 0) return;
    setUndoStack((u) => [...u.slice(-49), progress.strokes]);
    setRedoStack([]);
    updateProgress((prev) => ({
      ...prev,
      strokes: scope === 'both' ? [] : prev.strokes.filter((s) => s.page !== scope),
    }));
  };

  const handlePenDetected = useCallback(() => {
    setPencilSettings((prev) => (prev.allowTouchAndMouseDraw ? prev : { ...prev, allowTouchAndMouseDraw: true }));
  }, []);

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
                disabled={!prevCase}
                onClick={() => prevCase && openCase(prevCase)}
              >
                <IconChevronLeft size={14} />
                <span>{t.prevSpread}</span>
              </button>
              <button
                type="button"
                className="top-btn"
                disabled={!nextCase}
                onClick={() => nextCase && openCase(nextCase)}
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
          solvedCount={starterCases.filter((c) => solvedIds.has(c.id)).length}
          totalStarter={starterCases.length}
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
              starterCases={starterCases}
              todayDate={todayDate}
              solvedIds={solvedIds}
              mobilePage={mobilePage}
              onSelectCase={openCase}
            />
          )}

          {view === 'rules' && <RulesSpread lang={lang} mobilePage={mobilePage} />}

          {view === 'case' && activeCase && progress && (
            <BookSpread
              murdokuCase={activeCase}
              lang={lang}
              mobilePage={mobilePage}
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

      {/* Mobile 1-Page Flip Switcher (< 900px) */}
      {view !== 'cover' && (
        <div className="mobile-page-switcher" role="tablist">
          <button
            type="button"
            className={mobilePage === 'left' ? 'active' : ''}
            onClick={() => setMobilePage('left')}
          >
            {view === 'case' && activeCase
              ? `${t.pageLabel} ${activeCase.pageLeft} · ${t.suspectsTab}`
              : t.dailyVolume}
          </button>
          <button
            type="button"
            className={mobilePage === 'right' ? 'active' : ''}
            onClick={() => setMobilePage('right')}
          >
            {view === 'case' && activeCase
              ? `${t.pageLabel} ${activeCase.pageRight} · ${t.mapTab}`
              : t.starterVolume}
          </button>
        </div>
      )}

      {/* Collapsible PencilKit-Style Dock on Case Spreads */}
      {view === 'case' && activeCase && (
        <PencilToolbar
          lang={lang}
          settings={pencilSettings}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onChangeSettings={(next) => {
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
          onNextCase={nextCase ? () => openCase(nextCase) : undefined}
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

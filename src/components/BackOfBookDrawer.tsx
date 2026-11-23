import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Lang, MurdokuCase, ProofStepKind, SuspectDef } from '../engine/types';
import type { CaseProgressState, InkStroke } from '../services/inkStorage';
import { buildVisualHintTimeline, type VisualHintStep } from '../engine/hintVisualizer';
import { UI_STRINGS } from '../data/i18n';
import { FloorplanSVG } from './FloorplanSVG';
import { TornWorkingGrid } from './TornWorkingGrid';
import { RichText } from './RichText';
import {
  IconBookOpen,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconLightbulb,
  IconPencil,
} from './Icons';

export interface BackOfBookDrawerProps {
  murdokuCase: MurdokuCase;
  lang: Lang;
  progress: CaseProgressState;
  onRevealNextHint: () => void;
  onClose: () => void;
}

const STEP_KIND_LABELS: Record<ProofStepKind, { en: string; pt: string; tone: string }> = {
  unary_single: { en: 'Single Valid Square', pt: 'Único Quadrado Válido', tone: 'emerald' },
  row_col_elimination: { en: 'Row & Col ✕', pt: 'Eliminação Linha/Col ✕', tone: 'blue' },
  relational_narrowing: { en: 'Clue Link ⇢', pt: 'Ligação de Pista ⇢', tone: 'amber' },
  hidden_single: { en: 'Hidden Single', pt: 'Única Opção na Linha/Col', tone: 'teal' },
  liar_elimination: { en: 'Liar Negation', pt: 'Negação do Mentiroso', tone: 'rose' },
  contradiction_elim: { en: 'Contradiction Check', pt: 'Teste de Contradição', tone: 'slate' },
  twist: { en: 'Chapter Twist', pt: 'Variante do Capítulo', tone: 'purple' },
  final_verdict: { en: 'Case Solved', pt: 'Caso Resolvido', tone: 'crimson' },
};

const MiniPortrait: React.FC<{
  suspect: SuspectDef;
  variant?: 'default' | 'victim' | 'murderer' | 'alibi' | 'liar';
}> = ({ suspect, variant = 'default' }) => (
  <div className={`hint-mini-polaroid hint-mini-polaroid--${variant}`}>
    <div className="hint-mini-polaroid__pic" style={{ background: suspect.cardBg }}>
      <img src={suspect.svgPath} alt={suspect.name} />
      {variant === 'alibi' && <span className="hint-mini-polaroid__slash">✕</span>}
    </div>
    <span className="hint-mini-polaroid__id">{suspect.id}</span>
  </div>
);

const VisualStepCard: React.FC<{
  visualStep: VisualHintStep;
  murdokuCase: MurdokuCase;
  lang: Lang;
  active: boolean;
  onClick: () => void;
  cardRef?: React.RefObject<HTMLButtonElement>;
}> = ({ visualStep, murdokuCase, lang, active, onClick, cardRef }) => {
  const { step, kind, suspect, secondarySuspect, victim, roomName, coordLabel, rolePairings, splitGroups } =
    visualStep;
  const badgeMeta = STEP_KIND_LABELS[kind];
  const isTwist = kind === 'twist';
  const isFinal = kind === 'final_verdict';
  const twistKind = murdokuCase.twist.kind;

  // Format room name nicely
  const formattedRoom = roomName
    ? roomName[lang]
        .toLowerCase()
        .split(' ')
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' ')
    : null;

  return (
    <button
      ref={cardRef}
      type="button"
      className={`proof-step proof-step--visual ${active ? 'is-active' : ''} ${isFinal ? 'is-final' : ''}`}
      onClick={onClick}
    >
      <div className="proof-step__left-col">
        <span className="proof-step__num">{step.stepNumber}</span>

        {/* Visual Portrait / Twist Emblem */}
        {isFinal && victim && suspect ? (
          <div className="hint-portrait-pair">
            <MiniPortrait suspect={victim} variant="victim" />
            <MiniPortrait suspect={suspect} variant="murderer" />
          </div>
        ) : isTwist && twistKind === 'time_travel' && suspect && secondarySuspect ? (
          <div className="hint-portrait-pair">
            <MiniPortrait suspect={suspect} />
            <span className="hint-swap-glyph" aria-hidden="true">⇄</span>
            <MiniPortrait suspect={secondarySuspect} />
          </div>
        ) : isTwist && twistKind === 'missing_piece' && murdokuCase.solution.correctPatchId ? (
          <div className="hint-patch-chip">
            <span className="hint-patch-chip__check">✓</span>
            <span>{murdokuCase.solution.correctPatchId}</span>
          </div>
        ) : suspect ? (
          <MiniPortrait
            suspect={suspect}
            variant={
              isTwist && twistKind === 'uninvolved'
                ? 'alibi'
                : isTwist && twistKind === 'liar'
                  ? 'liar'
                  : 'default'
            }
          />
        ) : null}
      </div>

      <div className="proof-step__body">
        <div className="proof-step__chips">
          <span className={`hint-kind-pill hint-kind-pill--${badgeMeta.tone}`}>
            {isTwist
              ? UI_STRINGS[lang].twistBadges[twistKind]
              : badgeMeta[lang]}
          </span>
          {coordLabel && (
            <span className="hint-loc-pill">
              <strong>{coordLabel}</strong>
              {formattedRoom ? ` · ${formattedRoom}` : ''}
            </span>
          )}
          {!coordLabel && formattedRoom && (
            <span className="hint-loc-pill">{formattedRoom}</span>
          )}
        </div>

        {/* Suspect's original clue reference for placement steps */}
        {!isTwist && !isFinal && suspect && !suspect.isVictim && (
          <div className="hint-clue-quote">
            <span className="hint-clue-quote__name">{suspect.name}:</span>{' '}
            <RichText text={suspect.clueText[lang]} />
          </div>
        )}

        {/* Secret Identities visual role-to-portrait chips */}
        {rolePairings && rolePairings.length > 0 && (
          <div className="hint-mini-chips-row">
            {rolePairings.map((rp, idx) => (
              <span key={idx} className="hint-role-chip">
                <img src={rp.suspect.svgPath} alt="" style={{ background: rp.suspect.cardBg }} />
                <span>
                  <strong>{rp.roleTitle[lang]}</strong> = {rp.suspect.name}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Split Grids visual headcount chips */}
        {splitGroups && splitGroups.length > 0 && (
          <div className="hint-split-groups">
            {splitGroups.map((grp, idx) => (
              <div key={idx} className="hint-split-group">
                <span className="hint-split-group__title">{grp.gridName[lang]}</span>
                <div className="hint-split-group__avatars">
                  {grp.suspects.map((s) => (
                    <span key={s.id} className="hint-avatar-pill" title={s.name}>
                      <img src={s.svgPath} alt={s.name} style={{ background: s.cardBg }} />
                      <strong>{s.id}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="proof-step__caption">
          <RichText text={step.text[lang]} />
        </div>
      </div>
    </button>
  );
};

function strokeToSvgPath(stroke: InkStroke, w: number, h: number): string {
  const pts = stroke.points;
  if (pts.length === 0) return '';
  if (pts.length === 1) {
    const x = pts[0].x * w;
    const y = pts[0].y * h;
    return `M ${x.toFixed(1)} ${y.toFixed(1)} L ${(x + 0.5).toFixed(1)} ${(y + 0.5).toFixed(1)}`;
  }
  return pts
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${(pt.x * w).toFixed(1)} ${(pt.y * h).toFixed(1)}`)
    .join(' ');
}

const InkPagePreview: React.FC<{ strokes: InkStroke[]; label: string }> = ({ strokes, label }) => {
  const W = 200;
  const H = 250;
  return (
    <div className="ink-preview-page">
      <svg className="ink-preview-svg" viewBox={`0 0 ${W} ${H}`} aria-label={label}>
        {strokes.map((s) => (
          <path
            key={s.id}
            d={strokeToSvgPath(s, W, H)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.tool === 'highlighter' ? Math.max(4, s.size * 1.8) : Math.max(1.1, s.size * 0.65)}
            strokeOpacity={s.tool === 'highlighter' ? 0.38 : 0.88}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <span className="ink-preview-page__label">{label}</span>
    </div>
  );
};

export const BackOfBookDrawer: React.FC<BackOfBookDrawerProps> = ({
  murdokuCase,
  lang,
  progress,
  onRevealNextHint,
  onClose,
}) => {
  const revealedHints = progress.revealedHints;
  const tapMarks = progress.tapMarks;
  const leftStrokes = useMemo(
    () => progress.strokes.filter((s) => s.page === 'left'),
    [progress.strokes]
  );
  const rightStrokes = useMemo(
    () => progress.strokes.filter((s) => s.page === 'right'),
    [progress.strokes]
  );

  const [tab, setTab] = useState<'hints' | 'solution'>('hints');
  const [selectedHintIdx, setSelectedHintIdx] = useState<number>(() =>
    Math.max(0, revealedHints - 1)
  );
  const [solutionPreviewIdx, setSolutionPreviewIdx] = useState<number | null>(null);
  const prevRevealedRef = useRef<number>(revealedHints);
  const activeCardRef = useRef<HTMLButtonElement>(null);

  const t = UI_STRINGS[lang];
  const timeline = useMemo(() => buildVisualHintTimeline(murdokuCase), [murdokuCase]);
  const totalSteps = timeline.length;
  const visibleSteps = timeline.slice(0, revealedHints);

  // Auto-select newly revealed hint step and scroll it smoothly into view
  useEffect(() => {
    if (revealedHints > prevRevealedRef.current) {
      setSelectedHintIdx(revealedHints - 1);
    } else if (revealedHints > 0 && selectedHintIdx >= revealedHints) {
      setSelectedHintIdx(revealedHints - 1);
    }
    prevRevealedRef.current = revealedHints;
  }, [revealedHints, selectedHintIdx]);

  useEffect(() => {
    if (tab === 'hints' && revealedHints > 0) {
      activeCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedHintIdx, revealedHints, tab]);

  const activeVisual =
    revealedHints > 0 ? visibleSteps[Math.min(selectedHintIdx, revealedHints - 1)] : null;
  const solutionVisual =
    solutionPreviewIdx !== null ? timeline[solutionPreviewIdx] ?? null : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-card--wide modal-card--bob"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="bob-header">
          <div>
            <h2 className="modal-title">
              {t.backOfBook} · {murdokuCase.number}. {murdokuCase.title[lang]}
            </h2>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <IconClose size={14} />
            <span>{t.close}</span>
          </button>
        </div>

        <div className="bob-tabs">
          <button
            type="button"
            className={`bob-tab ${tab === 'hints' ? 'active' : ''}`}
            onClick={() => setTab('hints')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <IconLightbulb size={14} />
            <span>
              {t.hintsTab} ({revealedHints}/{totalSteps})
            </span>
          </button>
          <button
            type="button"
            className={`bob-tab ${tab === 'solution' ? 'active' : ''}`}
            onClick={() => setTab('solution')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <IconBookOpen size={14} />
            <span>{t.solutionTab}</span>
          </button>
        </div>

        {tab === 'hints' ? (
          <div className="hints-visual-layout">
            {/* Left Column: Live Illustrated Step-by-Step Floorplan */}
            <div className="hints-map-pane">
              <div className="hints-map-pane__bar">
                <span className="hints-map-pane__step-label">
                  {activeVisual
                    ? lang === 'en'
                      ? `Step ${activeVisual.step.stepNumber} of ${totalSteps}`
                      : `Passo ${activeVisual.step.stepNumber} de ${totalSteps}`
                    : lang === 'en'
                      ? `Visual Walkthrough · 0/${totalSteps}`
                      : `Guia Visual · 0/${totalSteps}`}
                </span>

                {revealedHints > 1 && (
                  <div className="hints-scrubber">
                    <button
                      type="button"
                      className="hints-scrubber__btn"
                      disabled={selectedHintIdx <= 0}
                      onClick={() => setSelectedHintIdx((i) => Math.max(0, i - 1))}
                      aria-label={t.prevSpread}
                    >
                      <IconChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      className="hints-scrubber__btn"
                      disabled={selectedHintIdx >= revealedHints - 1}
                      onClick={() => setSelectedHintIdx((i) => Math.min(revealedHints - 1, i + 1))}
                      aria-label={t.nextSpread}
                    >
                      <IconChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="hints-map-frame">
                <FloorplanSVG
                  murdokuCase={murdokuCase}
                  lang={lang}
                  showCoords
                  hintOverlay={activeVisual?.overlay}
                  instanceTag="bob-hints"
                />
              </div>

              {/* Compact Visual Legend (Rules-style visual language) */}
              <div className="hints-legend" aria-label="Visual legend">
                <span className="hints-legend__item">
                  <span className="hints-dot hints-dot--active" />
                  {lang === 'en' ? 'This step' : 'Este passo'}
                </span>
                <span className="hints-legend__item">
                  <span className="hints-dot hints-dot--prior" />
                  {lang === 'en' ? 'Placed' : 'Colocado'}
                </span>
                <span className="hints-legend__item">
                  <span className="hints-x hints-x--row">✕</span>
                  {lang === 'en' ? 'Row' : 'Linha'}
                </span>
                <span className="hints-legend__item">
                  <span className="hints-x hints-x--col">✕</span>
                  {lang === 'en' ? 'Col' : 'Col.'}
                </span>
                <span className="hints-legend__item">
                  <span className="hints-arrow-swatch">⇢</span>
                  {lang === 'en' ? 'Clue link' : 'Ligação'}
                </span>
              </div>
            </div>

            {/* Right Column: Illustrated Step Cards & Reveal Action */}
            <div className="hints-cards-pane">
              {visibleSteps.length === 0 ? (
                <div className="hints-empty-card">
                  <div className="hints-empty-card__badge">
                    <IconLightbulb size={16} />
                    <span>{lang === 'en' ? 'Spoiler-Free Visual Hints' : 'Pistas Visuais Sem Spoilers'}</span>
                  </div>
                  <p className="modal-sub" style={{ marginBottom: 10 }}>
                    {t.noHintsYet}
                  </p>
                  <p className="hints-empty-card__note">
                    {lang === 'en'
                      ? 'Each revealed step highlights the exact room, marks eliminated rows & columns with blue/purple ✕, and links clues directly on the map.'
                      : 'Cada passo revelado destaca a divisão exata, marca linhas e colunas eliminadas com ✕ azul/roxo e liga as pistas diretamente na planta.'}
                  </p>
                </div>
              ) : (
                <div className="proof-list proof-list--scroll">
                  {visibleSteps.map((vs, idx) => (
                    <VisualStepCard
                      key={vs.step.stepNumber}
                      visualStep={vs}
                      murdokuCase={murdokuCase}
                      lang={lang}
                      active={idx === Math.min(selectedHintIdx, revealedHints - 1)}
                      onClick={() => setSelectedHintIdx(idx)}
                      cardRef={
                        idx === Math.min(selectedHintIdx, revealedHints - 1)
                          ? activeCardRef
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}

              <div className="hints-footer-bar">
                {revealedHints < totalSteps ? (
                  <button type="button" className="btn-primary" onClick={onRevealNextHint}>
                    {t.revealNextHint} ({revealedHints + 1}/{totalSteps})
                  </button>
                ) : (
                  <div className="hints-footer-bar__done">
                    <span style={{ fontSize: 13, color: '#55535d' }}>{t.allHintsRevealed}</span>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setTab('solution')}
                    >
                      {t.solutionTab}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Your Saved Investigation Record (status, how solved, saved notes) */}
            {(() => {
              const hintsUsed = progress.hintsUsedAtSolve ?? progress.revealedHints;
              const tries = (progress.wrongAttempts ?? 0) + (progress.solved ? 1 : 0);
              const stampCount = Object.keys(tapMarks).length;
              const strokeCount = progress.strokes.length;
              const dateLabel = progress.solvedAt
                ? new Date(progress.solvedAt).toLocaleDateString(
                    lang === 'pt' ? 'pt-PT' : 'en-US',
                    { month: 'short', day: 'numeric', year: 'numeric' }
                  )
                : null;
              return (
                <div className={`record-banner ${progress.solved ? 'record-banner--solved' : ''}`}>
                  <div className="record-banner__status">
                    {progress.solved ? <IconCheck size={15} /> : <IconPencil size={14} />}
                    <span>
                      {progress.solved
                        ? lang === 'en'
                          ? `Solved${dateLabel ? ` · ${dateLabel}` : ''}`
                          : `Resolvido${dateLabel ? ` · ${dateLabel}` : ''}`
                        : lang === 'en'
                          ? 'In Progress · Saved on this device'
                          : 'Em Curso · Guardado neste dispositivo'}
                    </span>
                  </div>
                  <div className="record-banner__chips">
                    {progress.solved && (
                      <span
                        className={`record-chip ${hintsUsed === 0 ? 'record-chip--pure' : ''}`}
                      >
                        {hintsUsed === 0
                          ? lang === 'en'
                            ? '★ Pure Deduction (0 hints)'
                            : '★ Dedução Pura (0 pistas)'
                          : lang === 'en'
                            ? `${hintsUsed} ${hintsUsed === 1 ? 'hint' : 'hints'} used`
                            : `${hintsUsed} ${hintsUsed === 1 ? 'pista usada' : 'pistas usadas'}`}
                      </span>
                    )}
                    {progress.solved && tries > 0 && (
                      <span className="record-chip">
                        {tries === 1
                          ? lang === 'en'
                            ? '1st try'
                            : '1.ª tentativa'
                          : lang === 'en'
                            ? `${tries} tries`
                            : `${tries} tentativas`}
                      </span>
                    )}
                    <span className="record-chip">
                      {lang === 'en'
                        ? `${strokeCount} ${strokeCount === 1 ? 'stroke' : 'strokes'} · ${stampCount} ${stampCount === 1 ? 'stamp' : 'stamps'}`
                        : `${strokeCount} ${strokeCount === 1 ? 'traço' : 'traços'} · ${stampCount} ${stampCount === 1 ? 'marca' : 'marcas'}`}
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="solution-compare">
              <div className="solution-box">
                <div className="solution-box__hdr">
                  <h4>
                    {solutionVisual
                      ? lang === 'en'
                        ? `Step ${solutionVisual.step.stepNumber} Replay`
                        : `Passo ${solutionVisual.step.stepNumber}`
                      : t.officialGrid}
                  </h4>
                  {solutionVisual && (
                    <button
                      type="button"
                      className="solution-reset-pill"
                      onClick={() => setSolutionPreviewIdx(null)}
                    >
                      {lang === 'en' ? 'Show Full Solution' : 'Ver Solução Completa'}
                    </button>
                  )}
                </div>
                <FloorplanSVG
                  murdokuCase={murdokuCase}
                  lang={lang}
                  showCoords
                  showSolution={!solutionVisual}
                  hintOverlay={solutionVisual?.overlay}
                  instanceTag="bob-sol"
                />
              </div>
              <div className="solution-box">
                <h4>{t.yourGridInk}</h4>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <TornWorkingGrid
                    murdokuCase={murdokuCase}
                    showObstacleAid
                    tapAssistEnabled={false}
                    tapMarks={tapMarks}
                    onUpdateTapMark={() => {}}
                    previewPatchId={murdokuCase.solution.correctPatchId}
                  />
                </div>
              </div>
            </div>

            {/* Your Saved Handwritten Notes across both book pages */}
            {progress.strokes.length > 0 && (
              <div className="ink-preview-box">
                <div className="ink-preview-box__hdr">
                  <h4>
                    <IconPencil size={13} />
                    <span>
                      {lang === 'en' ? 'Your Saved Written Notes' : 'As Tuas Anotações Guardadas'}
                    </span>
                  </h4>
                  <span>
                    {lang === 'en'
                      ? 'Automatically saved on this device'
                      : 'Guardado automaticamente neste dispositivo'}
                  </span>
                </div>
                <div className="ink-preview-spread">
                  <InkPagePreview
                    strokes={leftStrokes}
                    label={
                      lang === 'en'
                        ? `Left Page · Suspects (${leftStrokes.length})`
                        : `Página Esq. · Suspeitos (${leftStrokes.length})`
                    }
                  />
                  <InkPagePreview
                    strokes={rightStrokes}
                    label={
                      lang === 'en'
                        ? `Right Page · Map & Grid (${rightStrokes.length})`
                        : `Página Dir. · Planta e Grelha (${rightStrokes.length})`
                    }
                  />
                </div>
              </div>
            )}

            <div className="solution-proof-hdr">
              <h4>{t.completeProof}</h4>
              <span>
                {lang === 'en'
                  ? 'Tap any step to inspect it on the map above'
                  : 'Toca num passo para o ver ilustrado na planta acima'}
              </span>
            </div>
            <div className="proof-list">
              {timeline.map((vs, idx) => (
                <VisualStepCard
                  key={vs.step.stepNumber}
                  visualStep={vs}
                  murdokuCase={murdokuCase}
                  lang={lang}
                  active={solutionPreviewIdx === idx}
                  onClick={() =>
                    setSolutionPreviewIdx((cur) => (cur === idx ? null : idx))
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

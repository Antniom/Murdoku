import React, { useState } from 'react';
import type { Lang, MurdokuCase } from '../engine/types';
import { UI_STRINGS } from '../data/i18n';
import { FloorplanSVG } from './FloorplanSVG';
import { TornWorkingGrid } from './TornWorkingGrid';
import { RichText } from './RichText';
import { IconBookOpen, IconClose, IconLightbulb } from './Icons';

export interface BackOfBookDrawerProps {
  murdokuCase: MurdokuCase;
  lang: Lang;
  revealedHints: number;
  tapMarks: Record<string, string>;
  onRevealNextHint: () => void;
  onClose: () => void;
}

export const BackOfBookDrawer: React.FC<BackOfBookDrawerProps> = ({
  murdokuCase,
  lang,
  revealedHints,
  tapMarks,
  onRevealNextHint,
  onClose,
}) => {
  const [tab, setTab] = useState<'hints' | 'solution'>('hints');
  const t = UI_STRINGS[lang];
  const totalSteps = murdokuCase.proofSteps.length;
  const visibleSteps = murdokuCase.proofSteps.slice(0, revealedHints);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-card--wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
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
          <div>
            {visibleSteps.length === 0 ? (
              <p className="modal-sub">{t.noHintsYet}</p>
            ) : (
              <div className="proof-list" style={{ marginBottom: 16 }}>
                {visibleSteps.map((step) => (
                  <div key={step.stepNumber} className="proof-step">
                    <span className="proof-step__num">{step.stepNumber}</span>
                    <div>
                      <RichText text={step.text[lang]} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {revealedHints < totalSteps ? (
                <button type="button" className="btn-primary" onClick={onRevealNextHint}>
                  {t.revealNextHint} ({revealedHints + 1}/{totalSteps})
                </button>
              ) : (
                <span style={{ fontSize: 13, color: '#55535d' }}>{t.allHintsRevealed}</span>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="solution-compare">
              <div className="solution-box">
                <h4>{t.officialGrid}</h4>
                <FloorplanSVG murdokuCase={murdokuCase} lang={lang} showSolution />
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

            <h4
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 13.5,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 10px',
              }}
            >
              {t.completeProof}
            </h4>
            <div className="proof-list">
              {murdokuCase.proofSteps.map((step) => (
                <div key={step.stepNumber} className="proof-step">
                  <span className="proof-step__num">{step.stepNumber}</span>
                  <div>
                    <RichText text={step.text[lang]} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

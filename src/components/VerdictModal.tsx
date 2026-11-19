import React, { useState } from 'react';
import type { Lang, MurdokuCase } from '../engine/types';
import { UI_STRINGS } from '../data/i18n';

export interface VerdictModalProps {
  murdokuCase: MurdokuCase;
  lang: Lang;
  initialPatchId?: 'A' | 'B' | 'C' | 'D';
  onClose: () => void;
  onSolved: () => void;
  onOpenBackOfBook: () => void;
  onNextCase?: () => void;
}

export const VerdictModal: React.FC<VerdictModalProps> = ({
  murdokuCase,
  lang,
  initialPatchId,
  onClose,
  onSolved,
  onOpenBackOfBook,
  onNextCase,
}) => {
  const t = UI_STRINGS[lang];
  const nonVictims = murdokuCase.suspects.filter((s) => !s.isVictim);
  const [murdererId, setMurdererId] = useState<string>('');
  const [twistAnswer, setTwistAnswer] = useState<string>(initialPatchId ?? '');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');

  const twist = murdokuCase.twist;
  const needsTwistAnswer = twist.kind !== 'classic';

  const twistPrompt =
    twist.kind === 'outlaw'
      ? t.selectOutlaw
      : twist.kind === 'uninvolved'
        ? t.selectUninvolved
        : twist.kind === 'missing_piece'
          ? t.selectPatch
          : twist.kind === 'liar'
            ? t.selectLiar
            : '';

  const checkVerdict = () => {
    let ok = murdererId === murdokuCase.solution.murdererId;
    if (ok && twist.kind === 'outlaw') ok = twistAnswer === murdokuCase.solution.outlawId;
    if (ok && twist.kind === 'uninvolved') ok = twistAnswer === murdokuCase.solution.uninvolvedId;
    if (ok && twist.kind === 'missing_piece') ok = twistAnswer === murdokuCase.solution.correctPatchId;
    if (ok && twist.kind === 'liar') ok = twistAnswer === murdokuCase.solution.liarId;

    if (ok) {
      setStatus('correct');
      onSolved();
    } else {
      setStatus('wrong');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="modal-title">{t.accuseTitle}</h2>
        <p className="modal-sub">{t.accuseSubtitle}</p>

        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>{t.selectMurderer}</div>
        <div className="choice-grid">
          {nonVictims.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`choice-chip ${murdererId === s.id ? 'selected' : ''}`}
              onClick={() => {
                setMurdererId(s.id);
                setStatus('idle');
              }}
            >
              {s.name}
            </button>
          ))}
        </div>

        {needsTwistAnswer && (
          <>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>{twistPrompt}</div>
            <div className="choice-grid">
              {twist.kind === 'missing_piece'
                ? (['A', 'B', 'C', 'D'] as const).map((pid) => (
                    <button
                      key={pid}
                      type="button"
                      className={`choice-chip ${twistAnswer === pid ? 'selected' : ''}`}
                      onClick={() => {
                        setTwistAnswer(pid);
                        setStatus('idle');
                      }}
                    >
                      Fragment {pid}
                    </button>
                  ))
                : nonVictims.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`choice-chip ${twistAnswer === s.id ? 'selected' : ''}`}
                      onClick={() => {
                        setTwistAnswer(s.id);
                        setStatus('idle');
                      }}
                    >
                      {s.name}
                    </button>
                  ))}
            </div>
          </>
        )}

        {status === 'correct' && (
          <div className="verdict-feedback verdict-feedback--ok">
            <strong>{t.verdictCorrectTitle}</strong> {t.verdictCorrectBody}
          </div>
        )}

        {status === 'wrong' && (
          <div className="verdict-feedback verdict-feedback--err">
            <strong>{t.verdictWrongTitle}</strong> {t.verdictWrongBody}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {status === 'wrong' ? t.tryAgain : t.close}
          </button>
          {status === 'correct' ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  onClose();
                  onOpenBackOfBook();
                }}
              >
                {t.viewSolution}
              </button>
              {onNextCase && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    onClose();
                    onNextCase();
                  }}
                >
                  {t.nextCase} →
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={!murdererId || (needsTwistAnswer && !twistAnswer)}
              onClick={checkVerdict}
            >
              {t.verifyVerdict}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

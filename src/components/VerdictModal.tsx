import React, { useState } from 'react';
import type { Lang, MurdokuCase } from '../engine/types';
import type { SavedVerdictRecord } from '../services/inkStorage';
import { UI_STRINGS } from '../data/i18n';

export interface VerdictModalProps {
  murdokuCase: MurdokuCase;
  lang: Lang;
  initialPatchId?: 'A' | 'B' | 'C' | 'D';
  savedVerdict?: SavedVerdictRecord;
  alreadySolved?: boolean;
  onClose: () => void;
  onSolved: (verdict: SavedVerdictRecord) => void;
  onWrongAttempt?: () => void;
  onOpenBackOfBook: () => void;
  onNextCase?: () => void;
}

export const VerdictModal: React.FC<VerdictModalProps> = ({
  murdokuCase,
  lang,
  initialPatchId,
  savedVerdict,
  alreadySolved = false,
  onClose,
  onSolved,
  onWrongAttempt,
  onOpenBackOfBook,
  onNextCase,
}) => {
  const t = UI_STRINGS[lang];
  const nonVictims = murdokuCase.suspects.filter((s) => !s.isVictim);
  const [murdererId, setMurdererId] = useState<string>(savedVerdict?.murdererId ?? '');
  const [twistAnswer, setTwistAnswer] = useState<string>(
    savedVerdict?.twistAnswer ?? initialPatchId ?? ''
  );
  const [swapPair, setSwapPair] = useState<string[]>(savedVerdict?.swapPair ?? []);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>(
    alreadySolved && savedVerdict ? 'correct' : 'idle'
  );

  const twist = murdokuCase.twist;
  const needsSingleTwist =
    twist.kind === 'outlaw' ||
    twist.kind === 'uninvolved' ||
    twist.kind === 'missing_piece' ||
    twist.kind === 'liar' ||
    twist.kind === 'secret_identities';
  const needsSwapPair = twist.kind === 'time_travel';

  const keyRole =
    twist.kind === 'secret_identities'
      ? twist.roles.find((r) => r.id === twist.keyRoleId) ?? twist.roles[0]
      : null;

  const twistPrompt =
    twist.kind === 'outlaw'
      ? t.selectOutlaw
      : twist.kind === 'uninvolved'
        ? t.selectUninvolved
        : twist.kind === 'missing_piece'
          ? t.selectPatch
          : twist.kind === 'liar'
            ? t.selectLiar
            : twist.kind === 'secret_identities' && keyRole
              ? `${t.selectRoleHolder} ${keyRole.title[lang]}?`
              : '';

  const toggleSwapCandidate = (id: string) => {
    setStatus('idle');
    setSwapPair((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const checkVerdict = () => {
    let ok = murdererId === murdokuCase.solution.murdererId;
    if (ok && twist.kind === 'outlaw') ok = twistAnswer === murdokuCase.solution.outlawId;
    if (ok && twist.kind === 'uninvolved') ok = twistAnswer === murdokuCase.solution.uninvolvedId;
    if (ok && twist.kind === 'missing_piece') ok = twistAnswer === murdokuCase.solution.correctPatchId;
    if (ok && twist.kind === 'liar') ok = twistAnswer === murdokuCase.solution.liarId;
    if (ok && twist.kind === 'secret_identities' && keyRole) {
      ok = twistAnswer === murdokuCase.solution.roleAssignment?.[keyRole.id];
    }
    if (ok && twist.kind === 'time_travel' && murdokuCase.solution.timeSwappedPair) {
      const sortedSel = [...swapPair].sort();
      const sortedAns = [...murdokuCase.solution.timeSwappedPair].sort();
      ok = sortedSel.length === 2 && sortedSel[0] === sortedAns[0] && sortedSel[1] === sortedAns[1];
    }

    if (ok) {
      setStatus('correct');
      onSolved({
        murdererId,
        twistAnswer: needsSingleTwist ? twistAnswer : undefined,
        swapPair: needsSwapPair ? [...swapPair].sort() : undefined,
      });
    } else {
      setStatus('wrong');
      onWrongAttempt?.();
    }
  };

  const canSubmit =
    Boolean(murdererId) &&
    (!needsSingleTwist || Boolean(twistAnswer)) &&
    (!needsSwapPair || swapPair.length === 2);

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

        {needsSingleTwist && (
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

        {needsSwapPair && (
          <>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>
              {t.selectTimeSwap} ({swapPair.length}/2)
            </div>
            <div className="choice-grid">
              {nonVictims.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`choice-chip ${swapPair.includes(s.id) ? 'selected' : ''}`}
                  onClick={() => toggleSwapCandidate(s.id)}
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
              disabled={!canSubmit}
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

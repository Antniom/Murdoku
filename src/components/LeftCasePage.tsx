import React from 'react';
import type { Lang, MurdokuCase } from '../engine/types';
import { formatTwistBanner } from '../engine/clues';
import { PolaroidCard } from './PolaroidCard';
import { RichText } from './RichText';

export interface LeftCasePageProps {
  murdokuCase: MurdokuCase;
  lang: Lang;
  solved: boolean;
  solvedLabel: string;
}

export const LeftCasePage: React.FC<LeftCasePageProps> = ({
  murdokuCase,
  lang,
  solved,
  solvedLabel,
}) => {
  const twistBanner = formatTwistBanner(murdokuCase.twist, murdokuCase.rows, murdokuCase.cols);
  const isDense = murdokuCase.suspects.length >= 8;

  // Distribute suspects into 3 staggered columns exactly like the printed book (col 0, 1, 2, ...)
  const cols: [typeof murdokuCase.suspects, typeof murdokuCase.suspects, typeof murdokuCase.suspects] = [
    [],
    [],
    [],
  ];
  murdokuCase.suspects.forEach((s, idx) => {
    cols[idx % 3].push(s);
  });

  return (
    <div className="left-case-content">
      {solved && <div className="solved-ribbon">{solvedLabel}</div>}

      <header className="case-header">
        <h1 className="case-title">
          {murdokuCase.number}. {murdokuCase.title[lang]}
        </h1>
        <p className="case-subtitle">{murdokuCase.subtitle[lang]}</p>
      </header>

      {twistBanner && (
        <div className="twist-banner" role="note">
          <RichText text={twistBanner[lang]} />
        </div>
      )}

      <div className={`polaroid-grid ${isDense ? 'polaroid-grid--dense' : ''}`}>
        <div className="polaroid-col">
          {cols[0].map((s) => (
            <PolaroidCard key={s.id} suspect={s} lang={lang} />
          ))}
        </div>
        <div className="polaroid-col polaroid-col--middle">
          {cols[1].map((s) => (
            <PolaroidCard key={s.id} suspect={s} lang={lang} />
          ))}
        </div>
        <div className="polaroid-col">
          {cols[2].map((s) => (
            <PolaroidCard key={s.id} suspect={s} lang={lang} />
          ))}
        </div>
      </div>

      <span className="page-number page-number--left">{murdokuCase.pageLeft}</span>
    </div>
  );
};

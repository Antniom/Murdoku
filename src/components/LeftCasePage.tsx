import React from 'react';
import type { Lang, MurdokuCase } from '../engine/types';
import { formatTwistBanner } from '../engine/clues';
import { UI_STRINGS } from '../data/i18n';
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
  const t = UI_STRINGS[lang];
  const twistBanner = formatTwistBanner(
    murdokuCase.twist,
    murdokuCase.rows,
    murdokuCase.cols,
    murdokuCase.walkableOverrides
  );
  const isDense = murdokuCase.suspects.length >= 8 || murdokuCase.twist.kind === 'secret_identities';

  // Distribute suspects into 3 staggered columns exactly like the printed book
  const cols: [typeof murdokuCase.suspects, typeof murdokuCase.suspects, typeof murdokuCase.suspects] = [
    [],
    [],
    [],
  ];
  murdokuCase.suspects.forEach((s, idx) => {
    cols[idx % 3].push(s);
  });

  const editionPrefix =
    murdokuCase.edition === 'vol2'
      ? 'VOL. 2'
      : murdokuCase.edition === 'vol3'
        ? 'VOL. 3'
        : null;

  return (
    <div className="left-case-content">
      {solved && <div className="solved-ribbon">{solvedLabel}</div>}

      <header className="case-header">
        {murdokuCase.chapterLabel && (
          <div
            className={`case-chapter-stamp ${
              murdokuCase.edition ? `case-chapter-stamp--${murdokuCase.edition}` : ''
            }`}
          >
            {editionPrefix ? `${editionPrefix} · ` : ''}
            {murdokuCase.chapterLabel[lang]}
          </div>
        )}
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

      {/* Volume 3: Secret Identities Dossier Box */}
      {murdokuCase.twist.kind === 'secret_identities' && (
        <div className="secret-dossier" role="region" aria-label={t.secretRolesHeading}>
          <div className="secret-dossier__title">{t.secretRolesHeading}</div>
          <div className="secret-dossier__list">
            {murdokuCase.twist.roles.map((role) => (
              <div key={role.id} className="secret-dossier__item">
                <RichText text={role.clueText[lang]} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`polaroid-grid ${isDense ? 'polaroid-grid--dense' : ''}`}>
        <div className="polaroid-col">
          {cols[0].map((s) => (
            <PolaroidCard key={s.id} suspect={s} lang={lang} cardTheme={murdokuCase.cardTheme} />
          ))}
        </div>
        <div className="polaroid-col polaroid-col--middle">
          {cols[1].map((s) => (
            <PolaroidCard key={s.id} suspect={s} lang={lang} cardTheme={murdokuCase.cardTheme} />
          ))}
        </div>
        <div className="polaroid-col">
          {cols[2].map((s) => (
            <PolaroidCard key={s.id} suspect={s} lang={lang} cardTheme={murdokuCase.cardTheme} />
          ))}
        </div>
      </div>

      <span className="page-number page-number--left">{murdokuCase.pageLeft}</span>
    </div>
  );
};

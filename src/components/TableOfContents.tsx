import React from 'react';
import type { Lang, MurdokuCase } from '../engine/types';
import { UI_STRINGS } from '../data/i18n';
import { IconCheck } from './Icons';

export interface TableOfContentsProps {
  lang: Lang;
  dailyCases: MurdokuCase[];
  starterCases: MurdokuCase[];
  todayDate: string;
  solvedIds: Set<string>;
  mobilePage: 'left' | 'right';
  onSelectCase: (murdokuCase: MurdokuCase) => void;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  lang,
  dailyCases,
  starterCases,
  todayDate,
  solvedIds,
  mobilePage,
  onSelectCase,
}) => {
  const t = UI_STRINGS[lang];

  return (
    <div
      className="book-spread"
      data-mobile-page={mobilePage}
      style={{ ['--page-bg' as string]: '#f4efe5', ['--gutter-shadow' as string]: 'rgba(54,42,26,0.14)' }}
    >
      <div className="book-gutter" aria-hidden="true" />

      {/* Left Page: Daily Mystery Volume Archive */}
      <section className="book-page book-page--left">
        <h1 className="toc-heading">{t.dailyVolume}</h1>
        <p className="toc-sub">{t.dailyNotice}</p>

        <div className="toc-list">
          {dailyCases.map((c) => {
            const isToday = c.date === todayDate;
            const isSolved = solvedIds.has(c.id);
            return (
              <button key={c.id} type="button" className="toc-item" onClick={() => onSelectCase(c)}>
                <div className="toc-item__main">
                  <span className="toc-item__title">
                    {c.number}. {c.title[lang]}
                  </span>
                  <div className="toc-item__meta">
                    {c.date && <span>{c.date}</span>}
                    <span className="toc-badge">{t.difficultyLabels[c.difficulty]}</span>
                    {c.twist.kind !== 'classic' && (
                      <span className="toc-badge toc-badge--twist">{t.twistBadges[c.twist.kind]}</span>
                    )}
                    {isToday && <span className="toc-badge toc-badge--today">{t.todayBadge}</span>}
                    {isSolved && (
                      <span className="toc-badge toc-badge--solved" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <IconCheck size={11} />
                        <span>{t.solvedStamp}</span>
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>
                  p.{c.pageLeft}
                </span>
              </button>
            );
          })}
        </div>

        <span className="page-number page-number--left">2</span>
      </section>

      {/* Right Page: Starter Anthology Volume */}
      <section className="book-page book-page--right" style={{ justifyContent: 'flex-start' }}>
        <div>
          <h2 className="toc-heading">{t.starterVolume}</h2>
          <p className="toc-sub">
            {lang === 'en'
              ? `${starterCases.length} curated cases spanning Classic Book 1 rules and all Book 2/3 chapter twists.`
              : `${starterCases.length} casos curados com regras Clássicas do Livro 1 e todas as variantes dos Livros 2 e 3.`}
          </p>

          <div className="toc-list">
            {starterCases.map((c) => {
              const isSolved = solvedIds.has(c.id);
              return (
                <button key={c.id} type="button" className="toc-item" onClick={() => onSelectCase(c)}>
                  <div className="toc-item__main">
                    <span className="toc-item__title">
                      {c.number}. {c.title[lang]}
                    </span>
                    <div className="toc-item__meta">
                      <span>
                        {c.rows}×{c.cols}
                      </span>
                      <span className="toc-badge">{t.difficultyLabels[c.difficulty]}</span>
                      {c.twist.kind !== 'classic' && (
                        <span className="toc-badge toc-badge--twist">{t.twistBadges[c.twist.kind]}</span>
                      )}
                      {isSolved && (
                        <span className="toc-badge toc-badge--solved" style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <IconCheck size={11} />
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>
                    p.{c.pageLeft}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <span className="page-number page-number--right">3</span>
      </section>
    </div>
  );
};

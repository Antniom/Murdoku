import React, { useMemo, useState } from 'react';
import type { BookEdition, Lang, MurdokuCase } from '../engine/types';
import { UI_STRINGS } from '../data/i18n';
import { IconCheck } from './Icons';

export interface TableOfContentsProps {
  lang: Lang;
  dailyCases: MurdokuCase[];
  starterCases: MurdokuCase[];
  todayDate: string;
  solvedIds: Set<string>;
  onSelectCase: (murdokuCase: MurdokuCase) => void;
}

type VolumeFilter = 'all' | BookEdition;

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  lang,
  dailyCases,
  starterCases,
  todayDate,
  solvedIds,
  onSelectCase,
}) => {
  const t = UI_STRINGS[lang];
  const [volFilter, setVolFilter] = useState<VolumeFilter>('all');

  const volCounts = useMemo(() => {
    const counts = { all: starterCases.length, vol1: 0, vol2: 0, vol3: 0 };
    for (const c of starterCases) {
      const ed = c.edition ?? 'vol1';
      counts[ed] += 1;
    }
    return counts;
  }, [starterCases]);

  const filteredStarter = useMemo(() => {
    if (volFilter === 'all') return starterCases;
    return starterCases.filter((c) => (c.edition ?? 'vol1') === volFilter);
  }, [starterCases, volFilter]);

  return (
    <div
      className="book-spread"
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
                    {c.chapterLabel && (
                      <span className="toc-badge toc-badge--chapter">{c.chapterLabel[lang]}</span>
                    )}
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
          <p className="toc-sub" style={{ marginBottom: 10 }}>
            {lang === 'en'
              ? `${starterCases.length} curated cases spanning Classic Vol. 1, Vol. 2 Back in Time, and Vol. 3 Around the World.`
              : `${starterCases.length} casos curados abrangendo Vol. 1 Clássico, Vol. 2 No Tempo e Vol. 3 Volta ao Mundo.`}
          </p>

          <div className="toc-vol-tabs" role="tablist" aria-label="Book volumes">
            {([
              ['all', `${t.volAll} (${volCounts.all})`],
              ['vol1', `${t.vol1Label} (${volCounts.vol1})`],
              ['vol2', `${t.vol2Label} (${volCounts.vol2})`],
              ['vol3', `${t.vol3Label} (${volCounts.vol3})`],
            ] as Array<[VolumeFilter, string]>).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={volFilter === key}
                className={`toc-vol-pill ${volFilter === key ? 'is-active' : ''}`}
                onClick={() => setVolFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="toc-list">
            {filteredStarter.map((c) => {
              const isSolved = solvedIds.has(c.id);
              const gridLabel =
                c.twist.kind === 'split_grids'
                  ? `${c.twist.grids[0].rows}×${c.twist.grids[0].cols}+${c.twist.grids[1].rows}×${c.twist.grids[1].cols}`
                  : `${c.rows}×${c.cols}`;
              return (
                <button key={c.id} type="button" className="toc-item" onClick={() => onSelectCase(c)}>
                  <div className="toc-item__main">
                    <span className="toc-item__title">
                      {c.number}. {c.title[lang]}
                    </span>
                    <div className="toc-item__meta">
                      <span>{gridLabel}</span>
                      <span className="toc-badge">{t.difficultyLabels[c.difficulty]}</span>
                      {c.chapterLabel && (
                        <span className="toc-badge toc-badge--chapter">{c.chapterLabel[lang]}</span>
                      )}
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

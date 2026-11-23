import React, { useMemo, useState } from 'react';
import type { BookEdition, Lang, MurdokuCase } from '../engine/types';
import type { StarterCaseSummary } from '../data/starterVolume';
import { UI_STRINGS } from '../data/i18n';
import { IconCheck } from './Icons';

export interface TableOfContentsProps {
  lang: Lang;
  dailyCases: MurdokuCase[];
  starterSummaries: StarterCaseSummary[];
  todayDate: string;
  solvedIds: Set<string>;
  onSelectDailyCase: (murdokuCase: MurdokuCase) => void;
  onSelectStarterId: (id: string) => void;
}

type VolumeFilter = 'all' | BookEdition;

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  lang,
  dailyCases,
  starterSummaries,
  todayDate,
  solvedIds,
  onSelectDailyCase,
  onSelectStarterId,
}) => {
  const t = UI_STRINGS[lang];
  const [volFilter, setVolFilter] = useState<VolumeFilter>('all');

  const volCounts = useMemo(() => {
    const counts = { all: starterSummaries.length, vol1: 0, vol2: 0, vol3: 0 };
    for (const c of starterSummaries) {
      counts[c.edition] += 1;
    }
    return counts;
  }, [starterSummaries]);

  const filteredStarter = useMemo(() => {
    if (volFilter === 'all') return starterSummaries;
    return starterSummaries.filter((c) => c.edition === volFilter);
  }, [starterSummaries, volFilter]);

  return (
    <div
      className="book-spread"
      style={{ ['--page-bg' as string]: '#f4efe5', ['--gutter-shadow' as string]: 'rgba(54,42,26,0.14)' }}
    >
      <div className="book-gutter" aria-hidden="true" />

      {/* Left Page: Daily Mystery Volume Archive */}
      <section className="book-page book-page--left">
        <h1 className="toc-heading">{t.dailyVolume}</h1>
        <p className="toc-sub">
          {dailyCases.length > 0
            ? lang === 'en'
              ? `${dailyCases.length} ${dailyCases.length === 1 ? 'case' : 'cases'} in your library · ${t.dailyNotice}`
              : `${dailyCases.length} ${dailyCases.length === 1 ? 'caso' : 'casos'} na tua biblioteca · ${t.dailyNotice}`
            : t.dailyNotice}
        </p>

        <div className="toc-list">
          {dailyCases.map((c) => {
            const isToday = c.date === todayDate;
            const isSolved = solvedIds.has(c.id);
            return (
              <button key={c.id} type="button" className="toc-item" onClick={() => onSelectDailyCase(c)}>
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
              ? `${starterSummaries.length} curated cases spanning Classic Vol. 1, Vol. 2 Back in Time, and Vol. 3 Around the World.`
              : `${starterSummaries.length} casos curados abrangendo Vol. 1 Clássico, Vol. 2 No Tempo e Vol. 3 Volta ao Mundo.`}
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
              return (
                <button key={c.id} type="button" className="toc-item" onClick={() => onSelectStarterId(c.id)}>
                  <div className="toc-item__main">
                    <span className="toc-item__title">
                      {c.number}. {c.title[lang]}
                    </span>
                    <div className="toc-item__meta">
                      <span>{c.gridLabel}</span>
                      <span className="toc-badge">{t.difficultyLabels[c.difficulty]}</span>
                      {c.chapterLabel && (
                        <span className="toc-badge toc-badge--chapter">{c.chapterLabel[lang]}</span>
                      )}
                      {c.twistKind !== 'classic' && (
                        <span className="toc-badge toc-badge--twist">{t.twistBadges[c.twistKind]}</span>
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

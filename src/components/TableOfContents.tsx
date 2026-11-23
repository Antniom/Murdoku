import React, { useMemo, useState } from 'react';
import type { BookEdition, Lang, MurdokuCase } from '../engine/types';
import type { StarterCaseSummary } from '../data/starterVolume';
import type { CaseProgressSummary } from '../services/inkStorage';
import { UI_STRINGS } from '../data/i18n';
import { IconCheck, IconPencil } from './Icons';

export interface TableOfContentsProps {
  lang: Lang;
  dailyCases: MurdokuCase[];
  starterSummaries: StarterCaseSummary[];
  todayDate: string;
  solvedIds: Set<string>;
  progressMap: Record<string, CaseProgressSummary>;
  onSelectDailyCase: (murdokuCase: MurdokuCase) => void;
  onSelectStarterId: (id: string) => void;
}

type VolumeFilter = 'all' | BookEdition | 'my_work';

function formatHowBadge(summary: CaseProgressSummary, lang: Lang): string | null {
  if (!summary.solved) return null;
  const hints = summary.hintsUsedAtSolve ?? summary.revealedHints;
  if (hints === 0) {
    return lang === 'en' ? '★ Pure Deduction' : '★ Dedução Pura';
  }
  return lang === 'en'
    ? `${hints} ${hints === 1 ? 'hint' : 'hints'}`
    : `${hints} ${hints === 1 ? 'pista' : 'pistas'}`;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  lang,
  dailyCases,
  starterSummaries,
  todayDate,
  solvedIds,
  progressMap,
  onSelectDailyCase,
  onSelectStarterId,
}) => {
  const t = UI_STRINGS[lang];
  const [volFilter, setVolFilter] = useState<VolumeFilter>('all');

  const dailyStats = useMemo(() => {
    let solved = 0;
    let inProgress = 0;
    for (const c of dailyCases) {
      const s = progressMap[c.id];
      if (solvedIds.has(c.id) || s?.solved) solved++;
      else if (s?.hasWork) inProgress++;
    }
    return { solved, inProgress };
  }, [dailyCases, solvedIds, progressMap]);

  const volCounts = useMemo(() => {
    const counts = { all: starterSummaries.length, vol1: 0, vol2: 0, vol3: 0, my_work: 0, solved: 0, inProgress: 0 };
    for (const c of starterSummaries) {
      counts[c.edition] += 1;
      const s = progressMap[c.id];
      const isSolved = solvedIds.has(c.id) || Boolean(s?.solved);
      if (isSolved) {
        counts.solved += 1;
        counts.my_work += 1;
      } else if (s?.hasWork) {
        counts.inProgress += 1;
        counts.my_work += 1;
      }
    }
    return counts;
  }, [starterSummaries, solvedIds, progressMap]);

  const filteredStarter = useMemo(() => {
    if (volFilter === 'all') return starterSummaries;
    if (volFilter === 'my_work') {
      return starterSummaries.filter((c) => {
        const s = progressMap[c.id];
        return solvedIds.has(c.id) || Boolean(s?.solved) || Boolean(s?.hasWork);
      });
    }
    return starterSummaries.filter((c) => c.edition === volFilter);
  }, [starterSummaries, volFilter, solvedIds, progressMap]);

  const renderProgressBadges = (caseId: string) => {
    const summary = progressMap[caseId];
    const isSolved = solvedIds.has(caseId) || Boolean(summary?.solved);
    const hasNotes = Boolean(summary && (summary.strokeCount > 0 || summary.stampCount > 0));
    const howLabel = summary ? formatHowBadge(summary, lang) : null;

    return (
      <>
        {isSolved && (
          <span
            className="toc-badge toc-badge--solved"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
          >
            <IconCheck size={11} />
            <span>{t.solvedStamp}</span>
          </span>
        )}
        {isSolved && howLabel && (
          <span className="toc-badge toc-badge--how">{howLabel}</span>
        )}
        {!isSolved && summary?.hasWork && (
          <span
            className="toc-badge toc-badge--progress"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
          >
            <IconPencil size={10} />
            <span>{lang === 'en' ? 'In Progress' : 'Em Curso'}</span>
          </span>
        )}
        {hasNotes && isSolved && (
          <span
            className="toc-badge toc-badge--notes"
            title={
              lang === 'en'
                ? 'Handwritten notes & grid marks saved on this device'
                : 'Anotações e marcas da grelha guardadas neste dispositivo'
            }
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
          >
            <IconPencil size={10} />
            <span>{lang === 'en' ? 'Notes' : 'Notas'}</span>
          </span>
        )}
      </>
    );
  };

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
              ? `${dailyCases.length} ${dailyCases.length === 1 ? 'case' : 'cases'} in your library · ${dailyStats.solved} solved${dailyStats.inProgress > 0 ? ` · ${dailyStats.inProgress} in progress` : ''}`
              : `${dailyCases.length} ${dailyCases.length === 1 ? 'caso' : 'casos'} na tua biblioteca · ${dailyStats.solved} ${dailyStats.solved === 1 ? 'resolvido' : 'resolvidos'}${dailyStats.inProgress > 0 ? ` · ${dailyStats.inProgress} em curso` : ''}`
            : t.dailyNotice}
        </p>

        <div className="toc-list">
          {dailyCases.map((c) => {
            const isToday = c.date === todayDate;
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
                    {renderProgressBadges(c.id)}
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
              ? `${volCounts.solved}/${starterSummaries.length} solved${volCounts.inProgress > 0 ? ` · ${volCounts.inProgress} in progress` : ''} · All notes & ink saved on this device.`
              : `${volCounts.solved}/${starterSummaries.length} resolvidos${volCounts.inProgress > 0 ? ` · ${volCounts.inProgress} em curso` : ''} · Todas as notas e desenhos guardados neste dispositivo.`}
          </p>

          <div className="toc-vol-tabs" role="tablist" aria-label="Book volumes">
            {([
              ['all', `${t.volAll} (${volCounts.all})`],
              ['vol1', `${t.vol1Label} (${volCounts.vol1})`],
              ['vol2', `${t.vol2Label} (${volCounts.vol2})`],
              ['vol3', `${t.vol3Label} (${volCounts.vol3})`],
              [
                'my_work',
                `${lang === 'en' ? 'My Progress' : 'O Meu Progresso'} (${volCounts.my_work})`,
              ],
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
            {filteredStarter.length === 0 ? (
              <p className="toc-sub" style={{ padding: '12px 4px' }}>
                {lang === 'en'
                  ? 'No cases started or solved yet. Pick any mystery to begin!'
                  : 'Ainda nenhum caso iniciado ou resolvido. Escolhe um mistério para começar!'}
              </p>
            ) : (
              filteredStarter.map((c) => (
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
                      {renderProgressBadges(c.id)}
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>
                    p.{c.pageLeft}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <span className="page-number page-number--right">3</span>
      </section>
    </div>
  );
};

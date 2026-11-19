import React from 'react';
import type { Lang, MurdokuCase } from '../engine/types';
import { UI_STRINGS } from '../data/i18n';

export interface BookCoverProps {
  lang: Lang;
  todayCase: MurdokuCase | null;
  dailyLoading: boolean;
  solvedCount: number;
  totalStarter: number;
  onOpenToday: () => void;
  onOpenToc: () => void;
  onOpenRules: () => void;
  onToggleLang: () => void;
}

export const BookCover: React.FC<BookCoverProps> = ({
  lang,
  todayCase,
  dailyLoading,
  solvedCount,
  totalStarter,
  onOpenToday,
  onOpenToc,
  onOpenRules,
  onToggleLang,
}) => {
  const t = UI_STRINGS[lang];

  return (
    <div className="cover-stage">
      <section className="book-cover" aria-label={t.appTitle}>
        <div className="book-cover__spine" aria-hidden="true" />

        <div>
          <div className="cover-kicker">VOLUMES I–III · OPEN-BOOK EDITION</div>
          <h1 className="cover-title">{t.appTitle}</h1>
          <p className="cover-subtitle">{t.appSubtitle}</p>

          <div className="cover-emblem">
            <div className="cover-emblem__polaroid">
              <img src="/assets/suspects/suspect_vaughn.svg" alt="Victim Portrait" draggable={false} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: '#f3e7d2' }}>
                {todayCase ? `${t.todayBadge} · ${todayCase.title[lang]}` : t.dailyLoading}
              </div>
              <div style={{ fontSize: 12.5, color: '#cbc4bc', marginTop: 4, lineHeight: 1.4 }}>
                {todayCase ? todayCase.subtitle[lang] : t.dailyNotice}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="cover-actions">
            <button
              type="button"
              className="cover-btn cover-btn--primary"
              onClick={onOpenToday}
              disabled={dailyLoading && !todayCase}
            >
              <span>{dailyLoading && !todayCase ? t.dailyLoading : t.openTodayCase}</span>
              <span>→</span>
            </button>

            <button type="button" className="cover-btn cover-btn--secondary" onClick={onOpenToc}>
              <span>{t.browseContents}</span>
              <span>{solvedCount}/{totalStarter} ✓</span>
            </button>

            <button type="button" className="cover-btn cover-btn--ghost" onClick={onOpenRules}>
              <span>{t.howToPlay}</span>
              <span>§</span>
            </button>
          </div>

          <div className="cover-footer">
            <span>iPad &amp; Apple Pencil Ready</span>
            <button type="button" className="lang-pill" onClick={onToggleLang}>
              {lang === 'en' ? 'EN · Português' : 'PT · English'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

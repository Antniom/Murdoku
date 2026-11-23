import React from 'react';
import type { Lang, MurdokuCase } from '../engine/types';
import { UI_STRINGS } from '../data/i18n';
import { IconCheck, IconChevronRight, IconRules } from './Icons';
import { CoverDiorama } from './CoverDiorama';

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
      <section className="book-cover book-cover--living" aria-label={t.appTitle}>
        <div className="book-cover__spine" aria-hidden="true" />

        {/* Left Panel: Living Pop-Up Paper-Cutout Stop-Motion Diorama */}
        <div className="cover-diorama-panel">
          <CoverDiorama lang={lang} />
        </div>

        {/* Right Panel: Hardcover Title, Pinned Today's Case Slip & Navigation */}
        <div className="cover-info-panel">
          <div className="cover-header-block">
            <div className="cover-kicker">VOLUMES I–III · OPEN-BOOK EDITION</div>
            <h1 className="cover-title">{t.appTitle}</h1>
            <p className="cover-subtitle">{t.appSubtitle}</p>

            <div className="cover-case-slip">
              <span className="cover-case-slip__pin" aria-hidden="true" />
              <div className="cover-case-slip__badge">{t.todayBadge}</div>
              <div className="cover-case-slip__title">
                {todayCase ? todayCase.title[lang] : t.dailyLoading}
              </div>
              <div className="cover-case-slip__sub">
                {todayCase ? todayCase.subtitle[lang] : t.dailyNotice}
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
                <IconChevronRight size={16} />
              </button>

              <button type="button" className="cover-btn cover-btn--secondary" onClick={onOpenToc}>
                <span>{t.browseContents}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {solvedCount}/{totalStarter} <IconCheck size={14} />
                </span>
              </button>

              <button type="button" className="cover-btn cover-btn--ghost" onClick={onOpenRules}>
                <span>{t.howToPlay}</span>
                <IconRules size={15} />
              </button>
            </div>

            <div className="cover-footer">
              <span>iPad &amp; Apple Pencil Ready · v2.3.5</span>
              <button type="button" className="lang-pill" onClick={onToggleLang}>
                {lang === 'en' ? 'EN · Português' : 'PT · English'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

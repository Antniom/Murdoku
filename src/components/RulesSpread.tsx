import React from 'react';
import type { Lang } from '../engine/types';
import { UI_STRINGS } from '../data/i18n';

export interface RulesSpreadProps {
  lang: Lang;
  mobilePage: 'left' | 'right';
}

export const RulesSpread: React.FC<RulesSpreadProps> = ({ lang, mobilePage }) => {
  const t = UI_STRINGS[lang];

  return (
    <div
      className="book-spread"
      data-mobile-page={mobilePage}
      style={{ ['--page-bg' as string]: '#f4efe5', ['--gutter-shadow' as string]: 'rgba(54,42,26,0.14)' }}
    >
      <div className="book-gutter" aria-hidden="true" />

      <section className="book-page book-page--left">
        <h1 className="toc-heading">{t.rulesTitle}</h1>
        <p className="toc-sub">{t.rulesSubtitle}</p>

        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, margin: '14px 0 8px' }}>
          {t.coreRulesHeading}
        </h3>
        <ol style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5, lineHeight: 1.5 }}>
          {t.coreRulesList.map((rule, idx) => (
            <li key={idx}>{rule}</li>
          ))}
        </ol>

        <div
          style={{
            marginTop: 22,
            padding: '12px 14px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.75)',
            border: '1px solid rgba(24,24,34,0.12)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13.5, marginBottom: 4 }}>
            ✏️ {t.pencilTipsHeading}
          </div>
          <p style={{ margin: 0, fontSize: 12.8, lineHeight: 1.48, color: '#3b3a40' }}>
            {t.pencilTipsBody}
          </p>
        </div>

        <span className="page-number page-number--left">4</span>
      </section>

      <section className="book-page book-page--right" style={{ justifyContent: 'flex-start' }}>
        <div>
          <h2 className="toc-heading">{t.twistsHeading}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
            {t.twistExplanations.map((tw) => (
              <div
                key={tw.badge}
                style={{
                  background: 'rgba(255,255,255,0.78)',
                  border: '1px solid rgba(24,24,34,0.12)',
                  borderRadius: 10,
                  padding: '12px 14px',
                }}
              >
                <span className="toc-badge toc-badge--twist">{tw.badge}</span>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, margin: '6px 0 4px' }}>
                  {tw.title}
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.46, color: '#3b3a40' }}>{tw.body}</p>
              </div>
            ))}
          </div>
        </div>

        <span className="page-number page-number--right">5</span>
      </section>
    </div>
  );
};

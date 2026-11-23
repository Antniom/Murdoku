import React from 'react';
import type { CardThemeId, Lang, SuspectDef, ThemeAccessoryId } from '../engine/types';
import { RichText } from './RichText';

const AccessoryOverlay: React.FC<{ accessory?: ThemeAccessoryId }> = ({ accessory }) => {
  if (!accessory || accessory === 'none') return null;

  if (accessory === 'lab_goggles') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <rect
          x="29"
          y="39"
          width="19"
          height="11"
          rx="3"
          fill="rgba(255,255,255,0.68)"
          stroke="#ffffff"
          strokeWidth="2.2"
        />
        <rect
          x="52"
          y="39"
          width="19"
          height="11"
          rx="3"
          fill="rgba(255,255,255,0.68)"
          stroke="#ffffff"
          strokeWidth="2.2"
        />
        <line x1="48" y1="44" x2="52" y2="44" stroke="#ffffff" strokeWidth="2.2" />
      </svg>
    );
  }

  if (accessory === 'lab_mask') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <path
          d="M34 52 Q50 56 66 52 L64 67 Q50 72 36 67 Z"
          fill="#eef5fa"
          stroke="#c8d8e6"
          strokeWidth="1.4"
        />
      </svg>
    );
  }

  if (accessory === 'western_bandana') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <path
          d="M31 67 Q50 72 69 67 L50 86 Z"
          fill="#b83b2f"
          stroke="#752018"
          strokeWidth="1.4"
        />
        <circle cx="50" cy="75" r="2.2" fill="#f4e6d2" />
      </svg>
    );
  }

  if (accessory === 'masquerade_mask') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <path
          d="M27 42 Q38 35 50 42 Q62 35 73 42 Q71 52 57 50 Q50 48 43 50 Q29 52 27 42 Z"
          fill="#35284c"
          stroke="#d9b86c"
          strokeWidth="1.5"
        />
        <ellipse cx="39" cy="44" rx="5" ry="3" fill="#f7e6d6" />
        <ellipse cx="61" cy="44" rx="5" ry="3" fill="#f7e6d6" />
      </svg>
    );
  }

  return null;
};

const CardFrameOrnament: React.FC<{ theme?: CardThemeId }> = ({ theme }) => {
  if (!theme || theme === 'classic') return null;

  if (theme === 'egypt') {
    return (
      <svg className="polaroid-ornament polaroid-ornament--top" viewBox="0 0 80 14" aria-hidden="true">
        <path d="M10 9 Q24 2 34 9 M70 9 Q56 2 46 9" fill="none" stroke="#b5842a" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="40" cy="7" r="4.5" fill="#d9a43b" stroke="#2d4c7a" strokeWidth="1.4" />
      </svg>
    );
  }
  if (theme === 'stone_age') {
    return (
      <svg className="polaroid-ornament polaroid-ornament--top" viewBox="0 0 80 12" aria-hidden="true">
        <path d="M18 8 L24 3 L30 8 M50 8 L56 3 L62 8" fill="none" stroke="#5b4632" strokeWidth="2" strokeLinecap="round" />
        <circle cx="40" cy="6" r="2.8" fill="#8b6f4e" stroke="#3c2a18" strokeWidth="1.2" />
      </svg>
    );
  }
  if (theme === 'medieval') {
    return (
      <svg className="polaroid-ornament polaroid-ornament--top" viewBox="0 0 80 14" aria-hidden="true">
        <path d="M31 11 L33 4 L37 8 L40 3 L43 8 L47 4 L49 11 Z" fill="#d4ab53" stroke="#2d3448" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    );
  }
  if (theme === 'pirate') {
    return (
      <svg className="polaroid-ornament polaroid-ornament--corners" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <circle cx="7" cy="7" r="2.6" fill="#c79b4b" stroke="#263b42" strokeWidth="1" />
        <circle cx="93" cy="7" r="2.6" fill="#c79b4b" stroke="#263b42" strokeWidth="1" />
        <circle cx="7" cy="93" r="2.6" fill="#c79b4b" stroke="#263b42" strokeWidth="1" />
        <circle cx="93" cy="93" r="2.6" fill="#c79b4b" stroke="#263b42" strokeWidth="1" />
      </svg>
    );
  }
  if (theme === 'wild_west') {
    return (
      <svg className="polaroid-ornament polaroid-ornament--top" viewBox="0 0 80 14" aria-hidden="true">
        <polygon
          points="40,1.5 42,5.6 46.5,6.2 43.2,9.2 44,13.5 40,11.3 36,13.5 36.8,9.2 33.5,6.2 38,5.6"
          fill="#d9a441"
          stroke="#593316"
          strokeWidth="1.1"
        />
      </svg>
    );
  }
  if (theme === 'antarctica') {
    return (
      <svg className="polaroid-ornament polaroid-ornament--top" viewBox="0 0 80 14" aria-hidden="true">
        <g stroke="#2a6899" strokeWidth="1.5" strokeLinecap="round" transform="translate(40, 7)">
          <line x1="-5" y1="0" x2="5" y2="0" />
          <line x1="0" y1="-5" x2="0" y2="5" />
          <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" />
          <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" />
        </g>
      </svg>
    );
  }
  if (theme === 'asia') {
    return (
      <svg className="polaroid-ornament polaroid-ornament--corners" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M4 16 V4 H16 M84 4 H96 V16 M4 84 V96 H16 M84 96 H96 V84" fill="none" stroke="#b33434" strokeWidth="3.2" />
      </svg>
    );
  }
  if (theme === 'africa') {
    return (
      <svg className="polaroid-ornament polaroid-ornament--top" viewBox="0 0 80 12" aria-hidden="true">
        <polyline points="14,8 22,3 30,8 38,3 46,8 54,3 62,8" fill="none" stroke="#9c4a20" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (theme === 'europe') {
    return (
      <svg className="polaroid-ornament polaroid-ornament--corners" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M5 17 Q5 5 17 5 M83 5 Q95 5 95 17 M5 83 Q5 95 17 95 M83 95 Q95 95 95 83" fill="none" stroke="#b89246" strokeWidth="2.8" />
      </svg>
    );
  }
  if (theme === 'americas') {
    return (
      <svg className="polaroid-ornament polaroid-ornament--top" viewBox="0 0 80 12" aria-hidden="true">
        <polygon points="40,2 45,6 40,10 35,6" fill="#237d87" stroke="#8a4424" strokeWidth="1.2" />
      </svg>
    );
  }
  if (theme === 'oceania') {
    return (
      <svg className="polaroid-ornament polaroid-ornament--top" viewBox="0 0 80 12" aria-hidden="true">
        <path d="M22 8 Q31 2 40 8 Q49 2 58 8" fill="none" stroke="#1e7b85" strokeWidth="2.1" strokeLinecap="round" />
      </svg>
    );
  }
  return null;
};

export interface PolaroidCardProps {
  suspect: SuspectDef;
  lang: Lang;
  cardTheme?: CardThemeId;
}

export const PolaroidCard: React.FC<PolaroidCardProps> = ({ suspect, lang, cardTheme }) => {
  const themeClass = cardTheme && cardTheme !== 'classic' ? `suspect-card--${cardTheme}` : '';
  return (
    <article className={`suspect-card ${themeClass}`} aria-label={suspect.name}>
      <div className={`polaroid-frame ${suspect.isVictim ? 'polaroid-frame--victim' : ''}`}>
        <CardFrameOrnament theme={cardTheme} />
        <div className="polaroid-photo" style={{ backgroundColor: suspect.cardBg }}>
          <img src={suspect.svgPath} alt={suspect.name} draggable={false} />
          <AccessoryOverlay accessory={suspect.accessory} />
          {suspect.isVictim && (
            <svg className="victim-red-x" viewBox="0 0 100 100" aria-hidden="true">
              <line
                x1="12"
                y1="14"
                x2="88"
                y2="86"
                stroke="#d22c2c"
                strokeWidth="7.5"
                strokeLinecap="round"
              />
              <line
                x1="88"
                y1="14"
                x2="12"
                y2="86"
                stroke="#d22c2c"
                strokeWidth="7.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
        <div className="polaroid-name">{suspect.name}</div>
      </div>

      <div className={`clue-pill ${suspect.isVictim ? 'clue-pill--victim' : ''}`}>
        <RichText text={suspect.clueText[lang]} />
      </div>
    </article>
  );
};

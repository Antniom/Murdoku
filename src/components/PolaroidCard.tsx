import React from 'react';
import type { Lang, SuspectDef, ThemeAccessoryId } from '../engine/types';
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

export interface PolaroidCardProps {
  suspect: SuspectDef;
  lang: Lang;
}

export const PolaroidCard: React.FC<PolaroidCardProps> = ({ suspect, lang }) => {
  return (
    <article className="suspect-card" aria-label={suspect.name}>
      <div className={`polaroid-frame ${suspect.isVictim ? 'polaroid-frame--victim' : ''}`}>
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

import React from 'react';
import type { CardThemeId, Lang, SuspectDef, ThemeAccessoryId } from '../engine/types';
import { RichText } from './RichText';

type VisualAccessoryId =
  | Exclude<ThemeAccessoryId, 'none'>
  | 'cowboy_hat'
  | 'sheriff_star'
  | 'pirate_hat'
  | 'pirate_bandana'
  | 'eye_patch'
  | 'pharaoh_circlet'
  | 'egypt_lotus'
  | 'medieval_plume'
  | 'medieval_crown'
  | 'vine_crown'
  | 'bone_pin'
  | 'winter_beanie'
  | 'winter_scarf'
  | 'sakura_pin'
  | 'bamboo_hat'
  | 'safari_hat'
  | 'beaded_band'
  | 'parisian_beret'
  | 'monocle'
  | 'explorer_hat'
  | 'andean_band'
  | 'hibiscus_flower'
  | 'coastal_shades'
  | 'detective_specs';

function suspectHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

function resolveVisualAccessory(
  suspect: SuspectDef,
  cardTheme?: CardThemeId
): VisualAccessoryId | null {
  if (suspect.accessory && suspect.accessory !== 'none') {
    return suspect.accessory;
  }

  // Keep the Victim's face super clear under the red X (only subtle non-face items if any)
  if (suspect.isVictim) return null;

  const idx = suspectHash(suspect.id + suspect.name);

  switch (cardTheme) {
    case 'wild_west': {
      const pool: VisualAccessoryId[] = ['cowboy_hat', 'western_bandana', 'sheriff_star'];
      return pool[idx % pool.length];
    }
    case 'pirate': {
      const pool: VisualAccessoryId[] = ['pirate_hat', 'pirate_bandana', 'eye_patch'];
      return pool[idx % pool.length];
    }
    case 'egypt': {
      const pool: VisualAccessoryId[] = ['pharaoh_circlet', 'egypt_lotus'];
      return pool[idx % pool.length];
    }
    case 'medieval': {
      const pool: VisualAccessoryId[] = ['medieval_plume', 'medieval_crown'];
      return pool[idx % pool.length];
    }
    case 'stone_age': {
      const pool: VisualAccessoryId[] = ['vine_crown', 'bone_pin'];
      return pool[idx % pool.length];
    }
    case 'antarctica': {
      const pool: VisualAccessoryId[] = ['winter_beanie', 'winter_scarf', 'lab_goggles'];
      return pool[idx % pool.length];
    }
    case 'asia': {
      const pool: VisualAccessoryId[] = ['sakura_pin', 'bamboo_hat'];
      return pool[idx % pool.length];
    }
    case 'africa': {
      const pool: VisualAccessoryId[] = ['safari_hat', 'beaded_band'];
      return pool[idx % pool.length];
    }
    case 'europe': {
      const pool: VisualAccessoryId[] = ['masquerade_mask', 'parisian_beret', 'monocle'];
      return pool[idx % pool.length];
    }
    case 'americas': {
      const pool: VisualAccessoryId[] = ['explorer_hat', 'andean_band'];
      return pool[idx % pool.length];
    }
    case 'oceania': {
      const pool: VisualAccessoryId[] = ['hibiscus_flower', 'coastal_shades'];
      return pool[idx % pool.length];
    }
    case 'around_world': {
      const pool: Array<VisualAccessoryId | null> = ['detective_specs', 'parisian_beret', 'monocle', null];
      return pool[idx % pool.length];
    }
    case 'classic':
    default: {
      // Subtle classic detective touches on select suspects while keeping Vol. 1 authentic
      const pool: Array<VisualAccessoryId | null> = ['detective_specs', null, 'monocle', null, 'parisian_beret', null];
      return pool[idx % pool.length];
    }
  }
}

const AccessoryOverlay: React.FC<{ accessory: VisualAccessoryId | null }> = ({ accessory }) => {
  if (!accessory) return null;

  if (accessory === 'lab_goggles') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <rect x="28" y="39" width="19" height="11" rx="3.5" fill="rgba(220,242,255,0.68)" stroke="#ffffff" strokeWidth="2.1" />
        <rect x="53" y="39" width="19" height="11" rx="3.5" fill="rgba(220,242,255,0.68)" stroke="#ffffff" strokeWidth="2.1" />
        <line x1="47" y1="44" x2="53" y2="44" stroke="#ffffff" strokeWidth="2.1" />
        <line className="acc-glint" x1="31" y1="48" x2="39" y2="40" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
        <line className="acc-glint" x1="56" y1="48" x2="64" y2="40" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (accessory === 'lab_mask') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <path
          d="M34 52 Q50 56 66 52 L64 67 Q50 72 36 67 Z"
          fill="#eef5fa"
          stroke="#9ab6ce"
          strokeWidth="1.4"
        />
        <line x1="39" y1="58" x2="61" y2="58" stroke="#c3d7e8" strokeWidth="1" />
        <line x1="40" y1="63" x2="60" y2="63" stroke="#c3d7e8" strokeWidth="1" />
      </svg>
    );
  }

  if (accessory === 'western_bandana') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <g className="acc-flutter" style={{ transformOrigin: '50px 72px' }}>
          <path d="M31 69 Q50 74 69 69 L50 88 Z" fill="#b83b2f" stroke="#752018" strokeWidth="1.4" />
          <circle cx="50" cy="77" r="2.2" fill="#f4e6d2" />
          <circle cx="43" cy="74" r="1.1" fill="#f4e6d2" />
          <circle cx="57" cy="74" r="1.1" fill="#f4e6d2" />
        </g>
      </svg>
    );
  }

  if (accessory === 'cowboy_hat') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <g className="acc-bob-soft" style={{ transformOrigin: '50px 18px' }}>
          <path d="M16 20 Q50 27 84 20 Q72 15 66 15 L63 4 Q55 9 50 7 Q45 9 37 4 L34 15 Q28 15 16 20 Z" fill="#8b5a2b" stroke="#472a11" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M34 15 Q50 18 66 15" fill="none" stroke="#d9a441" strokeWidth="2.2" />
        </g>
      </svg>
    );
  }

  if (accessory === 'sheriff_star') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <g className="acc-glint" style={{ transformOrigin: '66px 82px' }}>
          <polygon
            points="66,74 68,79 73,79.5 69,83 70,88 66,85.5 62,88 63,83 59,79.5 64,79"
            fill="#e5b84b"
            stroke="#6b4314"
            strokeWidth="1.1"
          />
        </g>
      </svg>
    );
  }

  if (accessory === 'pirate_hat') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <g className="acc-bob-soft" style={{ transformOrigin: '50px 16px' }}>
          {/* Bobbing crimson plume */}
          <path className="acc-feather" style={{ transformOrigin: '67px 14px' }} d="M67 14 Q79 4 86 9 Q78 16 67 16 Z" fill="#c9362b" stroke="#6e1912" strokeWidth="1" />
          <path d="M17 19 Q50 24 83 19 Q74 8 60 6 Q50 12 40 6 Q26 8 17 19 Z" fill="#242c33" stroke="#111519" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M22 17 Q50 21 78 17" fill="none" stroke="#d6ad57" strokeWidth="1.6" />
          <circle cx="50" cy="13" r="2.2" fill="#f4efe5" />
        </g>
      </svg>
    );
  }

  if (accessory === 'pirate_bandana') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M26 22 Q50 14 74 22 L72 14 Q50 7 28 14 Z" fill="#a82c2c" stroke="#5e1515" strokeWidth="1.3" />
        <g className="acc-flutter" style={{ transformOrigin: '73px 20px' }}>
          <path d="M73 19 Q83 22 86 29 Q79 28 73 24 Z" fill="#a82c2c" stroke="#5e1515" strokeWidth="1.1" />
        </g>
        <circle className="acc-glint" cx="24" cy="48" r="2.8" fill="none" stroke="#e3b648" strokeWidth="1.6" />
      </svg>
    );
  }

  if (accessory === 'eye_patch') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <line x1="28" y1="30" x2="72" y2="48" stroke="#1c1c21" strokeWidth="1.6" />
        <ellipse cx="40" cy="42" rx="7.5" ry="5.5" fill="#1c1c21" stroke="#45454e" strokeWidth="1" />
        <circle className="acc-glint" cx="76" cy="48" r="2.8" fill="none" stroke="#e3b648" strokeWidth="1.6" />
      </svg>
    );
  }

  if (accessory === 'pharaoh_circlet') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M27 21 Q50 15 73 21" fill="none" stroke="#d9a43b" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M29 21 Q50 16 71 21" fill="none" stroke="#28588a" strokeWidth="1.2" strokeDasharray="4 4" />
        <g className="acc-glint" style={{ transformOrigin: '50px 16px' }}>
          <polygon points="50,9 54,16 50,21 46,16" fill="#2aa3b8" stroke="#8c6115" strokeWidth="1.1" />
        </g>
      </svg>
    );
  }

  if (accessory === 'egypt_lotus') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <g className="acc-sway" style={{ transformOrigin: '70px 23px' }}>
          <path d="M70 24 Q63 14 68 9 Q73 14 70 24 Z" fill="#32a4b0" stroke="#1c5c66" strokeWidth="1" />
          <path d="M70 24 Q72 11 79 11 Q78 18 70 24 Z" fill="#e5b84b" stroke="#855f16" strokeWidth="1" />
          <path d="M70 24 Q78 16 83 20 Q77 25 70 24 Z" fill="#32a4b0" stroke="#1c5c66" strokeWidth="1" />
        </g>
      </svg>
    );
  }

  if (accessory === 'medieval_plume') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <g className="acc-bob-soft" style={{ transformOrigin: '50px 16px' }}>
          <path className="acc-feather" style={{ transformOrigin: '66px 13px' }} d="M66 14 Q79 2 87 8 Q77 16 66 16 Z" fill="#f4efe5" stroke="#8b7d65" strokeWidth="1.1" />
          <path d="M26 19 Q50 8 74 18 Q68 23 50 21 Q32 23 26 19 Z" fill="#38476b" stroke="#1d2538" strokeWidth="1.3" />
        </g>
      </svg>
    );
  }

  if (accessory === 'medieval_crown') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <g className="acc-bob-soft" style={{ transformOrigin: '50px 15px' }}>
          <path d="M32 19 L35 8 L43 14 L50 5 L57 14 L65 8 L68 19 Z" fill="#dfb34c" stroke="#6b4b12" strokeWidth="1.3" strokeLinejoin="round" />
          <circle className="acc-glint" cx="50" cy="14" r="2" fill="#b82b2b" />
        </g>
      </svg>
    );
  }

  if (accessory === 'vine_crown') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M29 21 Q50 14 71 21" fill="none" stroke="#63482d" strokeWidth="2.2" strokeLinecap="round" />
        <g className="acc-sway" style={{ transformOrigin: '66px 18px' }}>
          <path d="M66 19 Q73 9 80 12 Q75 20 66 19 Z" fill="#5e8c49" stroke="#2d4c20" strokeWidth="1" />
        </g>
        <g className="acc-sway acc-delay-1" style={{ transformOrigin: '36px 18px' }}>
          <path d="M36 19 Q28 10 22 14 Q28 21 36 19 Z" fill="#6da155" stroke="#2d4c20" strokeWidth="1" />
        </g>
      </svg>
    );
  }

  if (accessory === 'bone_pin') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <g className="acc-sway" style={{ transformOrigin: '70px 18px' }}>
          <line x1="60" y1="22" x2="78" y2="12" stroke="#f5eee0" strokeWidth="3.6" strokeLinecap="round" />
          <line x1="60" y1="22" x2="78" y2="12" stroke="#6c5840" strokeWidth="1.1" strokeLinecap="round" />
          <circle cx="78" cy="11" r="2.2" fill="#f5eee0" stroke="#6c5840" strokeWidth="1" />
          <circle cx="80" cy="14" r="2.2" fill="#f5eee0" stroke="#6c5840" strokeWidth="1" />
        </g>
      </svg>
    );
  }

  if (accessory === 'winter_beanie') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <g className="acc-bob-soft" style={{ transformOrigin: '50px 18px' }}>
          <circle className="acc-pom" style={{ transformOrigin: '50px 7px' }} cx="50" cy="6.5" r="5" fill="#f7fbff" stroke="#36628a" strokeWidth="1.2" />
          <path d="M27 21 Q29 7 50 7 Q71 7 73 21 Z" fill="#3b78ab" stroke="#1e4466" strokeWidth="1.3" />
          <rect x="25" y="18" width="50" height="6" rx="3" fill="#e6f2fa" stroke="#1e4466" strokeWidth="1.2" />
        </g>
      </svg>
    );
  }

  if (accessory === 'winter_scarf') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M30 70 Q50 76 70 70 L68 79 Q50 84 32 79 Z" fill="#c9443e" stroke="#6e1e1a" strokeWidth="1.2" />
        <g className="acc-flutter" style={{ transformOrigin: '61px 76px' }}>
          <path d="M58 76 L67 75 L71 91 L61 92 Z" fill="#c9443e" stroke="#6e1e1a" strokeWidth="1.2" />
          <line x1="60" y1="84" x2="69" y2="83" stroke="#f7e6d4" strokeWidth="2" />
        </g>
      </svg>
    );
  }

  if (accessory === 'sakura_pin') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <g className="acc-sway" style={{ transformOrigin: '70px 24px' }}>
          <circle cx="70" cy="20" r="3.4" fill="#f7b7c6" stroke="#b34c66" strokeWidth="0.9" />
          <circle cx="74" cy="23" r="3.4" fill="#f7b7c6" stroke="#b34c66" strokeWidth="0.9" />
          <circle cx="72" cy="28" r="3.4" fill="#f7b7c6" stroke="#b34c66" strokeWidth="0.9" />
          <circle cx="67" cy="27" r="3.4" fill="#f7b7c6" stroke="#b34c66" strokeWidth="0.9" />
          <circle cx="66" cy="22" r="3.4" fill="#f7b7c6" stroke="#b34c66" strokeWidth="0.9" />
          <circle cx="70" cy="24" r="2" fill="#f4d06f" />
        </g>
      </svg>
    );
  }

  if (accessory === 'bamboo_hat') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <g className="acc-bob-soft" style={{ transformOrigin: '50px 18px' }}>
          <path d="M12 22 L50 5 L88 22 Q50 26 12 22 Z" fill="#d9c087" stroke="#6b5428" strokeWidth="1.4" strokeLinejoin="round" />
          <line x1="50" y1="6" x2="30" y2="22" stroke="#a68649" strokeWidth="0.9" />
          <line x1="50" y1="6" x2="70" y2="22" stroke="#a68649" strokeWidth="0.9" />
        </g>
      </svg>
    );
  }

  if (accessory === 'safari_hat') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <g className="acc-bob-soft" style={{ transformOrigin: '50px 18px' }}>
          <path d="M21 20 Q50 24 79 20 Q72 16 70 15 Q68 6 50 6 Q32 6 30 15 Q28 16 21 20 Z" fill="#d8c39b" stroke="#695230" strokeWidth="1.4" />
          <path d="M30 15 Q50 18 70 15" fill="none" stroke="#8f4c24" strokeWidth="2.4" />
        </g>
      </svg>
    );
  }

  if (accessory === 'beaded_band') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M26 22 Q50 16 74 22" fill="none" stroke="#b55224" strokeWidth="3.6" strokeLinecap="round" />
        <path className="acc-glint" d="M29 21 Q50 16 71 21" fill="none" stroke="#f2cc6b" strokeWidth="2" strokeDasharray="3 5" strokeLinecap="round" />
      </svg>
    );
  }

  if (accessory === 'masquerade_mask') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <path
          className="acc-feather"
          style={{ transformOrigin: '71px 40px' }}
          d="M71 41 Q82 26 88 30 Q81 39 72 43 Z"
          fill="#d9b86c"
          stroke="#6b4e16"
          strokeWidth="1"
        />
        <path
          d="M27 42 Q38 35 50 42 Q62 35 73 42 Q71 52 57 50 Q50 48 43 50 Q29 52 27 42 Z"
          fill="#35284c"
          stroke="#d9b86c"
          strokeWidth="1.5"
        />
        <ellipse cx="39" cy="44" rx="5" ry="3" fill="#f7e6d6" />
        <ellipse cx="61" cy="44" rx="5" ry="3" fill="#f7e6d6" />
        <circle className="acc-glint" cx="50" cy="41" r="1.8" fill="#f7dc88" />
      </svg>
    );
  }

  if (accessory === 'parisian_beret') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <g className="acc-bob-soft" style={{ transformOrigin: '48px 16px' }}>
          <path d="M24 20 Q22 8 48 7 Q72 6 75 18 Q52 22 24 20 Z" fill="#6b273c" stroke="#36101c" strokeWidth="1.3" />
          <path d="M47 7 Q49 3 52 4" fill="none" stroke="#36101c" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      </svg>
    );
  }

  if (accessory === 'monocle') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="60" cy="44" r="6.8" fill="rgba(255,255,255,0.28)" stroke="#c79b3b" strokeWidth="1.8" />
        <line className="acc-glint" x1="57" y1="47" x2="63" y2="41" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
        <path className="acc-flutter" style={{ transformOrigin: '67px 45px' }} d="M67 45 Q72 58 69 74" fill="none" stroke="#c79b3b" strokeWidth="1.1" strokeDasharray="2 2" />
      </svg>
    );
  }

  if (accessory === 'explorer_hat') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <g className="acc-bob-soft" style={{ transformOrigin: '50px 18px' }}>
          <path className="acc-feather" style={{ transformOrigin: '67px 14px' }} d="M67 14 Q77 4 82 8 Q75 16 67 16 Z" fill="#2aa3ad" stroke="#145c63" strokeWidth="1" />
          <path d="M18 20 Q50 25 82 20 Q72 15 67 14 L63 6 Q50 4 37 6 L33 14 Q28 15 18 20 Z" fill="#7d583c" stroke="#3b2616" strokeWidth="1.4" />
          <path d="M33 14 Q50 17 67 14" fill="none" stroke="#c96b3b" strokeWidth="2.2" />
        </g>
      </svg>
    );
  }

  if (accessory === 'andean_band') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M26 22 Q50 15 74 22" fill="none" stroke="#1e7580" strokeWidth="3.8" strokeLinecap="round" />
        <path d="M29 21 Q50 15 71 21" fill="none" stroke="#e09a48" strokeWidth="1.8" strokeDasharray="4 4" strokeLinecap="round" />
        <g className="acc-flutter" style={{ transformOrigin: '74px 22px' }}>
          <line x1="74" y1="22" x2="77" y2="33" stroke="#c94b3b" strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>
    );
  }

  if (accessory === 'hibiscus_flower') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <g className="acc-sway" style={{ transformOrigin: '71px 25px' }}>
          <circle cx="71" cy="20" r="4.2" fill="#eb6c5b" stroke="#9e2f22" strokeWidth="0.9" />
          <circle cx="76" cy="24" r="4.2" fill="#eb6c5b" stroke="#9e2f22" strokeWidth="0.9" />
          <circle cx="73" cy="29" r="4.2" fill="#eb6c5b" stroke="#9e2f22" strokeWidth="0.9" />
          <circle cx="67" cy="28" r="4.2" fill="#eb6c5b" stroke="#9e2f22" strokeWidth="0.9" />
          <circle cx="66" cy="23" r="4.2" fill="#eb6c5b" stroke="#9e2f22" strokeWidth="0.9" />
          <circle cx="71" cy="25" r="2.2" fill="#f7d55b" />
        </g>
      </svg>
    );
  }

  if (accessory === 'coastal_shades') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <rect x="29" y="39" width="18" height="10" rx="4" fill="#183f47" stroke="#f2e6d0" strokeWidth="1.6" />
        <rect x="53" y="39" width="18" height="10" rx="4" fill="#183f47" stroke="#f2e6d0" strokeWidth="1.6" />
        <line x1="47" y1="43" x2="53" y2="43" stroke="#f2e6d0" strokeWidth="1.6" />
        <line className="acc-glint" x1="32" y1="47" x2="40" y2="40" stroke="#78e3e8" strokeWidth="2" strokeLinecap="round" />
        <line className="acc-glint" x1="56" y1="47" x2="64" y2="40" stroke="#78e3e8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (accessory === 'detective_specs') {
    return (
      <svg className="polaroid-accessory" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="39" cy="44" r="6.8" fill="rgba(255,255,255,0.22)" stroke="#2c2933" strokeWidth="1.7" />
        <circle cx="61" cy="44" r="6.8" fill="rgba(255,255,255,0.22)" stroke="#2c2933" strokeWidth="1.7" />
        <line x1="46" y1="44" x2="54" y2="44" stroke="#2c2933" strokeWidth="1.7" />
        <line className="acc-glint" x1="36" y1="47" x2="42" y2="41" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" />
        <line className="acc-glint" x1="58" y1="47" x2="64" y2="41" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" />
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
  const visualAccessory = resolveVisualAccessory(suspect, cardTheme);
  const hash = suspectHash(suspect.id + suspect.name);
  const idleVariant = hash % 3;
  const idleDur = (4.2 + (hash % 5) * 0.55).toFixed(2);
  const idleDelay = (-((hash % 7) * 0.65)).toFixed(2);

  return (
    <article className={`suspect-card ${themeClass}`} aria-label={suspect.name}>
      <div className={`polaroid-frame ${suspect.isVictim ? 'polaroid-frame--victim' : ''}`}>
        <CardFrameOrnament theme={cardTheme} />
        <div className="polaroid-photo" style={{ backgroundColor: suspect.cardBg }}>
          <div
            className={`polaroid-character-rig ${
              suspect.isVictim ? 'polaroid-character-rig--still' : `polaroid-character-rig--v${idleVariant}`
            }`}
            style={
              suspect.isVictim
                ? undefined
                : ({
                    ['--char-dur' as string]: `${idleDur}s`,
                    ['--char-delay' as string]: `${idleDelay}s`,
                  } as React.CSSProperties)
            }
          >
            <img src={suspect.svgPath} alt={suspect.name} draggable={false} />
            <AccessoryOverlay accessory={visualAccessory} />
          </div>
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

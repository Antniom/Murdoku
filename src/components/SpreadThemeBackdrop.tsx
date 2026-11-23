import React from 'react';
import type { CardThemeId, MurdokuCase } from '../engine/types';

/**
 * Resolves the rich visual theme for a case spread & its suspect frames.
 * Automatically maps continent chapterLabels to their dedicated continent theme
 * even if a case only specifies `cardTheme: 'around_world'`.
 */
export function resolveCaseVisualTheme(
  murdokuCase: Pick<MurdokuCase, 'cardTheme' | 'chapterLabel' | 'edition'>
): CardThemeId {
  const ct = murdokuCase.cardTheme;
  if (ct && ct !== 'around_world' && ct !== 'classic') {
    return ct;
  }

  const label = `${murdokuCase.chapterLabel?.en ?? ''} ${murdokuCase.chapterLabel?.pt ?? ''}`.toLowerCase();
  if (label.includes('stone age') || label.includes('idade da pedra') || label.includes('prehist')) return 'stone_age';
  if (label.includes('egypt') || label.includes('egito')) return 'egypt';
  if (label.includes('middle ages') || label.includes('medieval') || label.includes('idade média')) return 'medieval';
  if (label.includes('pirac') || label.includes('pirat')) return 'pirate';
  if (label.includes('wild west') || label.includes('velho oeste')) return 'wild_west';
  if (label.includes('antarct') || label.includes('antárt')) return 'antarctica';
  if (label.includes('asia') || label.includes('ásia') || label.includes('japan') || label.includes('japão') || label.includes('china') || label.includes('india')) return 'asia';
  if (label.includes('africa') || label.includes('áfrica') || label.includes('tanzan') || label.includes('serengeti') || label.includes('safari')) return 'africa';
  if (label.includes('europ') || label.includes('italy') || label.includes('itália') || label.includes('france') || label.includes('paris') || label.includes('london')) return 'europe';
  if (label.includes('americ') || label.includes('améric') || label.includes('peru') || label.includes('mexico') || label.includes('brazil') || label.includes('brasil') || label.includes('canada')) return 'americas';
  if (label.includes('ocean') || label.includes('austral') || label.includes('zealand') || label.includes('pacific')) return 'oceania';

  return ct ?? 'classic';
}

/**
 * Subtle printed book-paper background motifs & corner ornaments for each
 * Volume 2 Historical Era and Volume 3 Continent spread.
 * Strictly pointer-events: none so Apple Pencil ink & taps pass straight through.
 */
export const SpreadThemeBackdrop: React.FC<{ theme: CardThemeId }> = ({ theme }) => {
  if (theme === 'classic') return null;

  return (
    <div className={`spread-backdrop spread-backdrop--${theme}`} aria-hidden="true">
      {theme === 'stone_age' && (
        <svg className="spread-backdrop__svg" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice">
          {/* Subtle cave-painting handprints, sun spirals & flint spearhead watermarks */}
          <g fill="none" stroke="#5b4632" strokeWidth="2.4" strokeLinecap="round" opacity="0.11">
            {/* Spiral sun top-left */}
            <path d="M88 94 c0-14 18-14 18 0 c0 20-26 20-26 0 c0-28 36-28 36 0" />
            {/* Cave bison/boar geometric outline bottom-left */}
            <path d="M56 680 Q80 652 126 658 Q154 662 164 684 M70 676 L64 708 M92 674 L90 708 M132 676 L130 708 M152 678 L158 708" />
            {/* Carved stone zigzag border top & bottom */}
            <polyline points="42,36 62,24 82,36 102,24 122,36 142,24 162,36" />
            <polyline points="1030,36 1050,24 1070,36 1090,24 1110,36 1130,24 1150,36" />
            {/* Flint spearheads right margin */}
            <polygon points="1115,642 1134,686 1115,678 1096,686" />
            <circle cx="1115" cy="116" r="24" strokeDasharray="5 5" />
          </g>
        </svg>
      )}

      {theme === 'egypt' && (
        <svg className="spread-backdrop__svg" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice">
          {/* Pyramids, sun disc, lotus & hieroglyphic border frame */}
          <g fill="none" stroke="#8a6220" strokeWidth="2" opacity="0.13">
            {/* Double-lined papyrus corner cartouche borders */}
            <rect x="26" y="24" width="1148" height="712" rx="4" strokeDasharray="12 6" />
            {/* Pyramids & sun horizon bottom-left */}
            <polygon points="48,712 112,626 176,712" />
            <polygon points="128,712 178,648 228,712" />
            <circle cx="174" cy="612" r="16" />
            {/* Winged sun disc top corners */}
            <path d="M62 78 Q92 62 122 78 Q92 92 62 78 Z" />
            <circle cx="92" cy="78" r="7" />
            <path d="M1078 78 Q1108 62 1138 78 Q1108 92 1078 78 Z" />
            <circle cx="1108" cy="78" r="7" />
            {/* Ankh & lotus motif bottom-right */}
            <circle cx="1118" cy="648" r="11" />
            <line x1="1118" y1="659" x2="1118" y2="700" />
            <line x1="1102" y1="674" x2="1134" y2="674" />
          </g>
        </svg>
      )}

      {theme === 'medieval' && (
        <svg className="spread-backdrop__svg" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice">
          {/* Illuminated manuscript Gothic arches, heraldic shields & crossed swords */}
          <g fill="none" stroke="#36415c" strokeWidth="2" opacity="0.11">
            <rect x="24" y="24" width="1152" height="712" rx="14" />
            <rect x="32" y="32" width="1136" height="696" rx="10" strokeDasharray="3 6" />
            {/* Heraldic shield top-left */}
            <path d="M64 62 H104 V88 Q104 110 84 120 Q64 110 64 88 Z" />
            <line x1="84" y1="62" x2="84" y2="120" />
            <line x1="64" y1="86" x2="104" y2="86" />
            {/* Castle battlements bottom-left */}
            <path d="M52 708 V670 H66 V684 H80 V670 H96 V684 H110 V670 H126 V708" />
            {/* Heraldic crown bottom-right */}
            <path d="M1076 696 L1082 664 L1102 680 L1116 656 L1130 680 L1150 664 L1156 696 Z" />
            {/* Pointed gothic arch top-right */}
            <path d="M1094 118 V86 Q1094 64 1118 54 Q1142 64 1142 86 V118" />
          </g>
        </svg>
      )}

      {theme === 'pirate' && (
        <svg className="spread-backdrop__svg" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice">
          {/* Nautical treasure-map compass rose, rhumb lines & ocean waves */}
          <g fill="none" stroke="#2d4c59" strokeWidth="1.9" opacity="0.12">
            {/* Compass rose top-right */}
            <circle cx="1108" cy="108" r="42" />
            <circle cx="1108" cy="108" r="34" strokeDasharray="4 4" />
            <polygon points="1108,58 1116,100 1158,108 1116,116 1108,158 1100,116 1058,108 1100,100" />
            {/* Treasure dotted route & X bottom-left */}
            <path d="M44 694 Q92 660 132 686 T204 654" strokeDasharray="6 6" />
            <line x1="196" y1="644" x2="216" y2="664" strokeWidth="3.2" />
            <line x1="216" y1="644" x2="196" y2="664" strokeWidth="3.2" />
            {/* Sea waves bottom-right */}
            <path d="M1030 690 Q1050 676 1070 690 T1110 690 T1150 690" />
            <path d="M1044 708 Q1064 694 1084 708 T1124 708 T1164 708" />
            {/* Anchor top-left */}
            <circle cx="82" cy="72" r="8" />
            <line x1="82" y1="80" x2="82" y2="122" />
            <line x1="66" y1="92" x2="98" y2="92" />
            <path d="M62 110 Q82 132 102 110" />
          </g>
        </svg>
      )}

      {theme === 'wild_west' && (
        <svg className="spread-backdrop__svg" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice">
          {/* Frontier Wanted-poster frame, sheriff stars, cactus & horseshoe */}
          <g fill="none" stroke="#70441f" strokeWidth="2.1" opacity="0.12">
            <rect x="24" y="24" width="1152" height="712" rx="4" />
            {/* Sheriff star top-left & top-right */}
            <polygon points="80,58 87,74 104,76 91,87 95,104 80,95 65,104 69,87 56,76 73,74" />
            <polygon points="1120,58 1127,74 1144,76 1131,87 1135,104 1120,95 1105,104 1109,87 1096,76 1113,74" />
            {/* Saguaro cactus bottom-left */}
            <path d="M84 712 V650 M84 684 H66 V666 M84 676 H102 V658" strokeWidth="4" strokeLinecap="round" />
            {/* Horseshoe bottom-right */}
            <path d="M1098 662 C1092 698 1138 698 1132 662" strokeWidth="3.5" strokeLinecap="round" />
            {/* Sunburst mesas */}
            <path d="M1020 712 L1046 680 H1084 L1100 712" />
          </g>
        </svg>
      )}

      {theme === 'antarctica' && (
        <svg className="spread-backdrop__svg" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice">
          {/* Polar latitude rings, crystalline snowflakes & jagged icebergs */}
          <g fill="none" stroke="#2c5d87" strokeWidth="1.9" opacity="0.13">
            {/* Snowflake top-left */}
            <g transform="translate(82, 88)">
              <line x1="-26" y1="0" x2="26" y2="0" />
              <line x1="0" y1="-26" x2="0" y2="26" />
              <line x1="-18" y1="-18" x2="18" y2="18" />
              <line x1="18" y1="-18" x2="-18" y2="18" />
              <circle cx="0" cy="0" r="9" />
            </g>
            {/* Polar coordinate arcs top-right */}
            <circle cx="1126" cy="96" r="46" strokeDasharray="5 5" />
            <circle cx="1126" cy="96" r="24" />
            <line x1="1074" y1="96" x2="1178" y2="96" />
            <line x1="1126" y1="44" x2="1126" y2="148" />
            {/* Iceberg silhouettes bottom corners */}
            <polygon points="40,716 74,660 112,684 148,642 198,716" />
            <polygon points="1018,716 1068,652 1106,680 1140,664 1172,716" />
          </g>
        </svg>
      )}

      {theme === 'asia' && (
        <svg className="spread-backdrop__svg" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice">
          {/* Seigaiha traditional waves, torii/pagoda silhouette & bamboo stalks */}
          <g fill="none" stroke="#2d5c48" strokeWidth="1.9" opacity="0.12">
            {/* Seigaiha wave scallops bottom-left */}
            <path d="M36 708 A28 28 0 0 1 92 708 M46 708 A18 18 0 0 1 82 708 M92 708 A28 28 0 0 1 148 708 M102 708 A18 18 0 0 1 138 708 M148 708 A28 28 0 0 1 204 708" />
            {/* Torii gate top-right */}
            <path d="M1076 68 Q1114 78 1152 68 M1084 82 H1144 M1094 74 V124 M1134 74 V124" strokeWidth="2.6" strokeLinecap="round" />
            {/* Bamboo stems top-left */}
            <line x1="68" y1="44" x2="68" y2="148" strokeWidth="2.8" />
            <line x1="62" y1="78" x2="74" y2="78" />
            <line x1="62" y1="114" x2="74" y2="114" />
            <path d="M68 78 Q88 66 96 72 Q82 82 68 78 Z" />
            {/* Red sun seal & sakura petals bottom-right */}
            <circle cx="1116" cy="676" r="24" stroke="#a63232" />
            <circle cx="1076" cy="656" r="5" stroke="#a63232" />
            <circle cx="1152" cy="650" r="4" stroke="#a63232" />
          </g>
        </svg>
      )}

      {theme === 'africa' && (
        <svg className="spread-backdrop__svg" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice">
          {/* Savanna acacia tree, radiant sun & mudcloth geometric bands */}
          <g fill="none" stroke="#8a4d22" strokeWidth="2.1" opacity="0.13">
            {/* Geometric mudcloth band top & bottom */}
            <polyline points="36,36 52,24 68,36 84,24 100,36 116,24 132,36 148,24 164,36" />
            <polyline points="1036,36 1052,24 1068,36 1084,24 1100,36 1116,24 1132,36 1148,24 1164,36" />
            {/* Acacia tree + sun bottom-left */}
            <circle cx="136" cy="662" r="22" />
            <line x1="88" y1="712" x2="88" y2="668" strokeWidth="3.5" />
            <path d="M48 668 Q88 644 128 668 Z" />
            {/* Savanna shield/diamond motif bottom-right */}
            <polygon points="1118,644 1142,678 1118,712 1094,678" />
            <polygon points="1118,658 1132,678 1118,698 1104,678" />
          </g>
        </svg>
      )}

      {theme === 'europe' && (
        <svg className="spread-backdrop__svg" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice">
          {/* Venetian arches, baroque filigree corner frames & classical column */}
          <g fill="none" stroke="#5a457a" strokeWidth="1.9" opacity="0.12">
            <rect x="26" y="26" width="1148" height="708" rx="18" />
            {/* Corner filigree curls */}
            <path d="M40 88 Q40 42 86 42 M48 80 Q48 50 78 50" />
            <path d="M1160 88 Q1160 42 1114 42 M1152 80 Q1152 50 1122 50" />
            <path d="M40 672 Q40 718 86 718 M48 680 Q48 710 78 710" />
            <path d="M1160 672 Q1160 718 1114 718 M1152 680 Q1152 710 1122 710" />
            {/* Venetian bridge arch bottom-left */}
            <path d="M56 704 Q112 652 168 704 M72 704 Q112 672 152 704" />
            {/* Baroque dome bottom-right */}
            <path d="M1086 704 V680 Q1114 646 1142 680 V704 M1114 646 V632" />
          </g>
        </svg>
      )}

      {theme === 'americas' && (
        <svg className="spread-backdrop__svg" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice">
          {/* Stepped Andean/Mayan pyramid, compass & turquoise geometric fret */}
          <g fill="none" stroke="#246873" strokeWidth="2.1" opacity="0.12">
            {/* Stepped pyramid bottom-left */}
            <path d="M44 712 H172 M56 694 H160 M68 676 H148 M82 658 H134 M96 642 H120" strokeWidth="2.8" />
            {/* Sun compass top-right */}
            <circle cx="1116" cy="92" r="24" />
            <circle cx="1116" cy="92" r="10" />
            <path d="M1116 56 V66 M1116 118 V128 M1080 92 H1090 M1142 92 H1152" />
            {/* Mountain peaks bottom-right */}
            <polyline points="1032,712 1072,654 1102,688 1134,644 1168,712" />
          </g>
        </svg>
      )}

      {theme === 'oceania' && (
        <svg className="spread-backdrop__svg" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice">
          {/* Coral-reef swells, coastal dot-art spirals & southern cross stars */}
          <g fill="none" stroke="#1e6f7a" strokeWidth="2" opacity="0.12">
            {/* Swell waves bottom-left & bottom-right */}
            <path d="M40 694 Q72 670 104 694 T168 694" />
            <path d="M52 710 Q84 686 116 710 T180 710" />
            {/* Concentric coastal dot circles top-left */}
            <circle cx="88" cy="92" r="28" strokeDasharray="3 7" strokeWidth="3" />
            <circle cx="88" cy="92" r="14" strokeDasharray="2 5" strokeWidth="2.5" />
            {/* Southern Cross stars top-right */}
            <g fill="#1e6f7a" stroke="none">
              <circle cx="1114" cy="64" r="3.5" />
              <circle cx="1114" cy="116" r="4" />
              <circle cx="1090" cy="86" r="3" />
              <circle cx="1136" cy="84" r="3.5" />
              <circle cx="1124" cy="98" r="2.2" />
            </g>
          </g>
        </svg>
      )}

      {theme === 'around_world' && (
        <svg className="spread-backdrop__svg" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice">
          {/* Classic globe meridians & passport postmark stamp */}
          <g fill="none" stroke="#2c4c7a" strokeWidth="1.8" opacity="0.11">
            <circle cx="1112" cy="94" r="36" />
            <ellipse cx="1112" cy="94" rx="18" ry="36" />
            <line x1="1076" y1="94" x2="1148" y2="94" />
            <circle cx="86" cy="686" r="30" strokeDasharray="4 4" />
            <line x1="46" y1="686" x2="126" y2="686" />
          </g>
        </svg>
      )}
    </div>
  );
};

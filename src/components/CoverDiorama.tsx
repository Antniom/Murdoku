import React, { useState } from 'react';

const PEEK_SUSPECT_PAIRS: Array<[string, string]> = [
  ['/assets/suspects/suspect_ashton.svg', '/assets/suspects/suspect_carla.svg'],
  ['/assets/suspects/suspect_delilah.svg', '/assets/suspects/suspect_frank.svg'],
];

/**
 * Tactile Pop-Up Paper-Cutout Diorama for the Murdoku Book Cover.
 * Features an articulated paper-cutout Detective with stiff, snappy
 * Lego-figure stop-motion choreography investigating the Victims (Vivianna & Vaughn)
 * on a mini pop-up crime-scene floorplan rising out of the open book pages,
 * while paper-cutout suspects peek stiffly from behind pop-up walls.
 */
export const CoverDiorama: React.FC<{ lang: 'en' | 'pt' }> = ({ lang }) => {
  const [castIdx, setCastIdx] = useState(0);
  const [burstKey, setBurstKey] = useState(0);

  const [leftSuspect, rightSuspect] = PEEK_SUSPECT_PAIRS[castIdx % PEEK_SUSPECT_PAIRS.length];

  const handleTapStage = () => {
    setCastIdx((i) => (i + 1) % PEEK_SUSPECT_PAIRS.length);
    setBurstKey((k) => k + 1);
  };

  return (
    <div
      className="cover-diorama"
      onClick={handleTapStage}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleTapStage();
        }
      }}
      aria-label={
        lang === 'pt'
          ? 'Cenário animado em papel recortado — toca para trocar os suspeitos escondidos'
          : 'Animated paper-cutout crime scene — tap to cycle peeking suspects'
      }
      title={lang === 'pt' ? 'Toca no cenário!' : 'Tap the diorama!'}
    >
      <svg
        className="diorama-svg"
        viewBox="0 0 520 430"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Crisp die-cut paper sticker / cardboard drop shadow */}
          <filter id="paperShadow" x="-18%" y="-18%" width="140%" height="145%">
            <feDropShadow dx="2" dy="5" stdDeviation="3.2" floodColor="#0b080e" floodOpacity="0.45" />
          </filter>
          <filter id="paperShadowSoft" x="-15%" y="-15%" width="135%" height="140%">
            <feDropShadow dx="1" dy="3" stdDeviation="2" floodColor="#14101a" floodOpacity="0.32" />
          </filter>
          {/* Thick white hand-cut paper edge around portraits */}
          <filter id="cutoutOutline" x="-15%" y="-15%" width="130%" height="130%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="3.2" result="expanded" />
            <feFlood floodColor="#fbf7ef" result="paperColor" />
            <feComposite in="paperColor" in2="expanded" operator="in" result="paperEdge" />
            <feDropShadow dx="1.5" dy="3.5" stdDeviation="2.2" floodColor="#0e0b12" floodOpacity="0.42" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="paperEdge" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <clipPath id="clipVivianna">
            <rect x="-20" y="-22" width="40" height="40" rx="5" />
          </clipPath>
          <clipPath id="clipVaughn">
            <rect x="-18" y="-20" width="36" height="36" rx="5" />
          </clipPath>
          <clipPath id="clipSuspectHead">
            <rect x="-19" y="-22" width="38" height="38" rx="6" />
          </clipPath>

          {/* Warm desk spotlight */}
          <radialGradient id="stageGlow" cx="50%" cy="46%" r="54%">
            <stop offset="0%" stopColor="#fff3d6" stopOpacity="0.22" />
            <stop offset="68%" stopColor="#d9b07e" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#141019" stopOpacity="0" />
          </radialGradient>

          {/* Crime scene tape pattern */}
          <pattern id="crimeTape" width="14" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
            <rect width="14" height="8" fill="#f2c94c" />
            <rect width="6" height="8" fill="#1c191e" />
          </pattern>
        </defs>

        {/* Subtle warm desk lamp aura behind the pop-up book */}
        <ellipse cx="260" cy="222" rx="236" ry="184" fill="url(#stageGlow)" />

        {/* ── OPEN POP-UP BOOK BASE (Pages coming to life!) ───────────────────── */}
        <g filter="url(#paperShadow)">
          {/* Hardcover book boards sticking out under the open pages */}
          <path
            d="M 32 342 L 260 378 L 488 342 L 496 354 L 260 394 L 24 354 Z"
            fill="#6c2d2c"
            stroke="#161219"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Left fanned cream page block */}
          <path
            d="M 42 332 L 258 364 L 258 376 L 36 342 Z"
            fill="#dfd4be"
            stroke="#2a242c"
            strokeWidth="1.5"
          />
          {/* Right fanned cream page block */}
          <path
            d="M 478 332 L 262 364 L 262 376 L 484 342 Z"
            fill="#d4c7ae"
            stroke="#2a242c"
            strokeWidth="1.5"
          />
          {/* Left Open Page surface */}
          <path
            d="M 76 232 L 260 250 L 260 364 L 42 332 Z"
            fill="#f7f0e2"
            stroke="#221d24"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Right Open Page surface */}
          <path
            d="M 444 232 L 260 250 L 260 364 L 478 332 Z"
            fill="#efe5d2"
            stroke="#221d24"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Center book gutter shadow */}
          <line x1="260" y1="250" x2="260" y2="364" stroke="#6c5e4c" strokeWidth="2.4" opacity="0.55" />
          {/* Decorative printed page lines on margins */}
          <g stroke="#b7aa92" strokeWidth="1.4" strokeLinecap="round" opacity="0.7">
            <line x1="78" y1="318" x2="132" y2="326" />
            <line x1="74" y1="326" x2="116" y2="332" />
            <line x1="388" y1="324" x2="444" y2="316" />
            <line x1="402" y1="331" x2="448" y2="324" />
          </g>
        </g>

        {/* ── POP-UP MURDOKU CRIME SCENE FLOORPLAN STAGE ──────────────────────── */}
        <g className="diorama-floorplan" filter="url(#paperShadowSoft)">
          {/* Raised paper diorama baseplate */}
          <polygon
            points="102,226 260,180 418,226 260,336"
            fill="#fbf7ef"
            stroke="#18161b"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Left room floor (mint green Murdoku room) */}
          <polygon points="108,226 260,184 260,256 184,280" fill="#b8dfc8" />
          {/* Right room floor (soft sky blue Murdoku room) */}
          <polygon points="260,184 412,226 336,280 260,256" fill="#c3e0f2" />
          {/* Front foyer room floor (warm cream Murdoku room) */}
          <polygon points="184,280 260,256 336,280 260,331" fill="#f3e6cb" />

          {/* Isometric Murdoku gridlines */}
          <g stroke="#2a3538" strokeWidth="1.1" opacity="0.45">
            <line x1="146" y1="215" x2="298" y2="306" />
            <line x1="184" y1="205" x2="336" y2="280" />
            <line x1="222" y1="194" x2="374" y2="253" />
            <line x1="374" y1="215" x2="222" y2="306" />
            <line x1="336" y1="205" x2="184" y2="280" />
            <line x1="298" y1="194" x2="146" y2="253" />
          </g>

          {/* Bold room divider walls */}
          <polyline
            points="184,280 260,256 336,280"
            fill="none"
            stroke="#18161b"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <line x1="260" y1="184" x2="260" y2="256" stroke="#18161b" strokeWidth="2.8" />

          {/* Dotted red detective footprint trail across the floorplan */}
          <path
            d="M 164 252 Q 214 274 260 286 T 346 244"
            fill="none"
            stroke="#c63636"
            strokeWidth="2.4"
            strokeDasharray="4 6"
            strokeLinecap="round"
            opacity="0.72"
          />
        </g>

        {/* ── SNEAKY PAPER-CUTOUT SUSPECTS PEEKING BEHIND POP-UP BACK WALLS ───── */}
        {/* Left peeking suspect behind the left folded paper wall */}
        <g className="lego-peek lego-peek--left">
          <g transform="translate(154, 158)" filter="url(#paperShadowSoft)">
            {/* Die-cut white paper silhouette body + head */}
            <path
              d="M -24 38 L -22 8 C -22 2 -14 -2 -14 -2 L -20 -26 L 20 -26 L 14 -2 C 14 -2 22 2 22 8 L 24 38 Z"
              fill="#fbf7ef"
              stroke="#1b181f"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Simple folded paper shoulders */}
            <path d="M -17 36 L -15 12 Q 0 6 15 12 L 17 36 Z" fill="#5e799e" stroke="#1b181f" strokeWidth="1.6" />
            {/* Actual Murdoku suspect portrait */}
            <g transform="translate(0, -6)">
              <rect x="-18" y="-20" width="36" height="36" rx="5" fill="#e5edf5" stroke="#1b181f" strokeWidth="1.6" />
              <image
                href={leftSuspect}
                x="-17"
                y="-19"
                width="34"
                height="34"
                clipPath="url(#clipSuspectHead)"
              />
            </g>
          </g>
        </g>

        {/* Right peeking suspect behind the right folded paper wall */}
        <g className="lego-peek lego-peek--right">
          <g transform="translate(366, 158)" filter="url(#paperShadowSoft)">
            <path
              d="M -24 38 L -22 8 C -22 2 -14 -2 -14 -2 L -20 -26 L 20 -26 L 14 -2 C 14 -2 22 2 22 8 L 24 38 Z"
              fill="#fbf7ef"
              stroke="#1b181f"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path d="M -17 36 L -15 12 Q 0 6 15 12 L 17 36 Z" fill="#a8635e" stroke="#1b181f" strokeWidth="1.6" />
            <g transform="translate(0, -6)">
              <rect x="-18" y="-20" width="36" height="36" rx="5" fill="#f3e5e2" stroke="#1b181f" strokeWidth="1.6" />
              <image
                href={rightSuspect}
                x="-17"
                y="-19"
                width="34"
                height="34"
                clipPath="url(#clipSuspectHead)"
              />
            </g>
          </g>
        </g>

        {/* ── POP-UP FOLDED PAPER BACK WALLS (bookcase & gallery wall) ────────── */}
        <g filter="url(#paperShadow)">
          {/* Left pop-up paper wall */}
          <polygon
            points="102,226 260,180 260,118 102,162"
            fill="#f6efe2"
            stroke="#18161b"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Inner wallpaper panel + tiny books/frame drawn on paper wall */}
          <polygon points="110,218 252,176 252,126 110,168" fill="#dce9e1" />
          {/* Drawn bookcase on left pop-up wall */}
          <polygon points="128,205 178,190 178,148 128,163" fill="#c79e72" stroke="#18161b" strokeWidth="2" />
          <line x1="128" y1="178" x2="178" y2="163" stroke="#18161b" strokeWidth="1.8" />
          <line x1="128" y1="191" x2="178" y2="176" stroke="#18161b" strokeWidth="1.8" />
          {/* Drawn framed portrait on left wall */}
          <polygon points="200,176 236,165 236,136 200,147" fill="#f7f1e3" stroke="#18161b" strokeWidth="2" />
          <circle cx="218" cy="156" r="6" fill="#d99a7e" />

          {/* Right pop-up paper wall */}
          <polygon
            points="260,180 418,226 418,162 260,118"
            fill="#ece2cf"
            stroke="#18161b"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <polygon points="268,176 410,218 410,168 268,126" fill="#d7e4ef" />
          {/* Window / moonlit panes on right pop-up wall */}
          <polygon points="326,184 388,202 388,164 326,146" fill="#2c3a57" stroke="#18161b" strokeWidth="2.2" />
          <line x1="357" y1="155" x2="357" y2="193" stroke="#f6efe2" strokeWidth="2" />
          <line x1="326" y1="165" x2="388" y2="183" stroke="#f6efe2" strokeWidth="2" />
          <circle cx="372" cy="168" r="5" fill="#f7e3a1" />
          {/* Center vertical fold crease */}
          <line x1="260" y1="118" x2="260" y2="180" stroke="#18161b" strokeWidth="2.5" />
        </g>

        {/* ── POP-UP PAPER FURNITURE & CRIME SCENE TAPE ───────────────────────── */}
        {/* Tiny paper crime-scene tape banner stretched across back corner */}
        <g transform="translate(212, 184) rotate(-8)" filter="url(#paperShadowSoft)">
          <rect x="0" y="0" width="94" height="11" rx="1.5" fill="url(#crimeTape)" stroke="#18161b" strokeWidth="1.5" />
        </g>

        {/* Evidence Marker #1 (folded yellow paper tent) */}
        <g transform="translate(194, 240)" filter="url(#paperShadowSoft)">
          <polygon points="-8,6 0,-11 8,6" fill="#f4cf58" stroke="#18161b" strokeWidth="1.8" strokeLinejoin="round" />
          <text x="0" y="3" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="9.5" fill="#18161b">
            1
          </text>
        </g>

        {/* Evidence Marker #2 (near Victim 2) */}
        <g transform="translate(324, 246)" filter="url(#paperShadowSoft)">
          <polygon points="-8,6 0,-11 8,6" fill="#f4cf58" stroke="#18161b" strokeWidth="1.8" strokeLinejoin="round" />
          <text x="0" y="3" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="9.5" fill="#18161b">
            2
          </text>
        </g>

        {/* ── VICTIM #1 PAPER CUTOUT: VIVIANNA (chalk outline + fallen standee) ─ */}
        <g className="victim-cutout victim-cutout--vivianna" transform="translate(168, 260)">
          {/* Chalk outline on floorplan */}
          <ellipse cx="0" cy="14" rx="34" ry="13" fill="none" stroke="#c63636" strokeWidth="2" strokeDasharray="5 4" opacity="0.82" />
          {/* Tilted fallen paper-cutout standee of Vivianna */}
          <g transform="rotate(-24) translate(0, -6)" filter="url(#paperShadow)">
            {/* Cardboard standee base tab */}
            <ellipse cx="0" cy="24" rx="18" ry="5" fill="#e8decc" stroke="#18161b" strokeWidth="1.6" />
            {/* White die-cut cutout backing */}
            <rect
              x="-24"
              y="-26"
              width="48"
              height="52"
              rx="6"
              fill="#fbf7ef"
              stroke="#18161b"
              strokeWidth="2.4"
            />
            {/* Red victim Polaroid frame */}
            <rect x="-20" y="-22" width="40" height="40" rx="4" fill="#df9b9b" stroke="#18161b" strokeWidth="1.5" />
            <image
              href="/assets/suspects/suspect_vivianna.svg"
              x="-20"
              y="-22"
              width="40"
              height="40"
              clipPath="url(#clipVivianna)"
            />
            {/* Bold crimson X across victim cutout */}
            <g stroke="#c62828" strokeWidth="3.6" strokeLinecap="round">
              <line x1="-13" y1="-15" x2="13" y2="11" />
              <line x1="13" y1="-15" x2="-13" y2="11" />
            </g>
            {/* Tiny paper caption */}
            <text
              x="0"
              y="24"
              textAnchor="middle"
              fontFamily="var(--font-display)"
              fontWeight="800"
              fontSize="7.2"
              fill="#8f1e1e"
            >
              VICTIM
            </text>
          </g>
        </g>

        {/* ── VICTIM #2 PAPER CUTOUT: VAUGHN (second fallen Polaroid cutout) ──── */}
        <g className="victim-cutout victim-cutout--vaughn" transform="translate(358, 252)">
          <ellipse cx="0" cy="14" rx="30" ry="11" fill="none" stroke="#c63636" strokeWidth="2" strokeDasharray="5 4" opacity="0.78" />
          <g transform="rotate(20) translate(0, -6)" filter="url(#paperShadow)">
            <ellipse cx="0" cy="22" rx="16" ry="4.5" fill="#e8decc" stroke="#18161b" strokeWidth="1.6" />
            <rect
              x="-22"
              y="-24"
              width="44"
              height="48"
              rx="6"
              fill="#fbf7ef"
              stroke="#18161b"
              strokeWidth="2.4"
            />
            <rect x="-18" y="-20" width="36" height="36" rx="4" fill="#df9b9b" stroke="#18161b" strokeWidth="1.5" />
            <image
              href="/assets/suspects/suspect_vaughn.svg"
              x="-18"
              y="-20"
              width="36"
              height="36"
              clipPath="url(#clipVaughn)"
            />
            <g stroke="#c62828" strokeWidth="3.4" strokeLinecap="round">
              <line x1="-11" y1="-13" x2="11" y2="9" />
              <line x1="11" y1="-13" x2="-11" y2="9" />
            </g>
          </g>
        </g>

        {/* ── THE STAR: ARTICULATED PAPER-CUTOUT LEGO-MOTION DETECTIVE ────────── */}
        <g className="detective-mover">
          {/* Paper standee shadow on the floorplan */}
          <ellipse className="detective-ground-shadow" cx="0" cy="48" rx="26" ry="8.5" fill="#120e17" opacity="0.34" />

          {/* Flip wrapper so detective crisply turns left/right in 1 Lego step */}
          <g className="detective-flip">
            {/* Stiff Lego hop + rigid tilt wrapper */}
            <g className="detective-hop" filter="url(#paperShadow)">
              {/* Folded paper standee tab under boots */}
              <polygon
                points="-22,48 22,48 16,40 -16,40"
                fill="#ede3d0"
                stroke="#18161b"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />

              {/* BACK ARM (holding tiny paper clue notepad — hinged at shoulder) */}
              <g className="det-arm-back">
                {/* Thick white paper cutout backing */}
                <path
                  d="M -22 -12 L -40 4 L -32 14 L -14 -2 Z"
                  fill="#fbf7ef"
                  stroke="#18161b"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                {/* Trench coat sleeve */}
                <path
                  d="M -20 -9 L -34 3 L -29 9 L -15 -3 Z"
                  fill="#c99f68"
                  stroke="#18161b"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                {/* Tiny paper clue notepad */}
                <g transform="translate(-38, 4) rotate(-18)">
                  <rect x="-7" y="-9" width="14" height="17" rx="2" fill="#fffdf7" stroke="#18161b" strokeWidth="1.6" />
                  <line x1="-4" y1="-4" x2="4" y2="-4" stroke="#8a372a" strokeWidth="1.4" />
                  <line x1="-4" y1="0" x2="4" y2="0" stroke="#444" strokeWidth="1.2" />
                  <line x1="-4" y1="4" x2="2" y2="4" stroke="#444" strokeWidth="1.2" />
                </g>
              </g>

              {/* BACK LEG (stiff Lego-hinged paper leg) */}
              <g className="det-leg-back">
                <rect
                  x="-14"
                  y="14"
                  width="14"
                  height="28"
                  rx="4"
                  fill="#fbf7ef"
                  stroke="#18161b"
                  strokeWidth="2.2"
                />
                <rect x="-11" y="16" width="8.5" height="17" rx="2" fill="#3a3d4c" stroke="#18161b" strokeWidth="1.5" />
                <rect x="-12" y="32" width="12" height="7" rx="2" fill="#231f24" stroke="#18161b" strokeWidth="1.5" />
              </g>

              {/* FRONT LEG (stiff Lego-hinged paper leg) */}
              <g className="det-leg-front">
                <rect
                  x="0"
                  y="14"
                  width="14"
                  height="28"
                  rx="4"
                  fill="#fbf7ef"
                  stroke="#18161b"
                  strokeWidth="2.2"
                />
                <rect x="2.5" y="16" width="8.5" height="17" rx="2" fill="#494d5e" stroke="#18161b" strokeWidth="1.5" />
                <rect x="2" y="32" width="12" height="7" rx="2" fill="#231f24" stroke="#18161b" strokeWidth="1.5" />
              </g>

              {/* TORSO (Blocky paper-cutout trench coat with white die-cut edge!) */}
              <g className="det-torso">
                {/* White die-cut silhouette */}
                <path
                  d="M -23 -20 L 23 -20 L 27 22 L -27 22 Z"
                  fill="#fbf7ef"
                  stroke="#18161b"
                  strokeWidth="2.6"
                  strokeLinejoin="round"
                />
                {/* Warm tan Sherlock trenchcoat */}
                <path
                  d="M -18 -16 L 18 -16 L 22 18 L -22 18 Z"
                  fill="#d7ae76"
                  stroke="#18161b"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                {/* Coat collar / lapels + crimson tie */}
                <polygon points="-11,-16 0,-4 11,-16" fill="#f7f1e4" stroke="#18161b" strokeWidth="1.5" />
                <polygon points="-2.5,-15 2.5,-15 3.5,-5 0,-1 -3.5,-5" fill="#9c2c2c" stroke="#18161b" strokeWidth="1.2" />
                {/* Trenchcoat belt & brass buckle */}
                <rect x="-20" y="4" width="40" height="5.5" fill="#7c5632" stroke="#18161b" strokeWidth="1.4" />
                <rect x="-4" y="3.5" width="8" height="6.5" rx="1" fill="#e5be66" stroke="#18161b" strokeWidth="1.3" />
                {/* Coat buttons */}
                <circle cx="-6" cy="-2" r="1.7" fill="#3c2b1e" />
                <circle cx="6" cy="-2" r="1.7" fill="#3c2b1e" />
                <circle cx="-6" cy="13" r="1.7" fill="#3c2b1e" />
                <circle cx="6" cy="13" r="1.7" fill="#3c2b1e" />
              </g>

              {/* HEAD + DEERSTALKER HAT (articulated with brass brad joint at neck!) */}
              <g className="det-head">
                {/* White paper die-cut backing for head + hat */}
                <path
                  d="M -24 -44 C -24 -64 24 -64 24 -44 L 30 -39 L 21 -35 L 20 -20 L -20 -20 L -21 -35 L -30 -39 Z"
                  fill="#fbf7ef"
                  stroke="#18161b"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                {/* Paper cutout face */}
                <rect
                  x="-16"
                  y="-42"
                  width="32"
                  height="22"
                  rx="7"
                  fill="#f4d2b4"
                  stroke="#18161b"
                  strokeWidth="1.7"
                />
                {/* Expressive Lego/paper eyes + neat mustache */}
                <circle cx="-5" cy="-33" r="2.3" fill="#18161b" />
                <circle cx="7" cy="-33" r="2.3" fill="#18161b" />
                <line x1="-9" y1="-37.5" x2="-2" y2="-36.5" stroke="#3c281c" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="3.5" y1="-36.5" x2="10.5" y2="-37.5" stroke="#3c281c" strokeWidth="1.8" strokeLinecap="round" />
                {/* Detective mustache */}
                <path
                  d="M -6 -26 Q 1 -29 8 -26 Q 4 -24 1 -25.5 Q -2 -24 -6 -26 Z"
                  fill="#4b3222"
                  stroke="#18161b"
                  strokeWidth="1"
                />
                {/* Classic checkered paper deerstalker detective hat */}
                <path
                  d="M -19 -41 C -19 -56 19 -56 19 -41 Z"
                  fill="#8c6d4e"
                  stroke="#18161b"
                  strokeWidth="1.8"
                />
                <path
                  d="M -25 -40 Q 0 -35 25 -40 Q 16 -44 0 -43 Q -16 -44 -25 -40 Z"
                  fill="#6e5339"
                  stroke="#18161b"
                  strokeWidth="1.7"
                />
                {/* Hat ribbon & top button */}
                <circle cx="0" cy="-54" r="2.6" fill="#523b26" stroke="#18161b" strokeWidth="1.3" />
                <line x1="-17" y1="-43" x2="17" y2="-43" stroke="#3d2b1d" strokeWidth="2.4" />
                {/* Brass paper-fastener brad dot at neck */}
                <circle cx="0" cy="-19" r="2.2" fill="#e5be66" stroke="#18161b" strokeWidth="1" />
              </g>

              {/* FRONT ARM + MAGNIFYING GLASS (hinged with brass paper brad at shoulder!) */}
              <g className="det-arm-front">
                {/* White paper die-cut arm */}
                <path
                  d="M 12 -14 L 36 -2 L 30 9 L 8 -2 Z"
                  fill="#fbf7ef"
                  stroke="#18161b"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M 14 -11 L 32 -1 L 27 6 L 11 -3 Z"
                  fill="#d7ae76"
                  stroke="#18161b"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                {/* Brass brad joint dot at shoulder */}
                <circle cx="15" cy="-7" r="2.2" fill="#e5be66" stroke="#18161b" strokeWidth="1" />
                {/* Lego-style C-claw paper hand holding brass magnifying glass */}
                <circle cx="33" cy="2" r="4.5" fill="#f4d2b4" stroke="#18161b" strokeWidth="1.5" />

                {/* Oversized paper-cutout Magnifying Glass */}
                <g transform="translate(38, -2) rotate(-18)">
                  {/* Handle */}
                  <rect x="-3" y="2" width="6" height="14" rx="2" fill="#6b3d26" stroke="#18161b" strokeWidth="1.6" />
                  {/* White die-cut outer halo */}
                  <circle cx="0" cy="-12" r="16" fill="#fbf7ef" stroke="#18161b" strokeWidth="2.2" />
                  {/* Brass rim */}
                  <circle cx="0" cy="-12" r="13" fill="#d9aa4b" stroke="#18161b" strokeWidth="1.6" />
                  {/* Glass lens */}
                  <circle cx="0" cy="-12" r="9.5" fill="#cbeeff" fillOpacity="0.82" stroke="#18161b" strokeWidth="1.4" />
                  {/* Crisp cartoon lens gleam */}
                  <path d="M -5 -16 Q -1 -19 4 -15" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
                  <circle cx="4" cy="-9" r="1.4" fill="#ffffff" />
                </g>
              </g>
            </g>
          </g>

          {/* Floating Stop-Motion Paper Clue Badges (? and !) above the Detective */}
          <g className="det-badge det-badge--question" transform="translate(0, -86)">
            <g filter="url(#paperShadowSoft)">
              <path
                d="M -16 -14 L 16 -14 L 16 10 L 4 10 L 0 18 L -4 10 L -16 10 Z"
                fill="#fbf7ef"
                stroke="#18161b"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              <text
                x="0"
                y="4"
                textAnchor="middle"
                fontFamily="var(--font-display)"
                fontWeight="800"
                fontSize="16"
                fill="#2c3c5a"
              >
                ?
              </text>
            </g>
          </g>

          <g className="det-badge det-badge--exclaim" transform="translate(0, -88)">
            <g filter="url(#paperShadowSoft)">
              <polygon
                points="0,-18 5,-7 18,-9 9,1 14,13 2,8 -9,15 -7,2 -17,-6 -5,-7"
                fill="#f6cf59"
                stroke="#18161b"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              <text
                x="0"
                y="4"
                textAnchor="middle"
                fontFamily="var(--font-display)"
                fontWeight="800"
                fontSize="15"
                fill="#9c2424"
              >
                !
              </text>
            </g>
          </g>
        </g>

        {/* Interactive tap burst sparkle */}
        {burstKey > 0 && (
          <g key={burstKey} className="diorama-tap-burst" transform="translate(260, 170)">
            <polygon
              points="0,-20 5,-6 20,-5 8,4 13,18 0,10 -13,18 -8,4 -20,-5 -5,-6"
              fill="#f7d560"
              stroke="#18161b"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Small interactive paper tag at bottom-left corner of diorama */}
        <g transform="translate(260, 408)">
          <rect
            x="-92"
            y="-12"
            width="184"
            height="22"
            rx="11"
            fill="rgba(251, 247, 239, 0.1)"
            stroke="rgba(251, 247, 239, 0.18)"
            strokeWidth="1"
          />
          <text
            x="0"
            y="2.5"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontWeight="700"
            fontSize="10"
            letterSpacing="1.1"
            fill="#d9c8ae"
          >
            {lang === 'pt' ? 'TOCA PARA TROCAR SUSPEITOS' : 'TAP SCENE TO SWAP SUSPECTS'}
          </text>
        </g>
      </svg>
    </div>
  );
};

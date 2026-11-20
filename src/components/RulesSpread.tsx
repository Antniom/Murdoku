import React from 'react';
import type { Lang } from '../engine/types';
import { getObjectTintRole, hexToTintMatrix, OBJECT_CATALOG, PAPER_PALETTES } from '../data/assets';
import { IconPencil } from './Icons';

export interface RulesSpreadProps {
  lang: Lang;
}

/** Tiny tinted Murdoku object SVG matching the book's warm furniture palette */
const TintedRuleObject: React.FC<{ objectId: string; label: string }> = ({ objectId, label }) => {
  const meta = OBJECT_CATALOG[objectId];
  const palette = PAPER_PALETTES.cream.objectColors;
  const role = getObjectTintRole(objectId);
  const filterId = `rule-obj-${objectId}`;

  return (
    <div className="rule-occ-item">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        {role && (
          <defs>
            <filter id={filterId} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values={hexToTintMatrix(palette[role])} />
            </filter>
          </defs>
        )}
        <image
          href={meta?.svgPath ?? '/assets/objects/obj_box.svg'}
          x="4"
          y="4"
          width="56"
          height="56"
          preserveAspectRatio="xMidYMid meet"
          filter={role ? `url(#${filterId})` : undefined}
        />
      </svg>
      <span>{label}</span>
    </div>
  );
};

/** Exact 3×3 mini floorplan diagram for Card 2 ("One person per Row and Column") */
const RowColMiniGrid: React.FC<{ blocked: boolean }> = ({ blocked }) => (
  <svg width="78" height="78" viewBox="0 0 96 96" aria-hidden="true">
    {/* Green left/top-center room (#94d1b1) + Light-blue right/bottom room (#bfe2f5) */}
    <rect x="3" y="3" width="30" height="30" fill="#94d1b1" />
    <rect x="33" y="3" width="30" height="30" fill="#94d1b1" />
    <rect x="3" y="33" width="30" height="30" fill="#94d1b1" />
    <rect x="33" y="33" width="30" height="30" fill="#94d1b1" />
    <rect x="3" y="63" width="30" height="30" fill="#94d1b1" />

    <rect x="63" y="3" width="30" height="30" fill="#bfe2f5" />
    <rect x="63" y="33" width="30" height="30" fill="#bfe2f5" />
    <rect x="33" y="63" width="30" height="30" fill="#bfe2f5" />
    <rect x="63" y="63" width="30" height="30" fill="#bfe2f5" />

    {/* Thin cell gridlines */}
    <g stroke="#2a3538" strokeWidth="1" opacity="0.65">
      <line x1="33" y1="3" x2="33" y2="93" />
      <line x1="63" y1="3" x2="63" y2="93" />
      <line x1="3" y1="33" x2="93" y2="33" />
      <line x1="3" y1="63" x2="93" y2="63" />
    </g>

    {/* Thick black outer & interior room walls */}
    <rect x="3" y="3" width="90" height="90" fill="none" stroke="#111114" strokeWidth="3.5" />
    <path d="M63 3 V63 H33 V93" fill="none" stroke="#111114" strokeWidth="3.5" strokeLinejoin="miter" />

    {/* Suspect A circle in top-right (0,2) */}
    <circle cx="78" cy="18" r="10.5" fill="#ffffff" stroke="#111114" strokeWidth="2.2" />
    <text
      x="78"
      y="22.5"
      textAnchor="middle"
      fontFamily="var(--font-display)"
      fontWeight="800"
      fontSize="13.5"
      fill="#111114"
    >
      A
    </text>

    {/* Row (blue X) & Column (purple X) blocking marks */}
    {blocked && (
      <>
        {/* Blue X along row 0 */}
        <g stroke="#245ca8" strokeWidth="3.6" strokeLinecap="round">
          <line x1="12" y1="12" x2="24" y2="24" />
          <line x1="24" y1="12" x2="12" y2="24" />
          <line x1="42" y1="12" x2="54" y2="24" />
          <line x1="54" y1="12" x2="42" y2="24" />
        </g>
        {/* Purple X along col 2 */}
        <g stroke="#5b4394" strokeWidth="3.6" strokeLinecap="round">
          <line x1="72" y1="42" x2="84" y2="54" />
          <line x1="84" y1="42" x2="72" y2="54" />
          <line x1="72" y1="72" x2="84" y2="84" />
          <line x1="84" y1="72" x2="72" y2="84" />
        </g>
      </>
    )}
  </svg>
);

/** Small black person silhouette for Card 3 ("beside") */
const PersonSilhouette: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x}, ${y})`} fill="#141418">
    <circle cx="0" cy="-7" r="3.4" />
    <path d="M-4.5 -2.5 C-4.5 -3.8 4.5 -3.8 4.5 -2.5 L3.8 4 L2.4 4 L2.2 10 L-2.2 10 L-2.4 4 L-3.8 4 Z" />
  </g>
);

/** Exact 3×3 mini floorplan diagram for Card 3 ("What does beside mean?") */
const BesideMiniGrid: React.FC = () => (
  <svg width="84" height="84" viewBox="0 0 96 96" aria-hidden="true">
    {/* Green L-room + Light-blue right & bottom-mid room */}
    <rect x="3" y="3" width="30" height="30" fill="#94d1b1" />
    <rect x="33" y="3" width="30" height="30" fill="#94d1b1" />
    <rect x="3" y="33" width="30" height="30" fill="#94d1b1" />
    <rect x="33" y="33" width="30" height="30" fill="#94d1b1" />
    <rect x="3" y="63" width="30" height="30" fill="#94d1b1" />

    <rect x="63" y="3" width="30" height="30" fill="#bfe2f5" />
    <rect x="63" y="33" width="30" height="30" fill="#bfe2f5" />
    <rect x="33" y="63" width="30" height="30" fill="#bfe2f5" />
    <rect x="63" y="63" width="30" height="30" fill="#bfe2f5" />

    <g stroke="#2a3538" strokeWidth="1" opacity="0.65">
      <line x1="33" y1="3" x2="33" y2="93" />
      <line x1="63" y1="3" x2="63" y2="93" />
      <line x1="3" y1="33" x2="93" y2="33" />
      <line x1="3" y1="63" x2="93" y2="63" />
    </g>

    <rect x="3" y="3" width="90" height="90" fill="none" stroke="#111114" strokeWidth="3.5" />
    <path d="M63 3 V63 H33 V93" fill="none" stroke="#111114" strokeWidth="3.5" strokeLinejoin="miter" />

    {/* Center target dot in (1,1) */}
    <circle cx="48" cy="48" r="8.5" fill="#4b5185" />

    {/* Valid orthogonal same-room neighbors: (0,1) above & (1,0) left */}
    <PersonSilhouette x={48} y={17} />
    <PersonSilhouette x={18} y={47} />

    {/* Invalid diagonal (0,0) and across-wall (2,1): Pink X */}
    <g stroke="#c24a8f" strokeWidth="3.6" strokeLinecap="round">
      <line x1="12" y1="12" x2="24" y2="24" />
      <line x1="24" y1="12" x2="12" y2="24" />
      <line x1="42" y1="72" x2="54" y2="84" />
      <line x1="54" y1="72" x2="42" y2="84" />
    </g>
  </svg>
);

/** Illustrated Compass Diagram for Card 4 (N/S/E/W anywhere on the grid) */
const CompassMiniGrid: React.FC = () => (
  <svg width="82" height="82" viewBox="0 0 96 96" aria-hidden="true" style={{ flexShrink: 0 }}>
    {/* 3x3 light grid */}
    <rect x="3" y="3" width="90" height="90" fill="#e6eff5" stroke="#111114" strokeWidth="3" />
    {/* North row highlight */}
    <rect x="4.5" y="4.5" width="87" height="28.5" fill="#cde6d6" />
    {/* East col highlight */}
    <rect x="63" y="33" width="28.5" height="58.5" fill="#dce6f7" />
    <g stroke="#2a3538" strokeWidth="1" opacity="0.55">
      <line x1="33" y1="3" x2="33" y2="93" />
      <line x1="63" y1="3" x2="63" y2="93" />
      <line x1="3" y1="33" x2="93" y2="33" />
      <line x1="3" y1="63" x2="93" y2="63" />
    </g>
    {/* Reference suspect B in center */}
    <circle cx="48" cy="48" r="10.5" fill="#ffffff" stroke="#111114" strokeWidth="2.2" />
    <text x="48" y="52.5" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="13.5" fill="#111114">
      B
    </text>
    {/* Directional labels */}
    <text x="48" y="22" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="11.5" fill="#1e6b42">
      N
    </text>
    <text x="18" y="22" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize="10" fill="#1e6b42">
      ↑
    </text>
    <text x="78" y="22" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize="10" fill="#1e6b42">
      ↑
    </text>
    <text x="78" y="52" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="11.5" fill="#245ca8">
      E →
    </text>
    <text x="18" y="52" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="11" fill="#5b4394">
      ← W
    </text>
    <text x="48" y="82" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="11.5" fill="#8a372a">
      S ↓
    </text>
  </svg>
);

export const RulesSpread: React.FC<RulesSpreadProps> = ({ lang }) => {
  const isPt = lang === 'pt';

  return (
    <div className="book-spread rules-spread">
      <div className="book-gutter" aria-hidden="true" />

      {/* LEFT PAGE (Page 4): Visual Rules matching the Original Murdoku Book */}
      <section className="book-page book-page--left rules-page rules-page--left">
        {/* Card 1: The Murder Mystery Goal + Victim Vivianna Polaroid */}
        <div className="rule-card">
          <span className="rule-badge">1</span>
          <div className="rule-goal-row">
            <div className="rule-goal-polaroid">
              <div className="rule-goal-polaroid__img">
                <img src="/assets/suspects/suspect_vivianna.svg" alt="Vivianna" draggable={false} />
                <svg
                  viewBox="0 0 100 100"
                  style={{ position: 'absolute', inset: '10%', width: '80%', height: '80%' }}
                  aria-hidden="true"
                >
                  <line x1="12" y1="14" x2="88" y2="86" stroke="#d22c2c" strokeWidth="8.5" strokeLinecap="round" />
                  <line x1="88" y1="14" x2="12" y2="86" stroke="#d22c2c" strokeWidth="8.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="rule-goal-polaroid__name">Vivianna</div>
            </div>
            <div>
              <h1 className="rule-card__title">
                {isPt
                  ? 'A Vivianna foi assassinada! Consegues descobrir quem foi?'
                  : 'Vivianna was murdered! Can you find out who did it?'}
              </h1>
              <p className="rule-card__body">
                {isPt ? (
                  <>
                    Lê a pista de cada suspeito e encontra a sua localização exata na cena do crime. O{' '}
                    <strong>assassino estava sozinho com a vítima</strong>, na mesma divisão.
                  </>
                ) : (
                  <>
                    Read each suspect’s clue and find their exact location on the crime scene. The{' '}
                    <strong>killer was alone with the victim</strong>, in the same area.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Cards 2 & 3 Side-by-Side */}
        <div className="rule-two-col">
          {/* Card 2: One person per Row and Column */}
          <div className="rule-card">
            <span className="rule-badge">2</span>
            <h2 className="rule-card__title" style={{ textAlign: 'center' }}>
              {isPt ? 'Regra: 1 pessoa por Linha e Coluna' : 'Rule: One person per Row and Column'}
            </h2>
            <div className="rule-diagrams-pair">
              <div className="rule-diagram-col">
                <RowColMiniGrid blocked={false} />
                <span className="rule-diagram-caption">
                  {isPt ? 'assim que colocas alguém...' : 'as soon as you place someone...'}
                </span>
              </div>
              <div className="rule-diagram-col">
                <RowColMiniGrid blocked={true} />
                <span className="rule-diagram-caption">
                  {isPt ? (
                    <>
                      ...bloqueia toda a <span className="rule-word-row">linha</span> e{' '}
                      <span className="rule-word-col">coluna</span>
                    </>
                  ) : (
                    <>
                      ...block their entire <span className="rule-word-row">row</span> and{' '}
                      <span className="rule-word-col">column</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: What does "beside" mean? */}
          <div className="rule-card">
            <span className="rule-badge">3</span>
            <h2 className="rule-card__title">
              {isPt ? 'O que significa “ao lado”?' : 'What does “beside” mean?'}
            </h2>
            <p className="rule-card__body">
              {isPt
                ? 'à esquerda, direita, acima ou abaixo de algo, e na mesma divisão'
                : 'to the left, right, above or under something, and in the same area'}
            </p>
            <div className="rule-beside-row">
              <div className="rule-beside-legend">
                <svg width="12" height="18" viewBox="-7 -11 14 22" style={{ verticalAlign: 'middle' }} aria-hidden="true">
                  <PersonSilhouette x={0} y={0} />
                </svg>{' '}
                {isPt ? (
                  <>
                    estão ao lado do <span className="rule-mini-dot" />
                  </>
                ) : (
                  <>
                    are beside the <span className="rule-mini-dot" />
                  </>
                )}
              </div>

              <BesideMiniGrid />

              <div className="rule-beside-legend">
                <strong style={{ color: '#c24a8f', fontStyle: 'normal' }}>✕</strong>{' '}
                {isPt ? (
                  <>
                    <span className="rule-word-not">não</span> estão ao lado do <span className="rule-mini-dot" />
                  </>
                ) : (
                  <>
                    are <span className="rule-word-not">not</span> beside the <span className="rule-mini-dot" />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Visual Furniture Pills: Can be occupied vs Cannot be occupied */}
        <div className="rule-furniture-row">
          <div className="rule-occ-pill rule-occ-pill--can">
            <div className="rule-occ-pill__title">
              {isPt ? 'Podem ser ocupados' : 'Can be occupied'}
            </div>
            <div className="rule-occ-items">
              <TintedRuleObject objectId="chair" label={isPt ? 'Cadeira' : 'Chair'} />
              <TintedRuleObject objectId="bed" label={isPt ? 'Cama' : 'Bed'} />
              <TintedRuleObject objectId="carpet" label={isPt ? 'Tapete' : 'Carpet'} />
              <TintedRuleObject objectId="flowers" label={isPt ? 'Flores' : 'Flowers'} />
            </div>
          </div>

          <div className="rule-occ-pill rule-occ-pill--cannot">
            <div className="rule-occ-pill__title">
              {isPt ? 'Não podem ser ocupados' : 'Cannot be occupied'}
            </div>
            <div className="rule-occ-items">
              <TintedRuleObject objectId="tv" label="TV" />
              <TintedRuleObject objectId="shelf" label={isPt ? 'Estante' : 'Shelf'} />
              <TintedRuleObject objectId="box" label={isPt ? 'Caixa' : 'Box'} />
              <TintedRuleObject objectId="table" label={isPt ? 'Mesa' : 'Table'} />
              <TintedRuleObject objectId="shrub" label={isPt ? 'Arbusto' : 'Shrub'} />
            </div>
          </div>
        </div>

        <span className="page-number page-number--left">4</span>
      </section>

      {/* RIGHT PAGE (Page 5): Compass Rule + Book 2 & 3 Visual Twists + Apple Pencil Shortcuts */}
      <section className="book-page book-page--right rules-page rules-page--right">
        {/* Card 4: Compass Directions */}
        <div className="rule-card">
          <span className="rule-badge">4</span>
          <h2 className="rule-card__title">
            {isPt ? 'Norte, Sul, Este e Oeste' : 'North, South, East, and West'}
          </h2>
          <div className="rule-compass-row">
            <CompassMiniGrid />
            <p className="rule-card__body">
              {isPt ? (
                <>
                  <strong>Norte de B</strong> significa qualquer quadrado numa linha acima de B —{' '}
                  <em>não precisa de estar na mesma coluna</em>. O mesmo vale para <strong>Sul</strong>,{' '}
                  <strong>Este</strong> e <strong>Oeste</strong>. Outras divisões podem ter 0, 1, 2 ou mais pessoas.
                </>
              ) : (
                <>
                  <strong>North of B</strong> means any square in a higher row than B —{' '}
                  <em>not necessarily the same column</em>. The same applies to <strong>South</strong>,{' '}
                  <strong>East</strong>, and <strong>West</strong>. Other rooms may hold 0, 1, 2, or more people.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Book 2 & 3 Chapter Twists */}
        <div className="rule-section-heading">
          {isPt ? 'Variantes dos Livros 2 e 3' : 'Book 2 & Book 3 Chapter Twists'}
        </div>

        <div className="rule-twists-grid">
          <div className="rule-twist-card">
            <div className="rule-twist-card__top">
              <span className="rule-twist-tag">{isPt ? 'FORA-DA-LEI' : 'OUTLAW'}</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8a372a" strokeWidth="1.8" aria-hidden="true">
                <polygon points="12 2 14.9 8.6 22 9.3 16.6 14 18.2 21 12 17.3 5.8 21 7.4 14 2 9.3 9.1 8.6 12 2" fill="#f2d6c9" />
              </svg>
            </div>
            <h3 className="rule-twist-card__title">
              {isPt ? 'O Fora-da-Lei Oculto' : 'The Hidden Outlaw'}
            </h3>
            <p className="rule-twist-card__body">
              {isPt
                ? 'Um suspeito (nunca a Vítima) cumpre a condição do Fora-da-Lei no topo da página. Outras pistas referem-no.'
                : 'One suspect (never the Victim) obeys the public Outlaw rule at the top of the page. Other clues refer to them.'}
            </p>
          </div>

          <div className="rule-twist-card">
            <div className="rule-twist-card__top">
              <span className="rule-twist-tag">{isPt ? 'ÁLIBI' : 'ALIBI'}</span>
              <svg width="34" height="22" viewBox="0 0 38 24" aria-hidden="true">
                <rect x="2" y="3" width="14" height="18" rx="2" fill="#ffffff" stroke="#18181b" strokeWidth="1.5" />
                <rect x="20" y="3" width="14" height="18" rx="2" fill="#f7dede" stroke="#b83838" strokeWidth="1.5" />
                <line x1="23" y1="7" x2="31" y2="17" stroke="#b83838" strokeWidth="2" strokeLinecap="round" />
                <line x1="31" y1="7" x2="23" y2="17" stroke="#b83838" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="rule-twist-card__title">
              {isPt ? 'O Suspeito com Álibi' : 'The Uninvolved Suspect'}
            </h3>
            <p className="rule-twist-card__body">
              {isPt
                ? 'Há uma carta a mais! Uma pessoa nunca esteve na cena do crime e deve ser descartada por contradição.'
                : 'There is one extra suspect card! One person was never at the crime scene and must be ruled out.'}
            </p>
          </div>

          <div className="rule-twist-card">
            <div className="rule-twist-card__top">
              <span className="rule-twist-tag">{isPt ? 'PLANTA RASGADA' : 'TORN MAP'}</span>
              <svg width="26" height="22" viewBox="0 0 28 24" aria-hidden="true">
                <rect x="2" y="2" width="24" height="20" rx="3" fill="#f7f4ec" stroke="#8a372a" strokeWidth="1.6" strokeDasharray="3 2" />
                <text x="14" y="16" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="13" fill="#8a372a">
                  ?
                </text>
              </svg>
            </div>
            <h3 className="rule-twist-card__title">
              {isPt ? 'Fragmento em Falta' : 'Missing Map Fragment'}
            </h3>
            <p className="rule-twist-card__body">
              {isPt
                ? 'Falta um quadrado da planta. Toca nos fragmentos A–D para testar qual é o único que funciona.'
                : 'A section of the map is missing. Tap fragments A–D to preview which single patch solves the case.'}
            </p>
          </div>

          <div className="rule-twist-card">
            <div className="rule-twist-card__top">
              <span className="rule-twist-tag">{isPt ? 'MENTIROSO' : 'LIAR'}</span>
              <svg width="28" height="22" viewBox="0 0 32 22" aria-hidden="true">
                <rect x="2" y="3" width="28" height="16" rx="8" fill="#ffffff" stroke="#8a372a" strokeWidth="1.6" />
                <line x1="9" y1="8" x2="23" y2="14" stroke="#c63636" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="23" y1="8" x2="9" y2="14" stroke="#c63636" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="rule-twist-card__title">
              {isPt ? 'O Mentiroso' : 'The Liar'}
            </h3>
            <p className="rule-twist-card__body">
              {isPt
                ? 'Exatamente um suspeito (nunca a Vítima) mente — toda a sua pista é falsa, enquanto os outros dizem a verdade.'
                : 'Exactly one suspect (never the Victim) is lying — their entire statement is false while all others are true.'}
            </p>
          </div>
        </div>

        {/* Apple Pencil & iPad Quick Strip */}
        <div className="rule-pencil-strip">
          <div className="rule-pencil-strip__head">
            <IconPencil size={13} />
            <span>{isPt ? 'Apple Pencil e Atalhos iPad' : 'Apple Pencil & iPad Shortcuts'}</span>
          </div>
          <div className="rule-pencil-chips">
            <span className="rule-pencil-chip">
              {isPt ? 'Duplo toque ponta: Borracha ↔ Lápis' : 'Double-tap tip: Eraser ↔ Tool'}
            </span>
            <span className="rule-pencil-chip">
              {isPt ? '2 dedos: Desfazer · 3 dedos: Refazer' : '2-finger: Undo · 3-finger: Redo'}
            </span>
            <span className="rule-pencil-chip">
              {isPt ? 'Marcar Grelha: carimbar ✕ / A–V por toque' : 'Stamp Grid: tap squares for ✕ / A–V'}
            </span>
          </div>
        </div>

        <span className="page-number page-number--right">5</span>
      </section>
    </div>
  );
};

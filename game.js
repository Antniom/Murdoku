// ============================================================
// game.js — Murdoku React Application (v2 — 1:1 fidelity)
// ============================================================

const { useState, useEffect, useCallback, useRef, useMemo } = React;

// ---- SVG cache for asset loading ----
const _svgCache = {};
const loadSvg = (src) => {
  if (_svgCache[src]) return Promise.resolve(_svgCache[src]);
  return fetch(src).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  }).then(text => {
    const trimmed = text.trim();
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<!doctype')) {
      throw new Error('Returned HTML instead of SVG');
    }
    _svgCache[src] = text;
    return text;
  });
};

// ---- Compute auto-X marks when suspects are placed ----
// Returns a Set of "x,y" keys that should have auto-X marks
const computeAutoXMarks = (placements, level) => {
  const autoX = new Set();
  for (const [suspectId, pos] of Object.entries(placements)) {
    // Mark all cells in same row
    for (let x = 0; x < level.cols; x++) {
      if (x !== pos.x && !isVoidCell(x, pos.y, level) && !isObstacleCell(x, pos.y, level)) {
        autoX.add(`${x},${pos.y}`);
      }
    }
    // Mark all cells in same col
    for (let y = 0; y < level.rows; y++) {
      if (y !== pos.y && !isVoidCell(pos.x, y, level) && !isObstacleCell(pos.x, y, level)) {
        autoX.add(`${pos.x},${y}`);
      }
    }
  }
  return autoX;
};

// ============================================================
// AVATAR SVG — unique per suspect based on seed + trait
// ============================================================
const AvatarSVG = ({ color, name, size = 64, isGrid = false }) => {
  const nameLower = name ? name.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const url = `/assets/scraped/suspect_${nameLower}.svg`;

  // Fallback to one of the 6 built-in vectors based on name seed
  const assetNames = ['alexander', 'bella', 'carol', 'dalia', 'evangeline', 'viraj'];
  const seed = name ? name.charCodeAt(0) + (name.length * 7) : 65;
  const assetName = assetNames[seed % assetNames.length];
  const fallbackUrl = `/assets/suspect_${assetName}.svg`;

  const handleImgError = (e) => {
    if (e.target.src !== window.location.origin + fallbackUrl) {
      e.target.src = fallbackUrl;
    }
  };

  const filterStyle = isGrid
    ? 'drop-shadow(3px 0px 0px #000) drop-shadow(-3px 0px 0px #000) drop-shadow(0px 3px 0px #000) drop-shadow(0px -3px 0px #000) drop-shadow(2px 2px 0px #000) drop-shadow(-2px 2px 0px #000) drop-shadow(2px -2px 0px #000) drop-shadow(-2px -2px 0px #000)'
    : 'none';

  return (
    <img 
      src={url} 
      onError={handleImgError}
      style={{ 
        width: size, height: size, 
        objectFit: 'contain', 
        objectPosition: 'center bottom',
        filter: filterStyle
      }} 
    />
  );
};

// ============================================================
// SVG ASSET COMPONENT
// ============================================================
const SvgAsset = ({ type, size = '100%' }) => {
  const [svgContent, setSvgContent] = useState(null);
  const assetFiles = typeof ASSET_FILES !== 'undefined' ? ASSET_FILES : {};
  const src = assetFiles[type] ? `/${assetFiles[type]}` : `/assets/obj_${type}.svg`;

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    loadSvg(src).then(text => {
      if (!cancelled) setSvgContent(colorizeSvg(text, type));
    }).catch((err) => {
      console.warn(`[SvgAsset] Failed to load SVG for ${type} from ${src}:`, err.message);
    });
    return () => { cancelled = true; };
  }, [src, type]);

  if (!svgContent) return null;
  return (
    <div
      style={{ width: size, height: size, display:'flex', alignItems:'center', justifyContent:'center',
               filter:'drop-shadow(1px 2px 0 rgba(0,0,0,0.4))' }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

// ============================================================
// PORTRAIT CARD — matches original mrdPortraitGroup structure
// ============================================================
const PortraitCard = ({ suspect, isSelected, isPlaced }) => (
  <div className="portrait-wrapper">
    <button
      className={`portrait-card mrdHoverGlow ${isSelected ? 'sel selected-portrait' : ''}`}
      style={{
        backgroundColor: suspect.color,
      }}
      tabIndex={-1}
    >
      {/* Avatar Area */}
      <div className="portrait-avatar">
        <AvatarSVG color={suspect.color} name={suspect.name} size="85%" />
      </div>
      {/* Inner highlight border */}
      <div className="portrait-inner-border" />
      {/* Name bar */}
      <div className={`portrait-name-bar ${suspect.isVictim ? 'victim-tag' : ''}`}>
        {suspect.name}
      </div>
    </button>
  </div>
);

// ============================================================
// CLUE BOX — pop animation on mount, matches original
// ============================================================
const ClueBox = ({ suspect, clueText, isSelected }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.classList.remove('clue-box-pop');
      void ref.current.offsetWidth;
      ref.current.classList.add('clue-box-pop');
    }
  }, [clueText]);

  return (
    <div
      ref={ref}
      className="clue-box clue-box-pop"
      style={{
        background: isSelected
          ? `linear-gradient(to bottom, ${suspect.color}30, ${suspect.color}10)`
          : `linear-gradient(to bottom, ${suspect.color}18, transparent)`,
      }}
    >
      <div
        className="clue-text"
        dangerouslySetInnerHTML={{ __html: clueText }}
      />
    </div>
  );
};

// ============================================================
// TIMER
// ============================================================
const useTimer = (running) => {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const reset = useCallback((val = 0) => setSeconds(val), []);
  const formatted = useMemo(() => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [seconds]);

  return { seconds, formatted, reset };
};

// ============================================================
// GRAIN CANVAS OVERLAY (matches original site's grain effect)
// ============================================================
const GrainOverlay = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const drawGrain = () => {
      const w = canvas.width = canvas.offsetWidth;
      const h = canvas.height = canvas.offsetHeight;
      const imageData = ctx.createImageData(w, h);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 30;
        data[i] = data[i+1] = data[i+2] = v;
        data[i+3] = Math.random() * 18;
      }
      ctx.putImageData(imageData, 0, 0);
      animId = requestAnimationFrame(drawGrain);
    };
    drawGrain();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position:'fixed', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:1, mixBlendMode:'screen' }}
    />
  );
};

// ============================================================
// GRID PREVIEW (for level selector cards)
// ============================================================
const GridPreview = ({ level, size = 160 }) => {
  const { cols, rows } = level;
  const cellSize = Math.min(size / cols, size / rows);
  const w = cols * cellSize;
  const h = rows * cellSize;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'block', borderRadius:4}}>
      {Array.from({length: rows}, (_, y) =>
        Array.from({length: cols}, (_, x) => {
          if (isVoidCell(x, y, level)) return null;
          const room = getRoomForCell(x, y, level);
          return (
            <rect key={`${x}-${y}`}
              x={x*cellSize} y={y*cellSize} width={cellSize} height={cellSize}
              fill={room?.color || '#fbfbfd'} stroke="rgba(0,0,0,0.1)" strokeWidth="0.5"/>
          );
        })
      )}
      {/* Room borders */}
      {Array.from({length: rows}, (_, y) =>
        Array.from({length: cols}, (_, x) => {
          if (isVoidCell(x, y, level)) return null;
          const r = getRoomForCell(x, y, level);
          const lines = [];
          if (x < cols-1 && !isVoidCell(x+1,y,level)) {
            const rr = getRoomForCell(x+1,y,level);
            if (r?.id !== rr?.id) lines.push(<line key={`v${x}${y}`} x1={(x+1)*cellSize} y1={y*cellSize} x2={(x+1)*cellSize} y2={(y+1)*cellSize} stroke="#000" strokeWidth="1.5"/>);
          }
          if (y < rows-1 && !isVoidCell(x,y+1,level)) {
            const rd = getRoomForCell(x,y+1,level);
            if (r?.id !== rd?.id) lines.push(<line key={`h${x}${y}`} x1={x*cellSize} y1={(y+1)*cellSize} x2={(x+1)*cellSize} y2={(y+1)*cellSize} stroke="#000" strokeWidth="1.5"/>);
          }
          // Outer edges
          if (y === 0 || isVoidCell(x,y-1,level)) lines.push(<line key={`et${x}${y}`} x1={x*cellSize} y1={y*cellSize} x2={(x+1)*cellSize} y2={y*cellSize} stroke="#000" strokeWidth="2"/>);
          if (y === rows-1 || isVoidCell(x,y+1,level)) lines.push(<line key={`eb${x}${y}`} x1={x*cellSize} y1={(y+1)*cellSize} x2={(x+1)*cellSize} y2={(y+1)*cellSize} stroke="#000" strokeWidth="2"/>);
          if (x === 0 || isVoidCell(x-1,y,level)) lines.push(<line key={`el${x}${y}`} x1={x*cellSize} y1={y*cellSize} x2={x*cellSize} y2={(y+1)*cellSize} stroke="#000" strokeWidth="2"/>);
          if (x === cols-1 || isVoidCell(x+1,y,level)) lines.push(<line key={`er${x}${y}`} x1={(x+1)*cellSize} y1={y*cellSize} x2={(x+1)*cellSize} y2={(y+1)*cellSize} stroke="#000" strokeWidth="2"/>);
          return lines;
        })
      )}
    </svg>
  );
};

// ============================================================
// LEVEL CARD (selector) — matches original puzzle-card-tilt style
// ============================================================
const LevelCard = ({ level, isCompleted, bestTime, isInProgress, onClick }) => {
  const dc = DIFFICULTY_COLORS[level.difficulty] || DIFFICULTY_COLORS['Medium'];
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="puzzle-card-tilt"
      style={{ position:'relative', overflow:'visible' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        role="button" tabIndex={0}
        className={`mrdHoverGlow puzzle-card-notched${hovered ? '' : ''}`}
        onClick={onClick}
        onKeyDown={e => e.key === 'Enter' && onClick()}
        style={{
          position:'relative', display:'flex', flexDirection:'column', alignItems:'center',
          gap:12, padding:16, height:340,
          background:'linear-gradient(155deg, rgb(243,237,226) 0%, rgb(238,232,220) 50%, rgb(232,225,212) 100%)',
          border:'2px solid var(--border)', borderRadius:12, cursor:'pointer',
          fontFamily:'inherit', color:'rgb(42,31,14)', boxSizing:'border-box',
          boxShadow: hovered ? '9px 9px 0 rgba(0,0,0,0.30)' : '6px 6px 0 rgba(0,0,0,0.30)',
          transition:'box-shadow 0.15s', overflow:'visible',
        }}
      >
        {/* Status Badge */}
        {(isCompleted || isInProgress) && (
          <div style={{
            position:'absolute', top:12, right:12, zIndex:15,
            padding:'4px 8px', borderRadius:6, fontSize:9, fontWeight:800,
            textTransform:'uppercase', letterSpacing:0.5,
            background: isCompleted ? 'rgba(74, 186, 120, 0.15)' : 'rgba(230, 140, 20, 0.15)',
            color: isCompleted ? 'rgb(50, 160, 90)' : 'rgb(200, 110, 10)',
            border: isCompleted ? '1px solid rgba(74, 186, 120, 0.3)' : '1px solid rgba(230, 140, 20, 0.3)',
            boxShadow:'0 1px 2px rgba(0,0,0,0.05)',
            display:'flex', alignItems:'center', gap:4
          }}>
            {isCompleted ? '✓ Solved' : '✏ In Progress'}
          </div>
        )}

        {/* Pin */}
        <svg width="14" height="14" viewBox="0 0 20 20"
          style={{ position:'absolute', top:-1, left:'50%', marginLeft:-7, zIndex:10, pointerEvents:'none', filter:'drop-shadow(3px 3px 0 rgba(0,0,0,0.3))' }}>
          <circle cx="10" cy="10" r="8" fill="#909090" stroke="#000" strokeWidth="2"/>
          <circle cx="10" cy="10" r="5" fill="#b0b0b0"/>
          <circle cx="8.5" cy="8.5" r="2" fill="rgba(255,255,255,0.7)"/>
        </svg>

        {/* Paper texture */}
        <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:1, opacity:0.5, borderRadius:12 }}>
          <div style={{ position:'absolute', inset:0, borderRadius:12, boxShadow:'rgba(120,90,40,0.09) 0 0 30px inset' }}/>
        </div>

        {/* Preview */}
        <div style={{ position:'relative', zIndex:2, marginTop:8 }}>
          <div style={{ display:'inline-block', width:198, height:198, borderRadius:4, boxShadow:'rgba(0,0,0,0.3) 0 2px 8px', overflow:'hidden' }}>
            <GridPreview level={level} size={198}/>
          </div>
        </div>

        {/* Name */}
        <div style={{ fontWeight:800, fontSize:14, textAlign:'center', lineHeight:1.2, color:'rgb(42,31,14)', position:'relative', zIndex:12 }}>
          {level.name}
        </div>

        {/* Meta */}
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', justifyContent:'center', position:'relative', zIndex:12 }}>
          <span style={{ padding:'3px 8px', fontSize:10, fontWeight:800, textTransform:'uppercase', background:dc.bg, color:dc.color, borderRadius:4, border:`1px solid ${dc.border}` }}>
            {level.difficulty}
          </span>
          <span style={{ fontSize:11, color:'rgba(60,42,16,0.65)', fontWeight:700 }}>{level.cols}×{level.rows}</span>
          <span style={{ fontSize:11, color:'rgba(60,42,16,0.65)', fontWeight:700 }}>{level.suspects.length} suspects</span>
        </div>

        {isCompleted && bestTime != null && (
          <div style={{ fontSize:11, color:'#c79f2a', fontWeight:700, position:'relative', zIndex:12 }}>
            ✓ Best: {Math.floor(bestTime/60)}:{String(bestTime%60).padStart(2,'0')}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// GENERATE MODAL
// ============================================================
const GenerateModal = ({ onClose, onGenerate }) => {
  const [theme, setTheme] = useState('');
  const [difficulty, setDifficulty] = useState('Easy');
  const [size, setSize] = useState('medium');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!theme.trim()) { setError('Please enter a theme.'); return; }
    setStatus('loading'); setError('');
    try {
      const level = await generateLevelWithGemini(theme.trim(), difficulty, size, msg => console.log('[Gemini]', msg));
      onGenerate(level);
    } catch (e) {
      setError(e.message || 'Generation failed. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card fade-in">
        <div className="modal-title">✨ Generate Level</div>
        <div className="modal-sub">Let AI create a unique puzzle just for you</div>
        {status === 'loading' ? (
          <div className="generating-state">
            <div className="spinner"/>
            <div className="generating-text">Generating your puzzle...</div>
            <div style={{fontSize:12, color:'var(--text-muted)', marginTop:8}}>This takes about 10–20 seconds</div>
          </div>
        ) : (<>
          <div className="form-field">
            <label className="form-label">Theme / Setting</label>
            <input className="form-input" placeholder='e.g. "haunted lighthouse", "medieval castle"'
              value={theme} onChange={e => setTheme(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGenerate()} autoFocus/>
          </div>
          <div className="form-field">
            <label className="form-label">Difficulty</label>
            <select className="form-select" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              <option>Very Easy</option><option>Easy</option><option>Medium</option><option>Hard</option><option>Expert</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Approximate Size</label>
            <select className="form-select" value={size} onChange={e => setSize(e.target.value)}>
              <option value="small">Small (5–6 suspects)</option>
              <option value="medium">Medium (7–8 suspects)</option>
              <option value="large">Large (9–10 suspects)</option>
            </select>
          </div>
          {error && <div className="error-msg">{error}</div>}
          <div className="modal-actions">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={handleGenerate} disabled={!theme.trim()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Generate
            </button>
          </div>
        </>)}
      </div>
    </div>
  );
};

// ============================================================
// HOW TO PLAY MODAL
// ============================================================
const HowToPlayModal = ({ onClose }) => (
  <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal-card fade-in">
      <div className="modal-title">How to Play</div>
      <ul className="howto-list">
        <li><span className="howto-icon">🎯</span> Place one suspect per row and one per column — like Sudoku.</li>
        <li><span className="howto-icon">👆</span> <strong>Click</strong> a portrait, then <strong>click</strong> a grid cell to add a pencil note.</li>
        <li><span className="howto-icon">⏱️</span> <strong>Hold</strong> a cell (~500ms) to <strong>firmly place</strong> the suspect there.</li>
        <li><span className="howto-icon">✕</span> Placing a suspect auto-fills their row & column with X marks.</li>
        <li><span className="howto-icon">🔍</span> Read clues carefully — they reference objects, rooms & positions.</li>
        <li><span className="howto-icon">🔪</span> The <strong>victim</strong> is alone with exactly one other suspect — the murderer.</li>
        <li><span className="howto-icon">↩️</span> Use <strong>Undo</strong> to step back any action.</li>
      </ul>
      <div className="modal-actions" style={{marginTop:16}}>
        <button className="btn-primary" onClick={onClose} style={{flex:'none', width:'100%'}}>Got it!</button>
      </div>
    </div>
  </div>
);

// ============================================================
// LEVEL SELECTOR SCREEN
// ============================================================
const LevelSelector = ({ onSelectLevel, onShowGenerate, generatedLevels }) => {
  const [filter, setFilter] = useState('All');
  const completed = getCompletedLevels();

  const inProgressMap = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('murdoku_level_progress') || '{}');
    } catch {
      return {};
    }
  }, []);

  const allLevels = [...BUILT_IN_LEVELS, ...generatedLevels];
  const filters = ['All','Very Easy','Easy','Medium','Hard','Expert','AI Generated'];
  const filtered = allLevels.filter(l => {
    if (filter === 'All') return true;
    if (filter === 'AI Generated') return !BUILT_IN_LEVELS.find(b => b.id === l.id);
    return l.difficulty === filter;
  });

  return (
    <div style={{
      minHeight:'100vh', width:'100vw', display:'flex', flexDirection:'column', overflowY:'auto',
      background:`repeating-linear-gradient(2deg,transparent,transparent 11px,rgba(120,80,40,0.021) 11px,rgba(120,80,40,0.021) 12px),
      repeating-linear-gradient(178deg,transparent,transparent 23px,rgba(100,70,35,0.014) 23px,rgba(100,70,35,0.014) 24px),
      linear-gradient(180deg,var(--bg) 0%,color-mix(in srgb,var(--bg) 96.5%,rgb(120,80,40)) 50%,var(--bg) 100%)`,
    }}>
      {/* Vignette */}
      <div style={{ position:'fixed', inset:0, boxShadow:'rgba(0,0,0,0.15) 0 0 150px 60px inset', pointerEvents:'none', zIndex:100 }}/>
      <GrainOverlay/>

      {/* Header */}
      <div style={{ background:'var(--panel)', borderBottom:'1px solid var(--border-soft)', padding:'clamp(12px,3vw,20px)', flexShrink:0, position:'sticky', top:0, zIndex:30 }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ fontSize:22, fontWeight:900, letterSpacing:-1 }}>MRD<span style={{color:'#ff7171'}}>O</span>KU</div>
            <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:500 }}>Murder Mystery meets Sudoku</span>
          </div>
          <div style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>
            <strong style={{color:'rgb(99,220,130)'}}>{completed.length}</strong> / {allLevels.length} completed
          </div>
        </div>

        {/* Sub-header */}
        <div style={{ maxWidth:1200, margin:'12px auto 0', textAlign:'center' }}>
          <p style={{ margin:0, fontSize:13, color:'var(--text-muted)' }}>Select a puzzle to play</p>
        </div>

        {/* Filter bar */}
        <div style={{ maxWidth:1200, margin:'12px auto 0', overflowX:'auto', scrollbarWidth:'none' }}>
          <div style={{ display:'flex', gap:6, justifyContent:'center', minWidth:'max-content', padding:'0 4px' }}>
            {filters.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding:'6px 12px', fontSize:11, fontWeight:700,
                border: filter === f ? '2px solid var(--accent)' : '1px solid var(--border-soft)',
                background: filter === f ? 'var(--accent-bg)' : 'transparent',
                color:'var(--text)', borderRadius:6, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap',
              }}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards grid */}
      <div style={{ padding:'clamp(12px,3vw,24px)' }}>
        <div style={{ maxWidth:1400, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:24 }}>

          {/* Generate Card */}
          {(filter === 'All' || filter === 'AI Generated') && (
            <div className="puzzle-card-tilt" style={{ position:'relative', overflow:'visible' }}>
              <button
                className="mrdHoverGlow puzzle-card-notched"
                onClick={onShowGenerate}
                style={{
                  position:'relative', display:'flex', flexDirection:'column', alignItems:'center',
                  gap:12, padding:16, height:340, width:'100%',
                  background:'linear-gradient(155deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)',
                  border:'2px solid #0f3460', borderRadius:12, cursor:'pointer',
                  fontFamily:'inherit', color:'#e2e2f0', boxSizing:'border-box',
                  boxShadow:'6px 6px 0 rgba(15,52,96,0.5)',
                }}
              >
                <div style={{ width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,0.07)', border:'2px solid rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, margin:'20px 0 10px' }}>✨</div>
                <div style={{ fontWeight:800, fontSize:14, textAlign:'center', color:'#e2e2f0' }}>Create New Level</div>
                <div style={{ fontSize:11, color:'rgba(200,200,240,0.7)', fontWeight:600 }}>AI-powered, any theme</div>
                <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center' }}>
                  {['Very Easy','Medium','Expert'].map(d => {
                    const dc = DIFFICULTY_COLORS[d];
                    return <span key={d} style={{ padding:'3px 8px', fontSize:9, fontWeight:800, textTransform:'uppercase', background:dc.bg, color:dc.color, borderRadius:4, border:`1px solid ${dc.border}` }}>{d}</span>;
                  })}
                </div>
              </button>
            </div>
          )}

          {filtered.map(level => {
            const comp = completed.find(c => c.id === level.id);
            const inProg = !!inProgressMap[level.id];
            return (
              <LevelCard 
                key={level.id} 
                level={level} 
                isCompleted={!!comp} 
                bestTime={comp?.time} 
                isInProgress={inProg} 
                onClick={() => onSelectLevel(level)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN GAME GRID
// ============================================================
const GameGrid = ({ level, placements, notes, xMarks, autoXMarks, selectedEntity, toolMode, pressingCell, onPointerDown, onPointerUp, onPointerLeave }) => {
  const { cols, rows, cellSize = 72 } = level;
  const W = cols * cellSize;
  const H = rows * cellSize;
  const [hoveredRoomId, setHoveredRoomId] = useState(null);
  const [tooltip, setTooltip] = useState(null); // { x, y, label }
  const tooltipTimerRef = useRef(null);
  const obsLabels = typeof OBSTACLE_LABELS !== 'undefined' ? OBSTACLE_LABELS : {};

  const roomBorderPath = useMemo(() => {
    let p = '';
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (isVoidCell(x,y,level)) continue;
      const r = getRoomForCell(x,y,level);
      if (x < cols-1) { const rr = isVoidCell(x+1,y,level) ? null : getRoomForCell(x+1,y,level); if (!rr || r?.id !== rr.id) p += `M${(x+1)*cellSize} ${y*cellSize} V${(y+1)*cellSize} `; }
      if (y < rows-1) { const rd = isVoidCell(x,y+1,level) ? null : getRoomForCell(x,y+1,level); if (!rd || r?.id !== rd.id) p += `M${x*cellSize} ${(y+1)*cellSize} H${(x+1)*cellSize} `; }
    }
    return p;
  }, [level, cols, rows, cellSize]);

  const thinGridPath = useMemo(() => {
    let p = '';
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (isVoidCell(x,y,level)) continue;
      const r = getRoomForCell(x,y,level);
      if (x < cols-1 && !isVoidCell(x+1,y,level)) { const rr = getRoomForCell(x+1,y,level); if (r?.id === rr?.id) p += `M${(x+1)*cellSize} ${y*cellSize} V${(y+1)*cellSize} `; }
      if (y < rows-1 && !isVoidCell(x,y+1,level)) { const rd = getRoomForCell(x,y+1,level); if (r?.id === rd?.id) p += `M${x*cellSize} ${(y+1)*cellSize} H${(x+1)*cellSize} `; }
    }
    return p;
  }, [level, cols, rows, cellSize]);

  const outerBorderPath = useMemo(() => {
    let p = '';
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (isVoidCell(x,y,level)) continue;
      if (y === 0 || isVoidCell(x,y-1,level)) p += `M${x*cellSize} ${y*cellSize} H${(x+1)*cellSize} `;
      if (y === rows-1 || isVoidCell(x,y+1,level)) p += `M${x*cellSize} ${(y+1)*cellSize} H${(x+1)*cellSize} `;
      if (x === 0 || isVoidCell(x-1,y,level)) p += `M${x*cellSize} ${y*cellSize} V${(y+1)*cellSize} `;
      if (x === cols-1 || isVoidCell(x+1,y,level)) p += `M${(x+1)*cellSize} ${y*cellSize} V${(y+1)*cellSize} `;
    }
    return p;
  }, [level, cols, rows, cellSize]);

  // Compute the perimeter border path of the currently hovered room
  const hoveredRoomPath = useMemo(() => {
    if (!hoveredRoomId) return '';
    const room = (level.rooms || []).find(r => r.id === hoveredRoomId);
    if (!room) return '';
    const cellSet = new Set(room.cells.map(c => `${c.x},${c.y}`));
    let p = '';
    for (const c of room.cells) {
      const {x, y} = c;
      // Top edge: if neighbor above is not in same room
      if (!cellSet.has(`${x},${y-1}`)) p += `M${x*cellSize} ${y*cellSize} H${(x+1)*cellSize} `;
      // Bottom edge
      if (!cellSet.has(`${x},${y+1}`)) p += `M${x*cellSize} ${(y+1)*cellSize} H${(x+1)*cellSize} `;
      // Left edge
      if (!cellSet.has(`${x-1},${y}`)) p += `M${x*cellSize} ${y*cellSize} V${(y+1)*cellSize} `;
      // Right edge
      if (!cellSet.has(`${x+1},${y}`)) p += `M${(x+1)*cellSize} ${y*cellSize} V${(y+1)*cellSize} `;
    }
    return p;
  }, [hoveredRoomId, level, cellSize]);

  return (
    <div className="grid-wrapper" style={{ width:W, height:H }} onPointerLeave={() => { setHoveredRoomId(null); clearTimeout(tooltipTimerRef.current); setTooltip(null); }}>
      <div
        className="grid-container"
        style={{ gridTemplateColumns:`repeat(${cols},${cellSize}px)`, gridTemplateRows:`repeat(${rows},${cellSize}px)` }}
      >
        {Array.from({length: rows * cols}, (_, idx) => {
          const x = idx % cols;
          const y = Math.floor(idx / cols);
          const cellKey = `${x},${y}`;
          const void_ = isVoidCell(x, y, level);
          const obstacle = getObstacleAt(x, y, level);
          const room = void_ ? null : getRoomForCell(x, y, level);
          const occupantId = Object.keys(placements).find(id => placements[id].x === x && placements[id].y === y);
          const occupant = occupantId ? level.suspects.find(s => s.id === occupantId) : null;
          const cellNotes = notes[cellKey] || [];
          const hasManualX = !!xMarks[cellKey];
          const hasAutoX = autoXMarks.has(cellKey);
          const hasAnyX = (hasManualX || hasAutoX) && !occupant;
          const press = pressingCell?.x === x && pressingCell?.y === y;
          const canPlace = !void_ && (!obstacle || obstacle.walkable);

          return (
            <div
              key={idx}
              className={`grid-cell ${void_ ? 'void-cell' : ''}`}
              style={{
                gridColumn: x+1, gridRow: y+1,
                width:cellSize, height:cellSize,
                cursor: void_ ? 'default' : canPlace ? 'pointer' : 'default',
                pointerEvents: void_ ? 'none' : 'auto',
              }}
              onPointerDown={canPlace ? e => onPointerDown(e, x, y) : undefined}
              onPointerUp={canPlace ? e => onPointerUp(e, x, y) : undefined}
              onPointerEnter={!void_ ? () => {
                setHoveredRoomId(room?.id || null);
                if (obstacle) {
                  clearTimeout(tooltipTimerRef.current);
                  const label = obsLabels[obstacle.type] || obstacle.type;
                  tooltipTimerRef.current = setTimeout(() => setTooltip({ x, y, label }), 800);
                }
              } : undefined}
              onPointerLeave={() => {
                if (canPlace) onPointerLeave();
                clearTimeout(tooltipTimerRef.current);
                setTooltip(null);
              }}
            >
              {/* Cell BG (only non-void) */}
              {!void_ && (
                <div 
                  className="cell-bg"
                  style={{
                    backgroundColor: room?.color || '#fbfbfd',
                    opacity: occupant ? 0.4 : 0.65,
                  }}
                />
              )}

              {/* Room hover glow overlay (subtle bg brighten) */}
              {!void_ && room && room.id === hoveredRoomId && (
                <div className="room-hover-glow" />
              )}

              {/* Hover preview */}
              {!void_ && (!obstacle || obstacle.walkable) && !occupant && (
                <div className="hover-preview" />
              )}

              {/* Obstacle */}
              {!void_ && obstacle && (() => {
                const isDoubleBedTop = obstacle.type === 'bed_top' || obstacle.type === 'bed_top_02';
                const isDoubleBedBottom = obstacle.type === 'bed' || obstacle.type === 'bed_02';
                return (
                  <div className="cell-asset"
                    style={
                      isDoubleBedTop 
                        ? { height: 'calc(200% + 20px)', pointerEvents: 'none' } 
                        : isDoubleBedBottom 
                        ? { display: 'none' } 
                        : undefined
                    }
                  >
                    <SvgAsset type={obstacle.type} size="100%"/>
                    {tooltip?.x === x && tooltip?.y === y && (
                      <div className="obstacle-tooltip">{tooltip.label}</div>
                    )}
                  </div>
                );
              })()}

              {/* X marks (auto or manual) */}
              {!void_ && hasAnyX && (
                <>
                  {hasManualX && <div className="manual-x-bg"/>}
                  <div className="x-mark-container">
                    <svg width={cellSize * 0.8} height={cellSize * 0.8} viewBox="0 0 87.7 95.7"
                      fill="rgba(25,25,34,0.95)"
                      style={{ filter: hasManualX ? 'drop-shadow(0px 1px 1px rgba(0,0,0,0.2))' : 'none' }}
                    >
                      <path d="M16.5,0l27,29.5L71.1.4c.4-.1.7-.1,1.1,0,.9.2,6.9,6.8,8,8s1.5,1.7,2.4,2.7c1.7,1.8,3.3,3.7,5.2,5.3v.6l-28,29.7.4,1.2c9.5,9.6,18.2,20,27.7,29.6v1.5c-.5,0-.9.4-1.2.7-4.5,4.8-8.7,10-13.4,14.6l-1.1.2-27.5-28.2-27.6,29.5h-1.5c-1-2-2.8-3.7-4.3-5.3-2.9-3.1-5.8-6.2-8.7-9.3-.6-.7-1.4-1.7-2.4-1.9v-2.1l28-29.7L0,16.8v-.3L14.8,0h1.8Z"/>
                    </svg>
                  </div>
                </>
              )}

              {/* Notes */}
              {!void_ && !occupant && !hasAnyX && cellNotes.length > 0 && (
                <div className="notes-container" style={{ 
                  position: 'absolute',
                  inset: '4px',
                  zIndex: 20,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cellNotes.length === 1 ? 1 : cellNotes.length <= 4 ? 2 : 3}, 1fr)`,
                  gridGap: '2px',
                  pointerEvents: 'none'
                }}>
                  {cellNotes.map(id => {
                    const s = level.suspects.find(s => s.id === id);
                    if (!s) return null;
                    const len = cellNotes.length;
                    const fontSize = len === 1 ? 40 : len === 2 ? 22 : len <= 4 ? 14 : 10;
                    const borderRadius = len === 1 ? 8 : len === 2 ? 4 : 3;
                    return (
                      <div key={id} style={{ 
                        borderRadius: borderRadius, 
                        background: s.color, 
                        display:'flex', alignItems:'center', justifyContent:'center', 
                        fontSize: fontSize, fontWeight:900, color:'#fff', 
                        textShadow:'0 0 2px rgba(0,0,0,0.5)',
                        transition: 'font-size 0.15s, border-radius 0.15s'
                      }}>
                        {s.name.charAt(0)}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Occupant (Suspect placed here) */}
              {!void_ && occupant && (
                <>
                  {/* Suspect Name Letter Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    left: '6px',
                    fontSize: '28px',
                    fontWeight: 900,
                    color: occupant.color,
                    WebkitTextStroke: '3.5px #000',
                    textStroke: '3.5px #000',
                    zIndex: 18,
                    fontFamily: 'Inter, sans-serif',
                    lineHeight: 1,
                    pointerEvents: 'none'
                  }}>
                    {occupant.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="occupant-container" style={{
                    position: 'absolute',
                    width: '80%',
                    height: '80%',
                    left: '10%',
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    zIndex: 15,
                  }}>
                    <div className="occupant-inner" style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                    }}>
                      <AvatarSVG color={occupant.color} name={occupant.name} isGrid={true} size="100%" />
                    </div>
                  </div>
                </>
              )}

              {/* Hold ring */}
              {press && toolMode === 'select' && selectedEntity && (
                <div className="hold-ring">
                  <svg viewBox="0 0 100 100" width={cellSize*0.45} height={cellSize*0.45} style={{transform:'rotate(-90deg)'}}>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="14"/>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgb(99,180,255)" strokeWidth="14"
                      strokeDasharray="251" strokeDashoffset="251"
                      style={{animation:'fillCircle 500ms linear forwards'}}/>
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SVG borders overlay */}
      <svg style={{ position:'absolute', top:0, left:0, pointerEvents:'none', zIndex:5, width:W, height:H }} viewBox={`0 0 ${W} ${H}`}>
        <path d={thinGridPath} stroke="var(--wall-thin)" strokeWidth="0.5" fill="none"/>
        <path d={roomBorderPath} stroke="var(--wall-thick)" strokeWidth="3" strokeLinecap="square" fill="none"/>
        <path d={outerBorderPath} stroke="var(--wall-thick)" strokeWidth="4" strokeLinecap="square" fill="none"/>
        
        {/* Wall decorations (windows) */}
        {(level.obstacles || []).map((obs, idx) => {
          if (obs.type !== 'window' || !obs.wall) return null;
          
          const cx = (obs.x + 0.5) * cellSize;
          const cy = (obs.y + 0.5) * cellSize;
          
          let wx, wy;
          let isHorizontal = true;
          
          if (obs.wall === 'top') {
            wx = cx;
            wy = obs.y * cellSize;
            isHorizontal = true;
          } else if (obs.wall === 'bottom') {
            wx = cx;
            wy = (obs.y + 1) * cellSize;
            isHorizontal = true;
          } else if (obs.wall === 'left') {
            wx = obs.x * cellSize;
            wy = cy;
            isHorizontal = false;
          } else if (obs.wall === 'right') {
            wx = (obs.x + 1) * cellSize;
            wy = cy;
            isHorizontal = false;
          } else {
            return null;
          }
          
          if (isHorizontal) {
            const w = cellSize * 0.55;
            const h = cellSize * 0.16;
            return (
              <g key={`wall-obs-${idx}`} transform={`translate(${wx - w/2}, ${wy - h/2})`}>
                <rect width={w} height={h} rx={h/2} ry={h/2} fill="#ffffff" stroke="var(--wall-thick)" strokeWidth="2.5" />
                <line x1={w/2} y1={0} x2={w/2} y2={h} stroke="var(--wall-thick)" strokeWidth="1.5" />
              </g>
            );
          } else {
            const w = cellSize * 0.16;
            const h = cellSize * 0.55;
            return (
              <g key={`wall-obs-${idx}`} transform={`translate(${wx - w/2}, ${wy - h/2})`}>
                <rect width={w} height={h} rx={w/2} ry={w/2} fill="#ffffff" stroke="var(--wall-thick)" strokeWidth="2.5" />
                <line x1={0} y1={h/2} x2={w} y2={h/2} stroke="var(--wall-thick)" strokeWidth="1.5" />
              </g>
            );
          }
        })}

        {/* Hovered room border highlight */}
        {hoveredRoomPath && (
          <>
            <path d={hoveredRoomPath} stroke="rgba(99,180,255,0.35)" strokeWidth="8" strokeLinecap="square" fill="none"/>
            <path d={hoveredRoomPath} stroke="rgb(99,180,255)" strokeWidth="3.5" strokeLinecap="square" fill="none" className="room-border-pulse"/>
          </>
        )}
      </svg>

      {/* Room labels (small corner label always visible, glows and scales on hover) */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:25 }}>
        {level.rooms.map(room => {
          const cells = room.cells.filter(c => !isVoidCell(c.x, c.y, level));
          if (!cells.length) return null;
          
          // Find leftmost column among room cells
          const minX = Math.min(...cells.map(c => c.x));
          // Filter cells to only those in the leftmost column
          const leftmostCells = cells.filter(c => c.x === minX);
          // Find the bottommost cell in that leftmost column to guarantee it is in a valid room cell
          const targetCellY = Math.max(...leftmostCells.map(c => c.y));
          
          const isHovered = room.id === hoveredRoomId;
          return (
            <div key={room.id} style={{ position:'absolute', left: minX*cellSize+4, top: (targetCellY+1)*cellSize-5, whiteSpace:'nowrap' }}>
              <span style={{
                display: 'inline-block',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 0.4,
                color: isHovered ? 'rgb(99, 180, 255)' : 'rgba(255, 255, 255, 0.92)',
                lineHeight: 1,
                textShadow: isHovered 
                  ? '0 0 8px rgba(99, 180, 255, 0.8), 0 0 15px rgba(99, 180, 255, 0.5), -1px -1px 0 #000, -1px 0 0 #000, -1px 1px 0 #000, 0 -1px 0 #000, 0 1px 0 #000, 1px -1px 0 #000, 1px 0 0 #000, 1px 1px 0 #000'
                  : '-1px -1px 0 #000, -1px 0 0 #000, -1px 1px 0 #000, 0 -1px 0 #000, 0 1px 0 #000, 1px -1px 0 #000, 1px 0 0 #000, 1px 1px 0 #000',
                transition: 'all 0.15s ease',
                transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                transformOrigin: 'left bottom',
              }}>{room.name.toUpperCase()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================
// VICTORY OVERLAY
// ============================================================
const VictoryOverlay = ({ level, timeSeconds, onNext, onBack }) => {
  const mins = Math.floor(timeSeconds / 60);
  const secs = timeSeconds % 60;
  const victim = level.suspects.find(s => s.isVictim);
  return (
    <div className="victory-overlay">
      <div className="victory-card">
        <div style={{fontSize:48, marginBottom:12}}>🏆</div>
        <div style={{fontSize:28, fontWeight:900, letterSpacing:-1, marginBottom:6}}>Case Solved!</div>
        <div style={{fontSize:14, color:'var(--text-muted)', fontWeight:600, marginBottom:8}}>
          {victim ? `${victim.name} has been avenged.` : 'The murder has been solved.'}
        </div>
        <div style={{fontSize:22, fontWeight:900, color:'var(--accent)', marginBottom:20}}>
          {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
        </div>
        <button className="victory-btn" onClick={onNext}>Next Puzzle →</button>
        <button className="victory-btn-back" onClick={onBack}>← Back to Levels</button>
      </div>
    </div>
  );
};

// ============================================================
// MAIN APP COMPONENT
// ============================================================
const MurdokuApp = () => {
  const [view, setView] = useState('selector');
  const [level, setLevel] = useState(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [generatedLevels, setGeneratedLevels] = useState([]);

  // Game state
  const [placements, setPlacements] = useState({});
  const [notes, setNotes]           = useState({});
  // xMarks = manually placed X's
  const [xMarks, setXMarks]         = useState({});
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [toolMode, setToolMode]     = useState('select');
  const [undoStack, setUndoStack]   = useState([]);
  const [isVictory, setIsVictory]   = useState(false);
  const [pressingCell, setPressingCell] = useState(null);

  // Compute auto-X marks based on placements
  const autoXMarks = useMemo(() =>
    level ? computeAutoXMarks(placements, level) : new Set(),
    [placements, level]
  );

  const { seconds: elapsed, formatted: timerStr, reset: resetTimer } = useTimer(view === 'playing' && !isVictory);
  const pressTimerRef = useRef(null);
  const pressStartPos = useRef(null);

  useEffect(() => {
    loadGeneratedLevels().then(levels => setGeneratedLevels(levels));
  }, []);

  // Auto-save active level progress in localStorage
  useEffect(() => {
    if (!level || isVictory) return;
    try {
      const progress = JSON.parse(localStorage.getItem('murdoku_level_progress') || '{}');
      if (Object.keys(placements).length > 0 || Object.keys(notes).length > 0 || Object.keys(xMarks).length > 0) {
        progress[level.id] = { placements, notes, xMarks, elapsed };
        localStorage.setItem('murdoku_level_progress', JSON.stringify(progress));
      } else {
        if (progress[level.id]) {
          delete progress[level.id];
          localStorage.setItem('murdoku_level_progress', JSON.stringify(progress));
        }
      }
    } catch (e) {}
  }, [level, placements, notes, xMarks, elapsed, isVictory]);

  const saveUndoState = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-49), { placements, notes, xMarks }]);
  }, [placements, notes, xMarks]);

  const handleUndo = useCallback(() => {
    if (!undoStack.length) return;
    const last = undoStack[undoStack.length - 1];
    setPlacements(last.placements); setNotes(last.notes); setXMarks(last.xMarks);
    setUndoStack(prev => prev.slice(0, -1));
  }, [undoStack]);

  const startLevel = useCallback((lvl) => {
    setLevel(lvl);
    setSelectedEntity(null);
    setToolMode('select');
    setIsVictory(false);
    setPressingCell(null);

    let loaded = false;
    try {
      const progress = JSON.parse(localStorage.getItem('murdoku_level_progress') || '{}');
      const saved = progress[lvl.id];
      if (saved) {
        setPlacements(saved.placements || {});
        setNotes(saved.notes || {});
        setXMarks(saved.xMarks || {});
        setUndoStack([]);
        resetTimer(saved.elapsed || 0);
        loaded = true;
      }
    } catch (e) {}

    if (!loaded) {
      setPlacements({});
      setNotes({});
      setXMarks({});
      setUndoStack([]);
      resetTimer(0);
    }
    setView('playing');
  }, [resetTimer]);

  const handleGenerated = useCallback(async (lvl) => {
    await cacheLevel(lvl);
    // Refresh list from server so all users see the new level
    const updated = await loadGeneratedLevels();
    setGeneratedLevels(updated);
    setShowGenerate(false);
    startLevel(lvl);
  }, [startLevel]);


  // Pointer handlers
  const handlePointerDown = useCallback((e, x, y) => {
    if (isVictory) return;
    if (e.target?.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    pressStartPos.current = { x: e.clientX, y: e.clientY };
    setPressingCell({ x, y });
    if (toolMode === 'xmark') return;

    const holdDuration = selectedEntity ? 500 : 700;
    pressTimerRef.current = setTimeout(() => {
      if (selectedEntity) {
        saveUndoState();
        // Place suspect, clear occupying suspect from that cell first
        setPlacements(prev => {
          const next = { ...prev };
          for (const id in next) if (next[id].x === x && next[id].y === y) delete next[id];
          next[selectedEntity] = { x, y };
          return next;
        });
        // Remove notes for this suspect everywhere
        setNotes(prev => {
          const next = { ...prev };
          for (const key in next) {
            next[key] = next[key].filter(id => id !== selectedEntity);
            if (!next[key].length) delete next[key];
          }
          return next;
        });
      } else {
        saveUndoState();
        setPlacements({}); setNotes({}); setXMarks({}); setSelectedEntity(null);
      }
      setPressingCell(null);
      pressTimerRef.current = null;
    }, holdDuration);
  }, [isVictory, toolMode, selectedEntity, saveUndoState]);

  const handlePointerUp = useCallback((e, x, y) => {
    if (isVictory) return;
    if (e.target?.releasePointerCapture) e.target.releasePointerCapture(e.pointerId);
    setPressingCell(null);

    const isDrag = pressStartPos.current &&
      (Math.abs(e.clientX - pressStartPos.current.x) > 8 || Math.abs(e.clientY - pressStartPos.current.y) > 8);
    const wasTimer = !!pressTimerRef.current;
    if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null; }
    if (isDrag) return;

    if (toolMode === 'xmark') {
      saveUndoState();
      const cellKey = `${x},${y}`;
      setXMarks(prev => { const n = {...prev}; if (n[cellKey]) delete n[cellKey]; else n[cellKey] = true; return n; });
      return;
    }
    if (!wasTimer) return;

    // Short click
    const cellKey = `${x},${y}`;
    const occupantId = Object.keys(placements).find(id => placements[id].x === x && placements[id].y === y);

    if (!selectedEntity) {
      // Eraser: remove whatever is in this cell
      saveUndoState();
      if (occupantId) {
        setPlacements(prev => { const n = {...prev}; delete n[occupantId]; return n; });
      } else if (notes[cellKey]?.length > 0) {
        setNotes(prev => { const n = {...prev}; delete n[cellKey]; return n; });
      } else if (xMarks[cellKey]) {
        setXMarks(prev => { const n = {...prev}; delete n[cellKey]; return n; });
      } else {
        setUndoStack(prev => prev.slice(0,-1));
      }
      return;
    }

    if (autoXMarks.has(cellKey) && !xMarks[cellKey] && !occupantId) return; // auto-X'd cell, no action
    if (isObstacleCell(x, y, level)) return;
    if (occupantId === selectedEntity) return;

    // Toggle note
    saveUndoState();
    setNotes(prev => {
      const cn = prev[cellKey] || [];
      if (cn.includes(selectedEntity)) return { ...prev, [cellKey]: cn.filter(id => id !== selectedEntity) };
      return { ...prev, [cellKey]: [...cn, selectedEntity] };
    });
  }, [isVictory, toolMode, selectedEntity, placements, notes, xMarks, autoXMarks, level, saveUndoState]);

  const handlePointerLeave = useCallback(() => {
    setPressingCell(null);
    if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null; }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!level || Object.keys(placements).length !== level.suspects.length) return;
    const hard = checkHardConstraints(placements, level);
    if (!hard.valid) { alert(`Invalid: ${hard.reason}`); return; }
    const { allPass } = validateAllClues(placements, level);
    if (allPass) {
      setIsVictory(true);
      markLevelComplete(level.id, elapsed);
      try {
        const progress = JSON.parse(localStorage.getItem('murdoku_level_progress') || '{}');
        delete progress[level.id];
        localStorage.setItem('murdoku_level_progress', JSON.stringify(progress));
      } catch (e) {}
    }
    else alert('Some clues are not satisfied. Review your placement and try again.');
  }, [level, placements, elapsed]);

  const placedIds = useMemo(() => new Set(Object.keys(placements)), [placements]);

  // ---- RENDER: Selector ----
  if (view === 'selector') {
    return (
      <>
        <LevelSelector onSelectLevel={startLevel} onShowGenerate={() => setShowGenerate(true)} generatedLevels={generatedLevels}/>
        {showGenerate && <GenerateModal onClose={() => setShowGenerate(false)} onGenerate={handleGenerated}/>}
      </>
    );
  }

  // ---- RENDER: Playing ----
  return (
    <div 
      className="app"
      style={{
        background:`repeating-linear-gradient(2deg,transparent,transparent 11px,rgba(120,80,40,0.021) 11px,rgba(120,80,40,0.021) 12px),
        linear-gradient(180deg,var(--bg) 0%,color-mix(in srgb,var(--bg) 96.5%,rgb(120,80,40)) 50%,var(--bg) 100%)`,
      }}
    >
      {/* Vignette */}
      <div style={{ position:'fixed', inset:0, boxShadow:'rgba(0,0,0,0.12) 0 0 120px 40px inset', pointerEvents:'none', zIndex:100 }}/>
      <GrainOverlay/>

      {/* ---- LEFT PANEL ---- */}
      <div className="left-panel" style={{ zIndex: 2 }}>
        <div className="left-inner">

          {/* Header */}
          <div className="panel-header">
            <div className="panel-header-top">
              <button
                className="back-btn"
                onClick={() => { setView('selector'); setIsVictory(false); }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
                Back
              </button>
              <div className="logo-text">MRD<span className="logo-o">O</span>KU</div>
            </div>
            <div className="puzzle-meta">
              <span className="puzzle-name">{level?.name}</span>
              <span className="puzzle-timer">{timerStr}</span>
            </div>
          </div>

          <div className="suspects-title">Suspects</div>
          <div className="suspects-hint">
            Tap to select · Click grid for note · Hold grid to place
          </div>

          {/* Suspects 3-col grid */}
          <div className="suspects-grid">
            {(level?.suspects || []).map(suspect => {
              const isPlaced = placedIds.has(suspect.id);
              const isSelected = selectedEntity === suspect.id && toolMode === 'select';
              const clue = level.clues.find(c => c.suspectId === suspect.id);
              return (
                <div 
                  key={suspect.id} 
                  className={`portrait-group ${isSelected ? 'selected' : ''} ${isPlaced ? 'placed' : ''}`}
                  onClick={() => { setToolMode('select'); setSelectedEntity(prev => prev === suspect.id ? null : suspect.id); }}
                >
                  <PortraitCard suspect={suspect} isSelected={isSelected} isPlaced={isPlaced} />
                  <ClueBox suspect={suspect} clueText={clue?.text || ''} isSelected={isSelected} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---- CENTER — GRID ---- */}
      <div className="center-panel" style={{ zIndex: 2 }}>
        {level && (
          <GameGrid
            level={level} placements={placements} notes={notes} xMarks={xMarks} autoXMarks={autoXMarks}
            selectedEntity={selectedEntity} toolMode={toolMode} pressingCell={pressingCell}
            onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerLeave={handlePointerLeave}
          />
        )}
      </div>

      {/* ---- RIGHT PANEL ---- */}
      <div className="right-panel" style={{ zIndex: 2 }}>
        <div className="tools-label">Tools</div>

        {/* X Mark */}
        <button className={`tool-btn ${toolMode === 'xmark' ? 'active-tool' : ''}`}
          onClick={() => { setToolMode(p => p === 'xmark' ? 'select' : 'xmark'); setSelectedEntity(null); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
          X Mark
        </button>

        {/* Eraser */}
        <button 
          className={`tool-btn ${toolMode === 'eraser' ? 'active-tool' : ''}`}
          onClick={() => { setToolMode(p => p === 'eraser' ? 'select' : 'eraser'); setSelectedEntity(null); }}
          onPointerDown={() => {
            window.eraserTimer = setTimeout(() => {
              setXMarks({});
              setNotes({});
              setToolMode('select');
            }, 500);
          }}
          onPointerUp={() => clearTimeout(window.eraserTimer)}
          onPointerLeave={() => clearTimeout(window.eraserTimer)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/>
            <path d="M22 21H7"/><path d="m5 11 9 9"/>
          </svg>
          Eraser
          <span className="tool-sub">hold to clear all</span>
        </button>

        {/* Undo */}
        <button className="tool-btn" onClick={handleUndo} disabled={!undoStack.length}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
          </svg>
          Undo
        </button>

        <div style={{flex:1}}/>

        {/* Submit */}
        <button className="submit-btn"
          onClick={handleSubmit}
          disabled={Object.keys(placements).length !== (level?.suspects?.length ?? 0)}>
          SUBMIT
          <span className="submit-sub">(place all first)</span>
        </button>

        {/* How to play */}
        <button className="tool-btn" style={{padding:8}} onClick={() => setShowHowToPlay(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
          </svg>
          How to play
        </button>

        {/* Icon row */}
        <div style={{ display:'flex', gap:4, marginTop:4 }}>
          <button className="icon-btn" title="Dark mode" style={{flex:1}} onClick={() => {
            setIsDarkMode(p => {
              const n = !p;
              if (n) document.body.classList.add('dark-theme');
              else document.body.classList.remove('dark-theme');
              return n;
            });
          }}>
            {isDarkMode ? '🌞' : '🌙'}
          </button>
          <button className="icon-btn" title="Mute" style={{flex:1}} onClick={() => setIsSoundMuted(p => !p)}>
            {isSoundMuted ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Victory */}
      {isVictory && level && (
        <VictoryOverlay level={level} timeSeconds={elapsed}
          onNext={() => {
            const all = [...BUILT_IN_LEVELS, ...generatedLevels];

            const idx = all.findIndex(l => l.id === level.id);
            startLevel(all[idx+1] || all[0]);
          }}
          onBack={() => { setView('selector'); setIsVictory(false); }}
        />
      )}

      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)}/>}
    </div>
  );
};

// ============================================================
// RENDER
// ============================================================
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<MurdokuApp/>);

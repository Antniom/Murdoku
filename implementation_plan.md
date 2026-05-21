# Murdoku 1:1 Clone — Implementation Plan

## Overview

The current clone diverges significantly from the real Murdoku. After deep analysis of the live site and the saved HTML, here are the key gaps to close.

---

## Critical Differences Found

### 1. Layout (MAJOR)
| Feature | Current | Original |
|---|---|---|
| Layout | Header + 3-column flex | Full-height 3-panel split (left panel + grid center + right panel) |
| Left panel | Vertical list of suspect cards | **3-column grid** of portrait cards (3 per row) |
| Right panel | Wide section | Narrow (168px) fixed sidebar |
| Grid position | Centered in flex | Center of screen, vertically/horizontally centered |
| Overflow | Scrolls | No scroll — everything fits in viewport |

### 2. Portrait Cards (MAJOR)
| Feature | Current | Original |
|---|---|---|
| Style | Simple SVG avatar (head/body) | **Multi-layered illustrated portrait** with colored background per suspect |
| Size | 64×64px small | ~137×172px tall portrait card |
| Name display | Text in card | **Handwritten-font name bar** at bottom of portrait |
| Card layout | Portrait + clue in same row | Portrait card on top, **clue box below** (stacked vertically in a group) |
| Selection state | Blue ring | Card **scales up**, portrait pops up slightly |
| Grid layout | 1-column list | **3-column grid** (3 portraits per row) |

### 3. Clue Box (MAJOR)
| Feature | Current | Original |
|---|---|---|
| Style | Plain text in card | Separate beige **clue-box button** below portrait, with **bold keywords** |
| Keywords | Plain text | Key words (alone, beside, chair, etc.) are `<strong>` |
| Background | White card | Gradient from suspect color to panel |

### 4. Grid & Cells (MAJOR)
| Feature | Current | Original |
|---|---|---|
| Grid borders | CSS border classes | **Canvas-drawn** room boundary lines |
| Room colors | Solid `ROOM_COLORS` | Subtle warm-toned palette (beige/cream/yellow/green) |
| Obstacle cells | Furniture SVG in cell | Same but with correct sizing and tinting |
| Room labels | Text in bottom-left cell | **Absolute positioned overlays** with text-shadow stroke |
| Cell background | Solid room color | Warm graduated colors per room |
| Notes display | Letter initials | Small **colored square tiles** with suspect's initial |

### 5. Tools Panel (RIGHT - MAJOR)
| Feature | Current | Original |
|---|---|---|
| X Mark Tool | Not present | Dedicated **X mark tool button** with SVG icon |
| Eraser | "Clear All" button | **Hold-to-erase button** with SVG eraser icon + "hold to clear all" label |
| Undo | Not present | **UNDO button** |
| Submit | Blue button | Dimmed button labeled "SUBMIT (place all first)" |
| How to Play | Not present | Button |
| Extra controls | ?, ⚙ | ?, ↗, 🖨, 🔇, ⚙ in small icon grid |

### 6. Interaction Model (MAJOR)
| Feature | Current | Original |
|---|---|---|
| Note placement | Click = note, hold = place | **Same** (click = note, hold = place) |
| X mark | Auto-generated on row/column | **Manually placed** using X Mark Tool |
| Blocked cells | Auto-blocked with X overlay | No auto-blocking; X marks are manual |
| Mode | No explicit mode | "X Mark mode" vs "suspect selected" mode |
| Drag to paint | Not present | Drag across cells places/removes notes |

### 7. Visual/Brand (MODERATE)
| Feature | Current | Original |
|---|---|---|
| Logo | Text "MURDOKU" | SVG logo with red skull in "O" |
| Background | `bg-slate-200` | `#f2f0f7` (soft purple-gray) |
| Font | System sans-serif | **Inter** from Google Fonts |
| Timer | Not present | Timer in top area (puzzle name + time) |
| Language selector | Not present | Language dropdown |

---

## Proposed Changes

### Step 1 — Complete Rewrite of `index.html`

The current structure is fundamentally different. A complete rewrite is needed.

#### Key Architecture:

```
<div class="app"> (flex row, 100vw, 100vh, overflow:hidden)
  ├── LEFT PANEL (fixed ~494px, scrollable)
  │   ├── Header (logo, back btn, language, puzzle name, timer)  
  │   ├── Suspects grid (3-col grid of portrait groups)
  │   │   └── PortraitGroup (portrait card + clue box, stacked)
  │   └── (resize handle)
  ├── CENTER (flex 1, grid wrapper centered)
  │   └── Grid container (inline-grid, cell-per-cell)
  └── RIGHT PANEL (fixed ~168px)
      ├── Tools section (X Mark, Eraser, Undo)
      ├── (spacer)
      └── Bottom (Submit, How to Play, icon buttons)
```

#### Portrait Card Structure:
```html
<div class="portrait-group"> <!-- flex col -->
  <div class="portrait-wrapper"> <!-- overflows to show character above card -->
    <button class="portrait-card"> <!-- colored bg, thick border, shadow -->
      <div class="character-layers"> <!-- drop-shadow filter wrapper -->
        <!-- 3-4 stacked SVG layers with feColorMatrix tinting -->
      </div>
      <div class="portrait-inner-border"></div>
      <div class="portrait-name-bar">Name</div> <!-- handwriting font -->
    </button>
  </div>
  <button class="clue-box"> <!-- separate card below -->
    <div>He was <strong>beside</strong> the <strong>chair</strong>.</div>
  </button>
</div>
```

#### Notes in cells:
- Instead of letter initials, show small **colored square chips** with letter, matching suspect background color

#### X Mark Tool:
- Separate tool mode: when active, clicking a cell places/removes an X overlay
- X is dark semi-transparent overlay (`rgba(25,25,34,0.25)`)

#### Eraser:
- Click: erase single cell content
- Hold (500ms): clear entire board

#### Undo:
- Full undo stack (array of state snapshots)

#### Room boundaries:
- Drawn on a `<canvas>` overlay using thick lines between different rooms
- Thin lines between same-room cells

### Step 2 — CSS Design System

Using the original CSS variables:
```css
--bg: #f2f0f7;
--panel: #f8f7fb;
--panel2: #fbfbfd;
--border: #000000;
--border-soft: #cccccc;
--text: #191922;
--text-muted: rgba(25,25,34,0.7);
--accent: #c79f2a;
--cell-base: #fbfbfd;
--cell-placed: #f0eef6;
--wall-thin: #000000;
--wall-thick: #000000;
--x-overlay: rgba(25,25,34,0.25);
--select-primary: rgba(94,140,200,0.95);
--hover-preview: rgba(60,140,220,0.5);
```

Font: Google Fonts **Inter** for body, **Caveat** (or similar cursive) for name bar.

### Step 3 — Puzzle Data

Keep the existing puzzle engine but adapt to use a proper 6×6 puzzle with:
- Real room boundaries (jigsaw-style, defined per-cell)
- Multiple obstacle objects per room
- Proper clue text with bold keywords

---

## Open Questions

> [!IMPORTANT]
> **Character portraits**: The original uses real illustrated SVG portraits (multi-layered with feColorMatrix tinting). Since we don't have these assets, should we:
> - A) Use simplified SVG avatars but styled like the original card format (colored bg + name bar + card shape) — keeps the 1:1 look/feel
> - B) Try to generate portrait-style images for each character
> 
> **Recommendation**: Option A — keep the current SVG avatar approach but wrap it exactly like the original card structure.

> [!NOTE]
> **Puzzle difficulty/size**: The original has multiple puzzles (Easy=6×6, Medium=9×9, etc.). For the clone, should we focus on one hardcoded puzzle (like the saved "Entrega em 24 Horas" 6×6) or keep the multi-difficulty system?

---

## Verification Plan

1. Open `index.html` in browser and compare side-by-side with murdoku.com/play
2. Verify: 3-column portrait grid matches layout
3. Verify: Click places note, hold places character
4. Verify: X Mark tool works independently
5. Verify: Eraser clears cells; hold clears all
6. Verify: Undo reverts last action
7. Verify: Room labels appear with text-shadow stroke
8. Verify: Grid uses canvas for room borders

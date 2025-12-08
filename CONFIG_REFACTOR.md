# Config Refactoring - December 2025

## Overview

Refactored monolithic `gameConstants.ts` (739 lines) into 6 focused config modules for better maintainability.

## New Structure

```
client/src/lib/config/
├── index.ts              # Main export (backward compatibility)
├── timing.ts             # Hit windows, lead times, accuracy (113 lines)
├── colors.ts             # UI palette, lane colors, particles (86 lines)
├── geometry.ts           # Tunnel viewport, notes, hexagons (150 lines)
├── visual-effects.ts     # Particles, shake, chromatic, glitch (129 lines)
├── ui.ts                 # Deck meters, YouTube UI (124 lines)
└── rotationConstants.ts  # Tunnel rotation (already existed)
```

## Module Breakdown

### timing.ts
- `GAME_CONFIG` - Hit windows, accuracy thresholds, scoring
- `GAME_ENGINE_TIMING` - BPM ranges, sync intervals, note generation
- Exports: `LEAD_TIME`, `TAP_HIT_WINDOW`, `HOLD_HIT_WINDOW`, etc.

### colors.ts
- `BUTTON_CONFIG` - Lane colors and key bindings
- `UI_COLOR_PALETTE` - All UI colors (decks, soundpads, particles)
- `TAP_COLORS` - Note stroke and glow colors
- Exports: `COLOR_DECK_LEFT`, `SOUNDPAD_COLORS`, `PARTICLE_COLORS`, etc.

### geometry.ts
- `TUNNEL_GEOMETRY` - Viewport, vanishing point, hexagon radii
- `HOLD_NOTE_GEOMETRY` - Strip width, failure animation
- `TAP_NOTE_GEOMETRY` - Render/fallthrough windows
- Note-specific constants: `TAP_DEPTH`, `HOLD_STROKE`, `TAP_OPACITY`, etc.
- Exports: `VANISHING_POINT_X`, `JUDGEMENT_RADIUS`, `HEXAGON_RADII`, etc.

### visual-effects.ts
- `VISUAL_EFFECTS` - All effect parameters
- `HEALTH_THRESHOLDS` - Max health, low health trigger
- `COMBO_MILESTONES` - Particle spawn intervals
- `CHROMATIC_EFFECT` - RGB aberration settings
- `GLITCH_EFFECT` - Scan line effects
- Exports: `GREYSCALE_INTENSITY`, `PARTICLE_SIZE_MIN`, etc.

### ui.ts
- `DECK_ROTATION` - Wheel rotation mechanics
- `DECK_METER` - Hold progress display
- `YOUTUBE_UI` - All YouTube loader strings
- `YOUTUBE_DIMENSIONS` - Preview panel sizing
- `YOUTUBE_EMBED_OPTIONS` - Iframe configuration
- Exports: `DECK_METER_SEGMENTS`, `ROTATION_SPEED`, etc.

### index.ts
Re-exports all modules for backward compatibility:
```typescript
export * from './timing';
export * from './colors';
export * from './geometry';
export * from './visual-effects';
export * from './ui';
export * from './rotationConstants';
```

## Migration

**No breaking changes!** All imports updated automatically:

```typescript
// Old (still works via index.ts)
import { LEAD_TIME } from '@/lib/config/gameConstants';

// New (recommended)
import { LEAD_TIME } from '@/lib/config';

// Specific module (for new code)
import { LEAD_TIME } from '@/lib/config/timing';
```

## Files Updated

- **Created:** 6 new config files (timing, colors, geometry, visual-effects, ui, index)
- **Updated:** 45 files with imports (auto-updated to `@/lib/config`)
- **Backed up:** `gameConstants.ts.backup` (original 739-line file)

## Benefits

✅ **Maintainability:** Easy to find/edit specific config types  
✅ **Clarity:** Each module has single responsibility  
✅ **Scalability:** Add new features to appropriate module  
✅ **No Breaking Changes:** index.ts maintains backward compatibility  
✅ **Build Success:** All imports resolved correctly

## Next Features

For Phase 3+ (parallax, sync lines, zoom):
- Create new config files rather than expanding existing ones
- Follow pattern: `config/feature-name.ts` with focused exports
- Update `config/index.ts` to include new modules

## File Sizes

**Before:** 1 file, 739 lines  
**After:** 6 files, avg ~125 lines each

**Largest modules:**
1. geometry.ts (150 lines) - Could split TAP/HOLD if grows
2. visual-effects.ts (129 lines) - Well organized
3. ui.ts (124 lines) - Could extract YouTube to separate file
4. timing.ts (113 lines) - Clean
5. colors.ts (86 lines) - Perfect size

## Testing

✅ Build successful (5.42s)  
✅ All 204 TS/TSX files compile  
✅ No import errors  
✅ Bundle size unchanged (577.82 kB)

## Related Documents

- Code structure audit in chat history
- `TUNNEL_ROTATION_DYNAMIC.md` - Example of good config separation

# HYPERVERSE - Rhythm Game

## Project Overview
HYPERVERSE is a 3D rhythm game with beatmap loading, YouTube music sync, and deck-based hold note mechanics. Players interact with notes coming through a hexagonal tunnel visualization.

**Status:** Active development - hold note geometry refinement phase

---

## Game Architecture

### Screens
1. **Home** (`pages/Home.tsx`)
   - Beatmap/difficulty selection
   - LOAD BEATMAP: Open loader for custom beatmaps
   - LOAD NEW: Replace current beatmap with new one
   - START SESSION: Launch game with selected difficulty
   - Difficulty toggle: EASY, MEDIUM, HARD

2. **Game** (`pages/Game.tsx`)
   - Main gameplay loop
   - 3D tunnel visualization with notes approaching
   - Real-time score/combo/health display
   - Pause menu, rewind, difficulty switching

3. **Not Found** - 404 page

### State Management
- **Zustand** (`stores/useGameStore.ts`): Central game state
  - Notes, score, combo, health, game state (IDLE/PLAYING/PAUSED)
  - Current time sync with YouTube player
  - Pause state management

- **URL params**: Difficulty via query string

### Data Flow
1. User selects beatmap + difficulty on Home
2. Beatmap text stored in `localStorage.pendingBeatmap` (raw text for re-parsing)
3. Game component mounts with difficulty, re-parses beatmap
4. Notes rendered based on time sync with YouTube player

---

## Core Systems

### Beatmap System
- **Input**: Raw text files (escaping-gravity.txt, lost-in-the-rhythm.txt, etc.)
- **Parser** (`lib/beatmap/beatmapParser.ts`): Converts text to note objects
- **Format**: [METADATA] + difficulty sections with TAP/HOLD notes
- **Storage**: Full beatmap text in localStorage for re-parsing any difficulty

### YouTube Integration
- **Player**: Embedded iframe (persistent across screens)
- **Sync**: `useYoutubePlayer` hook provides real-time video time
- **Methods**: play(), pause(), seek(0), getCurrentTime()
- **On Difficulty Change**: Game remounts with new key, seeks to 0, resets all state

### 3D Tunnel Geometry
- **Vanishing Point**: (350, 300) - center of screen
- **Rays**: 6 lanes at angles [0°, 60°, 120°, 180°, 240°, 300°]
- **Hexagon Radii**: [22, 52, 89, 135, 187, 248] - visual depth circles
- **Judgement Radius**: 187 - where notes are tapped/held
- **Approach Window**: Notes visible 2000ms before judgement (LEAD_TIME)

### Note Types

#### TAP Notes
- Simple point notes (2D trapezoid)
- Approach geometry calculated by `calculateTapNoteGeometry`
- Perfect/Good/Bad timing windows

#### HOLD Notes
- Duration-based notes with start/end points
- **Geometry States**:
  1. **Approach Phase** (before pressed): Near end moves from vanishing point to judgement, far end maintains constant depth behind
  2. **Collapse Phase** (after pressed/failed): Strip shrinks from both ends toward center
  3. **Miss Failure**: Near end extends PAST judgement line (showing "moving through" user), far end stays at proper depth

---

## Recent Changes (Hold Note Geometry Refinement)

### Issue Identified
- Hold notes had incorrect depth rendering
- Far end was collapsing into vanishing point instead of maintaining proper 3D strip appearance
- Near end was stopping at judgement instead of continuing through on miss

### Fixes Applied

1. **Depth Calculation** (`lib/geometry/holdNoteGeometry.ts`)
   - Changed from expanding triangle → trapezoid to **constant-width moving strip**
   - Formula: `farDistance = nearDistance - stripWidth` (no clamping)
   - stripWidth capped at `max(JUDGEMENT_RADIUS - 50, 150)` to prevent vanishing point collision

2. **Miss Failure Behavior** 
   - Added `isHoldMissFailure` flag to `calculateApproachGeometry`
   - When true: near end extends PAST JUDGEMENT_RADIUS (visual "moving through" effect)
   - When false: near end clamped at JUDGEMENT_RADIUS (normal approach)
   - `calculateLockedNearDistance` returns null for misses (unlocks the geometry)

3. **Greyscale State** (`lib/notes/hold/holdGreystate.ts`)
   - `holdReleaseFailure`: Immediate greyscale
   - `tooEarlyFailure`: Immediate greyscale  
   - `holdMissFailure`: Greyscale at 70% of judgement radius (~judgement moment)

---

## Current State

### Working Features
✅ Beatmap loading (text + parsing)
✅ YouTube video sync
✅ Note rendering (TAP + HOLD)
✅ Difficulty switching with clean state reset
✅ Game state persistence across difficulty changes
✅ Hold note constant-width strip geometry
✅ Hold note miss failure extension past judgement

### Known Issues / TODOs
- Hold note far distance depth values at moment of miss (needs verification - currently set to maintain ~50+ distance from vanishing point)
- Collapse animation timing may need tuning
- Deck interaction system (left/right spin notes) - basic framework exists

### Key Constants
- **JUDGEMENT_RADIUS**: 187 (distance where notes are judged)
- **LEAD_TIME**: 2000ms (approach window)
- **HOLD_NOTE_STRIP_WIDTH_MULTIPLIER**: 0.15 (duration → depth)
- **FAILURE_ANIMATION_DURATION**: 1100ms (how long miss animates)

---

## Files Structure
```
client/src/
├── pages/                  # Screen components
│   ├── Home.tsx
│   ├── Game.tsx
│   └── not-found.tsx
├── components/
│   ├── game/
│   │   ├── Down3DNoteLane.tsx    # Main game viewport
│   │   ├── notes/
│   │   │   ├── TapNotes.tsx
│   │   │   ├── HoldNotes.tsx
│   │   │   └── HoldNote.tsx
│   │   └── TunnelBackground.tsx
│   └── loaders/BeatmapLoader.tsx
├── lib/
│   ├── beatmap/           # Parsing & conversion
│   │   ├── beatmapParser.ts
│   │   └── beatmapConverter.ts
│   ├── geometry/          # 3D calculations
│   │   └── holdNoteGeometry.ts
│   ├── youtube/           # YouTube integration
│   │   ├── youtubeSeek.ts
│   │   ├── youtubePlay.ts
│   │   └── [others]
│   ├── notes/             # Note rendering logic
│   │   ├── tap/
│   │   └── hold/
│   │       ├── holdNoteStyle.ts
│   │       ├── holdGreystate.ts
│   │       └── holdNoteHelpers.ts
│   └── config/
│       └── gameConstants.ts
├── stores/
│   └── useGameStore.ts    # Zustand state management
├── hooks/
│   ├── useGameLogic.ts    # Main game engine
│   ├── useYoutubePlayer.ts
│   ├── useHoldNotes.ts
│   └── [others]
└── App.tsx
```

---

## Next Steps / Development Priorities
1. **Verify hold note far distance values** - ensure they're realistic for all hold durations
2. **Test miss failure visual** - confirm near end extends properly and collapses correctly
3. **Deck mechanics** - implement left/right spin note interactions
4. **Visual polish** - particle effects, color schemes, animations
5. **Sound effects** - tap/hit/miss audio feedback
6. **Performance optimization** - render pipeline profiling

---

## Session Context (Latest Work)
- Fixed difficulty switching: Game component remounts with new key while iFrame persists
- Fixed YouTube seek on difficulty change: Now properly awaits async seek(0)
- Fixed hold note geometry: Constant-width strip instead of collapsing triangle
- Fixed miss failure: Near end extends past judgement, far end maintains depth

# Hyperverse Folder Organization Analysis

**Date:** January 25, 2026  
**Scope:** Client-side folder structure and file organization

---

## Executive Summary

Analysis reveals **significant opportunities** for improved organization in the `hooks/` directory (39 files) and `components/ui/` directory (56 files). Other directories show better organization with appropriate subfolder structures.

### Key Issues Identified

1. **❌ hooks/** - 39 files in single directory, no subfolders
2. **❌ components/ui/** - 56 files in single directory (including 1 subfolder)
3. **✅ lib/** - Well-organized with 13 domain-specific subfolders
4. **✅ components/game/** - Properly organized with feature-based subfolders
5. **⚠️ stores/** - 14 stores could benefit from grouping

---

## Detailed Analysis

### 🔴 Critical: hooks/ Directory (39 Files)

**Current Structure:** Flat directory with 39 hook files

#### File Categories (Proposed Organization)

##### 1️⃣ **Game Hooks** (18 files)
Core gameplay mechanics and game loop management:
- `useGameEngine.ts` - Main game engine orchestration
- `useGameLogic.ts` - Game logic processing
- `useGameLoop.ts` - Game loop management
- `useGameInput.ts` - Input handling
- `useGameConfig.ts` - Game configuration
- `useGameDebugger.ts` - Debug functionality
- `useGameQueries.ts` - Game data queries
- `useAutoStart.ts` - Auto-start functionality
- `useCountdown.ts` - Countdown timer
- `usePauseLogic.ts` - Pause mechanics
- `useRewind.ts` - Rewind functionality
- `useKeyControls.ts` - Keyboard controls
- `useTapNotes.ts` - Tap note mechanics
- `useHoldNotes.ts` - Hold note mechanics
- `useHoldProgress.ts` - Hold note progress tracking
- `useVisibleNotes.ts` - Note visibility calculation
- `useSyncedValue.ts` - Synchronized value management
- `useBeatmapLoader.ts` - Beatmap loading

##### 2️⃣ **Editor Hooks** (4 files)
Beatmap editor-specific functionality:
- `useEditorMouseHandlers.ts` - Mouse interaction handling
- `useHandleDetection.ts` - Note handle detection
- `useNoteCandidateScoring.ts` - Selection scoring logic
- `useNoteHandleDrag.ts` - Note dragging mechanics

##### 3️⃣ **Visual Effects Hooks** (10 files)
Graphics, animations, and visual feedback:
- `useChromatic.ts` - Chromatic aberration effect
- `useGlitch.ts` - Glitch effect
- `useParticles.ts` - Particle system
- `useShake.ts` - Screen shake effect
- `useFadeAnimation.ts` - Fade animations
- `useZoomEffect.ts` - Zoom effect
- `useIdleRotation.ts` - Idle rotation animation
- `useTunnelRotation.ts` - Tunnel rotation effect
- `useRotationTriggers.ts` - Rotation trigger management
- `useVanishingPointOffset.ts` - Vanishing point calculations

##### 4️⃣ **Audio Hooks** (2 files)
Audio playback and management:
- `useAudioEffects.ts` - Audio effects
- `useYoutubePlayer.ts` - YouTube player integration

##### 5️⃣ **Utility Hooks** (5 files)
Generic utilities and UI helpers:
- `use-mobile.tsx` - Mobile detection
- `use-toast.ts` - Toast notifications
- `useApiMutation.ts` - API mutations
- `useConsoleLogger.ts` - Console logging
- `useErrorLogs.ts` - Error logging

---

### 📋 Recommended hooks/ Structure

```
client/src/hooks/
├── game/                        # Core game mechanics (18 files)
│   ├── core/
│   │   ├── useGameEngine.ts
│   │   ├── useGameLogic.ts
│   │   ├── useGameLoop.ts
│   │   ├── useGameConfig.ts
│   │   └── useGameQueries.ts
│   ├── input/
│   │   ├── useGameInput.ts
│   │   └── useKeyControls.ts
│   ├── notes/
│   │   ├── useTapNotes.ts
│   │   ├── useHoldNotes.ts
│   │   ├── useHoldProgress.ts
│   │   └── useVisibleNotes.ts
│   ├── mechanics/
│   │   ├── useAutoStart.ts
│   │   ├── useCountdown.ts
│   │   ├── usePauseLogic.ts
│   │   ├── useRewind.ts
│   │   └── useSyncedValue.ts
│   └── data/
│       ├── useBeatmapLoader.ts
│       └── useGameDebugger.ts
│
├── editor/                      # Editor functionality (4 files)
│   ├── useEditorMouseHandlers.ts
│   ├── useHandleDetection.ts
│   ├── useNoteCandidateScoring.ts
│   └── useNoteHandleDrag.ts
│
├── effects/                     # Visual effects (10 files)
│   ├── screen/
│   │   ├── useChromatic.ts
│   │   ├── useGlitch.ts
│   │   ├── useShake.ts
│   │   └── useZoomEffect.ts
│   ├── animation/
│   │   ├── useFadeAnimation.ts
│   │   └── useIdleRotation.ts
│   ├── tunnel/
│   │   ├── useTunnelRotation.ts
│   │   └── useRotationTriggers.ts
│   └── geometry/
│       ├── useVanishingPointOffset.ts
│       └── useParticles.ts
│
├── audio/                       # Audio management (2 files)
│   ├── useAudioEffects.ts
│   └── useYoutubePlayer.ts
│
└── utils/                       # Generic utilities (5 files)
    ├── use-mobile.tsx
    ├── use-toast.ts
    ├── useApiMutation.ts
    ├── useConsoleLogger.ts
    └── useErrorLogs.ts
```

**Benefits:**
- ✅ Clear domain separation (game vs editor vs effects)
- ✅ Easier navigation and discovery
- ✅ Logical grouping by functionality
- ✅ Reduced cognitive load (max 6 files per subfolder)
- ✅ Scalable structure for future additions

---

### 🔴 Critical: components/ui/ Directory (56 Files)

**Current Structure:** Mostly flat with 56 files + 1 HUD subfolder

**Issue:** While most are third-party UI components (shadcn/ui), this many files in one directory reduces discoverability.

#### Proposed Grouping

```
client/src/components/ui/
├── layout/                      # Layout components
│   ├── accordion.tsx
│   ├── aspect-ratio.tsx
│   ├── collapsible.tsx
│   ├── resizable.tsx
│   ├── scroll-area.tsx
│   ├── separator.tsx
│   └── tabs.tsx
│
├── forms/                       # Form & input components
│   ├── button.tsx
│   ├── button-group.tsx
│   ├── checkbox.tsx
│   ├── field.tsx
│   ├── form.tsx
│   ├── input.tsx
│   ├── input-group.tsx
│   ├── input-otp.tsx
│   ├── label.tsx
│   ├── radio-group.tsx
│   ├── select.tsx
│   ├── slider.tsx
│   ├── switch.tsx
│   └── textarea.tsx
│
├── overlays/                    # Modals, dialogs, popovers
│   ├── alert-dialog.tsx
│   ├── dialog.tsx
│   ├── drawer.tsx
│   ├── hover-card.tsx
│   ├── popover.tsx
│   ├── sheet.tsx
│   ├── tooltip.tsx
│   └── sonner.tsx
│
├── navigation/                  # Navigation components
│   ├── breadcrumb.tsx
│   ├── menubar.tsx
│   ├── navigation-menu.tsx
│   ├── pagination.tsx
│   ├── sidebar.tsx
│   └── toggle-group.tsx
│
├── data-display/                # Data presentation
│   ├── avatar.tsx
│   ├── badge.tsx
│   ├── calendar.tsx
│   ├── card.tsx
│   ├── carousel.tsx
│   ├── chart.tsx
│   ├── item.tsx
│   ├── progress.tsx
│   ├── skeleton.tsx
│   └── table.tsx
│
├── feedback/                    # User feedback
│   ├── alert.tsx
│   ├── toast.tsx
│   └── toaster.tsx
│
└── menus/                       # Menu systems
    ├── command.tsx
    ├── context-menu.tsx
    ├── dropdown-menu.tsx
    └── toggle.tsx
```

**Note:** Since these are third-party components, reorganization is **OPTIONAL**. Consider this if the team frequently struggles to find specific components.

---

### ⚠️ Medium Priority: stores/ Directory (14 Files)

**Current Structure:** Flat directory with 14 store files

#### Proposed Grouping

```
client/src/stores/
├── game/                        # Game-related stores
│   ├── useGameStore.ts
│   ├── useGameDebuggerStore.ts
│   ├── useParticlesStore.ts
│   ├── useShakeStore.ts
│   └── useVanishingPointStore.ts
│
├── editor/                      # Editor-related stores
│   ├── useEditorStore.ts
│   ├── useEditorCoreStore.ts
│   ├── useEditorUIStore.ts
│   └── useEditorGraphicsStore.ts
│
├── media/                       # Media playback stores
│   ├── useYouTubePlayerStore.ts
│   └── useYoutubeStore.ts
│
└── utils/                       # Utility stores
    ├── useApiStore.ts
    ├── useConsoleLogStore.ts
    └── useToastStore.ts
```

**Benefits:**
- ✅ Groups related state management
- ✅ Mirrors hooks/ structure (game/editor/utils)
- ✅ 3-5 files per group (manageable)

---

### ✅ Well-Organized: lib/ Directory (13 Subfolders)

**Current Structure:** Already well-organized with domain-specific subfolders

```
client/src/lib/
├── audio/           # Audio management (1 file)
├── beatmap/         # Beatmap parsing (2 files)
├── config/          # Configuration (10 files)
├── editor/          # Editor logic (5 files)
├── engine/          # Game engine (2 files)
├── errors/          # Error handling (4 files)
├── geometry/        # Geometric calculations (2 files)
├── managers/        # Manager classes (3 files)
├── notes/           # Note processing (11 files, 3 subfolders)
├── parsers/         # Parser utilities (1 file)
├── soundeffects/    # Sound effects (files unknown)
├── utils/           # Utilities (15 files)
└── youtube/         # YouTube integration (12 files)
```

**Assessment:** ✅ **Excellent organization**
- Clear domain boundaries
- Appropriate subfolder nesting
- Manageable file counts per directory

**Potential Improvement:**
- `lib/config/` has 10 files - could split into `game/`, `editor/`, `ui/` subdirectories
- `lib/utils/` has 15 files - could group by domain (game, editor, notes, etc.)

---

### ✅ Well-Organized: components/game/ Directory

**Current Structure:** Feature-based subfolders

```
client/src/components/game/
├── Down3DNoteLane.tsx           # Top-level lane component
├── effects/                     # Visual effects (6 files)
│   ├── CamelotWheel.tsx
│   ├── ChromaticAberration.tsx
│   ├── GlitchOverlay.tsx
│   ├── ParticleSystem.tsx
│   ├── PerfectPulse.tsx
│   └── VisualEffects.tsx
├── hud/                         # HUD elements (4 files)
│   ├── DeckHoldMeters.tsx
│   ├── RectangleMeter.tsx
│   ├── SoundpadButton.tsx
│   └── SoundpadButtons.tsx
├── loaders/                     # Loading components
├── notes/                       # Note components (4 files)
│   ├── HoldNote.tsx
│   ├── HoldNotes.tsx
│   ├── TapNote.tsx
│   └── TapNotes.tsx
└── tunnel/                      # Tunnel visuals (9 files)
    ├── HexagonLayers.tsx
    ├── HoldJudgementLines.tsx
    ├── JudgementLines.tsx
    ├── ParallaxHexagonLayers.tsx
    ├── RadialSpokes.tsx
    ├── SyncLineHexagons.tsx
    ├── TapJudgementLines.tsx
    ├── TunnelBackground.tsx
    └── zoom.md
```

**Assessment:** ✅ **Excellent organization**
- Clear feature-based grouping
- Small, focused directories (4-9 files)
- Intuitive hierarchy

---

## Comparison: Current vs Industry Best Practices

| Directory | Files | Subfolders | Industry Rec. | Status |
|-----------|-------|------------|---------------|--------|
| **hooks/** | 39 | 0 | Max 10-15 per folder | ❌ **Needs refactoring** |
| **components/ui/** | 56 | 1 | Max 20 per folder | ⚠️ **Optional grouping** |
| **stores/** | 14 | 0 | Max 10-15 per folder | ⚠️ **Consider grouping** |
| **lib/** | N/A | 13 | 5-15 subfolders | ✅ **Excellent** |
| **components/game/** | 1 | 5 | 5-10 subfolders | ✅ **Excellent** |
| **components/editor/** | 19 | 0 | Max 15-20 per folder | ✅ **Acceptable** |

---

## Priority Recommendations

### 🔴 **High Priority: Reorganize hooks/ Directory**

**Impact:** High cognitive load, difficult navigation, poor discoverability  
**Effort:** Medium (requires import updates across codebase)  
**Benefit:** Significant improvement in developer experience

**Proposed Structure:**
```
hooks/
├── game/ (18 files)
│   ├── core/ (5 files)
│   ├── input/ (2 files)
│   ├── notes/ (4 files)
│   ├── mechanics/ (5 files)
│   └── data/ (2 files)
├── editor/ (4 files)
├── effects/ (10 files)
│   ├── screen/ (4 files)
│   ├── animation/ (2 files)
│   ├── tunnel/ (2 files)
│   └── geometry/ (2 files)
├── audio/ (2 files)
└── utils/ (5 files)
```

**Migration Steps:**
1. Create subdirectories
2. Move files to new locations
3. Update imports across codebase (use find/replace)
4. Update barrel exports (if any)
5. Test build and runtime

---

### ⚠️ **Medium Priority: Reorganize stores/ Directory**

**Impact:** Moderate - makes store discovery easier  
**Effort:** Low (fewer files, less coupling)  
**Benefit:** Consistent organization pattern

**Proposed Structure:**
```
stores/
├── game/ (5 files)
├── editor/ (4 files)
├── media/ (2 files)
└── utils/ (3 files)
```

---

### 💡 **Low Priority: Consider Grouping components/ui/**

**Impact:** Low - component discovery slightly improved  
**Effort:** Medium-High (many files, third-party source)  
**Benefit:** Marginal improvement

**Note:** This is **OPTIONAL** and should only be done if:
- Team frequently struggles to find UI components
- Planning to add custom UI components
- UI library is forked/customized (not using direct shadcn/ui)

**Alternative:** Keep flat structure but improve documentation with categorized list

---

### 💡 **Low Priority: Further Organize lib/config/ and lib/utils/**

**Current:**
- `lib/config/` - 10 files (flat)
- `lib/utils/` - 15 files (flat)

**Proposed:**
```
lib/config/
├── game/ (timing.ts, geometry.ts, rotationConstants.ts)
├── editor/ (editor.ts)
├── ui/ (ui.ts, colors.ts)
└── visual-effects/ (visual-effects.ts)

lib/utils/
├── game/ (tunnelUtils.ts, laneUtils.ts, laneRotationUtils.ts, judgementLineUtils.ts)
├── notes/ (tapNoteGeometryUtils.ts, holdNoteUtils.ts, holdMeterUtils.ts)
├── beatmap/ (parseBeatmapUtils.ts, convertBeatmapNotes.ts, syncLineUtils.ts)
└── common/ (utils.ts, errorLogUtils.ts, soundpadUtils.ts, visualEffectsUtils.ts)
```

---

## Implementation Plan

### Phase 1: High Priority (hooks/)

**Estimated Time:** 2-3 hours  
**Risk:** Medium (many imports to update)

1. ✅ Create directory structure
2. ✅ Move files to subdirectories
3. ✅ Update all imports (automated find/replace)
4. ✅ Test build
5. ✅ Manual QA of key features

### Phase 2: Medium Priority (stores/)

**Estimated Time:** 1 hour  
**Risk:** Low (fewer files, clear dependencies)

1. ✅ Create directory structure
2. ✅ Move files to subdirectories
3. ✅ Update imports
4. ✅ Test build

### Phase 3: Optional (ui/, lib/config/, lib/utils/)

**Estimated Time:** 3-4 hours  
**Risk:** Low-Medium  
**Decision:** Postpone until team consensus

---

## Import Pattern Updates

### Before (Current)
```typescript
import { useGameEngine } from '@/hooks/useGameEngine'
import { useEditorMouseHandlers } from '@/hooks/useEditorMouseHandlers'
import { useChromatic } from '@/hooks/useChromatic'
```

### After (Proposed)
```typescript
import { useGameEngine } from '@/hooks/game/core/useGameEngine'
import { useEditorMouseHandlers } from '@/hooks/editor/useEditorMouseHandlers'
import { useChromatic } from '@/hooks/effects/screen/useChromatic'
```

### Alternative: Barrel Exports
```typescript
// hooks/game/index.ts
export * from './core/useGameEngine'
export * from './input/useGameInput'
// ...

// Usage
import { useGameEngine, useGameInput } from '@/hooks/game'
```

---

## Conclusion

The Hyperverse codebase has **excellent organization in most areas** (`lib/`, `components/game/`) but suffers from **flat directory anti-patterns** in:

1. **❌ hooks/** - 39 files, no structure (HIGH PRIORITY)
2. **⚠️ stores/** - 14 files, could be grouped (MEDIUM PRIORITY)
3. **💡 components/ui/** - 56 files, optional grouping (LOW PRIORITY)

**Recommendation:** Prioritize reorganizing the `hooks/` directory using the proposed structure. This will significantly improve code navigation, discoverability, and maintainability.

---

## Appendix: Complete File Listings

### hooks/ Directory (39 files)
```
use-mobile.tsx
use-toast.ts
useApiMutation.ts
useAudioEffects.ts
useAutoStart.ts
useBeatmapLoader.ts
useChromatic.ts
useConsoleLogger.ts
useCountdown.ts
useEditorMouseHandlers.ts
useErrorLogs.ts
useFadeAnimation.ts
useGameConfig.ts
useGameDebugger.ts
useGameEngine.ts
useGameInput.ts
useGameLogic.ts
useGameLoop.ts
useGameQueries.ts
useGlitch.ts
useHandleDetection.ts
useHoldNotes.ts
useHoldProgress.ts
useIdleRotation.ts
useKeyControls.ts
useNoteCandidateScoring.ts
useNoteHandleDrag.ts
useParticles.ts
usePauseLogic.ts
useRewind.ts
useRotationTriggers.ts
useShake.ts
useSyncedValue.ts
useTapNotes.ts
useTunnelRotation.ts
useVanishingPointOffset.ts
useVisibleNotes.ts
useYoutubePlayer.ts
useZoomEffect.ts
```

### stores/ Directory (14 files)
```
useApiStore.ts
useConsoleLogStore.ts
useEditorCoreStore.ts
useEditorGraphicsStore.ts
useEditorStore.ts
useEditorUIStore.ts
useGameDebuggerStore.ts
useGameStore.ts
useParticlesStore.ts
useShakeStore.ts
useToastStore.ts
useVanishingPointStore.ts
useYouTubePlayerStore.ts
useYoutubeStore.ts
```

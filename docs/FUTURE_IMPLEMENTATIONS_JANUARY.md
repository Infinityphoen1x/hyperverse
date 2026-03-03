# Future Implementations - January 2026

Based on comprehensive gameplay analysis and feature gap assessment.

---

## 🚨 MUST HAVE - P0 (Breaks Core Loop)

### 1. Results Screen
**Priority:** CRITICAL  
**Estimated Time:** 2-4 hours  
**Status:** Not Started

**Problem:** No post-game feedback - players can't see final performance or replay

**Requirements:**
- Display final score, combo, max combo, miss count
- Show accuracy breakdown:
  - Perfect hits count (< 50ms)
  - Great hits count (< 100ms)
  - Normal hits count (< 150ms)
  - Miss count
  - Accuracy percentage
- Show timing distribution graph (early vs late)
- Buttons: "Replay", "Home", "Next Song"
- Animate in with score counter
- Store personal best scores (localStorage)

**Files to Create:**
- `/client/src/pages/Results.tsx`
- `/client/src/components/screens/ResultsScreen.tsx`
- `/client/src/stores/useResultsStore.ts` (optional)

**Integration:**
- Trigger on song completion or health depleted
- Pass final game state from useGameEngine
- Add route handling in App.tsx

---

### 2. Timing Judgement Display
**Priority:** CRITICAL  
**Estimated Time:** 1-2 hours  
**Status:** Not Started

**Problem:** Players can't tell how accurate their hits are - no visual feedback for timing quality

**Requirements:**
- Display "PERFECT" / "GREAT" / "NORMAL" / "MISS" text on each note hit
- Show timing error in milliseconds (e.g., "-15ms" for early, "+8ms" for late)
- Position overlay near hit note or center screen
- Fade out after 500ms
- Different colors per judgement:
  - PERFECT: Cyan glow (#00FFFF)
  - GREAT: Yellow (#FFD700)
  - NORMAL: White (#FFFFFF)
  - MISS: Red (#FF0000)
- Queue multiple judgements (don't overlap)

**Files to Create:**
- `/client/src/components/game/hud/JudgementDisplay.tsx`
- `/client/src/hooks/useJudgementFeedback.ts`

**Integration:**
- Hook into NoteProcessor.processTapHit() and processHoldEnd()
- Calculate judgement based on timingError
- Add to Game.tsx overlay

**Data Structure:**
```typescript
interface JudgementFeedback {
  id: string;
  judgement: 'PERFECT' | 'GREAT' | 'NORMAL' | 'MISS';
  timingError: number; // milliseconds
  timestamp: number; // when to show
  lane: number; // for positioning
}
```

---

### 3. Customizable Key Bindings
**Priority:** CRITICAL  
**Estimated Time:** 3-4 hours  
**Status:** Not Started

**Problem:** Keys are hardcoded (WOIEQP) - no accessibility or preference options

**Requirements:**
- Settings page section for key bindings
- Click button → "Press any key" prompt → capture and save
- Validate no duplicate bindings
- Show current key on each button
- Reset to defaults option
- Persist to localStorage
- Update KEY_LANE_MAP dynamically

**Default Mappings:**
```
Lane 0 (W): 'w' / 'W'
Lane 1 (O): 'o' / 'O'  
Lane 2 (I): 'i' / 'I'
Lane 3 (E): 'e' / 'E'
Lane -1 (Q): 'q' / 'Q'
Lane -2 (P): 'p' / 'P'
Pause: 'Escape'
Rewind: 'r' / 'R'
```

**Files to Modify:**
- `/client/src/pages/Settings.tsx` - Add key binding UI
- `/client/src/hooks/useKeyControls.ts` - Load from store instead of constant
- `/client/src/stores/useGameStore.ts` - Add keyBindings state

**Alternative Layouts to Support:**
- DVORAK users
- Left-handed layouts (ASDFGH + ZX)
- Numpad layouts (789456 + 10)
- Custom arrangements

---

## ⚡ SHOULD HAVE - P1 (Expected Features)

### 4. Visual & Audio Offset Calibration
**Priority:** HIGH  
**Estimated Time:** 2-3 hours  
**Status:** Not Started

**Problem:** Different devices have different A/V latency - no way to compensate

**Requirements:**
- Settings page sliders:
  - Visual Offset: -200ms to +200ms (adjusts note spawn time)
  - Audio Offset: -200ms to +200ms (adjusts audio playback delay)
- Real-time preview while adjusting
- Test mode: metronome with visual cue to verify sync
- Persist to localStorage
- Apply offsets in:
  - Note rendering (adjust currentTime)
  - Audio playback (delay/advance)

**Implementation:**
```typescript
// In useGameEngine or useGameLoop
const adjustedTime = currentTime + visualOffset;
const notes = getVisibleNotes(allNotes, adjustedTime);
```

**Files to Modify:**
- `/client/src/pages/Settings.tsx`
- `/client/src/stores/useGameStore.ts` - Add offset values
- `/client/src/hooks/useGameLoop.ts` - Apply visual offset
- `/client/src/lib/audio/audioManager.ts` - Apply audio offset

---

### 5. Accuracy Statistics Tracking
**Priority:** HIGH  
**Estimated Time:** 2 hours  
**Status:** Not Started

**Problem:** No detailed stats during gameplay or for analysis

**Requirements:**
- Track in real-time:
  - Perfect/Great/Normal/Miss counts
  - Early vs Late distribution
  - Current accuracy percentage
  - Average timing error
  - Max combo achieved
- Display mini-stats in pause menu
- Full breakdown in results screen
- Store per-session in useGameStore

**Data Structure:**
```typescript
interface AccuracyStats {
  perfectCount: number;
  greatCount: number;
  normalCount: number;
  missCount: number;
  earlyCount: number;
  lateCount: number;
  totalNotes: number;
  avgTimingError: number;
  maxCombo: number;
}
```

**Files to Modify:**
- `/client/src/lib/managers/scoringManager.ts` - Track stats
- `/client/src/stores/useGameStore.ts` - Add stats state
- Results screen to display

---

### 6. Improved Pause Menu
**Priority:** MEDIUM  
**Estimated Time:** 1-2 hours  
**Status:** Not Started

**Problem:** Pause menu is basic - doesn't show current performance

**Requirements:**
- Show while paused:
  - Current score
  - Current combo
  - Current health
  - Accuracy stats
  - Song progress (time / duration)
- Options:
  - Resume
  - Restart
  - Settings (quick access)
  - Quit to Home
- Semi-transparent backdrop
- Prevent accidental resume (require confirmation or delay)

**Files to Create:**
- `/client/src/components/screens/PauseMenu.tsx`

**Files to Modify:**
- `/client/src/pages/Game.tsx` - Replace basic pause with new component

---

### 7. Tutorial / Instructions Screen
**Priority:** MEDIUM  
**Estimated Time:** 2-3 hours  
**Status:** Not Started

**Problem:** New players don't understand mechanics, especially HOLD note pairing rules

**Requirements:**
- Show on first launch (localStorage flag)
- Manual access from Home screen
- Explain:
  - Basic controls (TAP vs HOLD notes)
  - Key layout diagram (show hexagon with lanes)
  - HOLD note pairing constraint (opposite lanes only)
  - Deck mechanics (Q/P positions)
  - Tunnel rotation (automatic for HOLD notes)
  - Scoring system (Perfect/Great/Normal)
  - Health system (gain on hit, lose on miss)
- Interactive examples if possible
- Skip option
- Paging (Next/Previous)

**Files to Create:**
- `/client/src/pages/Tutorial.tsx`
- `/client/src/components/screens/TutorialStep.tsx`

---

## 🎨 NICE TO HAVE - P2 (Polish)

### 8. Practice Mode
**Priority:** LOW-MEDIUM  
**Estimated Time:** 4-6 hours  
**Status:** Not Started

**Requirements:**
- Adjustable playback speed (0.5x - 1.5x)
- Section looping (set A/B points)
- Auto-pause on miss (optional)
- No score/combo tracking (practice only)
- Show note timing constantly
- Metronome option

**Use Cases:**
- Learn difficult patterns
- Practice specific sections
- Build muscle memory
- Test beatmaps

---

### 9. Leaderboards
**Priority:** LOW  
**Estimated Time:** 8-12 hours (with backend)  
**Status:** Not Started

**Options:**
- **Local Only:** localStorage per song/difficulty
- **Global:** Backend API + database
  - User accounts
  - Score submission
  - Replay validation (prevent cheating)
  - Daily/weekly/all-time rankings

**Requirements:**
- Show top 10/100 scores per song
- User's rank and score
- Filter by difficulty
- Replay viewing (optional)

---

### 10. Advanced Visual Options
**Priority:** LOW  
**Estimated Time:** 3-4 hours  
**Status:** Not Started

**Settings:**
- HUD opacity (0-100%)
- HUD scale (80-120%)
- Note appearance:
  - Note skin selection
  - Trail effects toggle
  - Glow intensity
- Background effects toggle:
  - Particles on/off
  - Screen shake on/off
  - Chromatic aberration on/off
  - Glitch effect on/off
- Lane brightness (for visibility)
- Judgement line brightness

---

### 11. Replay System
**Priority:** LOW  
**Estimated Time:** 6-8 hours  
**Status:** Not Started

**Requirements:**
- Record gameplay:
  - Input timestamps (key down/up)
  - Note outcomes (hit/miss/judgement)
  - Score progression
- Playback engine
- Replay file format (JSON)
- Save/load replays
- Share replays (export file)
- Replay verification (prevent tampering)

**Use Cases:**
- Review performance
- Learn from better players
- Share achievements
- Verify leaderboard scores

---

## 🐛 FIXES & IMPROVEMENTS

### 12. Standardize Note State Machine
**Priority:** MEDIUM  
**Estimated Time:** 2-3 hours  
**Status:** Not Started

**Problem:** Hold note state logic is complex - `hit`, `pressHoldTime`, `releaseTime` create confusion

**Proposal:**
- Clear state machine for HOLD notes:
  ```
  INACTIVE → APPROACHING → PRESSED → RELEASED → COMPLETED
             ↓            ↓          ↓
           TOO_EARLY    MISS     RELEASE_FAIL
  ```
- Single source of truth for note state
- Unified filtering logic (don't check multiple flags)
- Better TypeScript enums

**Files to Refactor:**
- `/client/src/types/game.ts` - Add NoteState enum
- `/client/src/lib/notes/processors/noteProcessor.ts`
- `/client/src/lib/utils/holdNoteUtils.ts`
- `/client/src/lib/utils/syncLineUtils.ts`

---

### 13. Unified Timing Terminology
**Priority:** LOW-MEDIUM  
**Estimated Time:** 1-2 hours  
**Status:** Not Started

**Problem:** "LEAD_TIME", "detection window", "hit window", "visibility window" used inconsistently

**Proposal:**
- Standardize naming:
  - `SPAWN_OFFSET`: Time before note.time when note spawns (4000ms)
  - `HIT_WINDOW`: Time range around note.time for successful hit (±150ms)
  - `MISS_WINDOW`: Time after HIT_WINDOW before auto-miss (250ms)
  - `CLEANUP_DELAY`: Time after miss before removing note (500ms)

**Files to Update:**
- `/client/src/lib/config/timing.ts`
- All references to LEAD_TIME
- Documentation comments

---

### 14. Performance Optimization
**Priority:** LOW  
**Estimated Time:** 4-6 hours  
**Status:** Not Started

**Areas:**
- Memoize expensive calculations
- Reduce re-renders (React.memo, useMemo, useCallback)
- Canvas-based note rendering instead of SVG
- Web Workers for beatmap parsing
- Virtualize long note lists
- Lazy load audio files

**Metrics to Track:**
- FPS (target: 60fps constant)
- Frame time (target: <16ms)
- Memory usage
- Input latency (target: <5ms)

---

## 📋 QUICK WINS (< 2 hours each)

### 15. Miss Counter in HUD
**Status:** Not Started  
**Time:** 15 minutes

Add "Misses: X" counter next to score/combo/health

---

### 16. Pause Menu Score Display  
**Status:** Not Started  
**Time:** 30 minutes

Show current score/combo in pause overlay

---

### 17. Early/Late Indicator
**Status:** Not Started  
**Time:** 1 hour

Show small arrow or text: "↑ EARLY" or "↓ LATE" with judgement

---

### 18. Max Combo Tracker
**Status:** Not Started  
**Time:** 30 minutes

Track and display max combo achieved in session

---

### 19. Song Progress Bar
**Status:** Not Started  
**Time:** 1 hour

Thin bar at top/bottom showing song completion percentage

---

### 20. Retry Counter
**Status:** Not Started  
**Time:** 15 minutes

Track how many times player retried current song (show in results)

---

## 🎯 IMPLEMENTATION ORDER

**Week 1 (Jan 6-12):**
1. Timing Judgement Display (P0)
2. Results Screen (P0)
3. Miss Counter (Quick Win)

**Week 2 (Jan 13-19):**
4. Key Binding Settings (P0)
5. Improved Pause Menu (P1)
6. Accuracy Statistics (P1)

**Week 3 (Jan 20-26):**
7. Calibration Tools (P1)
8. Tutorial Screen (P1)
9. Early/Late Indicator (Quick Win)

**Week 4 (Jan 27 - Feb 2):**
10. Practice Mode (P2)
11. Advanced Visual Options (P2)
12. Note State Machine Refactor

---

## 📊 METRICS TO TRACK

After implementing P0/P1 features, measure:
- **Player Retention:** Do players come back after seeing results?
- **Session Length:** How long do players stay engaged?
- **Retry Rate:** Are players retrying songs to improve scores?
- **Settings Usage:** Which settings are most adjusted?
- **Accuracy Trends:** Are players improving over time?

---

## 🔗 DEPENDENCIES

- **Results Screen** needs **Accuracy Statistics**
- **Tutorial** references **Key Bindings**
- **Leaderboards** need **Replay System** (for verification)
- **Practice Mode** needs **Calibration Tools** (for timing precision)

---

## 💡 NOTES

- Prioritize user feedback - implement P0 features first
- Test on multiple devices for A/V sync issues
- Consider accessibility (colorblind modes, font sizes)
- Mobile support? (touch controls would require major refactor)
- Multiplayer? (Future consideration, very large scope)

---

**Last Updated:** January 5, 2026  
**Status:** Planning Phase  
**Total Estimated Time:** ~60-80 hours for P0-P2

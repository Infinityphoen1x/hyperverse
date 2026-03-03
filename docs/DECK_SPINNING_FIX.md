# Deck Spinning Logic Fix

## Issue
Deck wheels were spinning based purely on physical key press/release events, not on the logical state of hold notes. This meant:
1. If a player held a key past the expected release time, the wheel kept spinning even though the note had been judged
2. If a hold note auto-failed (timed out), the wheel kept spinning until the player released the key
3. The visual deck spinning was not synchronized with the game logic that determines when a hold note is active

## Root Cause
The `CamelotWheel` component only tracked `isKeyPressed` state from keyboard events. The `startDeckHold` and `endDeckHold` functions in the game store were just empty console.log stubs with no actual logic.

## Solution
Implemented a proper deck spinning state management system:

### 1. Added Deck Spinning State to Store
**File:** [client/src/types/game.ts](client/src/types/game.ts)
- Added `leftDeckSpinning: boolean` and `rightDeckSpinning: boolean` to track logical spinning state
- Added setter methods `setLeftDeckSpinning` and `setRightDeckSpinning`

**File:** [client/src/stores/useGameStore.ts](client/src/stores/useGameStore.ts)
- Initialized both deck spinning states to `false`
- Implemented `startDeckHold()` to set the appropriate deck spinning state to `true`
- Implemented `endDeckHold()` to set the appropriate deck spinning state to `false`

### 2. Updated CamelotWheel Component
**File:** [client/src/components/game/effects/CamelotWheel.tsx](client/src/components/game/effects/CamelotWheel.tsx)
- Added `isDeckSpinning` selector to read the deck spinning state from store
- Created `shouldSpin` boolean that combines `isKeyPressed || isDeckSpinning`
- Added `shouldSpinRef` to sync the combined state to the animation loop
- Updated rotation animation loop to check `shouldSpinRef.current` instead of `isKeyPressedRef.current`
- Enhanced border glow effect to show brighter double glow when `shouldSpin` is true

### 3. Auto-Fail Deck Stop Logic
**File:** [client/src/hooks/useGameEngine.ts](client/src/hooks/useGameEngine.ts)
- Added logic to detect when hold notes transition to failed/completed state
- When a deck hold note (lane -1 or -2) fails or completes, automatically calls `endDeckHold(lane)`
- This ensures decks stop spinning when hold notes timeout or complete, even if the key is still held

## Behavior After Fix

### Hold Note Start
1. Player presses deck key (Q or P)
2. `handleTrackHoldStart` validates and processes the hold
3. `startDeckHold(lane)` called → sets `leftDeckSpinning` or `rightDeckSpinning` to `true`
4. `CamelotWheel` detects the state change → starts spinning with enhanced glow

### Hold Note End (Manual Release)
1. Player releases deck key
2. `handleTrackHoldEnd` processes the release and judges timing
3. `endDeckHold(lane)` called → sets deck spinning state to `false`
4. `CamelotWheel` stops spinning and returns to idle glow

### Hold Note End (Auto-Fail/Timeout)
1. Hold note reaches auto-fail threshold without being released
2. `processNotesFrame` detects the state transition (hit/failure flags set)
3. `endDeckHold(lane)` called automatically → sets deck spinning state to `false`
4. `CamelotWheel` stops spinning immediately, even if key is still held

## Visual Feedback
- **Idle**: Border has 50% opacity color with subtle 30% glow
- **Spinning**: Border has 100% opacity color with bright double glow (40px + 20px)
- This provides clear visual feedback about the logical state of hold notes

## Technical Details

### State Flow
```
Hold Note Active → leftDeckSpinning/rightDeckSpinning = true
                 → shouldSpin = true (in CamelotWheel)
                 → shouldSpinRef.current = true
                 → Animation loop rotates wheel
                 → Enhanced border glow visible

Hold Note Ends  → leftDeckSpinning/rightDeckSpinning = false
                → shouldSpin = false
                → shouldSpinRef.current = false
                → Animation loop stops rotating
                → Border returns to idle glow
```

### Key Decision
The deck spinning now represents **logical note state** rather than **physical key state**. This aligns with the earlier fix to the deck meter progress calculation, which also uses logical note timing (pressHoldTime to releaseTime) rather than being frame-dependent.

## Files Modified
1. [client/src/types/game.ts](client/src/types/game.ts) - Added deck spinning state types
2. [client/src/stores/useGameStore.ts](client/src/stores/useGameStore.ts) - Implemented deck spinning state management
3. [client/src/components/game/effects/CamelotWheel.tsx](client/src/components/game/effects/CamelotWheel.tsx) - Connected to store state, enhanced visual feedback
4. [client/src/hooks/useGameEngine.ts](client/src/hooks/useGameEngine.ts) - Added auto-fail deck stop logic

## Sound Effects Note
No hold loop sound effects were found in the codebase. Only `holdRelease` sound plays on successful release. If hold loop sounds are added in the future, they should follow the same pattern:
- Start loop when `startDeckHold` is called
- Stop loop when `endDeckHold` is called
- This ensures audio stays synchronized with the visual deck spinning

## Consistency with Previous Fixes
This fix maintains consistency with the earlier deck meter progress calculation fix:
- **Deck Meter**: Progress based on `(currentTime - pressHoldTime) / (releaseTime - pressHoldTime)`
- **Deck Spinning**: Active based on logical hold note state, stops at release time/auto-fail
- Both systems now represent **logical note timing** rather than frame-dependent or key-dependent behavior

Rhythm Game Mechanic: Dynamic Gap-Based Timing Windows

## Current Hyperverse Setup

**Lead Time (Rendering):** `MAGIC_MS = 80000` scaled by `playerSpeed`
- `effectiveLeadTime = MAGIC_MS / playerSpeed`
- Speed 20 (default): 80000 / 20 = 4000ms
- Speed 5 (slow): 80000 / 5 = 16000ms  
- Speed 40 (fast): 80000 / 40 = 2000ms

**Detection Windows:** Fixed for all notes
- TAP: `-TAP_RENDER_WINDOW_MS` to `+TAP_HIT_WINDOW` (-4000ms to +150ms)
- HOLD: Same as TAP (-4000ms to +150ms)

**Judgment Windows:** Fixed for all notes
- Hit success: ±150ms around note.time
- Too early fail: Before -150ms (within detection)
- Miss: After +150ms (within detection)

## Problems with Current System

1. **Overlapping Detection Windows**
   - TAP at 5000ms detectable from 1000-5150ms
   - HOLD at 8000ms detectable from 4000-8150ms
   - Windows overlap 4000-5150ms → requires hacky priority logic
   
2. **Fixed Difficulty Regardless of Density**
   - Dense sections (187ms gaps): Same ±150ms windows as sparse (3000ms gaps)
   - Fast patterns don't feel harder, slow patterns don't feel easier
   
3. **Speed-Visual Mismatch**
   - Fast speed = notes zoom by visually
   - But timing windows stay ±150ms (doesn't feel harder)

**Note:** "Too early fails on visible notes" is INTENTIONAL design, not a bug. Notes appear 4000ms early for read-ahead, but successful hits require precise timing. This is standard rhythm game design.

## Solution: Gap-Based Detection + Dynamic Judgment

### Key Concepts

**Detection Window:** When a keypress is recognized as targeting a note
- Press in this range → system knows you're trying to hit this note
- Currently: -4000ms to +150ms (fixed)

**Judgment Window:** When that press results in success vs failure
- PERFECT/GOOD/OK: Different timing precision tiers
- Too Early: Before success window (still detected)
- Miss: After success window (still detected)
- Currently: Fixed ±150ms for all notes

### Part 1: Gap-Based Early Detection

Prevents overlapping detection windows by limiting early detection to the gap since the previous note.

```typescript
interface Note {
  time: number;  // ms
  lane: number;
  type: 'TAP' | 'HOLD';
  duration?: number;
}

function getEarlyDetectionWindow(
  notes: Note[],
  lane: number,
  targetNote: Note,
  effectiveLeadTime: number  // MAGIC_MS / playerSpeed
): number {
  // Find previous note on this lane
  const prevNotes = notes.filter(n => n.lane === lane && n.time < targetNote.time);
  if (!prevNotes.length) return effectiveLeadTime;  // First note: use full render window

  const prevNote = prevNotes.reduce((latest, n) => n.time > latest.time ? n : latest);
  const prevEnd = prevNote.type === 'HOLD' 
    ? prevNote.time + (prevNote.duration ?? 0) 
    : prevNote.time;
  
  const gap = Math.max(0, targetNote.time - prevEnd);
  
  // Use minimum: can't detect before visible OR before previous note ends
  return Math.min(gap, effectiveLeadTime);
}
```

**Example: No More Overlaps**
```
TAP at 5000ms: earlyDetection = 4000ms (first note)
  → Detectable from 1000-5150ms
  
HOLD at 8000ms: earlyDetection = min(3000ms gap, 4000ms lead) = 3000ms
  → Detectable from 5000-8150ms
  
No overlap! At 4999ms, only TAP is detectable.
```
**Detection Window Scaling Examples:**

| Scenario | Gap | Lead Time | Detection Window | Result |
|----------|-----|-----------|------------------|--------|
| Sparse (slow speed) | 3000ms | 16000ms | 3000ms | Gap-limited |
| Sparse (default) | 3000ms | 4000ms | 3000ms | Gap-limited |
| Sparse (fast) | 3000ms | 2000ms | 2000ms | Lead-limited |
| Dense (200BPM 16ths) | 187ms | 4000ms | 187ms | Gap-limited (precise!) |

### Part 2: Dynamic Judgment Windows

Scale judgment windows with detection window for density-adaptive difficulty.

```typescript
function getJudgmentWindows(earlyDetectionMs: number) {
  // Scale factors for different judgment tiers
  const PERFECT_EARLY_SCALE = 0.08;   // 8% of detection window
  const GOOD_EARLY_SCALE = 0.20;      // 20% of detection window
  const OK_EARLY_SCALE = 0.32;        // 32% of detection window
  
  // Minimum windows to prevent impossibly tight timing
  const MIN_PERFECT_EARLY = 20;
  const MIN_GOOD_EARLY = 40;
  const MIN_OK_EARLY = 60;
  
  const PERFECT_EARLY = Math.max(MIN_PERFECT_EARLY, earlyDetectionMs * PERFECT_EARLY_SCALE);
  const GOOD_EARLY = Math.max(MIN_GOOD_EARLY, earlyDetectionMs * GOOD_EARLY_SCALE);
  const OK_EARLY = Math.max(MIN_OK_EARLY, earlyDetectionMs * OK_EARLY_SCALE);

  return {
    PERFECT: { early: PERFECT_EARLY, late: 30 },
    GOOD: { early: GOOD_EARLY, late: 70 },
    OK: { early: OK_EARLY, late: 120 },
    TOO_EARLY: earlyDetectionMs,  // Everything before PERFECT.early
    MISS: 200  // Everything after OK.late (extends detection window)
  };
}
```

**Why Success Windows Stay Fixed (But Miss Extends):**
- Human reaction time is constant (can't press faster than ~30ms after visual stimulus)
- Early side scales with read-ahead time (more time to prepare = more forgiveness)
- Late success windows (PERFECT/GOOD/OK.late) stay fixed for consistent "barely got it" timing
- **Miss window must extend** to cover full detection range, preventing unhandled gaps

**Judgment Coverage (No Gaps):**
```
Detection Window: [-earlyDetection, +200ms]
  
Too Early:    [−earlyDetection, −OK.early]
OK:           [−OK.early, +OK.late]
GOOD:         [−GOOD.early, +GOOD.late]  
PERFECT:      [−PERFECT.early, +PERFECT.late]
Miss:         [+OK.late, +200ms]

Every millisecond in detection range has a judgment!
```**Judgment Window Examples:**

| Scenario | Detection | PERFECT | GOOD | OK | Too Early | Miss |
|----------|-----------|---------|------|----|-----------| -----|
| Dense (187ms gap) | 187ms | -15/+30ms | -38/+70ms | -60/+120ms | -187 to -61ms | +121 to +200ms |
| Sparse (3000ms gap) | 3000ms | -240/+30ms | -600/+70ms | -960/+120ms | -3000 to -961ms | +121 to +200ms |

**Visual Comparison:**
```
Dense section (187ms detection):
  [-187]----[-60]----[-15][0][+30]----[+120]----[+200]
    |       TOO EARLY     |  OK  | GOOD | PERFECT | MISS |

Sparse section (3000ms detection):  
  [-3000]------------[-960]----[-240][0][+30]----[+120]----[+200]
     |     TOO EARLY          |    OK    | GOOD | PERFECT | MISS |
```

Dense sections require precise timing. Sparse sections are more forgiving.

## Implementation

### Input Handler with Dynamic Windows
```typescript
function handleInput(lane: number, currentTime: number, allNotes: Note[], effectiveLeadTime: number) {
  const laneNotes = allNotes.filter(n => n.lane === lane && !n.hit && !n.missed);
  
  let bestNote: Note | null = null;
  let bestJudgment: string | null = null;
  let bestDelta = Infinity;

  for (const note of laneNotes) {
    // Calculate dynamic detection and judgment windows for this note
    const earlyDetection = getEarlyDetectionWindow(allNotes, lane, note, effectiveLeadTime);
    const windows = getJudgmentWindows(earlyDetection);
    
    // Check if press is within detection window
    const detectionStart = note.time - earlyDetection;
    const detectionEnd = note.time + windows.MISS;
    if (currentTime < detectionStart || currentTime > detectionEnd) {
      continue; // Not detected
    }
    
    const delta = currentTime - note.time;
    const absDelta = Math.abs(delta);
    
    // Find best matching judgment (prioritize closer notes)
    let judgment: string | null = null;
    
    if (delta >= -windows.PERFECT.early && delta <= windows.PERFECT.late) {
      judgment = 'PERFECT';
    } else if (delta >= -windows.GOOD.early && delta <= windows.GOOD.late) {
      judgment = 'GOOD';
    } else if (delta >= -windows.OK.early && delta <= windows.OK.late) {
      judgment = 'OK';
    } else if (delta < -windows.OK.early) {
      judgment = 'TOO_EARLY';
    } else if (delta > windows.OK.late) {
      judgment = 'MISS';
    }
    
    // Select closest note if multiple are pressable
    if (judgment && absDelta < bestDelta) {
      bestNote = note;
      bestJudgment = judgment;
      bestDelta = absDelta;
    }
  }
  
  if (bestNote && bestJudgment) {
    applyJudgment(bestNote, bestJudgment, bestDelta);
  }
}
```

## Benefits Summary

1. **Eliminates Overlaps:** Gap-based detection prevents multiple notes from being pressable simultaneously
2. **No Priority Hacks:** Don't need "check TAP before HOLD" logic - windows naturally don't overlap
3. **Density-Scaled Difficulty:** Fast sections feel harder (tight windows), slow sections feel easier (loose windows)
4. **Speed Consistency:** Visual speed and timing difficulty scale together
5. **Complete Coverage:** Every millisecond in detection range has a judgment (no gaps)
6. **Intuitive Scaling:** One formula (`min(gap, leadTime)`) handles all cases

## Migration Notes for Hyperverse

**Current Constants to Replace:**
- `TAP_RENDER_WINDOW_MS = 4000` → Dynamic per-note
- `TAP_HIT_WINDOW = ±150` → Dynamic per-note
- `HOLD_ACTIVATION_WINDOW = 150` → Dynamic per-note

**New Constants Needed:**
- `PERFECT_EARLY_SCALE = 0.08`
- `GOOD_EARLY_SCALE = 0.20`
- `OK_EARLY_SCALE = 0.32`
- `MIN_PERFECT_EARLY = 20`
- `LATE_MISS_BUFFER = 200`

**Files to Modify:**
- `noteValidator.ts` - Add `getEarlyDetectionWindow()` and `getJudgmentWindows()`
- `useKeyControls.ts` - Remove TAP-before-HOLD priority logic
- `noteProcessor.ts` - Use dynamic windows for too-early/miss detection
- `timing.ts` - Add new scaling constants

**Backward Compatibility:**
- Keep `MAGIC_MS / playerSpeed` for rendering (effectiveLeadTime)
- Only change detection/judgment window calculation
- No changes to geometry, rendering, or visual effects needed

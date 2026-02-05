Based on the game's mechanics and beta tester needs, here's a progressive tutorial beatmap curriculum:

## Tutorial Beatmap - Learning Stages

### Stage 1: Basic TAP Notes (Single Position)
**Objective:** Learn to hit single notes with proper timing
* Teach: Press key when note reaches judgment line
* Notes: 8-12 TAP notes on position 0 (W key) only
* Success Criteria: Hit 75% (6/8) notes
* Failure Behavior: Loop stage with visual prompt "Press W when the note reaches the center!"

### Stage 2: Multi-Position TAP Notes (Sequential)
**Objective:** Learn all position mappings
* Teach: 6 positions mapped to keys W, O, I, E, Q, P
  - Diamond positions (rotate): 0→1→2→3 = W→O→I→E
  - Horizontal positions (fixed): -1→-2 = Q→P
* Notes: 12-16 TAP notes cycling through positions -1→0→1→-2→3→2 
* Success Criteria: Hit 70% (10/14) notes
* Failure Behavior: Show key layout diagram, loop with "Position 0=W, 1=O, 2=I, 3=E, -1=Q, -2=P"

### Stage 3: Simultaneous TAP Notes (Chords)
**Objective:** Press multiple keys at once
* Teach: Some notes require pressing 2+ keys simultaneously
* Notes:
    * 4 single TAP notes (warm up)
    * 3 two-note chords (positions 0+3, 1+2, 0+1)
    * 1 three-note chord (positions 0+1+2)
* Success Criteria: Hit all chords correctly (chord detection)
* Failure Behavior: "Press multiple keys at the SAME TIME!" + loop

### Stage 4: Basic HOLD Notes (Single Position)
**Objective:** Learn press-and-hold mechanic
* Teach: Press key, hold until note tail passes judgment line, then release
* Notes: 4-6 HOLD notes on position 0 (W), varying durations (1s - 3s)
* Success Criteria: Complete 75% (3/4) HOLD notes without early release
* Failure Behavior: "HOLD the key until the note ends!" + visual indicator

### Stage 5: HOLD Note Pairing Rules
**Objective:** Understand opposite-position constraint
* Teach: Can hold 2 notes simultaneously ONLY on opposite positions:
  - Diamond pairs: 0↔2 (W↔I), 1↔3 (O↔E)
  - Horizontal pair: -1↔-2 (Q↔P)
* Notes:
    * 2 single HOLD notes (positions 0, 1)
    * 1 valid pair (positions 0+2 simultaneously - W+I)
    * 1 valid pair (positions 1+3 simultaneously - O+E)
    * Intentional test: Show invalid pair suggestion (positions 0+1) with "X" marker
* Success Criteria: Complete both valid pairs, ignore invalid
* Failure Behavior: "HOLD notes can only pair on OPPOSITE positions! W↔I, O↔E, Q↔P" + diagram

### Stage 6: Horizontal Positions (Q/P Keys)
**Objective:** Learn special horizontal deck positions
* Teach: Q = left deck (position -1), P = right deck (position -2)
  - These are HOLD completion targets for diamond positions
  - Fixed at 180° and 0° respectively (don't rotate)
* Notes:
    * 4 TAP notes on position -1 (Q)
    * 4 TAP notes on position -2 (P)
    * 2 simultaneous (Q+P together)
* Success Criteria: Hit 75% of deck notes
* Failure Behavior: "Q = LEFT deck (position -1), P = RIGHT deck (position -2)" + visual highlight

### Stage 7: Deck + Diamond Position Combinations
**Objective:** Combine horizontal and diamond position hits
* Teach: Horizontal positions (Q/P) can overlap with any diamond position note
* Notes:
    * Q + position 0 (Q+W) simultaneous
    * P + position 3 (P+E) simultaneous
    * Q + P + position 1 (Q+P+O - three notes at once)
* Success Criteria: Hit 70% of combinations
* Failure Behavior: "Horizontal positions (Q/P) work with ANY diamond position!" + loop

### Stage 8: Tunnel Rotation (HOLD Note Visual)
**Objective:** Understand automatic tunnel rotation
* Teach: Tunnel rotates when HOLD notes on diamond positions (0-3) are active
  - Rotation is purely visual - positions remain fixed
  - Diamond positions rotate to align with horizontal positions
  - This is automatic, not player-controlled
* Notes:
    * 2 HOLD notes on opposite diamond positions (trigger rotation)
    * Show rotation aligns active diamond positions with deck positions
* Success Criteria: Complete HOLD notes (rotation is automatic)
* Failure Behavior: Loop if HOLD notes failed

### Stage 9: Timing Windows (Perfect/Great/Normal)
**Objective:** Learn about hit accuracy
* Teach: Closer timing = better score/health gain
* Notes: 12 TAP notes with timing feedback display enabled
* Success Criteria: Get at least 6 "PERFECT" or "GREAT" judgements
* Failure Behavior: "Try to hit notes RIGHT when they reach the center!" + loop
* Visual Aid: Show timing window visualization (±150ms)

### Stage 10: Health & Combo System
**Objective:** Understand health loss and combo breaks
* Teach:
    * Hitting notes = gain health
    * Missing notes = lose health
    * Combo breaks on miss
* Notes: 16 mixed TAP/HOLD notes
* Success Criteria: Finish with >50% health, combo >10
* Failure Behavior: "Don't let your health reach zero!" + loop

### Stage 11: Final Challenge (Mixed Mechanics)
**Objective:** Combine everything learned
* Teach: Full gameplay experience
* Notes:
    * 30-40 mixed notes
    * TAP singles, chords
    * HOLD singles, pairs
    * Horizontal position combinations
    * Varied timing challenges
* Success Criteria:
    * Complete song without health depletion
    * Accuracy >60%
    * Combo >15
* Failure Behavior: Restart from Stage 11 (not full tutorial)
* Success Message: "Tutorial Complete! Ready to play HYPERVERSE!"

---

## Tutorial Beatmap Format

### Position Terminology Reference:
- **Absolute Positions** (Fixed tunnel coordinates): -2, -1, 0, 1, 2, 3
- **Horizontal Positions**: -1 (Q), -2 (P) - Fixed at 180° and 0°
- **Diamond Positions**: 0 (W), 1 (O), 2 (I), 3 (E) - Rotate during HOLD notes
- **Opposite Position Pairs**: 
  - Diamond: 0↔2 (W↔I), 1↔3 (O↔E)
  - Horizontal: -1↔-2 (Q↔P)

### File Format (Plain Text):
```
[METADATA]
title: Tutorial Stage X - [Name]
artist: Hyperverse
bpm: 120
duration: 60000
beatmapStart: 0
beatmapEnd: 60000

[EASY]
# Format: time|position|TYPE
# Positions: -2 (P), -1 (Q), 0 (W), 1 (O), 2 (I), 3 (E)
# Types: TAP, HOLD_START, HOLD_END
1000|0|TAP
2000|1|TAP
3000|0|HOLD_START|hold1
5000|0|HOLD_END|hold1
```

### Implementation Notes:
- Use existing beatmap parser (supports position values -2 to 3)
- Stage progression stored in localStorage
- Each stage is a separate beatmap file
- Success/failure detection uses existing scoring system
- Tutorial-specific UI overlays for instruction text
- "Skip Tutorial" button available on all stages
- "Replay Stage" option on failure

# localStorage Logic Analysis

## Overview
The app uses a single localStorage key `'pendingBeatmap'` to store beatmap data that persists across different screens (Home, Game, Editor).

## localStorage Key Structure

### `pendingBeatmap` (JSON object)
```typescript
{
  youtubeVideoId: string,    // YouTube video ID for background playback
  beatmapText: string        // Full beatmap text with [METADATA] and all difficulties
}
```

## Component Interactions

### 1. **App.tsx** (Root Component)
**Role**: Manages YouTube player initialization and lifecycle

**Read Operations**:
- Polls `pendingBeatmap` every 500ms to detect changes
- Listens for `'beatmapUpdate'` custom events for immediate updates
- Extracts `youtubeVideoId` to initialize/update YouTube player

**Write Operations**: None

**Key Logic**:
```typescript
// Polling interval for changes
const interval = setInterval(loadVideoId, 500);

// Immediate updates via custom events
window.addEventListener('beatmapUpdate', handleBeatmapUpdate);
```

**State Management**:
- When `youtubeVideoId` changes, destroys old player and creates new one
- If `pendingBeatmap` is removed, sets `youtubeVideoId` to null (unmounts iframe)

---

### 2. **Home.tsx** (Main Menu)
**Role**: Beatmap loader and difficulty selector

**Read Operations**:
- On mount: Checks if `pendingBeatmap` exists and has both `youtubeVideoId` and `beatmapText`
- Sets `beatmapLoaded` state to show/hide "START" button

**Write Operations**:
- When user loads a beatmap via BeatmapLoader:
  ```typescript
  const beatmapStorageData = { 
    youtubeVideoId: data.youtubeVideoId,
    beatmapText: beatmapText
  };
  localStorage.setItem('pendingBeatmap', JSON.stringify(beatmapStorageData));
  ```

**State Management**:
- Calls `unloadBeatmap()` before loading new beatmap to prevent conflicts
- `unloadBeatmap()` removes `pendingBeatmap` and resets game state

---

### 3. **Game.tsx** (Gameplay)
**Role**: Plays the loaded beatmap with selected difficulty

**Read Operations**:
- On mount and when `difficulty` changes:
  - Reads `pendingBeatmap.beatmapText`
  - Re-parses beatmap with current difficulty setting
  - Extracts `youtubeVideoId` for player sync

**Write Operations**: None

**Key Logic**:
```typescript
// Re-parse beatmap text with new difficulty
const parsed = parseBeatmap(beatmapData.beatmapText, difficulty);
const convertedNotes = convertBeatmapNotes(parsed.notes, beatmapStartOffset);
setCustomNotes(convertedNotes);
```

**Important**: Game NEVER modifies `pendingBeatmap` - it's read-only for gameplay

---

### 4. **BeatmapEditor.tsx** (Editor)
**Role**: Create and edit beatmaps with live preview

**Read Operations**:
- On mount: Loads `youtubeVideoId` from `pendingBeatmap` for initial state
- On YouTube URL metadata change: Reads existing `pendingBeatmap` to preserve `beatmapText`

**Write Operations** (3 locations):

#### a) YouTube video ID setup (lines 160-164)
```typescript
const beatmapData = pendingBeatmap ? JSON.parse(pendingBeatmap) : {};
beatmapData.youtubeVideoId = videoId;
localStorage.setItem('pendingBeatmap', JSON.stringify(beatmapData));
window.dispatchEvent(new CustomEvent('beatmapUpdate'));
```
**Purpose**: Update video ID while preserving beatmapText

#### b) YouTube setup handler (lines 184-189)
```typescript
const existingData = localStorage.getItem('pendingBeatmap');
const beatmapData = existingData ? JSON.parse(existingData) : {};
beatmapData.youtubeVideoId = videoId;
localStorage.setItem('pendingBeatmap', JSON.stringify(beatmapData));
window.dispatchEvent(new CustomEvent('beatmapUpdate'));
```
**Purpose**: Manual YouTube setup from modal

#### c) Notes/metadata changes (lines 280-284)
```typescript
const existingData = localStorage.getItem('pendingBeatmap');
const beatmapData = existingData ? JSON.parse(existingData) : {};
beatmapData.beatmapText = newText;
localStorage.setItem('pendingBeatmap', JSON.stringify(beatmapData));
```
**Purpose**: Save edited beatmap text whenever notes or metadata change

**Critical Pattern**: Always reads existing data first, then patches only the changed field

---

### 5. **useGameStore.ts** (Zustand Store)
**Role**: Global game state management

**Write Operations**:
- `unloadBeatmap()` function:
  ```typescript
  destroyYouTubePlayer();
  localStorage.removeItem('pendingBeatmap');
  // Resets all game state (notes, score, combo, health, etc.)
  ```

**Usage**: Called from Home.tsx when user wants to load a new beatmap

---

## State Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     localStorage                              │
│  Key: 'pendingBeatmap'                                       │
│  Value: { youtubeVideoId, beatmapText }                      │
└──────────────────────────────────────────────────────────────┘
         ↑                    ↑                    ↑
         │                    │                    │
    [WRITE]              [WRITE]              [REMOVE]
         │                    │                    │
         │                    │                    │
    ┌────────┐          ┌──────────┐         ┌─────────┐
    │ Home   │          │  Editor  │         │ Store   │
    │  Load  │          │  Edit    │         │ Unload  │
    └────────┘          └──────────┘         └─────────┘
         │                    │                    
    [READ/WRITE]        [READ/WRITE]              
         │                    │                    
         ↓                    ↓                    
    ┌────────┐          ┌──────────┐         
    │  Game  │          │   App    │         
    │ [READ] │          │ [READ]   │         
    └────────┘          └──────────┘         
                             ↓
                    ┌─────────────────┐
                    │ YouTube Player  │
                    │  (re-init on    │
                    │   ID change)    │
                    └─────────────────┘
```

## Navigation Flow Analysis

### Scenario 1: Home → Game → Home
1. **Home**: User loads beatmap → writes `pendingBeatmap` with both fields
2. **Navigate to Game**: Game reads `pendingBeatmap`, parses `beatmapText` with difficulty
3. **Navigate back to Home**: Home checks `pendingBeatmap`, sees it exists, shows "START" button
4. **Result**: ✅ No issues - beatmap persists

### Scenario 2: Home → Editor → Home
1. **Home**: User loads beatmap → writes `pendingBeatmap`
2. **Navigate to Editor**: Editor reads `youtubeVideoId`, loads for editing
3. **User edits notes**: Editor writes updated `beatmapText` to `pendingBeatmap`
4. **Navigate back to Home**: Home checks `pendingBeatmap`, sees updated beatmap
5. **Result**: ✅ No issues - edits are saved

### Scenario 3: Home → Game → Editor → Game
1. **Home**: User loads beatmap
2. **Game**: Plays with MEDIUM difficulty
3. **Navigate to Editor**: Editor reads and allows editing
4. **User changes metadata/notes**: Editor writes to `pendingBeatmap`
5. **Navigate back to Game**: Game re-reads `pendingBeatmap`, re-parses with current difficulty
6. **Result**: ✅ No issues - changes reflected in gameplay

### Scenario 4: Editor without prior beatmap
1. **Navigate to Editor directly**: Editor has no `pendingBeatmap` to read
2. **User sets YouTube URL**: Editor writes `youtubeVideoId` to new `pendingBeatmap` object
3. **User creates notes**: Editor writes `beatmapText` to existing `pendingBeatmap`
4. **Result**: ✅ No issues - new beatmap created from scratch

### Scenario 5: App.tsx YouTube player sync
1. **Any component writes to `pendingBeatmap`**: Dispatches `'beatmapUpdate'` event
2. **App.tsx receives event**: Immediately reads `youtubeVideoId`
3. **Video ID changed**: Destroys old player, creates new one
4. **Video ID same**: No action taken
5. **Result**: ✅ YouTube player stays in sync

## Potential Issues & Edge Cases

### ⚠️ Issue 1: Race Condition in Editor
**Location**: BeatmapEditor.tsx lines 160-164 and 280-284

**Problem**: Two separate effects write to `pendingBeatmap`:
- Effect 1: Watches `metadata.youtubeUrl` changes
- Effect 2: Watches `difficultyNotes` and `metadata` changes

If both fire simultaneously:
```typescript
// Effect 1 reads
const data1 = JSON.parse(localStorage.getItem('pendingBeatmap'));
// Effect 2 reads (before Effect 1 writes)
const data2 = JSON.parse(localStorage.getItem('pendingBeatmap'));
// Effect 1 writes (only youtubeVideoId)
localStorage.setItem('pendingBeatmap', JSON.stringify({ ...data1, youtubeVideoId }));
// Effect 2 writes (only beatmapText) - OVERWRITES Effect 1
localStorage.setItem('pendingBeatmap', JSON.stringify({ ...data2, beatmapText }));
```

**Impact**: Low - both effects preserve existing fields, but theoretically could lose updates

**Fix**: Debounce or combine into single effect

---

### ⚠️ Issue 2: App.tsx polling every 500ms
**Location**: App.tsx lines 48-75

**Problem**: Inefficient polling could cause unnecessary re-renders

**Current Mitigation**: Only updates state when `youtubeVideoId` actually changes

**Improvement**: Use `'storage'` event listener:
```typescript
window.addEventListener('storage', (e) => {
  if (e.key === 'pendingBeatmap') {
    loadVideoId();
  }
});
```
**Note**: `storage` event only fires for changes from OTHER tabs, not same tab

---

### ✅ Non-Issue: Multiple reads of same data
**Example**: Both App.tsx and Editor read `youtubeVideoId`

**Why it's fine**: Reads are idempotent - no state corruption possible

---

### ✅ Non-Issue: Game re-parsing on difficulty change
**Example**: User changes difficulty while in Game component

**Why it's fine**: Re-parsing is intentional - different difficulties have different notes

---

## Recommendations

### 1. ✅ Keep current `'beatmapUpdate'` event system
Works well for immediate cross-component synchronization

### 2. ✅ Current merge pattern is good
```typescript
const beatmapData = existingData ? JSON.parse(existingData) : {};
beatmapData.someField = newValue; // Only update one field
localStorage.setItem('pendingBeatmap', JSON.stringify(beatmapData));
```

### 3. 🔧 Consider: Add version number to localStorage
```typescript
{
  version: 1,
  youtubeVideoId: string,
  beatmapText: string
}
```
Allows for migration if structure changes in future

### 4. 🔧 Consider: Centralize localStorage access
Create a `useBeatmapStorage()` hook to handle all reads/writes:
```typescript
export function useBeatmapStorage() {
  const get = () => { /* safe read with error handling */ };
  const set = (partial: Partial<BeatmapStorage>) => { /* merge update */ };
  const clear = () => { /* remove */ };
  return { get, set, clear };
}
```

### 5. 🔧 Consider: Remove App.tsx polling
Replace with `'beatmapUpdate'` event only + initial load:
```typescript
// Initial load
loadVideoId();

// Listen for updates
window.addEventListener('beatmapUpdate', loadVideoId);
```

## Summary

### ✅ What works well:
- Single source of truth (`pendingBeatmap` key)
- Merge pattern preserves existing fields
- Custom `'beatmapUpdate'` event for immediate sync
- Game component is read-only (no accidental overwrites)
- Clear unload mechanism via `useGameStore.unloadBeatmap()`

### ⚠️ Minor concerns:
- Polling in App.tsx is inefficient (but works)
- Potential race condition in Editor (unlikely in practice)

### 🎯 Overall assessment: **SOLID** ✅
The current localStorage logic is robust and handles navigation between screens correctly. The identified issues are minor optimizations, not critical bugs.

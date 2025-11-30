# Game Engine Refactor - Migration Guide

## 🎯 What Changed

### Architecture Overview

**Before:** Single monolithic hook with ~700 lines, mixed concerns, complex ref management

**After:** Modular architecture with clear separation:
1. **Core Logic** (`gameEngineCore.ts`) - Framework-agnostic business logic
2. **React Hooks** (`gameEngineHooks.ts`) - React integration layer
3. **Debug Tools** (`gameDebugTools.ts`) - Optional debugging utilities

---

## 📦 New Structure

```
gameEngineCore.ts (Pure TypeScript)
├── TimingManager      - Handles time calculations
├── ScoringManager     - Manages score/combo/health
├── NoteValidator      - Pure validation functions
├── NoteProcessor      - Note hit detection logic
└── GameEngineCore     - Orchestrates everything

gameEngineHooks.ts (React Layer)
├── useGameEngine      - Main hook (drop-in replacement)
├── useGameConfig      - Configuration management
├── useGameLoop        - requestAnimationFrame wrapper
└── useStateSynchronizer - Batched state updates

gameDebugTools.ts (Optional)
└── GameDebugger       - Debugging utilities
```

---

## 🔄 Migration Steps

### Step 1: Update Imports

**Before:**
```typescript
import { useGameEngine, GameErrors } from '@/lib/gameEngine';
```

**After:**
```typescript
import { useGameEngine } from '@/lib/gameEngineHooks';
import { useGameDebugger } from '@/lib/gameDebugTools'; // Optional
```

### Step 2: Update Hook Usage

The hook API is **backwards compatible**! Just update the import:

```typescript
// Works exactly the same
const {
  gameState,
  score,
  combo,
  health,
  notes,
  currentTime,
  hitNote,
  trackHoldStart,
  trackHoldEnd,
  startGame,
  pauseGame,
  resumeGame,
  restartGame,
} = useGameEngine({
  difficulty: 'MEDIUM',
  customNotes: myNotes,
  getVideoTime: () => videoPlayer.getCurrentTime(),
});
```

### Step 3: Update Error Tracking (Optional)

**Before:**
```typescript
GameErrors.log('Something happened');
GameErrors.trackAnimation(noteId, 'tapMissFailure');
```

**After:**
```typescript
const debugger = useGameDebugger(true);
debugger.log('Something happened');
debugger.trackAnimation(noteId, 'tapMissFailure');
```

---

## ✨ New Features

### 1. Configurable Sync Intervals

Control how often state updates to optimize performance:

```typescript
const engine = useGameEngine({
  difficulty: 'HARD',
  customNotes: notes,
  syncIntervals: {
    notesInterval: 50,   // Update notes array every 50ms
    stateInterval: 100,  // Update score/combo/health every 100ms
  },
});
```

### 2. Standalone Core for Testing

Test game logic without React:

```typescript
import { GameEngineCore } from './gameEngineCore';

const engine = new GameEngineCore(config, notes);
engine.start();
engine.handleTap(0, 1000);
expect(engine.getScore().score).toBe(100);
```

### 3. Custom Timing Sources

Override timing with your own implementation:

```typescript
class CustomTiming extends TimingManager {
  getCurrentTime(): number {
    return myCustomTimeSource.getTime();
  }
}
```

---

## 🧪 Testing Benefits

### Before: Hard to Test
```typescript
// Had to render entire React component
render(<GameComponent />);
// Simulate frame updates
// Check DOM changes
```

### After: Easy to Test
```typescript
const engine = new GameEngineCore(config, [testNote]);
engine.start();
engine.handleTap(0, testNote.time);

expect(engine.getScore().score).toBe(100);
expect(engine.getNotes()[0].hit).toBe(true);
```

---

## 📊 Performance Improvements

1. **Batched State Updates** - Configurable sync intervals reduce re-renders
2. **Immutable Updates** - Cleaner state management, easier to optimize
3. **Separated Concerns** - React only handles UI, core logic is pure
4. **Optional Debug Tools** - Zero overhead in production

---

## 🔧 Advanced Usage

### Custom Scoring Rules

```typescript
class CustomScoring extends ScoringManager {
  calculateHitScore(timingError: number): number {
    // Your custom scoring logic
    return Math.max(0, 200 - Math.abs(timingError));
  }
}
```

### Integration with Game Debugger

```typescript
function GameComponent() {
  const engine = useGameEngine({...});
  const debugger = useGameDebugger(process.env.NODE_ENV === 'development');
  
  useEffect(() => {
    debugger.updateNoteStats(engine.notes);
  }, [engine.notes]);
  
  return (
    <div>
      <Game {...engine} />
      {process.env.NODE_ENV === 'development' && (
        <DebugPanel 
          stats={debugger.getNoteStats()}
          logs={debugger.getErrorLog()}
        />
      )}
    </div>
  );
}
```

---

## 🐛 Breaking Changes

### Removed Global `GameErrors`

**Before:**
```typescript
GameErrors.log('message');
GameErrors.noteStats;
```

**After:**
```typescript
const debugger = useGameDebugger();
debugger.log('message');
debugger.getNoteStats();
```

### Release Time Map

**Before:**
```typescript
import { getReleaseTime } from '@/lib/gameEngine';
const time = getReleaseTime(noteId);
```

**After:**
```typescript
const { getReleaseTime } = useGameEngine({...});
const time = getReleaseTime(noteId);
```

---

## 📝 Type Safety Improvements

All managers are fully typed with no `any` types:

```typescript
// Before: Complex ref types, easy to misuse
const notesRef = useRef<Note[]>([]);
const gameTimeRef = useRef<number>(0);

// After: Encapsulated, type-safe
const engine = new GameEngineCore(config, notes);
engine.getCurrentTime(); // Returns number
engine.getNotes();       // Returns Note[]
```

---

## 🎓 Best Practices

### 1. Separation of Concerns
- UI components use `useGameEngine` hook
- Business logic lives in `GameEngineCore`
- Debug tools are optional development aids

### 2. Testability
- Test core logic without React
- Mock timing/scoring for predictable tests
- Use snapshot testing for complex states

### 3. Performance
- Adjust sync intervals based on game requirements
- Use React DevTools Profiler to optimize
- Consider useMemo for expensive note calculations

---

## 🚀 Next Steps

1. Replace old `gameEngine.ts` with new modules
2. Update imports throughout your codebase
3. Add tests for core logic
4. Integrate debugger in development
5. Optimize sync intervals based on profiling

---

## 📚 Additional Resources

- See `gameEngineCore.ts` for full API documentation
- Check `gameDebugTools.ts` for debugging features
- Review test examples in `__tests__/` directory

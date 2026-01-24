import { useCallback } from 'react';
import { TunnelBackground } from '@/components/game/tunnel/TunnelBackground';
import { SoundpadButtons } from '@/components/game/hud/SoundpadButtons';
import { JudgementLines } from '@/components/game/tunnel/JudgementLines';
import { TapNotes } from '@/components/game/notes/TapNotes';
import { HoldNotes } from '@/components/game/notes/HoldNotes';
import { Note } from '@/types/game';
import { mouseToLane, mouseToTime, snapTimeToGrid, generateBeatGrid, checkNoteOverlap } from '@/lib/editor/editorUtils';
import { audioManager } from '@/lib/audio/audioManager';
import { VANISHING_POINT_X, VANISHING_POINT_Y, TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT } from '@/lib/config';
import { useVanishingPointOffset } from '@/hooks/useVanishingPointOffset';
import { useZoomEffect } from '@/hooks/useZoomEffect';
import type { Difficulty } from '@/lib/editor/beatmapTextUtils';

// Constants - matching game rendering
const JUDGEMENT_RADIUS = 187;
const LEAD_TIME = 4000;
const MIN_HOLD_DURATION = 100;

interface EditorCanvasProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  currentTime: number;
  parsedNotes: Note[];
  metadata: any;
  editorMode: boolean;
  snapEnabled: boolean;
  snapDivision: 1 | 2 | 4 | 8 | 16;
  hoveredNote: any;
  setHoveredNote: (note: any) => void;
  selectedNoteId: string | null;
  setSelectedNoteId: (id: string | null) => void;
  selectedNoteIds: string[];
  toggleNoteSelection: (id: string) => void;
  clearSelection: () => void;
  addToHistory: (notes: Note[]) => void;
  setParsedNotes: (notes: Note[]) => void;
  setDifficultyNotes: (diff: Difficulty, notes: Note[]) => void;
  currentDifficulty: Difficulty;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  dragStartTime: number | null;
  setDragStartTime: (time: number | null) => void;
  dragStartLane: number | null;
  setDragStartLane: (lane: number | null) => void;
  draggedNoteId: string | null;
  setDraggedNoteId: (id: string | null) => void;
  draggedHandle: 'start' | 'end' | null;
  setDraggedHandle: (handle: 'start' | 'end' | null) => void;
  selectedHandle: { noteId: string; handle: 'start' | 'end' } | null;
  setSelectedHandle: (selection: { noteId: string; handle: 'start' | 'end' } | null) => void;
  glowEnabled: boolean;
  dynamicVPEnabled: boolean;
  zoomEnabled: boolean;
  judgementLinesEnabled: boolean;
  spinEnabled: boolean;
}

export function EditorCanvas({
  canvasRef,
  currentTime,
  parsedNotes,
  metadata,
  editorMode,
  snapEnabled,
  snapDivision,
  hoveredNote,
  setHoveredNote,
  selectedNoteId,
  setSelectedNoteId,
  selectedNoteIds,
  toggleNoteSelection,
  clearSelection,
  addToHistory,
  setParsedNotes,
  setDifficultyNotes,
  currentDifficulty,
  isDragging,
  setIsDragging,
  dragStartTime,
  setDragStartTime,
  dragStartLane,
  setDragStartLane,
  draggedNoteId,
  setDraggedNoteId,
  draggedHandle,
  setDraggedHandle,
  selectedHandle,
  setSelectedHandle,
  glowEnabled,
  dynamicVPEnabled,
  zoomEnabled,
  judgementLinesEnabled,
  spinEnabled,
}: EditorCanvasProps) {
  // Get dynamic vanishing point offset (if enabled)
  const vpOffset = useVanishingPointOffset();
  const { zoomScale } = useZoomEffect();
  
  // Calculate actual vanishing point coordinates
  const vpX = dynamicVPEnabled ? VANISHING_POINT_X + vpOffset.x : VANISHING_POINT_X;
  const vpY = dynamicVPEnabled ? VANISHING_POINT_Y + vpOffset.y : VANISHING_POINT_Y;
  const actualZoomScale = zoomEnabled ? zoomScale : 1.0;
  
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { lane: closestLane, distance: mouseDistance } = mouseToLane(mouseX, mouseY, VANISHING_POINT_X, VANISHING_POINT_Y);
    const { time: timeOffset } = mouseToTime(mouseX, mouseY, VANISHING_POINT_X, VANISHING_POINT_Y, currentTime, LEAD_TIME, JUDGEMENT_RADIUS);
    const clickTime = snapEnabled ? snapTimeToGrid(timeOffset, metadata.bpm, snapDivision) : timeOffset;
    
    console.log('[EDITOR] Mouse down - closestLane:', closestLane, 'mouseX:', mouseX, 'mouseY:', mouseY, 'mouseDistance:', mouseDistance);

    // Check if clicking a handle on an existing note (check visual position, not time)
    let clickedHandle: { note: Note; handle: 'start' | 'end' } | null = null;
    for (const note of parsedNotes) {
      // Check start handle
      const startProgress = (note.time - currentTime) / LEAD_TIME;
      if (startProgress >= 0 && startProgress <= 1 && note.lane === closestLane) {
        const startDistance = 1 + (startProgress * (JUDGEMENT_RADIUS - 1));
        // Check if mouse is near the handle's visual position (within 20px)
        if (Math.abs(mouseDistance - startDistance) < 20) {
          clickedHandle = { note, handle: 'start' };
          console.log('[EDITOR] Clicked start handle - note:', note.id, 'mouseDistance:', mouseDistance, 'startDistance:', startDistance);
          break;
        }
      }
      
      // Check end handle for hold notes
      if (note.type === 'HOLD' && note.duration && note.lane === closestLane) {
        const endTime = note.time + note.duration;
        const endProgress = (endTime - currentTime) / LEAD_TIME;
        if (endProgress >= 0 && endProgress <= 1) {
          const endDistance = 1 + (endProgress * (JUDGEMENT_RADIUS - 1));
          // Check if mouse is near the handle's visual position (within 20px)
          if (Math.abs(mouseDistance - endDistance) < 20) {
            clickedHandle = { note, handle: 'end' };
            console.log('[EDITOR] Clicked end handle - note:', note.id, 'mouseDistance:', mouseDistance, 'endDistance:', endDistance);
            break;
          }
        }
      }
    }

    if (clickedHandle) {
      // Dragging a handle to extend/shorten note
      if (!selectedNoteIds.includes(clickedHandle.note.id)) clearSelection();
      setSelectedNoteId(clickedHandle.note.id);
      setDraggedNoteId(clickedHandle.note.id);
      setDraggedHandle(clickedHandle.handle);
      setIsDragging(true);
      audioManager.play('tapHit');
      return;
    }

    // Check if clicking an existing note (not handle)
    const clickedNote = parsedNotes.find(note => {
      const progress = (note.time - currentTime) / LEAD_TIME;
      if (progress < 0 || progress > 1) return false;
      return note.lane === closestLane && Math.abs(note.time - clickTime) < 200;
    });
    
    if (clickedNote) {
      // Start dragging existing note (move entire note)
      if (e.ctrlKey || e.metaKey) {
        toggleNoteSelection(clickedNote.id);
      } else {
        if (!selectedNoteIds.includes(clickedNote.id)) clearSelection();
        setSelectedNoteId(clickedNote.id);
        setDraggedNoteId(clickedNote.id);
        setDraggedHandle(null);
        setIsDragging(true);
      }
      audioManager.play('tapHit');
    } else {
      // Start creating new note at judgement line
      const noteTime = snapEnabled ? snapTimeToGrid(currentTime, metadata.bpm, snapDivision) : currentTime;
      console.log('[EDITOR] Creating new note - closestLane:', closestLane, 'at time:', noteTime);
      setIsDragging(true);
      setDragStartTime(noteTime);
      setDragStartLane(closestLane);
      if (!e.ctrlKey && !e.metaKey) clearSelection();
    }
  }, [canvasRef, currentTime, snapEnabled, metadata.bpm, snapDivision, parsedNotes, selectedNoteIds, toggleNoteSelection, clearSelection, setSelectedNoteId, setIsDragging, setDragStartTime, setDragStartLane, setDraggedNoteId, setDraggedHandle]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { lane: closestLane } = mouseToLane(mouseX, mouseY, VANISHING_POINT_X, VANISHING_POINT_Y);
    
    // If dragging a handle, extend/shorten the note
    if (isDragging && draggedNoteId && draggedHandle) {
      const { time: timeOffset } = mouseToTime(mouseX, mouseY, VANISHING_POINT_X, VANISHING_POINT_Y, currentTime, LEAD_TIME, JUDGEMENT_RADIUS);
      const newTime = snapEnabled ? snapTimeToGrid(timeOffset, metadata.bpm, snapDivision) : timeOffset;
      
      const updatedNotes = parsedNotes.map(note => {
        if (note.id === draggedNoteId) {
          if (draggedHandle === 'start') {
            // Dragging start handle - adjust note time
            const oldEndTime = note.type === 'HOLD' && note.duration ? note.time + note.duration : note.time;
            const newDuration = oldEndTime - newTime;
            
            if (newDuration > MIN_HOLD_DURATION) {
              // Convert to hold or adjust hold
              return { ...note, time: newTime, type: 'HOLD' as const, duration: newDuration };
            } else {
              // Too short, keep as tap at new time
              return { ...note, time: newTime, type: 'TAP' as const, duration: undefined };
            }
          } else {
            // Dragging end handle - adjust duration
            const newDuration = newTime - note.time;
            
            if (newDuration > MIN_HOLD_DURATION) {
              // Convert to hold or adjust hold
              return { ...note, type: 'HOLD' as const, duration: newDuration };
            } else {
              // Too short, convert back to tap
              return { ...note, type: 'TAP' as const, duration: undefined };
            }
          }
        }
        return note;
      });
      setParsedNotes(updatedNotes);
      setHoveredNote({ lane: closestLane, time: newTime });
    } else if (isDragging && draggedNoteId && !draggedHandle) {
      // Dragging entire note - update its position
      const { time: timeOffset } = mouseToTime(mouseX, mouseY, VANISHING_POINT_X, VANISHING_POINT_Y, currentTime, LEAD_TIME, JUDGEMENT_RADIUS);
      const newTime = snapEnabled ? snapTimeToGrid(timeOffset, metadata.bpm, snapDivision) : timeOffset;
      
      const updatedNotes = parsedNotes.map(note => {
        if (note.id === draggedNoteId) {
          return { ...note, time: newTime, lane: closestLane };
        }
        return note;
      });
      setParsedNotes(updatedNotes);
      setHoveredNote({ lane: closestLane, time: newTime });
    } else {
      // Hover preview always shows at current time (judgement line)
      const noteTime = snapEnabled ? snapTimeToGrid(currentTime, metadata.bpm, snapDivision) : currentTime;
      setHoveredNote({ lane: closestLane, time: noteTime });
    }
  }, [canvasRef, currentTime, snapEnabled, metadata.bpm, snapDivision, setHoveredNote, isDragging, draggedNoteId, draggedHandle, parsedNotes, setParsedNotes]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !isDragging) return;

    // If we were dragging a handle or existing note, finalize the move
    if (draggedNoteId) {
      addToHistory(parsedNotes);
      setDifficultyNotes(currentDifficulty, parsedNotes);
      setIsDragging(false);
      setDraggedNoteId(null);
      setDraggedHandle(null);
      audioManager.play('tapHit');
      return;
    }

    // Otherwise, we're creating a new TAP note (use handles to extend to HOLD)
    addToHistory(parsedNotes);

    console.log('[EDITOR] Creating TAP note - lane:', dragStartLane, 'time:', dragStartTime);
    const newNote: Note = {
      id: `editor-note-${Date.now()}`,
      type: 'TAP',
      lane: dragStartLane!,
      time: dragStartTime!,
      hit: false,
      missed: false,
    };
    const updatedNotes = [...parsedNotes, newNote];
    setParsedNotes(updatedNotes);
    setDifficultyNotes(currentDifficulty, updatedNotes);
    audioManager.play('tapHit');

    setIsDragging(false);
    setDragStartTime(null);
    setDragStartLane(null);
  }, [canvasRef, isDragging, draggedNoteId, dragStartTime, dragStartLane, parsedNotes, currentDifficulty, addToHistory, setParsedNotes, setDifficultyNotes, setIsDragging, setDragStartTime, setDragStartLane, setDraggedNoteId, setDraggedHandle]);

  return (
    <div
      ref={canvasRef}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={() => { setHoveredNote(null); setIsDragging(false); }}
      className={`relative cursor-crosshair ${glowEnabled ? '' : 'editor-no-glow'}`}
      style={{ 
        width: `${TUNNEL_CONTAINER_WIDTH}px`, 
        height: `${TUNNEL_CONTAINER_HEIGHT}px`,
        margin: '0 auto'
      }}
    >
      {/* Tunnel - matching game rendering */}
      <TunnelBackground 
        vpX={vpX} 
        vpY={vpY} 
        hexCenterX={VANISHING_POINT_X}
        hexCenterY={VANISHING_POINT_Y}
        health={100}
      />
      
      {/* Soundpad buttons - matching game */}
      <SoundpadButtons 
        vpX={vpX} 
        vpY={vpY} 
        zoomScale={actualZoomScale}
      />
      
      {/* Judgement lines - matching game (conditionally rendered) */}
      {judgementLinesEnabled && (
        <JudgementLines 
          vpX={vpX} 
          vpY={vpY} 
          type="tap"
          zoomScale={actualZoomScale}
        />
      )}

      {/* Notes */}
      {editorMode && parsedNotes.length > 0 && (
        <>
          <HoldNotes vpX={vpX} vpY={vpY} />
          {judgementLinesEnabled && (
            <JudgementLines 
              vpX={vpX} 
              vpY={vpY} 
              type="hold"
              zoomScale={actualZoomScale}
            />
          )}
          <TapNotes vpX={vpX} vpY={vpY} />
          
          {/* Note handles for extending/shortening - only at start/end of notes */}
          <div 
            className="absolute inset-0"
            style={{ 
              width: `${TUNNEL_CONTAINER_WIDTH}px`, 
              height: `${TUNNEL_CONTAINER_HEIGHT}px`,
              margin: '0 auto',
              pointerEvents: 'none'
            }}
          >
            {parsedNotes.map(note => {
              const handles: { type: 'start' | 'end'; time: number }[] = [{ type: 'start', time: note.time }];
              if (note.type === 'HOLD' && note.duration) {
                handles.push({ type: 'end', time: note.time + note.duration });
              }
              
              return handles.map(handle => {
                // Progress calculation matching game rendering: 1 = at judgement line, 0 = far away
                const rawProgress = 1 - ((handle.time - currentTime) / LEAD_TIME);
                if (rawProgress < 0 || rawProgress > 1) return null;
                
                // Distance: 1 (vanishing point) to JUDGEMENT_RADIUS (judgement line)
                const distance = 1 + (rawProgress * (JUDGEMENT_RADIUS - 1));
                if (distance < 1 || distance > JUDGEMENT_RADIUS) return null;
                
                // Scale handle width based on distance (notes get wider as they approach)
                const widthScale = distance / JUDGEMENT_RADIUS;
                const handleWidth = 20 + (widthScale * 40); // 20-60px range
                
                // Correct lane to angle mapping
                const laneToAngle: Record<number, number> = {
                  [-2]: 0,   // P key
                  1: 60,     // O key
                  0: 120,    // W key
                  [-1]: 180, // Q key
                  3: 240,    // E key
                  2: 300     // I key
                };
                const laneAngle = laneToAngle[note.lane] ?? 0;
                const angleRad = (laneAngle * Math.PI) / 180;
                const x = VANISHING_POINT_X + distance * Math.cos(angleRad);
                const y = VANISHING_POINT_Y + distance * Math.sin(angleRad);
                
                const isHandleSelected = draggedNoteId === note.id && draggedHandle === handle.type;
                
                return (
                  <div
                    key={`handle-${note.id}-${handle.type}`}
                    className={`absolute ${isHandleSelected ? 'animate-pulse' : ''}`}
                    style={{ 
                      left: x - handleWidth / 2 - 10, 
                      top: y - 13, 
                      width: handleWidth + 20, 
                      height: 26,
                      pointerEvents: 'auto',
                      cursor: 'pointer',
                      zIndex: 10
                    }}
                  >
                    <div 
                      className={`w-full h-full flex items-center justify-center`}
                    >
                      <div
                        className={`rounded`}
                        style={{
                          width: handleWidth,
                          height: 6,
                          transform: `rotate(${laneAngle + 90}deg)`,
                          transformOrigin: 'center',
                          backgroundColor: isHandleSelected ? 'white' : 'rgba(255, 255, 255, 0.8)',
                          boxShadow: isHandleSelected ? '0 0 10px rgba(255, 255, 255, 0.8)' : 'none'
                        }}
                      />
                    </div>
                  </div>
                );
              });
            })}
          </div>
          
          {/* Selected highlights - disabled (removed unwanted yellow circles) */}
          {/* {parsedNotes.map(note => {
            const isSelected = note.id === selectedNoteId || selectedNoteIds.includes(note.id);
            if (!isSelected) return null;
            
            const progress = (note.time - currentTime) / LEAD_TIME;
            const distance = 1 + (progress * (JUDGEMENT_RADIUS - 1));
            // Stricter bounds check - only show if clearly within judgement area
            if (progress < 0 || progress > 1 || distance < 10 || distance > JUDGEMENT_RADIUS) return null;
            
            const laneAngles = [-2, 1, 0, -1, 3, 2];
            const laneAngle = laneAngles[note.lane] === -2 ? 0 : 
                             laneAngles[note.lane] === 1 ? 60 :
                             laneAngles[note.lane] === 0 ? 120 :
                             laneAngles[note.lane] === -1 ? 180 :
                             laneAngles[note.lane] === 3 ? 240 : 300;
            const angleRad = (laneAngle * Math.PI) / 180;
            const x = VANISHING_POINT_X + distance * Math.cos(angleRad);
            const y = VANISHING_POINT_Y + distance * Math.sin(angleRad);
            
            return (
              <div
                key={`highlight-${note.id}`}
                className="absolute rounded-full border-4 border-yellow-400 animate-pulse pointer-events-none"
                style={{ left: x - 30, top: y - 30, width: 60, height: 60 }}
              />
            );
          })} */}
        </>
      )}

      {/* Status Bar */}
      <div className="absolute top-20 right-4 space-y-2">
        <div className="bg-black/80 border border-neon-cyan/50 px-4 py-2 rounded font-rajdhani text-neon-cyan">
          TIME: {currentTime.toFixed(0)}ms | NOTES: {parsedNotes.length}
        </div>
        {selectedNoteIds.length > 1 && (
          <div className="bg-black/80 border border-yellow-500/50 px-4 py-2 rounded font-rajdhani text-yellow-500 text-sm">
            {selectedNoteIds.length} NOTES SELECTED
          </div>
        )}
        {isDragging && (
          <div className="bg-black/80 border border-yellow-500/50 px-4 py-2 rounded font-rajdhani text-yellow-500 text-sm">
            DRAG TO CREATE HOLD
          </div>
        )}
        {snapEnabled && (
          <div className="bg-black/80 border border-neon-cyan/50 px-4 py-2 rounded font-rajdhani text-neon-cyan text-sm">
            SNAP: 1/{snapDivision} @ {metadata.bpm} BPM
          </div>
        )}
      </div>

      {/* Beat Grid - hexagonal with parallax */}
      {snapEnabled && editorMode && (
        <svg 
          className="absolute inset-0 pointer-events-none" 
          style={{ 
            width: `${TUNNEL_CONTAINER_WIDTH}px`, 
            height: `${TUNNEL_CONTAINER_HEIGHT}px`,
            margin: '0 auto'
          }}
        >
          {generateBeatGrid(currentTime, metadata.bpm, snapDivision, LEAD_TIME, JUDGEMENT_RADIUS, 20).map((gridPoint, i) => {
            // Calculate hexagon size based on distance from VP (parallax effect)
            const scale = gridPoint.distance / JUDGEMENT_RADIUS;
            const hexSize = scale * JUDGEMENT_RADIUS;
            
            // Draw hexagon by connecting 6 points at 60° intervals
            const hexAngles = [0, 60, 120, 180, 240, 300];
            const hexPoints = hexAngles.map(angle => {
              const rad = (angle * Math.PI) / 180;
              const x = VANISHING_POINT_X + hexSize * Math.cos(rad);
              const y = VANISHING_POINT_Y + hexSize * Math.sin(rad);
              return `${x},${y}`;
            }).join(' ');
            
            return (
              <polygon
                key={`beat-grid-${i}`}
                points={hexPoints}
                fill="none"
                stroke="rgba(0, 255, 255, 0.15)"
                strokeWidth="1.5"
                opacity={scale * 0.8}
              />
            );
          })}
        </svg>
      )}
    </div>
  );
}

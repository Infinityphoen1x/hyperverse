import { useCallback } from 'react';
import { TunnelBackground } from '@/components/game/tunnel/TunnelBackground';
import { SoundpadButtons } from '@/components/game/hud/SoundpadButtons';
import { JudgementLines } from '@/components/game/tunnel/JudgementLines';
import { TapNotes } from '@/components/game/notes/TapNotes';
import { HoldNotes } from '@/components/game/notes/HoldNotes';
import { EditorBeatGrid } from '@/components/editor/EditorBeatGrid';
import { EditorStatusBar } from '@/components/editor/EditorStatusBar';
import { SelectionBoundingBox } from '@/components/editor/SelectionBoundingBox';
import { EditorInteractionLayer } from '@/components/editor/EditorInteractionLayer';
import { Note } from '@/types/game';
import { VANISHING_POINT_X, VANISHING_POINT_Y, TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT } from '@/lib/config';
import { useVanishingPointOffset } from '@/hooks/effects/geometry/useVanishingPointOffset';
import { useZoomEffect } from '@/hooks/effects/screen/useZoomEffect';
import { useEditorMouseHandlers } from '@/hooks/editor/useEditorMouseHandlers';
import type { Difficulty } from '@/lib/editor/beatmapTextUtils';

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
  draggedHandle: 'start' | 'end' | 'near' | 'far' | null;
  setDraggedHandle: (handle: 'start' | 'end' | 'near' | 'far' | null) => void;
  glowEnabled: boolean;
  dynamicVPEnabled: boolean;
  zoomEnabled: boolean;
  judgementLinesEnabled: boolean;
  spinEnabled: boolean;
  isPlaying: boolean;
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
  glowEnabled,
  dynamicVPEnabled,
  zoomEnabled,
  judgementLinesEnabled,
  spinEnabled,
  isPlaying,
}: EditorCanvasProps) {
  // Get dynamic vanishing point offset (if enabled)
  const vpOffset = useVanishingPointOffset();
  const { zoomScale } = useZoomEffect();
  
  // Calculate actual vanishing point coordinates
  const vpX = dynamicVPEnabled ? VANISHING_POINT_X + vpOffset.x : VANISHING_POINT_X;
  const vpY = dynamicVPEnabled ? VANISHING_POINT_Y + vpOffset.y : VANISHING_POINT_Y;
  const actualZoomScale = zoomEnabled ? zoomScale : 1.0;
  
  // Extract mouse handlers to custom hook
  const { handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp } = useEditorMouseHandlers({
    canvasRef,
    currentTime,
    parsedNotes,
    snapEnabled,
    snapDivision,
    metadata: { bpm: metadata.bpm },
    selectedNoteIds,
    isDragging,
    draggedNoteId,
    draggedHandle,
    dragStartTime,
    dragStartLane,
    currentDifficulty,
    isPlaying,
    toggleNoteSelection,
    clearSelection,
    setSelectedNoteId,
    setIsDragging,
    setDragStartTime,
    setDragStartLane,
    setDraggedNoteId,
    setDraggedHandle,
    setHoveredNote,
    setParsedNotes,
    setDifficultyNotes,
    addToHistory,
  });

  // Handle note clicks from interaction layer
  const handleNoteClick = useCallback((note: Note, event: React.MouseEvent) => {
    const isAlreadySelected = selectedNoteIds.includes(note.id);
    
    if (event.ctrlKey || event.metaKey) {
      // Ctrl-click: multi-select mode
      // First, ensure selectedNoteId is in selectedNoteIds if it exists
      if (selectedNoteId && !selectedNoteIds.includes(selectedNoteId)) {
        toggleNoteSelection(selectedNoteId);
      }
      
      // Now toggle this note in the selection
      if (isAlreadySelected) {
        // Remove from selection - batch updates
        const newSelectedIds = selectedNoteIds.filter(id => id !== note.id);
        clearSelection();
        if (newSelectedIds.length > 0) {
          newSelectedIds.forEach(id => toggleNoteSelection(id));
          setSelectedNoteId(newSelectedIds[0]);
        }
      } else {
        // Check if we can add this note (max 6 notes, one per lane)
        const selectedNotes = parsedNotes.filter(n => selectedNoteIds.includes(n.id));
        const laneTaken = selectedNotes.some(n => n.lane === note.lane);
        
        if (laneTaken) {
          // Lane already has a selected note - replace it
          const oldNoteInLane = selectedNotes.find(n => n.lane === note.lane);
          if (oldNoteInLane) {
            toggleNoteSelection(oldNoteInLane.id); // Remove old note
          }
          toggleNoteSelection(note.id); // Add new note
          setSelectedNoteId(note.id);
        } else if (selectedNoteIds.length >= 6) {
          // Max 6 notes - do nothing (optional: show toast)
          return;
        } else {
          // Add to selection - single operation
          toggleNoteSelection(note.id);
          setSelectedNoteId(note.id);
        }
      }
    } else {
      // Regular click: select only this note
      if (isAlreadySelected && selectedNoteIds.length === 1) {
        // Clicking the only selected note - deselect it - single operation
        clearSelection();
      } else {
        // Select this note exclusively - batch clear and select
        clearSelection();
        // Use a microtask to batch the next updates
        queueMicrotask(() => {
          setSelectedNoteId(note.id);
          toggleNoteSelection(note.id);
        });
      }
    }
  }, [selectedNoteId, selectedNoteIds, clearSelection, setSelectedNoteId, toggleNoteSelection]);

  const handleNoteMouseDown = useCallback((note: Note, event: React.MouseEvent) => {
    if (isPlaying) return;
    // Only allow dragging if note is NOT selected
    if (!selectedNoteIds.includes(note.id)) {
      setDraggedNoteId(note.id);
      setDragStartTime(note.time);
      setDragStartLane(note.lane);
    }
  }, [isPlaying, selectedNoteIds, setDraggedNoteId, setDragStartTime, setDragStartLane]);

  const handleBoundingBoxHandleMouseDown = useCallback((noteId: string, handle: 'start' | 'end' | 'near' | 'far', event: React.MouseEvent) => {
    if (isPlaying) return;
    if (!noteId) return;
    
    const selectedNote = parsedNotes.find(n => n.id === noteId);
    if (!selectedNote) return;
    
    // Start dragging the handle - set this note as the primary selection
    setSelectedNoteId(noteId);
    setDraggedNoteId(noteId);
    setDragStartTime(selectedNote.time);
    setDragStartLane(selectedNote.lane);
    setDraggedHandle(handle);
    setIsDragging(true);
  }, [isPlaying, parsedNotes, setDraggedNoteId, setDragStartTime, setDragStartLane, setDraggedHandle, setIsDragging, setSelectedNoteId]);

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
          
          {/* Bounding boxes around all selected notes */}
          {selectedNoteIds.length > 0 && !isDragging && (
            <>
              {selectedNoteIds.map(noteId => {
                const selectedNote = parsedNotes.find(n => n.id === noteId);
                if (!selectedNote) return null;
                return (
                  <SelectionBoundingBox
                    key={`bbox-${noteId}`}
                    selectedNote={selectedNote}
                    currentTime={currentTime}
                    vpX={vpX}
                    vpY={vpY}
                    onHandleMouseDown={handleBoundingBoxHandleMouseDown}
                  />
                );
              })}
            </>
          )}
          
          {/* Interaction layer - invisible clickable overlay matching note geometry */}
          <EditorInteractionLayer
            vpX={vpX}
            vpY={vpY}
            selectedNoteId={selectedNoteId}
            onNoteClick={handleNoteClick}
            onNoteMouseDown={handleNoteMouseDown}
          />
          
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
      <EditorStatusBar 
        currentTime={currentTime}
        noteCount={parsedNotes.length}
        selectedCount={selectedNoteIds.length}
        isDragging={isDragging}
        snapEnabled={snapEnabled}
        snapDivision={snapDivision}
        bpm={metadata.bpm}
      />

      {/* Beat Grid - hexagonal with parallax */}
      {snapEnabled && editorMode && (
        <EditorBeatGrid 
          currentTime={currentTime}
          bpm={metadata.bpm}
          snapDivision={snapDivision}
          vpX={vpX}
          vpY={vpY}
        />
      )}
    </div>
  );
}

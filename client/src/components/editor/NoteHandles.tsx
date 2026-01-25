import { Note } from '@/types/game';
import { VANISHING_POINT_X, VANISHING_POINT_Y, TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT } from '@/lib/config';
import { JUDGEMENT_RADIUS } from '@/lib/config/geometry';
import { LEAD_TIME } from '@/lib/config/timing';

interface NoteHandlesProps {
  parsedNotes: Note[];
  currentTime: number;
  draggedNoteId: string | null;
  draggedHandle: 'start' | 'end' | 'near' | 'far' | null;
}

const laneToAngle: Record<number, number> = {
  [-2]: 0,   // P key
  1: 60,     // O key
  0: 120,    // W key
  [-1]: 180, // Q key
  3: 240,    // E key
  2: 300     // I key
};

export function NoteHandles({
  parsedNotes,
  currentTime,
  draggedNoteId,
  draggedHandle
}: NoteHandlesProps) {
  return (
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
          
          const laneAngle = laneToAngle[note.lane] ?? 0;
          const angleRad = (laneAngle * Math.PI) / 180;
          const x = VANISHING_POINT_X + distance * Math.cos(angleRad);
          const y = VANISHING_POINT_Y + distance * Math.sin(angleRad);
          
          // Handle is selected if it's being dragged
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
              <div className="w-full h-full flex items-center justify-center">
                <div
                  className="rounded"
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
  );
}

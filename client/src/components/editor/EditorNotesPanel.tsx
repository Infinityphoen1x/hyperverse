import { Note } from '@/types/game';

interface EditorNotesPanelProps {
  parsedNotes: Note[];
  selectedNoteIds: string[];
  isDragging: boolean;
  draggedHandle: 'start' | 'end' | 'near' | 'far' | null;
  draggedNoteId: string | null;
}

export function EditorNotesPanel({ 
  parsedNotes, 
  selectedNoteIds, 
  isDragging,
  draggedHandle,
  draggedNoteId
}: EditorNotesPanelProps) {
  // Count notes per lane
  const notesPerLane = parsedNotes.reduce((acc, note) => {
    acc[note.lane] = (acc[note.lane] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  // Count hold notes
  const holdNotesCount = parsedNotes.filter(n => n.type === 'HOLD').length;

  // Determine current action
  let currentAction = 'Idle';
  if (isDragging && draggedNoteId) {
    const draggedNote = parsedNotes.find(n => n.id === draggedNoteId);
    if (draggedNote) {
      if (draggedHandle === 'near' || draggedHandle === 'start') {
        currentAction = 'Adjusting start time';
      } else if (draggedHandle === 'far' || draggedHandle === 'end') {
        currentAction = 'Adjusting end time';
      } else if (!draggedHandle) {
        currentAction = 'Sliding note';
      }
    }
  } else if (isDragging && !draggedNoteId) {
    currentAction = 'Creating new note';
  } else if (selectedNoteIds.length > 0) {
    currentAction = `${selectedNoteIds.length} note${selectedNoteIds.length > 1 ? 's' : ''} selected`;
  }

  const laneNames: Record<number, string> = {
    [-2]: 'P',
    [-1]: 'Q',
    [0]: 'W',
    [1]: 'O',
    [2]: 'I',
    [3]: 'E'
  };

  return (
    <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4 text-white font-mono text-sm min-w-[280px] z-50">
      <h3 className="text-cyan-400 font-bold mb-3 text-base">NOTES DEBUG</h3>
      
      <div className="space-y-2">
        <div className="flex justify-between border-b border-cyan-500/20 pb-1">
          <span className="text-gray-400">Selected:</span>
          <span className="text-cyan-300 font-bold">{selectedNoteIds.length}</span>
        </div>
        
        <div className="flex justify-between border-b border-cyan-500/20 pb-1">
          <span className="text-gray-400">Total Notes:</span>
          <span className="text-cyan-300 font-bold">{parsedNotes.length}</span>
        </div>
        
        <div className="flex justify-between border-b border-cyan-500/20 pb-1">
          <span className="text-gray-400">Hold Notes:</span>
          <span className="text-cyan-300 font-bold">{holdNotesCount}</span>
        </div>

        <div className="mt-3 mb-2 text-cyan-400 text-xs font-semibold">NOTES PER LANE</div>
        <div className="space-y-1 pl-2">
          {Object.entries(laneNames).map(([laneNum, laneName]) => {
            const lane = parseInt(laneNum);
            const count = notesPerLane[lane] || 0;
            return (
              <div key={lane} className="flex justify-between text-xs">
                <span className="text-gray-400">Lane {laneName}:</span>
                <span className="text-cyan-300">{count}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-cyan-500/30">
          <div className="text-xs text-gray-400 mb-1">Status:</div>
          <div className={`text-sm font-semibold ${
            isDragging ? 'text-yellow-400' : 
            selectedNoteIds.length > 0 ? 'text-green-400' : 
            'text-gray-500'
          }`}>
            {currentAction}
          </div>
        </div>

        {draggedHandle && (
          <div className="mt-2 text-xs">
            <span className="text-gray-400">Handle:</span>
            <span className="ml-2 text-purple-400 font-semibold">{draggedHandle}</span>
          </div>
        )}

        {draggedNoteId && (
          <div className="mt-1 text-xs">
            <span className="text-gray-400">Dragged ID:</span>
            <span className="ml-2 text-purple-400 font-mono text-[10px]">
              {draggedNoteId.substring(0, 20)}...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

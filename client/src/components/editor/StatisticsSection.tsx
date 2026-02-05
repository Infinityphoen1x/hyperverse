import { Note } from '@/types/game';

interface StatisticsSectionProps {
  parsedNotes: Note[];
  selectedNoteIds: string[];
  isDragging: boolean;
  draggedHandle: 'start' | 'end' | 'near' | 'far' | null;
  draggedNoteId: string | null;
}

export function StatisticsSection({ 
  parsedNotes, 
  selectedNoteIds, 
  isDragging,
  draggedHandle,
  draggedNoteId
}: StatisticsSectionProps) {
  // Count notes per position
  const notesPerPosition = parsedNotes.reduce((acc, note) => {
    acc[note.lane] = (acc[note.lane] || 0) + 1; // DEPRECATED: note.lane field, treat as position
    return acc;
  }, {} as Record<number, number>);

  // Count hold notes
  const holdNotesCount = parsedNotes.filter(n => n.type === 'HOLD').length;
  const tapNotesCount = parsedNotes.filter(n => n.type === 'TAP').length;

  // Count spin notes (HOLD notes that trigger tunnel rotation to align with x-axis)
  // Diamond positions 0-3 require rotation, horizontal positions -1/-2 (Q/P) are always on x-axis
  const spinNotes = parsedNotes.filter(n => n.type === 'HOLD' && n.lane >= 0 && n.lane <= 3); // DEPRECATED: note.lane field
  const spinNotesCount = spinNotes.length;

  // Count zoom notes (synced HOLD notes - pairs with same start time and duration)
  // Group hold notes by start time + duration to find synced pairs
  const holdNotes = parsedNotes.filter(n => n.type === 'HOLD');
  const zoomGroups = holdNotes.reduce((acc, note) => {
    const duration = note.duration || 0;
    const key = `${note.time}_${duration}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(note);
    return acc;
  }, {} as Record<string, Note[]>);
  
  // Count groups with 2+ notes (these are zoom triggers)
  const zoomNotesCount = Object.values(zoomGroups)
    .filter(group => group.length >= 2)
    .reduce((sum, group) => sum + group.length, 0);

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

  const positionNames: Record<number, string> = {
    [-2]: 'P',
    [-1]: 'Q',
    [0]: 'W',
    [1]: 'O',
    [2]: 'I',
    [3]: 'E'
  };

  return (
    <div className="p-4 space-y-3 text-sm">
      {/* Selection Status */}
      <div className="space-y-2">
        <div className="flex justify-between border-b border-cyan-500/20 pb-2">
          <span className="text-gray-400">Selected:</span>
          <span className="text-cyan-300 font-bold">{selectedNoteIds.length}</span>
        </div>
        
        <div className="pt-2 border-t border-cyan-500/20">
          <div className="text-xs text-gray-500 mb-1">Status:</div>
          <div className={`text-sm font-semibold ${
            isDragging ? 'text-yellow-400' : 
            selectedNoteIds.length > 0 ? 'text-green-400' : 
            'text-gray-500'
          }`}>
            {currentAction}
          </div>
        </div>

        {draggedHandle && (
          <div className="text-xs">
            <span className="text-gray-400">Handle:</span>
            <span className="ml-2 text-purple-400 font-semibold">{draggedHandle}</span>
          </div>
        )}
      </div>

      {/* Note Counts */}
      <div className="space-y-2 pt-3 border-t border-neon-cyan/20">
        <div className="text-cyan-400 text-xs font-semibold mb-2">NOTE COUNTS</div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Total Notes:</span>
          <span className="text-cyan-300 font-bold">{parsedNotes.length}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">TAP Notes:</span>
          <span className="text-cyan-300">{tapNotesCount}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">HOLD Notes:</span>
          <span className="text-cyan-300">{holdNotesCount}</span>
        </div>

        <div className="flex justify-between pt-2 border-t border-cyan-500/10">
          <span className="text-gray-400">SPIN Notes:</span>
          <span className="text-pink-400 font-semibold" title="HOLD notes that trigger tunnel rotation to align with x-axis (W/O/I/E positions)">{spinNotesCount}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">ZOOM Notes:</span>
          <span className="text-purple-400 font-semibold" title="Synced HOLD notes (2+ with same start/duration) that trigger zoom effect">{zoomNotesCount}</span>
        </div>
      </div>

      {/* Notes per Position */}
      <div className="pt-3 border-t border-neon-cyan/20">
        <div className="text-cyan-400 text-xs font-semibold mb-2">NOTES PER POSITION</div>
        <div className="space-y-1">
          {Object.entries(positionNames).map(([posNum, posName]) => {
            const position = parseInt(posNum);
            const count = notesPerPosition[position] || 0;
            return (
              <div key={position} className="flex justify-between text-xs">
                <span className="text-gray-400">Position {posName}:</span>
                <span className="text-cyan-300">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

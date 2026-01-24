import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Minimize2, X, ArrowLeft, ArrowRight } from 'lucide-react';

interface FloatingWindowProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  initialPosition: { x: number; y: number };
  onClose: () => void;
  onDock: (side: 'left' | 'right') => void;
  onPositionChange: (position: { x: number; y: number }) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const SNAP_THRESHOLD = 80; // Distance from edge to trigger snap

export function FloatingWindow({
  title,
  icon,
  children,
  initialPosition,
  onClose,
  onDock,
  onPositionChange,
  collapsed,
  onToggleCollapse,
}: FloatingWindowProps) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showSnapIndicator, setShowSnapIndicator] = useState<'left' | 'right' | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  // Update position when initialPosition changes (e.g., when reopening)
  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition.x, initialPosition.y]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return; // Don't drag when clicking buttons
    
    setIsDragging(true);
    const rect = windowRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      setPosition({ x: newX, y: newY });
      onPositionChange({ x: newX, y: newY });

      // Check for snap zones
      const windowWidth = window.innerWidth;
      if (newX < SNAP_THRESHOLD) {
        setShowSnapIndicator('left');
      } else if (newX > windowWidth - SNAP_THRESHOLD - 400) {
        setShowSnapIndicator('right');
      } else {
        setShowSnapIndicator(null);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      
      // Check if we should snap to a side
      const windowWidth = window.innerWidth;
      const finalX = e.clientX - dragOffset.x;
      
      if (finalX < SNAP_THRESHOLD) {
        onDock('left');
      } else if (finalX > windowWidth - SNAP_THRESHOLD - 400) {
        onDock('right');
      }
      
      setShowSnapIndicator(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, onDock, onPositionChange]);

  return (
    <>
      {/* Snap Indicators */}
      {showSnapIndicator === 'left' && (
        <div className="fixed left-0 top-0 bottom-0 w-80 bg-neon-cyan/20 border-r-4 border-neon-cyan z-[60] flex items-center justify-center">
          <div className="text-neon-cyan font-rajdhani text-2xl font-bold flex items-center gap-2">
            <ArrowLeft className="w-8 h-8" />
            DOCK LEFT
          </div>
        </div>
      )}
      {showSnapIndicator === 'right' && (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-neon-cyan/20 border-l-4 border-neon-cyan z-[60] flex items-center justify-center">
          <div className="text-neon-cyan font-rajdhani text-2xl font-bold flex items-center gap-2">
            DOCK RIGHT
            <ArrowRight className="w-8 h-8" />
          </div>
        </div>
      )}

      {/* Floating Window */}
      <motion.div
        ref={windowRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`fixed bg-gray-900 border-2 border-neon-cyan rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.5)] z-[70] ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          left: position.x,
          top: position.y,
          width: 400,
          maxHeight: '80vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 bg-gray-800 border-b border-neon-cyan/30 rounded-t-lg cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-sm font-rajdhani text-neon-cyan font-bold">{title}</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleCollapse}
              className="p-1 hover:bg-neon-cyan/20 rounded transition-colors"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? (
                <ChevronDown className="w-4 h-4 text-neon-cyan" />
              ) : (
                <ChevronUp className="w-4 h-4 text-neon-cyan" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-red-500/20 rounded transition-colors"
              title="Close floating window"
            >
              <Minimize2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        {!collapsed && (
          <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
            {children}
          </div>
        )}
      </motion.div>
    </>
  );
}

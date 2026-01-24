import { ChevronDown, ChevronUp, Maximize2, X, ArrowLeftRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onPopout: () => void;
  onClose: () => void;
  onSwitchSide?: () => void;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  icon,
  collapsed,
  onToggleCollapse,
  onPopout,
  onClose,
  onSwitchSide,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="border-b border-neon-cyan/30">
      <div className="flex items-center justify-between p-3 bg-gray-900/50 hover:bg-gray-900/70 transition-colors">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-rajdhani text-neon-cyan font-bold">{title}</h2>
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
          {onSwitchSide && (
            <button
              onClick={onSwitchSide}
              className="p-1 hover:bg-neon-cyan/20 rounded transition-colors"
              title="Switch to other side"
            >
              <ArrowLeftRight className="w-4 h-4 text-neon-cyan" />
            </button>
          )}
          <button
            onClick={onPopout}
            className="p-1 hover:bg-neon-cyan/20 rounded transition-colors"
            title="Pop out"
          >
            <Maximize2 className="w-4 h-4 text-neon-cyan" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-500/20 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}

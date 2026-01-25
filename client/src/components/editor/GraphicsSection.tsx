import { Eye, EyeOff } from 'lucide-react';

interface GraphicsSectionProps {
  glowEnabled: boolean;
  setGlowEnabled: (enabled: boolean) => void;
  dynamicVPEnabled: boolean;
  setDynamicVPEnabled: (enabled: boolean) => void;
  zoomEnabled: boolean;
  setZoomEnabled: (enabled: boolean) => void;
  judgementLinesEnabled: boolean;
  setJudgementLinesEnabled: (enabled: boolean) => void;
  spinEnabled: boolean;
  setSpinEnabled: (enabled: boolean) => void;
  idleMotionEnabled: boolean;
  setIdleMotionEnabled: (enabled: boolean) => void;
}

export function GraphicsSection({
  glowEnabled,
  setGlowEnabled,
  dynamicVPEnabled,
  setDynamicVPEnabled,
  zoomEnabled,
  setZoomEnabled,
  judgementLinesEnabled,
  setJudgementLinesEnabled,
  spinEnabled,
  setSpinEnabled,
  idleMotionEnabled,
  setIdleMotionEnabled,
}: GraphicsSectionProps) {
  const toggles = [
    {
      label: 'Glow Effects',
      description: 'Neon glow and visual effects',
      enabled: glowEnabled,
      setEnabled: setGlowEnabled,
    },
    {
      label: 'Dynamic Vanishing Point',
      description: 'Circular VP motion (wobble)',
      enabled: dynamicVPEnabled,
      setEnabled: setDynamicVPEnabled,
    },
    {
      label: 'Zoom Effects',
      description: 'Combo-based zoom animation',
      enabled: zoomEnabled,
      setEnabled: setZoomEnabled,
    },
    {
      label: 'Judgement Lines',
      description: 'Tap/hold timing indicators',
      enabled: judgementLinesEnabled,
      setEnabled: setJudgementLinesEnabled,
    },
    {
      label: 'Tunnel Spin',
      description: 'Continuous tunnel rotation',
      enabled: spinEnabled,
      setEnabled: setSpinEnabled,
    },
    {
      label: 'Idle Motion',
      description: 'Background sway & parallax',
      enabled: idleMotionEnabled,
      setEnabled: setIdleMotionEnabled,
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 mb-4">
        Toggle visual effects for easier note editing. Preview renders like paused gameplay.
      </p>

      {toggles.map((toggle) => (
        <div
          key={toggle.label}
          className="flex items-start justify-between gap-3 p-3 bg-gray-900/50 border border-gray-700 rounded hover:border-gray-600 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="font-rajdhani text-sm text-neon-cyan flex items-center gap-2">
              {toggle.enabled ? (
                <Eye className="w-4 h-4 flex-shrink-0" />
              ) : (
                <EyeOff className="w-4 h-4 flex-shrink-0 text-gray-500" />
              )}
              <span>{toggle.label}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{toggle.description}</p>
          </div>

          <button
            onClick={() => toggle.setEnabled(!toggle.enabled)}
            className={`px-3 py-1 text-xs font-rajdhani rounded border transition-colors flex-shrink-0 ${
              toggle.enabled
                ? 'bg-neon-cyan border-neon-cyan text-black'
                : 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-500'
            }`}
          >
            {toggle.enabled ? 'ON' : 'OFF'}
          </button>
        </div>
      ))}

      <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded">
        <p className="text-xs text-blue-300">
          <strong>Preview Mode:</strong> Editor shows notes at their current time position, like a paused game.
          Use playback controls to scrub through the beatmap.
        </p>
      </div>
    </div>
  );
}

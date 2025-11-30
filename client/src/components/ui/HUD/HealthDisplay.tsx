interface HealthDisplayProps {
  health: number;
}

export function HealthDisplay({ health }: HealthDisplayProps) {
  return (
    <>
      <div className="w-12 h-12 rounded-full border-2 border-neon-cyan flex items-center justify-center text-neon-cyan font-bold">
        {Math.floor((health / 200) * 100)}%
      </div>
      <div className="h-2 w-32 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-neon-cyan transition-all duration-300"
          style={{ width: `${(health / 200) * 100}%` }}
        />
      </div>
    </>
  );
}
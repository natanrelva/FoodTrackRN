import { motion } from 'motion/react';

interface ExtendedTask {
  id: string;
  name: string;
  startDay: number;
  endDay: number;
  category: string;
  responsible: string;
}

interface ExtendedGanttBarProps {
  task: ExtendedTask;
  dayWidth: number;
  color: string;
  lightColor: string;
}

export function GanttBar({ task, dayWidth, color, lightColor }: ExtendedGanttBarProps) {
  const duration = task.endDay - task.startDay;
  const barWidth = duration * dayWidth;
  const leftPosition = task.startDay * dayWidth;

  return (
    <motion.div
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay: task.startDay * 0.02 }}
      className="absolute rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer group"
      style={{
        left: `${leftPosition}px`,
        width: `${barWidth}px`,
        height: '32px',
        backgroundColor: color,
        transformOrigin: 'left'
      }}
    >
      {/* Gradient overlay */}
      <div
        className="absolute inset-0 rounded-lg opacity-20"
        style={{
          background: `linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(0,0,0,0.1) 100%)`
        }}
      />
      
      {/* Progress indicator (subtle stripe) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg opacity-50"
        style={{ backgroundColor: lightColor }}
      />

      {/* Tooltip on hover */}
      <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap pointer-events-none z-50 shadow-xl">
        <div>{task.name}</div>
        <div className="text-slate-300 mt-1">
          Dia {task.startDay} → Dia {task.endDay} ({duration} dias)
        </div>
        <div className="text-slate-300">{task.responsible}</div>
        {/* Arrow */}
        <div
          className="absolute top-full left-1/2 transform -translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #0f172a'
          }}
        />
      </div>

      {/* Bar label (for wider bars) */}
      {barWidth > 100 && (
        <div className="absolute inset-0 flex items-center px-3">
          <span className="text-white text-xs truncate">
            {task.name.length > 30 ? task.name.substring(0, 27) + '...' : task.name}
          </span>
        </div>
      )}
    </motion.div>
  );
}

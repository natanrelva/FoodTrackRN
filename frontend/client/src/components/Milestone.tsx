import { Calendar, Target, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { MilestoneProps } from '@foodtrack/types';

interface ExtendedMilestoneProps extends MilestoneProps {
  icon: 'calendar' | 'target' | 'zap';
  leftMargin: number;
  dayWidth: number;
  topOffset: number;
}

export function Milestone({ day, label, icon, leftMargin, dayWidth, topOffset }: ExtendedMilestoneProps) {
  const iconMap = {
    calendar: Calendar,
    target: Target,
    zap: Zap
  };

  const Icon = iconMap[icon];
  const position = leftMargin + day * dayWidth;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, delay: day * 0.02 }}
      className="absolute"
      style={{
        left: `${position}px`,
        top: `${topOffset}px`,
        transform: 'translateX(-50%)'
      }}
    >
      {/* Linha vertical */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 bg-amber-400 h-24 opacity-50" />
      
      {/* Ícone do milestone */}
      <div className="relative bg-gradient-to-br from-amber-400 to-amber-500 rounded-full p-2.5 shadow-lg border-4 border-white">
        <Icon className="w-5 h-5 text-white" />
      </div>

      {/* Label */}
      <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-amber-50 border-2 border-amber-300 rounded-lg px-3 py-1.5 shadow-md whitespace-nowrap">
        <div className="text-xs text-amber-900">{label}</div>
        <div className="text-xs text-amber-700">Dia {day}</div>
      </div>
    </motion.div>
  );
}

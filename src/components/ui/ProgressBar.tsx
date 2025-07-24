import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  progress: number; // 0-100
  height?: string;
  className?: string;
  barClassName?: string;
  delay?: number;
  duration?: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 'h-2',
  className,
  barClassName,
  delay = 0.5,
  duration = 1,
}) => {
  return (
    <div className={cn("w-full bg-gray-200 rounded-full", height, className)}>
      <motion.div 
        className={cn("bg-gradient-to-r from-orange-400 to-orange-600 rounded-full", height, barClassName)}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ delay, duration }}
      />
    </div>
  );
};

export default ProgressBar;
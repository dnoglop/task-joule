import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon: LucideIcon;
  index?: number; // For staggered animation
  iconBgColor?: string;
  changeBgColor?: string;
  changeTextColor?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  change,
  icon: Icon,
  index = 0,
  iconBgColor = 'bg-orange-50',
  changeBgColor,
  changeTextColor,
}) => {
  const defaultChangeBg = change?.startsWith('+') ? 'bg-green-50' : 'bg-red-50';
  const defaultChangeText = change?.startsWith('+') ? 'text-green-600' : 'text-red-600';

  return (
    <motion.div
      className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -5, scale: 1.02 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-xl", iconBgColor)}>
          <Icon className="text-orange-600" size={24} />
        </div>
        {change && (
          <span className={cn(
            "text-sm font-medium px-2 py-1 rounded-full",
            changeBgColor || defaultChangeBg,
            changeTextColor || defaultChangeText
          )}>
            {change}
          </span>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-800 mb-1">{value}</h3>
      <p className="text-gray-500 text-sm">{label}</p>
    </motion.div>
  );
};

export default MetricCard;
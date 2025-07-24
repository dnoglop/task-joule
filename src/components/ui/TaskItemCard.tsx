import React from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Task, TaskStatus } from '@/types/supabase';
import { Profile } from '@/types/supabase';

interface TaskItemCardProps {
  task: Task;
  assigneeName?: string;
  index?: number; // For staggered animation
  onClick?: (task: Task) => void;
}

const statusColors: Record<TaskStatus, string> = {
  'pending': 'bg-gray-50 text-gray-600',
  'in_progress': 'bg-blue-50 text-blue-600',
  'completed': 'bg-green-50 text-green-600',
  'on_hold': 'bg-yellow-50 text-yellow-600',
  'cancelled': 'bg-red-50 text-red-600',
};

const statusLabels: Record<TaskStatus, string> = {
  'pending': 'Pendente',
  'in_progress': 'Em Progresso',
  'completed': 'Concluída',
  'on_hold': 'Em Espera',
  'cancelled': 'Cancelada',
};

const priorityColors: Record<string, string> = {
  'alta': 'bg-red-50 text-red-600',
  'media': 'bg-yellow-50 text-yellow-600',
  'baixa': 'bg-green-50 text-green-600',
};

const TaskItemCard: React.FC<TaskItemCardProps> = ({ task, assigneeName, index = 0, onClick }) => {
  return (
    <motion.div
      className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-50 cursor-pointer"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ x: 4 }}
      onClick={() => onClick && onClick(task)}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-800">{task.task_name}</h4>
        {task.priority && (
          <Badge className={priorityColors[task.priority]}>
            {task.priority}
          </Badge>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <Badge className={statusColors[task.status]}>
          {statusLabels[task.status]}
        </Badge>
        {assigneeName && (
          <div className="flex items-center text-sm text-gray-500">
            <User size={14} className="mr-1" />
            {assigneeName}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TaskItemCard;
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Task, TaskStatus } from '@/types/supabase';

interface TaskStatusChartProps {
  tasks: Task[];
}

const COLORS = {
  'pending': '#FFC107', // Amber/Orange
  'in_progress': '#2196F3', // Blue
  'completed': '#4CAF50', // Green
  'on_hold': '#9E9E9E', // Grey
  'cancelled': '#F44336', // Red
};

const statusLabels: Record<TaskStatus, string> = {
  'pending': 'Pendente',
  'in_progress': 'Em Progresso',
  'completed': 'Concluída',
  'on_hold': 'Em Espera',
  'cancelled': 'Cancelada',
};

const TaskStatusChart: React.FC<TaskStatusChartProps> = ({ tasks }) => {
  const statusCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<TaskStatus, number>);

  const data = Object.entries(statusCounts).map(([status, count]) => ({
    name: statusLabels[status as TaskStatus],
    value: count,
    color: COLORS[status as TaskStatus],
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default TaskStatusChart;
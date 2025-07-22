import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Task, TaskStatus } from '@/types/supabase';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, Trash2 } from 'lucide-react';

interface TaskTableProps {
  tasks: Task[];
  onView: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const statusColors: Record<TaskStatus, string> = {
  'pending': 'bg-yellow-500',
  'in_progress': 'bg-blue-500',
  'completed': 'bg-green-500',
  'on_hold': 'bg-gray-500',
  'cancelled': 'bg-red-500',
};

const statusLabels: Record<TaskStatus, string> = {
  'pending': 'Pendente',
  'in_progress': 'Em Progresso',
  'completed': 'Concluída',
  'on_hold': 'Em Espera',
  'cancelled': 'Cancelada',
};

const TaskTable: React.FC<TaskTableProps> = ({ tasks, onView, onEdit, onDelete }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome da Tarefa</TableHead>
            <TableHead>Programa</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead>Horas Estimadas</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                Nenhuma tarefa encontrada.
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium">{task.task_name}</TableCell>
                <TableCell>{task.program_name}</TableCell>
                <TableCell>
                  <Badge className={statusColors[task.status]}>
                    {statusLabels[task.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy') : 'N/A'}
                </TableCell>
                <TableCell>{task.estimated_hours || 'N/A'}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="icon" onClick={() => onView(task)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => onEdit(task)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => onDelete(task.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default TaskTable;
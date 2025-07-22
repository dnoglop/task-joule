import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Loader2, Mail, Briefcase, CheckCircle, Clock, XCircle, Hourglass } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Profile, Task } from '@/types/supabase';
import TaskStatusChart from '@/components/TaskStatusChart';

const EmployeeDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // This 'id' is the profile.id

  // Fetch employee profile
  const { data: employee, isLoading: isLoadingEmployee, error: employeeError } = useQuery<Profile | null>({
    queryKey: ['employee', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch tasks assigned to this employee
  const { data: tasks, isLoading: isLoadingTasks, error: tasksError } = useQuery<Task[]>({
    queryKey: ['employeeTasks', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (employeeError) {
    showError("Erro ao carregar detalhes do funcionário: " + employeeError.message);
    console.error("Error fetching employee details:", employeeError);
  }

  if (tasksError) {
    showError("Erro ao carregar tarefas do funcionário: " + tasksError.message);
    console.error("Error fetching employee tasks:", tasksError);
  }

  if (isLoadingEmployee || isLoadingTasks) {
    return (
      <div className="flex items-center justify-center h-full min-h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6 text-center text-gray-700 dark:text-gray-300">
        Funcionário não encontrado.
      </div>
    );
  }

  const completedTasks = tasks?.filter(task => task.status === 'completed').length || 0;
  const overdueTasks = tasks?.filter(task => task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed' && task.status !== 'cancelled').length || 0;
  const totalEstimatedHours = tasks?.reduce((sum, task) => sum + (task.estimated_hours || 0), 0) || 0;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Detalhes do Funcionário: {employee.name}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center space-x-4 pb-2">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employee.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${employee.name}`} alt={employee.name} />
              <AvatarFallback className="text-2xl">{employee.name?.charAt(0) || 'IJ'}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{employee.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{employee.role === 'manager' ? 'Gestor' : 'Funcionário'}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <Mail className="mr-2 h-4 w-4 text-primary" /> {employee.email}
            </div>
            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <Briefcase className="mr-2 h-4 w-4 text-primary" /> {employee.area || 'Não especificado'}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Métricas de Desempenho</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Tarefas Concluídas</p>
                <p className="text-xl font-bold">{completedTasks}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Tarefas Atrasadas</p>
                <p className="text-xl font-bold">{overdueTasks}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Hourglass className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Horas Estimadas</p>
                <p className="text-xl font-bold">{totalEstimatedHours}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Status das Tarefas Atribuídas</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks && tasks.length > 0 ? (
            <TaskStatusChart tasks={tasks} />
          ) : (
            <p className="text-muted-foreground text-center">Nenhuma tarefa atribuída para exibir no gráfico.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Tarefas Atribuídas</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Placeholder for a table of assigned tasks */}
          <p className="text-muted-foreground">Tabela de tarefas atribuídas virá aqui...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeDetailsPage;
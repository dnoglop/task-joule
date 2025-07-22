import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { showError } from '@/utils/toast';
import { Loader2, ListTodo, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Profile, Task } from '@/types/supabase';
import TaskStatusChart from '@/components/TaskStatusChart';

const DashboardPage: React.FC = () => {
  const { session } = useSession();
  const userId = session?.user?.id;

  // Fetch current user's profile
  const { data: profile, isLoading: isLoadingProfile, error: profileError } = useQuery<Profile | null>({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch tasks based on role
  const { data: tasks, isLoading: isLoadingTasks, error: tasksError } = useQuery<Task[]>({
    queryKey: ['tasks', profile?.role, profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      let query = supabase.from('tasks').select('*');
      if (profile.role === 'employee') {
        query = query.eq('assigned_to', profile.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile, // Only fetch tasks if profile is loaded
  });

  if (profileError) {
    showError("Erro ao carregar perfil: " + profileError.message);
    console.error("Error fetching profile:", profileError);
  }

  if (tasksError) {
    showError("Erro ao carregar tarefas: " + tasksError.message);
    console.error("Error fetching tasks:", tasksError);
  }

  if (isLoadingProfile || isLoadingTasks) {
    return (
      <div className="flex items-center justify-center h-full min-h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center text-gray-700 dark:text-gray-300">
        Não foi possível carregar as informações do perfil.
      </div>
    );
  }

  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(task => task.status === 'completed').length || 0;
  const pendingTasks = tasks?.filter(task => task.status === 'pending' || task.status === 'in_progress' || task.status === 'on_hold').length || 0;
  const overdueTasks = tasks?.filter(task => task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed' && task.status !== 'cancelled').length || 0;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Dashboard {profile.role === 'manager' ? 'do Gestor' : 'do Funcionário'}
      </h1>
      <p className="text-gray-700 dark:text-gray-300 mb-8">
        Bem-vindo, {profile.name}! Aqui você verá um resumo das tarefas e indicadores importantes.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">Todas as tarefas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Concluídas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks}</div>
            <p className="text-xs text-muted-foreground">Tarefas finalizadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks}</div>
            <p className="text-xs text-muted-foreground">Aguardando ou em progresso</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Atrasadas</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueTasks}</div>
            <p className="text-xs text-muted-foreground">Com prazo vencido</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Gráfico de Status de Tarefas</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks && tasks.length > 0 ? (
              <TaskStatusChart tasks={tasks} />
            ) : (
              <p className="text-muted-foreground text-center">Nenhuma tarefa para exibir no gráfico.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Lista de atividades recentes virá aqui...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
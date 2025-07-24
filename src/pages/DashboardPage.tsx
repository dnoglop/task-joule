import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { showError } from '@/utils/toast';
import { Loader2, ListTodo, CheckSquare, Users, Target, Plus, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Keep shadcn Card for general use
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Profile, Task, Program } from '@/types/supabase';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import MetricCard from '@/components/ui/MetricCard'; // New custom MetricCard
import TaskItemCard from '@/components/ui/TaskItemCard'; // New custom TaskItemCard

const DashboardPage: React.FC = () => {
  const { session } = useSession();
  const userId = session?.user?.id;

  const [selectedProgram, setSelectedProgram] = React.useState<string | 'all'>('all');
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  // Fetch do perfil do usuário atual
  const { data: profile, isLoading: isLoadingProfile, error: profileError } = useQuery<Profile | null>({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch de todos os programas para o filtro
  const { data: programs, isLoading: isLoadingPrograms, error: programsError } = useQuery<Program[]>({
    queryKey: ['allPrograms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
    enabled: profile?.role === 'manager',
  });

  // Fetch de todos os perfis para mapear assigned_to
  const { data: allProfiles, isLoading: isLoadingAllProfiles, error: allProfilesError } = useQuery<Profile[]>({
    queryKey: ['allProfiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch de tarefas agora reage aos filtros
  const { data: tasks, isLoading: isLoadingTasks, error: tasksError } = useQuery<Task[]>({
    queryKey: ['tasks', profile?.role, profile?.id, selectedProgram, dateRange],
    queryFn: async () => {
      if (!profile) return [];
      
      let query = supabase.from('tasks').select('*');

      if (profile.role === 'employee') {
        query = query.eq('assigned_to', profile.id);
      }

      if (selectedProgram !== 'all') {
        query = query.eq('program_id', selectedProgram);
      }
      if (dateRange?.from) {
        query = query.gte('due_date', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('due_date', dateRange.to.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  if (profileError || programsError || tasksError || allProfilesError) {
    const error = profileError || programsError || tasksError || allProfilesError;
    showError("Erro ao carregar dados do dashboard: " + error.message);
    console.error("Dashboard data fetching error:", error);
  }

  const clearFilters = () => {
    setSelectedProgram('all');
    setDateRange(undefined);
  };

  const isLoading = isLoadingProfile || isLoadingTasks || isLoadingPrograms || isLoadingAllProfiles;

  if (isLoading) {
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

  // Cálculos dos cards
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(task => task.status === 'completed').length || 0;
  const activeProjects = programs?.length || 0; // Assuming all fetched programs are active
  const teamMembers = allProfiles?.length || 0; // Total members
  const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(0) : 0;

  // Mock data for monthly progress (replace with real data if available)
  const monthlyProgressData = [
    { month: 'Jan', value: 65 },
    { month: 'Fev', value: 80 },
    { month: 'Mar', value: 45 },
    { month: 'Abr', value: 90 },
    { month: 'Mai', value: 70 },
    { month: 'Jun', value: 85 },
    { month: 'Jul', value: 95 },
  ];

  // Get recent tasks (e.g., last 3, not completed)
  const recentTasks = tasks
    ?.filter(task => task.status !== 'completed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3) || [];

  return (
    <motion.div
      className="p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          label="Tarefas Concluídas"
          value={completedTasks}
          change="+12%"
          icon={CheckSquare}
          index={0}
        />
        <MetricCard
          label="Projetos Ativos"
          value={activeProjects}
          change="+5%"
          icon={Folder}
          index={1}
        />
        <MetricCard
          label="Membros do Time"
          value={teamMembers}
          change="+2%"
          icon={Users}
          index={2}
        />
        <MetricCard
          label="Taxa de Conclusão"
          value={`${completionRate}%`}
          change="+8%"
          icon={Target}
          index={3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Progresso Mensal */}
        <motion.div
          className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800">Progresso Mensal</h3>
            <Button variant="link" className="text-orange-600 hover:text-orange-700 text-sm font-medium p-0 h-auto">
              Ver mais
            </Button>
          </div>
          
          <div className="h-64 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl flex items-end justify-center p-4">
            {monthlyProgressData.map((data, index) => (
              <motion.div
                key={data.month}
                className="bg-orange-500 rounded-t-lg mx-1 flex-1 max-w-12"
                initial={{ height: 0 }}
                animate={{ height: `${data.value}%` }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.6 }}
              />
            ))}
          </div>
        </motion.div>

        {/* Tarefas Recentes */}
        <motion.div
          className="bg-white rounded-2xl p-6 shadow-lg"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800">Tarefas Recentes</h3>
            <Button variant="ghost" size="icon" className="text-orange-600 hover:bg-orange-50 hover:text-orange-700">
              <Plus size={20} />
            </Button>
          </div>
          
          <div className="space-y-4">
            {recentTasks.length > 0 ? (
              recentTasks.map((task, index) => (
                <TaskItemCard
                  key={task.id}
                  task={task}
                  assigneeName={allProfiles?.find(p => p.id === task.assigned_to)?.name || 'N/A'}
                  index={index}
                />
              ))
            ) : (
              <p className="text-muted-foreground text-center">Nenhuma tarefa recente encontrada.</p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;
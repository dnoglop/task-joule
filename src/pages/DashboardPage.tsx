import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { showError } from '@/utils/toast';
import { Loader2, ListTodo, CheckCircle, Clock, XCircle, Calendar as CalendarIcon, Hourglass } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Profile, Task, Program } from '@/types/supabase';
import TaskStatusChart from '@/components/TaskStatusChart';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DashboardPage: React.FC = () => {
  const { session } = useSession();
  const userId = session?.user?.id;

  // --- Adicionado: Estados para os filtros ---
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

  // --- Adicionado: Fetch de todos os programas para o filtro ---
  const { data: programs, isLoading: isLoadingPrograms, error: programsError } = useQuery<Program[]>({
    queryKey: ['allPrograms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
    enabled: profile?.role === 'manager', // Apenas gestores precisam do filtro de programa
  });

  // --- Modificado: Fetch de tarefas agora reage aos filtros ---
  const { data: tasks, isLoading: isLoadingTasks, error: tasksError } = useQuery<Task[]>({
    queryKey: ['tasks', profile?.role, profile?.id, selectedProgram, dateRange], // Chave de query inclui os filtros
    queryFn: async () => {
      if (!profile) return [];
      
      let query = supabase.from('tasks').select('*');

      // Filtro padrão por funcionário
      if (profile.role === 'employee') {
        query = query.eq('assigned_to', profile.id);
      }

      // --- Adicionado: Lógica de filtragem na query ---
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
    enabled: !!profile, // Só busca tarefas se o perfil estiver carregado
  });

  if (profileError || programsError || tasksError) {
    const error = profileError || programsError || tasksError;
    showError("Erro ao carregar dados do dashboard: " + error.message);
    console.error("Dashboard data fetching error:", error);
  }

  // --- Adicionado: Função para limpar os filtros ---
  const clearFilters = () => {
    setSelectedProgram('all');
    setDateRange(undefined);
  };

  const isLoading = isLoadingProfile || isLoadingTasks || isLoadingPrograms;

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
  const pendingTasks = tasks?.filter(task => task.status === 'pending' || task.status === 'in_progress' || task.status === 'on_hold').length || 0;
  const overdueTasks = tasks?.filter(task => task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed' && task.status !== 'cancelled').length || 0;
  
  // --- Adicionado: Cálculo do total de horas ---
  const totalHours = tasks?.reduce((acc, task) => acc + (task.estimated_hours || 0), 0) || 0;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Dashboard {profile.role === 'manager' ? 'do Gestor' : 'do Funcionário'}
      </h1>
      <p className="text-gray-700 dark:text-gray-300 mb-6">
        Bem-vindo, {profile.name}! Aqui você verá um resumo das tarefas e indicadores importantes.
      </p>

      {/* --- Adicionado: Seção de Filtros --- */}
      {profile.role === 'manager' && (
        <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-muted/50 rounded-lg">
          <div className="flex-grow">
            <label className="text-sm font-medium mb-1 block">Programa</label>
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um programa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Programas</SelectItem>
                {programs?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-grow">
            <label className="text-sm font-medium mb-1 block">Intervalo de Datas</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y", { locale: ptBR })} -{' '}
                        {format(dateRange.to, "LLL dd, y", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y", { locale: ptBR })
                    )
                  ) : (
                    <span>Selecione um intervalo</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={clearFilters} variant="ghost" className="self-end">Limpar Filtros</Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* --- Adicionado: Card de Total de Horas --- */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Horas (Estimado)</CardTitle>
            <Hourglass className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Soma das horas das tarefas filtradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">Tarefas no filtro atual</p>
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
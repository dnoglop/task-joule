import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TaskTable from '@/components/TaskTable';
import TaskFormDialog from '@/components/TaskFormDialog';
import { Task, Profile, Program } from '@/types/supabase';
import { useSession } from '@/contexts/SessionContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge'; // Adicionando esta importação

const TasksPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const currentUserId = session?.user?.id;

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = React.useState(false);
  const [viewingTask, setViewingTask] = React.useState<Task | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = React.useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = React.useState<string | null>(null);

  // Fetch current user's profile to check role
  const { data: currentUserProfile, isLoading: isLoadingCurrentUserProfile, error: currentUserProfileError } = useQuery<Profile | null>({
    queryKey: ['currentUserProfile', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentUserId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentUserId,
  });

  // Fetch tasks
  const { data: tasks, isLoading: isLoadingTasks, error: tasksError } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch employees for assignment
  const { data: employees, isLoading: isLoadingEmployees, error: employeesError } = useQuery<Profile[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch programs for task creation
  const { data: programs, isLoading: isLoadingPrograms, error: programsError } = useQuery<Program[]>({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('id, name');
      if (error) throw error;
      return data;
    },
  });

  if (currentUserProfileError) {
    showError("Erro ao carregar perfil do usuário atual: " + currentUserProfileError.message);
    console.error("Error fetching current user profile:", currentUserProfileError);
  }

  if (tasksError) {
    showError("Erro ao carregar tarefas: " + tasksError.message);
    console.error("Error fetching tasks:", tasksError);
  }

  if (employeesError) {
    showError("Erro ao carregar funcionários: " + employeesError.message);
    console.error("Error fetching employees:", employeesError);
  }

  if (programsError) {
    showError("Erro ao carregar programas: " + programsError.message);
    console.error("Error fetching programs:", programsError);
  }

  const createTaskMutation = useMutation({
    mutationFn: async (newTask: Partial<Task>) => {
      const { data, error } = await supabase.from('tasks').insert(newTask).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showSuccess("Tarefa criada com sucesso!");
    },
    onError: (error) => {
      showError("Erro ao criar tarefa: " + error.message);
      console.error("Error creating task:", error);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTask: Partial<Task>) => {
      const { data, error } = await supabase.from('tasks').update(updatedTask).eq('id', updatedTask.id!).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showSuccess("Tarefa atualizada com sucesso!");
    },
    onError: (error) => {
      showError("Erro ao atualizar tarefa: " + error.message);
      console.error("Error updating task:", error);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showSuccess("Tarefa excluída com sucesso!");
    },
    onError: (error) => {
      showError("Erro ao excluir tarefa: " + error.message);
      console.error("Error deleting task:", error);
    },
  });

  const handleCreateTask = (task: Partial<Task>) => {
    createTaskMutation.mutate({ ...task, created_by: currentUserProfile?.id });
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleUpdateTask = (task: Partial<Task>) => {
    updateTaskMutation.mutate(task);
  };

  const handleDeleteTask = (taskId: string) => {
    setTaskToDeleteId(taskId);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (taskToDeleteId) {
      deleteTaskMutation.mutate(taskToDeleteId);
      setTaskToDeleteId(null);
      setIsConfirmDeleteOpen(false);
    }
  };

  const handleViewTask = (task: Task) => {
    setViewingTask(task);
    setIsViewDetailsOpen(true);
  };

  // Define statusColors and statusLabels here as they are used in the Task Details Dialog
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

  if (isLoadingCurrentUserProfile || isLoadingTasks || isLoadingEmployees || isLoadingPrograms) {
    return (
      <div className="flex items-center justify-center h-full min-h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (currentUserProfile?.role !== 'manager' && currentUserProfile?.role !== 'employee') {
    return (
      <div className="p-6 text-center text-gray-700 dark:text-gray-300">
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestão de Tarefas</h1>
        {currentUserProfile?.role === 'manager' && (
          <Button onClick={() => { setEditingTask(null); setIsFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Criar Nova Tarefa
          </Button>
        )}
      </div>
      <p className="text-gray-700 dark:text-gray-300 mb-8">
        Aqui você poderá criar, visualizar e gerenciar todas as tarefas.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Tarefas</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskTable
            tasks={tasks || []}
            onView={handleViewTask}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
          />
        </CardContent>
      </Card>

      <TaskFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        initialData={editingTask}
        employees={employees || []}
        programs={programs || []}
      />

      {/* Task Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Tarefa: {viewingTask?.task_name}</DialogTitle>
            <DialogDescription>
              Informações detalhadas sobre a tarefa selecionada.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Programa:</Label>
              <span className="col-span-3">{viewingTask?.program_name}</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Descrição:</Label>
              <span className="col-span-3">{viewingTask?.description || 'N/A'}</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Horas Estimadas:</Label>
              <span className="col-span-3">{viewingTask?.estimated_hours || 'N/A'}</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Atribuído a:</Label>
              <span className="col-span-3">
                {employees?.find(emp => emp.id === viewingTask?.assigned_to)?.name || 'N/A'}
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Prazo:</Label>
              <span className="col-span-3">
                {viewingTask?.due_date ? format(new Date(viewingTask.due_date), 'dd/MM/yyyy') : 'N/A'}
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Status:</Label>
              <span className="col-span-3">
                <Badge className={statusColors[viewingTask?.status || 'pending']}>
                  {statusLabels[viewingTask?.status || 'pending']}
                </Badge>
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Fase Atual:</Label>
              <span className="col-span-3">{viewingTask?.current_phase || 'N/A'}</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Observações:</Label>
              <span className="col-span-3">{viewingTask?.observations || 'N/A'}</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Comentários:</Label>
              <span className="col-span-3">{viewingTask?.comments || 'N/A'}</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Criado por:</Label>
              <span className="col-span-3">
                {employees?.find(emp => emp.id === viewingTask?.created_by)?.name || 'N/A'}
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Criado em:</Label>
              <span className="col-span-3">
                {viewingTask?.created_at ? format(new Date(viewingTask.created_at), 'dd/MM/yyyy HH:mm') : 'N/A'}
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Última Atualização:</Label>
              <span className="col-span-3">
                {viewingTask?.updated_at ? format(new Date(viewingTask.updated_at), 'dd/MM/yyyy HH:mm') : 'N/A'}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewDetailsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza de que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TasksPage;
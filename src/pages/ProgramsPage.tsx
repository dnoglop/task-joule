import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, PlusCircle, Edit, Trash2, ListTodo, CheckCircle, Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/contexts/SessionContext';
import { Profile, Program, Task } from '@/types/supabase';
import ProgramFormDialog from '@/components/ProgramFormDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface ProgramWithMetrics extends Program {
  total_tasks: number;
  completed_tasks: number;
  total_estimated_hours: number;
}

const ProgramsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const currentUserId = session?.user?.id;

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingProgram, setEditingProgram] = React.useState<Program | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = React.useState(false);
  const [programToDeleteId, setProgramToDeleteId] = React.useState<string | null>(null);

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

  // Fetch programs
  const { data: programs, isLoading: isLoadingPrograms, error: programsError } = useQuery<Program[]>({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch tasks to aggregate metrics for programs
  const { data: tasks, isLoading: isLoadingTasks, error: tasksError } = useQuery<Task[]>({
    queryKey: ['tasksForPrograms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('program_id, status, estimated_hours');
      if (error) throw error;
      return data;
    },
  });

  if (currentUserProfileError) {
    showError("Erro ao carregar perfil do usuário atual: " + currentUserProfileError.message);
    console.error("Error fetching current user profile:", currentUserProfileError);
  }
  if (programsError) {
    showError("Erro ao carregar programas: " + programsError.message);
    console.error("Error fetching programs:", programsError);
  }
  if (tasksError) {
    showError("Erro ao carregar tarefas para métricas: " + tasksError.message);
    console.error("Error fetching tasks for program metrics:", tasksError);
  }

  const createProgramMutation = useMutation({
    mutationFn: async (newProgram: Partial<Program>) => {
      const { data, error } = await supabase.from('programs').insert(newProgram).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      showSuccess("Programa criado com sucesso!");
    },
    onError: (error) => {
      showError("Erro ao criar programa: " + error.message);
      console.error("Error creating program:", error);
    },
  });

  const updateProgramMutation = useMutation({
    mutationFn: async (updatedProgram: Partial<Program>) => {
      const { data, error } = await supabase.from('programs').update(updatedProgram).eq('id', updatedProgram.id!).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      showSuccess("Programa atualizado com sucesso!");
    },
    onError: (error) => {
      showError("Erro ao atualizar programa: " + error.message);
      console.error("Error updating program:", error);
    },
  });

  const deleteProgramMutation = useMutation({
    mutationFn: async (programId: string) => {
      const { error } = await supabase.from('programs').delete().eq('id', programId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['tasksForPrograms'] }); // Invalidate tasks as well
      showSuccess("Programa excluído com sucesso!");
    },
    onError: (error) => {
      showError("Erro ao excluir programa: " + error.message);
      console.error("Error deleting program:", error);
    },
  });

  const handleCreateProgram = (program: Partial<Program>) => {
    createProgramMutation.mutate({ ...program, created_by: currentUserProfile?.id });
  };

  const handleEditProgram = (program: Program) => {
    setEditingProgram(program);
    setIsFormOpen(true);
  };

  const handleUpdateProgram = (program: Partial<Program>) => {
    updateProgramMutation.mutate(program);
  };

  const handleDeleteProgram = (programId: string) => {
    setProgramToDeleteId(programId);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (programToDeleteId) {
      deleteProgramMutation.mutate(programToDeleteId);
      setProgramToDeleteId(null);
      setIsConfirmDeleteOpen(false);
    }
  };

  const programsWithMetrics: ProgramWithMetrics[] = React.useMemo(() => {
    if (!programs || !tasks) return [];

    const programMetrics = new Map<string, { total: number; completed: number; estimatedHours: number }>();

    tasks.forEach(task => {
      if (task.program_id) {
        const metrics = programMetrics.get(task.program_id) || { total: 0, completed: 0, estimatedHours: 0 };
        metrics.total++;
        if (task.status === 'completed') {
          metrics.completed++;
        }
        metrics.estimatedHours += (task.estimated_hours || 0);
        programMetrics.set(task.program_id, metrics);
      }
    });

    return programs.map(program => ({
      ...program,
      total_tasks: programMetrics.get(program.id)?.total || 0,
      completed_tasks: programMetrics.get(program.id)?.completed || 0,
      total_estimated_hours: programMetrics.get(program.id)?.estimatedHours || 0,
    }));
  }, [programs, tasks]);


  if (isLoadingCurrentUserProfile || isLoadingPrograms || isLoadingTasks) {
    return (
      <div className="flex items-center justify-center h-full min-h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (currentUserProfile?.role !== 'manager') {
    return (
      <div className="p-6 text-center text-gray-700 dark:text-gray-300">
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestão de Programas</h1>
        {currentUserProfile?.role === 'manager' && (
          <Button onClick={() => { setEditingProgram(null); setIsFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Criar Novo Programa
          </Button>
        )}
      </div>
      <p className="text-gray-700 dark:text-gray-300 mb-8">
        Visualize e gerencie os programas do Instituto Joule.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Programas</CardTitle>
        </CardHeader>
        <CardContent>
          {programsWithMetrics && programsWithMetrics.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Programa</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-center">Total de Tarefas</TableHead>
                  <TableHead className="text-center">Tarefas Concluídas</TableHead>
                  <TableHead className="text-center">Horas Estimadas</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programsWithMetrics.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell className="font-medium">{program.name}</TableCell>
                    <TableCell>{program.description || 'N/A'}</TableCell>
                    <TableCell className="text-center flex items-center justify-center">
                      <ListTodo className="h-4 w-4 mr-1 text-muted-foreground" /> {program.total_tasks}
                    </TableCell>
                    <TableCell className="text-center flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 mr-1 text-green-500" /> {program.completed_tasks}
                    </TableCell>
                    <TableCell className="text-center flex items-center justify-center">
                      <Hourglass className="h-4 w-4 mr-1 text-blue-500" /> {program.total_estimated_hours}h
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex space-x-2 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditProgram(program)}
                          title="Editar Programa"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteProgram(program.id)}
                          title="Excluir Programa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center">Nenhum programa encontrado.</p>
          )}
        </CardContent>
      </Card>

      <ProgramFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={editingProgram ? handleUpdateProgram : handleCreateProgram}
        initialData={editingProgram}
      />

      {/* Confirm Delete Dialog */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza de que deseja excluir este programa? Esta ação não pode ser desfeita e removerá todas as tarefas associadas a ele.
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

export default ProgramsPage;
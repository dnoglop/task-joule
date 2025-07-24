import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, UserPlus, Edit, Eye, Trash2 } from 'lucide-react';
import { Profile, Task } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/contexts/SessionContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import EmployeeFormDialog from '@/components/EmployeeFormDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import TeamMemberCard from '@/components/ui/TeamMemberCard'; // New custom TeamMemberCard

const EmployeesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const navigate = useNavigate();
  const userId = session?.user?.id;

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingEmployee, setEditingEmployee] = React.useState<Profile | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = React.useState(false);
  const [employeeToDeleteId, setEmployeeToDeleteId] = React.useState<string | null>(null);

  // Fetch current user's profile to check role
  const { data: currentUserProfile, isLoading: isLoadingCurrentUserProfile, error: currentUserProfileError } = useQuery<Profile | null>({
    queryKey: ['currentUserProfile', userId],
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

  // Fetch all profiles (only if current user is manager)
  const { data: employees, isLoading: isLoadingEmployees, error: employeesError } = useQuery<Profile[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      if (currentUserProfile?.role !== 'manager') return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: currentUserProfile?.role === 'manager',
  });

  // Fetch tasks for all employees to calculate metrics
  const { data: allTasks, isLoading: isLoadingAllTasks, error: allTasksError } = useQuery<Task[]>({
    queryKey: ['allTasksForEmployees'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('assigned_to, status, estimated_hours, due_date');
      if (error) throw error;
      return data;
    },
    enabled: currentUserProfile?.role === 'manager',
  });

  if (currentUserProfileError) {
    showError("Erro ao carregar perfil do usuário atual: " + currentUserProfileError.message);
    console.error("Error fetching current user profile:", currentUserProfileError);
  }

  if (employeesError) {
    showError("Erro ao carregar funcionários: " + employeesError.message);
    console.error("Error fetching employees:", employeesError);
  }

  if (allTasksError) {
    showError("Erro ao carregar tarefas para métricas de funcionários: " + allTasksError.message);
    console.error("Error fetching tasks for employee metrics:", allTasksError);
  }

  const updateEmployeeMutation = useMutation({
    mutationFn: async (updatedEmployee: Partial<Profile>) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          name: updatedEmployee.name,
          area: updatedEmployee.area,
          role: updatedEmployee.role,
          avatar_url: updatedEmployee.avatar_url,
        })
        .eq('id', updatedEmployee.id!)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      showSuccess("Funcionário atualizado com sucesso!");
    },
    onError: (error) => {
      showError("Erro ao atualizar funcionário: " + error.message);
      console.error("Error updating employee:", error);
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase.from('profiles').delete().eq('id', employeeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['allTasksForEmployees'] }); // Invalidate tasks as well
      showSuccess("Funcionário excluído com sucesso!");
    },
    onError: (error) => {
      showError("Erro ao excluir funcionário: " + error.message);
      console.error("Error deleting employee:", error);
    },
  });

  const handleInviteSuccess = () => {
    setIsFormOpen(false);
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  };

  const handleEditEmployee = (employee: Profile) => {
    showError("A funcionalidade de edição ainda precisa ser implementada em um formulário separado.");
    // setEditingEmployee(employee);
    // setIsFormOpen(true);
  };

  const handleDeleteEmployee = (employeeId: string) => {
    setEmployeeToDeleteId(employeeId);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (employeeToDeleteId) {
      deleteEmployeeMutation.mutate(employeeToDeleteId);
      setEmployeeToDeleteId(null);
      setIsConfirmDeleteOpen(false);
    }
  };

  const getEmployeeMetrics = (employeeId: string) => {
    const employeeTasks = allTasks?.filter(task => task.assigned_to === employeeId) || [];
    const completedTasks = employeeTasks.filter(task => task.status === 'completed').length;
    const delayedTasks = employeeTasks.filter(task => task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed' && task.status !== 'cancelled').length;
    const estimatedHours = employeeTasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
    return { completedTasks, delayedTasks, estimatedHours };
  };

  if (isLoadingCurrentUserProfile || isLoadingEmployees || isLoadingAllTasks) {
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
    <motion.div
      className="p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Equipe do Instituto Joule</h2>
          <p className="text-gray-500">Gerencie e visualize informações da sua equipe</p>
        </div>
        
        {currentUserProfile?.role === 'manager' && (
          <motion.button
            onClick={() => { setEditingEmployee(null); setIsFormOpen(true); }}
            className="bg-orange-500 text-white px-6 py-2 rounded-xl hover:bg-orange-600 transition-colors shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <UserPlus className="inline mr-2" size={18} />
            Adicionar Membro
          </motion.button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees && employees.length > 0 ? (
          employees.map((employee, index) => {
            const metrics = getEmployeeMetrics(employee.id);
            return (
              <TeamMemberCard
                key={employee.id}
                member={employee}
                index={index}
                onClick={() => navigate(`/employees/${employee.id}`)}
                completedTasks={metrics.completedTasks}
                delayedTasks={metrics.delayedTasks}
                estimatedHours={metrics.estimatedHours}
              />
            );
          })
        ) : (
          <p className="text-muted-foreground text-center col-span-full">Nenhum funcionário encontrado.</p>
        )}
      </div>

      <EmployeeFormDialog
        isOpen={isFormOpen && !editingEmployee}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleInviteSuccess}
        initialData={null}
      />

      {/* Confirm Delete Dialog */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza de que deseja excluir este funcionário? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default EmployeesPage;
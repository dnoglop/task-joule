import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, UserPlus, Edit, Eye, Trash2 } from 'lucide-react';
import { Profile } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/contexts/SessionContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import EmployeeFormDialog from '@/components/EmployeeFormDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

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
        .order('created_at', { ascending: false }); // Ordena os mais novos primeiro
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

  // --- REMOVIDO ---
  // A mutação para convidar um funcionário foi movida para dentro do EmployeeFormDialog.
  // Esta lógica não é mais necessária aqui.
  /*
  const inviteEmployeeMutation = useMutation({
    mutationFn: async (newEmployee: Partial<Profile>) => { ... },
    ...
  });
  */

  const updateEmployeeMutation = useMutation({
    mutationFn: async (updatedEmployee: Partial<Profile>) => {
      // A lógica de atualização permanece aqui, pois o diálogo de formulário foi
      // especializado para apenas ADICIONAR novos funcionários via Edge Function.
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
      showSuccess("Funcionário excluído com sucesso!");
    },
    onError: (error) => {
      showError("Erro ao excluir funcionário: " + error.message);
      console.error("Error deleting employee:", error);
    },
  });
  
  // --- REMOVIDO ---
  // Esta função não é mais necessária, pois o Dialog cuida de si mesmo.
  // const handleAddEmployee = (employee: Partial<Profile>) => {
  //   inviteEmployeeMutation.mutate(employee);
  // };
  
  // --- ADICIONADO ---
  // Esta é a função que será passada para a prop `onSuccess` do Dialog.
  // Ela será executada QUANDO o convite for um sucesso.
  const handleInviteSuccess = () => {
    setIsFormOpen(false); // Fecha o modal
    queryClient.invalidateQueries({ queryKey: ['employees'] }); // Invalida o cache para recarregar a lista
  };

  const handleEditEmployee = (employee: Profile) => {
    // AVISO: O seu EmployeeFormDialog foi otimizado para CRIAR funcionários.
    // Usá-lo para editar exigiria uma lógica diferente (sem chamada à Edge Function).
    // Por enquanto, esta função abrirá o diálogo, mas a submissão de edição precisa ser tratada.
    showError("A funcionalidade de edição ainda precisa ser implementada em um formulário separado.");
    // setEditingEmployee(employee);
    // setIsFormOpen(true);
  };

  const handleUpdateEmployee = (employee: Partial<Profile>) => {
    updateEmployeeMutation.mutate(employee);
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

  if (isLoadingCurrentUserProfile || isLoadingEmployees) {
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestão de Funcionários</h1>
        {currentUserProfile?.role === 'manager' && (
          <Button onClick={() => { setEditingEmployee(null); setIsFormOpen(true); }}>
            <UserPlus className="mr-2 h-4 w-4" /> Adicionar Funcionário
          </Button>
        )}
      </div>
      <p className="text-gray-700 dark:text-gray-300 mb-8">
        Visualize e gerencie as informações dos funcionários e suas métricas de desempenho.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Funcionários</CardTitle>
        </CardHeader>
        <CardContent>
          {employees && employees.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{employee.area || 'N/A'}</TableCell>
                    <TableCell>{employee.role === 'manager' ? 'Gestor' : 'Funcionário'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/employees/${employee.id}`)}
                          title="Ver Detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditEmployee(employee)}
                          title="Editar Funcionário"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteEmployee(employee.id)}
                          title="Excluir Funcionário"
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
            <p className="text-muted-foreground text-center">Nenhum funcionário encontrado.</p>
          )}
        </CardContent>
      </Card>

      {/* --- MODIFICADO ---
          A chamada ao diálogo agora usa a prop `onSuccess` em vez de `onSubmit`.
          A prop `initialData` foi removida, pois este formulário é sempre para adicionar.
          A prop `isOpen` agora só é verdadeira se não estivermos no modo de edição.
      */}
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
    </div>
  );
};

export default EmployeesPage;
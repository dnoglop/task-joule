import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Loader2, User } from 'lucide-react';
import { Profile, Task } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/contexts/SessionContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const EmployeesPage: React.FC = () => {
  const { session } = useSession();
  const navigate = useNavigate();
  const userId = session?.user?.id;

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
      if (currentUserProfile?.role !== 'manager') return []; // Only managers can see all employees
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      if (error) throw error;
      return data;
    },
    enabled: currentUserProfile?.role === 'manager', // Only enable if current user is manager
  });

  if (currentUserProfileError) {
    showError("Erro ao carregar perfil do usuário atual: " + currentUserProfileError.message);
    console.error("Error fetching current user profile:", currentUserProfileError);
  }

  if (employeesError) {
    showError("Erro ao carregar funcionários: " + employeesError.message);
    console.error("Error fetching employees:", employeesError);
  }

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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Gestão de Funcionários</h1>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/employees/${employee.id}`)}
                      >
                        Ver Detalhes
                      </Button>
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
    </div>
  );
};

export default EmployeesPage;
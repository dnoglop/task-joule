import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/contexts/SessionContext';
import { Profile, Program, Task, TaskStatus } from '@/types/supabase';
import { useCSVReader } from 'react-papaparse';

const UploadPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const currentUserId = session?.user?.id;
  const { CSVReader } = useCSVReader();

  const [csvData, setCsvData] = React.useState<any[]>([]);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

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

  // Fetch all profiles for assigned_to lookup
  const { data: profiles, isLoading: isLoadingProfiles, error: profilesError } = useQuery<Profile[]>({
    queryKey: ['allProfiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, email, name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch all programs for program_id lookup
  const { data: programs, isLoading: isLoadingPrograms, error: programsError } = useQuery<Program[]>({
    queryKey: ['allPrograms'],
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
  if (profilesError) {
    showError("Erro ao carregar perfis de funcionários: " + profilesError.message);
    console.error("Error fetching profiles:", profilesError);
  }
  if (programsError) {
    showError("Erro ao carregar programas: " + programsError.message);
    console.error("Error fetching programs:", programsError);
  }

  const insertTasksMutation = useMutation({
    mutationFn: async (tasksToInsert: Partial<Task>[]) => {
      if (tasksToInsert.length === 0) {
        throw new Error("Nenhuma tarefa válida para inserir.");
      }
      const { error } = await supabase.from('tasks').insert(tasksToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showSuccess("Tarefas importadas com sucesso!");
      setCsvData([]);
      setFileName(null);
    },
    onError: (error) => {
      showError("Erro ao importar tarefas: " + error.message);
      console.error("Error inserting tasks:", error);
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const handleUploadCSV = async () => {
    if (csvData.length === 0) {
      showError("Por favor, selecione um arquivo CSV para upload.");
      return;
    }
    if (!currentUserProfile || currentUserProfile.role !== 'manager') {
      showError("Você não tem permissão para importar tarefas.");
      return;
    }

    setIsUploading(true);
    const profileMap = new Map(profiles?.map(p => [p.email, p.id]));
    const programMap = new Map(programs?.map(p => [p.name, p.id]));
    const validStatuses: TaskStatus[] = ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'];

    const tasksToInsert: Partial<Task>[] = [];
    let skippedRows = 0;

    csvData.forEach((row, index) => {
      // Skip header row if present and not already handled by PapaParse
      if (index === 0 && row.task_name === 'task_name') return;

      const taskName = row.task_name;
      const programName = row.program_name;
      const assignedToEmail = row.assigned_to_email;
      const dueDateStr = row.due_date;
      const statusStr = row.status;

      if (!taskName || !programName) {
        console.warn(`Linha ${index + 1}: 'task_name' ou 'program_name' ausente. Linha ignorada.`);
        skippedRows++;
        return;
      }

      const programId = programMap.get(programName);
      if (!programId) {
        console.warn(`Linha ${index + 1}: Programa '${programName}' não encontrado. Linha ignorada.`);
        skippedRows++;
        return;
      }

      const assignedToId = assignedToEmail ? profileMap.get(assignedToEmail) : undefined;
      if (assignedToEmail && !assignedToId) {
        console.warn(`Linha ${index + 1}: Email do funcionário '${assignedToEmail}' não encontrado. Tarefa será atribuída como N/A.`);
      }

      let parsedDueDate: string | undefined = undefined;
      if (dueDateStr) {
        try {
          const date = new Date(dueDateStr);
          if (!isNaN(date.getTime())) {
            parsedDueDate = date.toISOString();
          } else {
            console.warn(`Linha ${index + 1}: Formato de data inválido para '${dueDateStr}'. Prazo ignorado.`);
          }
        } catch (e) {
          console.warn(`Linha ${index + 1}: Erro ao parsear data '${dueDateStr}'. Prazo ignorado.`, e);
        }
      }

      const taskStatus: TaskStatus = validStatuses.includes(statusStr as TaskStatus) ? statusStr as TaskStatus : 'pending';
      if (!validStatuses.includes(statusStr as TaskStatus)) {
        console.warn(`Linha ${index + 1}: Status inválido '${statusStr}'. Usando 'pending'.`);
      }

      tasksToInsert.push({
        task_name: taskName,
        program_id: programId,
        program_name: programName,
        description: row.description,
        estimated_hours: row.estimated_hours ? parseFloat(row.estimated_hours) : undefined,
        assigned_to: assignedToId,
        due_date: parsedDueDate,
        status: taskStatus,
        current_phase: row.current_phase,
        observations: row.observations,
        comments: row.comments,
        created_by: currentUserProfile.id,
      });
    });

    if (tasksToInsert.length > 0) {
      insertTasksMutation.mutate(tasksToInsert);
    } else {
      showError("Nenhuma tarefa válida encontrada no CSV para importação.");
      setIsUploading(false);
    }
    if (skippedRows > 0) {
      showError(`${skippedRows} linha(s) foram ignoradas devido a dados inválidos ou ausentes. Verifique o console para detalhes.`);
    }
  };

  if (isLoadingCurrentUserProfile || isLoadingProfiles || isLoadingPrograms) {
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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Upload de Tarefas (CSV)</h1>
      <p className="text-gray-700 dark:text-gray-300 mb-8">
        Aqui você pode fazer o upload de um arquivo CSV para importar múltiplas tarefas para o sistema.
        Certifique-se de que o CSV contenha as colunas: `task_name`, `program_name`, `description`, `estimated_hours`, `assigned_to_email`, `due_date`, `status`, `current_phase`, `observations`, `comments`.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Importar Tarefas via CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CSVReader
            onUploadAccepted={(results: any) => {
              setCsvData(results.data);
              setFileName(results.file.name);
              showSuccess(`Arquivo '${results.file.name}' carregado com ${results.data.length} linhas.`);
            }}
            config={{
              header: true, // Assumes the first row is the header
              skipEmptyLines: true,
            }}
          >
            {({ getUploadFileProps }) => (
              <Button
                type="button"
                onClick={getUploadFileProps().onClick}
                className="w-full"
                variant="outline"
              >
                <UploadCloud className="mr-2 h-4 w-4" />
                {fileName ? `Arquivo Selecionado: ${fileName}` : 'Clique para selecionar CSV'}
              </Button>
            )}
          </CSVReader>
          {csvData.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {csvData.length} linhas lidas do CSV.
            </div>
          )}
          <Button
            onClick={handleUploadCSV}
            disabled={csvData.length === 0 || isUploading}
            className="w-full"
          >
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? 'Importando...' : 'Importar Tarefas'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadPage;
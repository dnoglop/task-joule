import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Plus, Filter, Download, ArrowLeft, RefreshCw, FileText, CheckSquare as CheckSquareIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TaskFormDialog from '@/components/TaskFormDialog';
import { Task, Profile, Program, TaskStatus } from '@/types/supabase';
import { useSession } from '@/contexts/SessionContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useCSVReader } from 'react-papaparse';
import TaskItemCard from '@/components/ui/TaskItemCard'; // Using the new TaskItemCard
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusColors: Record<TaskStatus, string> = {
  'pending': 'bg-gray-50 text-gray-600',
  'in_progress': 'bg-blue-50 text-blue-600',
  'completed': 'bg-green-50 text-green-600',
  'on_hold': 'bg-yellow-50 text-yellow-600',
  'cancelled': 'bg-red-50 text-red-600',
};

const statusLabels: Record<TaskStatus, string> = {
  'pending': 'Pendente',
  'in_progress': 'Em Progresso',
  'completed': 'Concluída',
  'on_hold': 'Em Espera',
  'cancelled': 'Cancelada',
};

const TasksPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const currentUserId = session?.user?.id;
  const { CSVReader } = useCSVReader();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = React.useState(false);
  const [viewingTask, setViewingTask] = React.useState<Task | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = React.useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = React.useState<string | null>(null);

  const [showUpload, setShowUpload] = React.useState(false);
  const [csvData, setCsvData] = React.useState<any[]>([]);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [dragActive, setDragActive] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadStatus, setUploadStatus] = React.useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

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

  // Fetch employees for assignment and display
  const { data: employees, isLoading: isLoadingEmployees, error: employeesError } = useQuery<Profile[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, name, email');
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

  // CSV Upload Logic
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        // Use PapaParse to read the file
        const reader = new FileReader();
        reader.onload = (event) => {
          const csvString = event.target?.result as string;
          CSVReader({
            onUploadAccepted: (results: any) => {
              setCsvData(results.data);
              setFileName(file.name);
              showSuccess(`Arquivo '${file.name}' carregado com ${results.data.length} linhas de dados.`);
              simulateUpload(); // Start simulated upload progress
            },
            config: {
              header: true,
              skipEmptyLines: true,
            }
          }).readString(csvString);
        };
        reader.readAsText(file);
      } else {
        showError("Por favor, selecione um arquivo CSV válido.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const csvString = event.target?.result as string;
          CSVReader({
            onUploadAccepted: (results: any) => {
              setCsvData(results.data);
              setFileName(file.name);
              showSuccess(`Arquivo '${file.name}' carregado com ${results.data.length} linhas de dados.`);
              simulateUpload(); // Start simulated upload progress
            },
            config: {
              header: true,
              skipEmptyLines: true,
            }
          }).readString(csvString);
        };
        reader.readAsText(file);
      } else {
        showError("Por favor, selecione um arquivo CSV válido.");
      }
    }
  };

  const simulateUpload = () => {
    setUploadStatus('uploading');
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadStatus('success');
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const resetUpload = () => {
    setCsvData([]);
    setFileName(null);
    setUploadProgress(0);
    setUploadStatus('idle');
  };

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
    const profileMap = new Map(employees?.map(p => [p.email, p.id]));
    const programMap = new Map(programs?.map(p => [p.name, p.id]));
    const validStatuses: TaskStatus[] = ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'];

    const tasksToInsert: Partial<Task>[] = [];
    let skippedRows = 0;

    csvData.forEach((row, index) => {
      const taskName = row.task_name;
      const programName = row.program_name;
      const assignedToEmail = row.assigned_to_email;
      const dueDateStr = row.due_date;
      const statusStr = row.status;

      if (!taskName || !programName) {
        console.warn(`Linha de dados ${index + 1}: 'task_name' ou 'program_name' ausente. Linha ignorada.`);
        skippedRows++;
        return;
      }

      const programId = programMap.get(programName);
      if (!programId) {
        console.warn(`Linha de dados ${index + 1}: Programa '${programName}' não encontrado. Linha ignorada.`);
        skippedRows++;
        return;
      }

      const assignedToId = assignedToEmail ? profileMap.get(assignedToEmail) : undefined;
      if (assignedToEmail && !assignedToId) {
        console.warn(`Linha de dados ${index + 1}: Email do funcionário '${assignedToEmail}' não encontrado. Tarefa será atribuída como N/A.`);
      }

      let parsedDueDate: string | undefined = undefined;
      if (dueDateStr) {
        try {
          const date = new Date(dueDateStr);
          if (!isNaN(date.getTime())) {
            parsedDueDate = date.toISOString();
          } else {
            console.warn(`Linha de dados ${index + 1}: Formato de data inválido para '${dueDateStr}'. Prazo ignorado.`);
          }
        } catch (e) {
          console.warn(`Linha de dados ${index + 1}: Erro ao parsear data '${dueDateStr}'. Prazo ignorado.`, e);
        }
      }

      const taskStatus: TaskStatus = validStatuses.includes(statusStr as TaskStatus) ? statusStr as TaskStatus : 'pending';
      if (statusStr && !validStatuses.includes(statusStr as TaskStatus)) {
        console.warn(`Linha de dados ${index + 1}: Status inválido '${statusStr}'. Usando 'pending'.`);
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

  const tasksByStatus: Record<TaskStatus, Task[]> = {
    'pending': [],
    'in_progress': [],
    'completed': [],
    'on_hold': [],
    'cancelled': [],
  };

  tasks?.forEach(task => {
    if (tasksByStatus[task.status]) {
      tasksByStatus[task.status].push(task);
    }
  });

  const renderKanbanBoard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Object.entries(tasksByStatus).map(([status, tasksInColumn], statusIndex) => (
        <motion.div
          key={status}
          className="bg-white rounded-2xl p-6 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: statusIndex * 0.1, duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">{statusLabels[status as TaskStatus]}</h3>
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
              {tasksInColumn.length}
            </span>
          </div>
          
          <div className="space-y-3 min-h-[100px]"> {/* Added min-h for visual consistency */}
            {tasksInColumn.length > 0 ? (
              tasksInColumn.map((task, index) => (
                <TaskItemCard
                  key={task.id}
                  task={task}
                  assigneeName={employees?.find(emp => emp.id === task.assigned_to)?.name || 'N/A'}
                  index={index}
                  onClick={handleViewTask}
                />
              ))
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">Nenhuma tarefa neste status.</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderUploadSection = () => (
    <motion.div
      className="p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center mb-6">
        <motion.button
          onClick={() => setShowUpload(false)}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors mr-4"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </motion.button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Upload de Tarefas (CSV)</h2>
          <p className="text-gray-500">Importe múltiplas tarefas para o sistema através de um arquivo CSV</p>
        </div>
      </div>

      {/* Instruções do CSV */}
      <motion.div
        className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        <div className="flex items-start">
          <div className="p-2 bg-blue-100 rounded-lg mr-4">
            <FileText className="text-blue-600" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-blue-800 mb-2">Formato do arquivo CSV</h3>
            <p className="text-blue-700 mb-3">
              Certifique-se de que o CSV contenha as colunas: `task_name`, `program_name`, `description`, `estimated_hours`, `assigned_to_email`, `due_date`, `status`, `current_phase`, `observations`, `comments`.
            </p>
            <div className="bg-white rounded-lg p-3 font-mono text-sm text-gray-700 border">
              task_name,program_name,description,estimated_hours,assigned_to_email,due_date,status,current_phase,observations,comments
            </div>
          </div>
        </div>
      </motion.div>

      {/* Área de Upload */}
      <motion.div
        className="bg-white rounded-2xl shadow-lg overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Importar Tarefas via CSV</h3>
          
          {uploadStatus === 'idle' ? (
            <div
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                dragActive 
                  ? 'border-orange-400 bg-orange-50' 
                  : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <motion.div
                className="flex flex-col items-center"
                whileHover={{ scale: 1.02 }}
              >
                <div className="p-4 bg-orange-100 rounded-full mb-4">
                  <Download className="text-orange-600" size={32} />
                </div>
                <h4 className="text-xl font-bold text-gray-800 mb-2">
                  Arraste e solte seu arquivo CSV aqui
                </h4>
                <p className="text-gray-500 mb-4">
                  ou clique para selecionar um arquivo
                </p>
                
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload">
                  <motion.div
                    className="bg-orange-500 text-white px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors cursor-pointer shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Selecionar Arquivo CSV
                  </motion.div>
                </label>
                
                <p className="text-sm text-gray-400 mt-4">
                  Formato suportado: .csv (máximo 10MB)
                </p>
              </motion.div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Informações do Arquivo */}
              <motion.div
                className="bg-gray-50 rounded-xl p-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg mr-3">
                      <FileText className="text-orange-600" size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">{fileName}</h4>
                      <p className="text-sm text-gray-500">
                        {(csvData.length * 100 / 1024).toFixed(1)} KB {/* Placeholder size */}
                      </p>
                    </div>
                  </div>
                  
                  {uploadStatus !== 'uploading' && (
                    <button
                      onClick={resetUpload}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <RefreshCw size={18} />
                    </button>
                  )}
                </div>
              </motion.div>

              {/* Barra de Progresso */}
              {uploadStatus === 'uploading' && (
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Processando arquivo...</span>
                    <span className="text-sm font-bold text-orange-600">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <motion.div 
                      className="bg-gradient-to-r from-orange-400 to-orange-600 h-3 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </motion.div>
              )}

              {/* Status de Sucesso */}
              {uploadStatus === 'success' && (
                <motion.div
                  className="bg-green-50 border border-green-200 rounded-xl p-6"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-green-100 rounded-lg mr-3">
                      <CheckSquareIcon className="text-green-600" size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-green-800">Upload concluído com sucesso!</h4>
                      <p className="text-green-700 text-sm">Todas as tarefas foram importadas e estão prontas para uso.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{csvData.length}</p>
                      <p className="text-sm text-gray-600">Tarefas Importadas</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{new Set(csvData.map(row => row.program_name)).size}</p>
                      <p className="text-sm text-gray-600">Programas Afetados</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">
                        {csvData.reduce((sum, row) => sum + (parseFloat(row.estimated_hours) || 0), 0).toFixed(0)}h
                      </p>
                      <p className="text-sm text-gray-600">Horas Estimadas</p>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <motion.button
                      className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl hover:bg-green-700 transition-colors font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowUpload(false)}
                    >
                      Ver Tarefas Importadas
                    </motion.button>
                    <motion.button
                      className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={resetUpload}
                    >
                      Importar Novo Arquivo
                    </motion.button>
                  </div>
                </motion.div>
              )}
              {uploadStatus === 'error' && (
                <motion.div
                  className="bg-red-50 border border-red-200 rounded-xl p-6"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-red-100 rounded-lg mr-3">
                      <FileText className="text-red-600" size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-800">Erro no Upload!</h4>
                      <p className="text-red-700 text-sm">Ocorreu um erro ao importar as tarefas. Verifique o console para mais detalhes.</p>
                    </div>
                  </div>
                  <Button onClick={resetUpload} variant="outline">Tentar Novamente</Button>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Exemplo de Template */}
      <motion.div
        className="bg-white rounded-2xl shadow-lg p-6 mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Template de Exemplo</h3>
          <motion.button
            className="text-orange-600 hover:text-orange-700 font-medium flex items-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download className="mr-2" size={18} />
            Baixar Template
          </motion.button>
        </div>
        
        <div className="bg-gray-50 rounded-xl p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-700">task_name</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">program_name</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">description</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">estimated_hours</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">assigned_to_email</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3 text-gray-600">Análise de consumo</td>
                <td className="py-2 px-3 text-gray-600">Energia Solar</td>
                <td className="py-2 px-3 text-gray-600">Análise detalhada do consumo energético</td>
                <td className="py-2 px-3 text-gray-600">8</td>
                <td className="py-2 px-3 text-gray-600">ana@joule.org</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-gray-600">Instalação de painéis</td>
                <td className="py-2 px-3 text-gray-600">Energia Solar</td>
                <td className="py-2 px-3 text-gray-600">Instalação física dos painéis solares</td>
                <td className="py-2 px-3 text-gray-600">16</td>
                <td className="py-2 px-3 text-gray-600">joao@joule.org</td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="p-6">
      <AnimatePresence mode="wait">
        {showUpload ? (
          renderUploadSection()
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Filter className="text-gray-500" size={20} />
                <Select defaultValue="all">
                  <SelectTrigger className="w-[180px] rounded-xl">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as tarefas</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="in_progress">Em Progresso</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="on_hold">Em Espera</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex space-x-3">
                {currentUserProfile?.role === 'manager' && (
                  <motion.button
                    onClick={() => setShowUpload(true)}
                    className="bg-blue-500 text-white px-6 py-2 rounded-xl hover:bg-blue-600 transition-colors shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Download className="inline mr-2" size={18} />
                    Importar CSV
                  </motion.button>
                )}
                
                <motion.button
                  onClick={() => { setEditingTask(null); setIsFormOpen(true); }}
                  className="bg-orange-500 text-white px-6 py-2 rounded-xl hover:bg-orange-600 transition-colors shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus className="inline mr-2" size={18} />
                  Nova Tarefa
                </motion.button>
              </div>
            </div>

            {renderKanbanBoard()}
          </motion.div>
        )}
      </AnimatePresence>

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
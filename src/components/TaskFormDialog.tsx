import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Task, Profile, Program, TaskStatus } from '@/types/supabase';

interface TaskFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Partial<Task>) => void;
  initialData?: Task | null;
  employees: Profile[];
  programs: Program[];
}

const taskFormSchema = z.object({
  task_name: z.string().min(1, { message: "Nome da tarefa é obrigatório." }),
  program_id: z.string().optional(),
  program_name: z.string().min(1, { message: "Nome do programa é obrigatório." }),
  description: z.string().optional(),
  estimated_hours: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0, { message: "Horas estimadas devem ser um número positivo." }).optional()
  ),
  assigned_to: z.string().optional(),
  due_date: z.date().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'on_hold', 'cancelled']).default('pending'),
  current_phase: z.string().optional(),
  observations: z.string().optional(),
  comments: z.string().optional(),
});

const TaskFormDialog: React.FC<TaskFormDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  employees,
  programs,
}) => {
  const form = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      task_name: initialData?.task_name || '',
      program_id: initialData?.program_id || '',
      program_name: initialData?.program_name || '',
      description: initialData?.description || '',
      estimated_hours: initialData?.estimated_hours || undefined,
      assigned_to: initialData?.assigned_to || '',
      due_date: initialData?.due_date ? new Date(initialData.due_date) : undefined,
      status: initialData?.status || 'pending',
      current_phase: initialData?.current_phase || '',
      observations: initialData?.observations || '',
      comments: initialData?.comments || '',
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        task_name: initialData.task_name,
        program_id: initialData.program_id || '',
        program_name: initialData.program_name,
        description: initialData.description || '',
        estimated_hours: initialData.estimated_hours || undefined,
        assigned_to: initialData.assigned_to || '',
        due_date: initialData.due_date ? new Date(initialData.due_date) : undefined,
        status: initialData.status,
        current_phase: initialData.current_phase || '',
        observations: initialData.observations || '',
        comments: initialData.comments || '',
      });
    } else {
      form.reset({
        task_name: '',
        program_id: '',
        program_name: '',
        description: '',
        estimated_hours: undefined,
        assigned_to: '',
        due_date: undefined,
        status: 'pending',
        current_phase: '',
        observations: '',
        comments: '',
      });
    }
  }, [initialData, form]);

  const handleSubmit = (values: z.infer<typeof taskFormSchema>) => {
    onSubmit({
      ...values,
      id: initialData?.id, // Include ID if editing
      due_date: values.due_date ? values.due_date.toISOString() : undefined,
    });
    onClose();
  };

  const statusOptions: { value: TaskStatus; label: string }[] = [
    { value: 'pending', label: 'Pendente' },
    { value: 'in_progress', label: 'Em Progresso' },
    { value: 'completed', label: 'Concluída' },
    { value: 'on_hold', label: 'Em Espera' },
    { value: 'cancelled', label: 'Cancelada' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Tarefa' : 'Criar Nova Tarefa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="task_name" className="text-right">
              Nome da Tarefa
            </Label>
            <Input
              id="task_name"
              {...form.register('task_name')}
              className="col-span-3"
            />
            {form.formState.errors.task_name && (
              <p className="col-span-4 text-right text-sm text-red-500">
                {form.formState.errors.task_name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="program_name" className="text-right">
              Programa
            </Label>
            <Select
              onValueChange={(value) => {
                form.setValue('program_id', value);
                const selectedProgram = programs.find(p => p.id === value);
                form.setValue('program_name', selectedProgram?.name || '');
              }}
              value={form.watch('program_id')}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione um programa" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.program_name && (
              <p className="col-span-4 text-right text-sm text-red-500">
                {form.formState.errors.program_name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Descrição
            </Label>
            <Textarea
              id="description"
              {...form.register('description')}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="estimated_hours" className="text-right">
              Horas Estimadas
            </Label>
            <Input
              id="estimated_hours"
              type="number"
              {...form.register('estimated_hours')}
              className="col-span-3"
            />
            {form.formState.errors.estimated_hours && (
              <p className="col-span-4 text-right text-sm text-red-500">
                {form.formState.errors.estimated_hours.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assigned_to" className="text-right">
              Atribuído a
            </Label>
            <Select
              onValueChange={(value) => form.setValue('assigned_to', value)}
              value={form.watch('assigned_to')}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione um funcionário" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="due_date" className="text-right">
              Prazo
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !form.watch('due_date') && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.watch('due_date') ? (
                    format(form.watch('due_date'), "PPP")
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={form.watch('due_date')}
                  onSelect={(date) => form.setValue('due_date', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select
              onValueChange={(value: TaskStatus) => form.setValue('status', value)}
              value={form.watch('status')}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="current_phase" className="text-right">
              Fase Atual
            </Label>
            <Input
              id="current_phase"
              {...form.register('current_phase')}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="observations" className="text-right">
              Observações
            </Label>
            <Textarea
              id="observations"
              {...form.register('observations')}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="comments" className="text-right">
              Comentários
            </Label>
            <Textarea
              id="comments"
              {...form.register('comments')}
              className="col-span-3"
            />
          </div>

          <DialogFooter>
            <Button type="submit">{initialData ? 'Salvar Alterações' : 'Criar Tarefa'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskFormDialog;
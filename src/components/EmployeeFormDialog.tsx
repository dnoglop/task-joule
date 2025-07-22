import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Profile, UserRole } from '@/types/supabase';

interface EmployeeFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employee: Partial<Profile>) => void;
  initialData?: Profile | null;
}

const employeeFormSchema = z.object({
  name: z.string().min(1, { message: "Nome é obrigatório." }),
  email: z.string().email({ message: "E-mail inválido." }),
  area: z.string().optional(),
  role: z.enum(['employee', 'manager']).default('employee'),
  avatar_url: z.string().url({ message: "URL do avatar inválida." }).optional().or(z.literal('')),
});

const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const form = useForm<z.infer<typeof employeeFormSchema>>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      area: initialData?.area || '',
      role: initialData?.role || 'employee',
      avatar_url: initialData?.avatar_url || '',
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        email: initialData.email,
        area: initialData.area || '',
        role: initialData.role,
        avatar_url: initialData.avatar_url || '',
      });
    } else {
      form.reset({
        name: '',
        email: '',
        area: '',
        role: 'employee',
        avatar_url: '',
      });
    }
  }, [initialData, form]);

  const handleSubmit = (values: z.infer<typeof employeeFormSchema>) => {
    onSubmit({
      ...values,
      id: initialData?.id, // Include ID if editing
      user_id: initialData?.user_id, // Include user_id if editing
    });
    onClose();
  };

  const roleOptions: { value: UserRole; label: string }[] = [
    { value: 'employee', label: 'Funcionário' },
    { value: 'manager', label: 'Gestor' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Funcionário' : 'Adicionar Novo Funcionário'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nome
            </Label>
            <Input
              id="name"
              {...form.register('name')}
              className="col-span-3"
            />
            {form.formState.errors.name && (
              <p className="col-span-4 text-right text-sm text-red-500">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            {/* Disable email editing for existing users */}
            <Input
              id="email"
              type="email"
              {...form.register('email')}
              className="col-span-3"
              disabled={!!initialData} 
            />
            {form.formState.errors.email && (
              <p className="col-span-4 text-right text-sm text-red-500">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="area" className="text-right">
              Área
            </Label>
            <Input
              id="area"
              {...form.register('area')}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Função
            </Label>
            <Select
              onValueChange={(value: UserRole) => form.setValue('role', value)}
              value={form.watch('role')}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="avatar_url" className="text-right">
              URL do Avatar
            </Label>
            <Input
              id="avatar_url"
              type="url"
              {...form.register('avatar_url')}
              className="col-span-3"
              placeholder="https://example.com/avatar.jpg"
            />
            {form.formState.errors.avatar_url && (
              <p className="col-span-4 text-right text-sm text-red-500">
                {form.formState.errors.avatar_url.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit">{initialData ? 'Salvar Alterações' : 'Adicionar Funcionário'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeFormDialog;
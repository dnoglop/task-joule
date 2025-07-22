import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Program } from '@/types/supabase';

interface ProgramFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (program: Partial<Program>) => void;
  initialData?: Program | null;
}

const programFormSchema = z.object({
  name: z.string().min(1, { message: "Nome do programa é obrigatório." }),
  description: z.string().optional(),
});

const ProgramFormDialog: React.FC<ProgramFormDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const form = useForm<z.infer<typeof programFormSchema>>({
    resolver: zodResolver(programFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        description: initialData.description || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
      });
    }
  }, [initialData, form, isOpen]);

  const handleSubmit = (values: z.infer<typeof programFormSchema>) => {
    onSubmit({
      ...values,
      id: initialData?.id, // Include ID if editing
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Programa' : 'Criar Novo Programa'}</DialogTitle>
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
            <Label htmlFor="description" className="text-right">
              Descrição
            </Label>
            <Textarea
              id="description"
              {...form.register('description')}
              className="col-span-3"
            />
          </div>
          <DialogFooter>
            <Button type="submit">{initialData ? 'Salvar Alterações' : 'Criar Programa'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProgramFormDialog;
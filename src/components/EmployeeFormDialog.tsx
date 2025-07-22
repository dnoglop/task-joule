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
import { supabase } from '@/integrations/supabase/client';
import { showError, showLoading, dismissToast } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

interface EmployeeFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employee: Partial<Profile>) => void;
  initialData?: Profile | null;
}

const employeeFormSchema = z.object({
  name: z.string().min(1, { message: "Nome é obrigatório." }),
  email: z.string().email({ message: "E-mail inválido." }),
  area: z.string().optional().transform(e => e === "" ? undefined : e),
  role: z.enum(['employee', 'manager']).default('employee'),
  // avatar_url agora pode ser uma string (URL existente) ou um File (novo upload)
  avatar_url: z.union([z.literal(''), z.string().url({ message: "URL do avatar inválida." }), z.instanceof(File)]).optional().transform(e => e === "" ? undefined : e),
});

const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

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
      setAvatarPreview(initialData.avatar_url || null);
      setSelectedFile(null); // Clear selected file on initial data load
    } else {
      form.reset({
        name: '',
        email: '',
        area: '',
        role: 'employee',
        avatar_url: '',
      });
      setAvatarPreview(null);
      setSelectedFile(null);
    }
  }, [initialData, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      form.setValue('avatar_url', file); // Set the file object to the form value
    } else {
      setSelectedFile(null);
      setAvatarPreview(initialData?.avatar_url || null); // Revert to initial or null
      form.setValue('avatar_url', initialData?.avatar_url || ''); // Revert form value
    }
  };

  const handleSubmit = async (values: z.infer<typeof employeeFormSchema>) => {
    let finalAvatarUrl: string | undefined = undefined;
    let loadingToastId: string | undefined;

    try {
      if (selectedFile) {
        setIsUploading(true);
        loadingToastId = showLoading("Fazendo upload da imagem...");
        const fileExtension = selectedFile.name.split('.').pop();
        const fileName = `${initialData?.id || crypto.randomUUID()}.${fileExtension}`;
        const filePath = `avatars/${fileName}`;

        const { data, error } = await supabase.storage
          .from('avatars') // Assuming a bucket named 'avatars'
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (error) {
          throw new Error("Erro ao fazer upload da imagem: " + error.message);
        }
        finalAvatarUrl = supabase.storage.from('avatars').getPublicUrl(filePath).data.publicUrl;
      } else if (initialData?.avatar_url && !form.formState.dirtyFields.avatar_url) {
        // If no new file selected and avatar_url wasn't explicitly cleared, keep existing
        finalAvatarUrl = initialData.avatar_url;
      }
      // If selectedFile is null and initialData.avatar_url is null/undefined, finalAvatarUrl remains undefined

      onSubmit({
        ...values,
        id: initialData?.id,
        user_id: initialData?.user_id,
        avatar_url: finalAvatarUrl, // Pass the uploaded URL or existing URL
      });
      onClose();
    } catch (error: any) {
      showError(error.message);
      console.error("Submission error:", error);
    } finally {
      setIsUploading(false);
      if (loadingToastId) {
        dismissToast(loadingToastId);
      }
    }
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
            {/* Desabilita edição de email para usuários existentes */}
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
            <Label htmlFor="avatar_file" className="text-right">
              Foto do Avatar
            </Label>
            <Input
              id="avatar_file"
              type="file"
              accept="image/png, image/jpeg"
              onChange={handleFileChange}
              className="col-span-3"
            />
            {avatarPreview && (
              <div className="col-span-4 flex justify-end">
                <img src={avatarPreview} alt="Avatar Preview" className="w-24 h-24 rounded-full object-cover mt-2" />
              </div>
            )}
            {form.formState.errors.avatar_url && (
              <p className="col-span-4 text-right text-sm text-red-500">
                {form.formState.errors.avatar_url.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isUploading}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? 'Salvar Alterações' : 'Adicionar Funcionário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeFormDialog;
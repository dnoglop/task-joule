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
import { showError, showLoading, dismissToast, showSuccess } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

// A função que chama a Edge Function foi movida para dentro do componente.
// A prop `onSuccess` será usada para notificar o componente pai (ex: para recarregar dados).
interface EmployeeFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Profile | null;
}

// O schema do Zod agora valida apenas os campos de texto.
// O arquivo não é mais parte do schema, pois será tratado separadamente.
const employeeFormSchema = z.object({
  name: z.string().min(1, { message: "Nome é obrigatório." }),
  email: z.string().email({ message: "E-mail inválido." }),
  area: z.string().optional().transform(e => e === "" ? undefined : e),
  role: z.enum(['employee', 'manager']).default('employee'),
});

const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  // Estado para o arquivo selecionado, preview e status de envio.
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof employeeFormSchema>>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      area: initialData?.area || '',
      role: initialData?.role || 'employee',
    },
  });

  // Efeito para resetar o formulário quando os dados iniciais mudam
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        email: initialData.email,
        area: initialData.area || '',
        role: initialData.role,
      });
      setAvatarPreview(initialData.avatar_url || null);
      setSelectedFile(null);
    } else {
      form.reset({
        name: '',
        email: '',
        area: '',
        role: 'employee',
      });
      setAvatarPreview(null);
      setSelectedFile(null);
    }
  }, [initialData, form, isOpen]); // Adicionado `isOpen` para resetar ao abrir

  // Manipula a seleção de um novo arquivo de imagem
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    } else {
      setSelectedFile(null);
      setAvatarPreview(initialData?.avatar_url || null);
    }
  };

  // Função principal de envio do formulário
  const handleSubmit = async (values: z.infer<typeof employeeFormSchema>) => {
    // Não faz sentido editar um funcionário neste formulário, pois ele convida novos usuários.
    // Esta lógica é para criar um novo funcionário.
    if (initialData) {
        showError("Este formulário é apenas para adicionar novos funcionários.");
        return;
    }

    setIsSubmitting(true);
    let loadingToastId: string | undefined;

    try {
      loadingToastId = showLoading("Convidando funcionário...");

      // 1. Crie um objeto FormData para enviar dados e arquivos.
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('email', values.email);
      formData.append('role', values.role);
      if (values.area) {
        formData.append('area', values.area);
      }
      if (selectedFile) {
        // O nome da chave 'avatar_file' deve corresponder ao que a Edge Function espera.
        formData.append('avatar_file', selectedFile, selectedFile.name);
      }
      
      // 2. Obtenha o token de sessão para autorizar a chamada à Edge Function.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Usuário não autenticado. Por favor, faça login novamente.");
      }
      
      // 3. Chame a Edge Function usando fetch.
      // !!! ATENÇÃO: Substitua 'invite-employee' pelo nome real da sua função !!!
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-employee`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          // NÃO defina 'Content-Type'. O navegador o definirá automaticamente
          // para 'multipart/form-data' com o boundary correto.
        },
        body: formData, // Envie o objeto FormData diretamente.
      });

      // 4. Trate a resposta.
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao convidar o funcionário.");
      }

      dismissToast(loadingToastId);
      showSuccess("Convite enviado com sucesso!");
      onSuccess(); // Notifica o componente pai sobre o sucesso.
      onClose();   // Fecha o diálogo.

    } catch (error: any) {
      if (loadingToastId) dismissToast(loadingToastId);
      showError(error.message);
      console.error("Erro no envio:", error);
    } finally {
      setIsSubmitting(false);
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
              autoComplete="name"
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
            <Input
              id="email"
              type="email"
              {...form.register('email')}
              className="col-span-3"
              disabled={!!initialData}
              autoComplete="email"
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
              onValueChange={(value: UserRole) => form.setValue('role', value, { shouldValidate: true })}
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
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
              className="col-span-3"
            />
            {avatarPreview && (
              <div className="col-span-4 flex justify-end pr-4">
                <img src={avatarPreview} alt="Pré-visualização do Avatar" className="w-24 h-24 rounded-full object-cover mt-2" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting || !!initialData}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? 'Edição Indisponível' : 'Adicionar Funcionário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeFormDialog;
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { useEffect, useState } from "react";
import { showError } from "@/utils/toast";

const Index = () => {
  const { session } = useSession();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (session?.user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (error) {
          showError("Erro ao carregar perfil: " + error.message);
          console.error("Error fetching profile:", error);
        } else {
          setProfile(data);
        }
      }
    };
    fetchProfile();
  }, [session]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError("Erro ao fazer logout: " + error.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Bem-vindo ao Sistema de Gestão de Tarefas do Instituto Joule</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
          {profile ? `Olá, ${profile.name}! Seu papel é: ${profile.role}` : "Carregando perfil..."}
        </p>
        <Button onClick={handleLogout} className="bg-orange-500 hover:bg-orange-600 text-white">
          Sair
        </Button>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;
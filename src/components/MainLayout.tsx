import React from 'react';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion } from 'framer-motion';
import { Search, Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession } from '@/contexts/SessionContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/supabase';

interface MainLayoutProps {
  children: React.ReactNode;
}

const Header: React.FC = () => {
  const { session } = useSession();
  const userId = session?.user?.id;

  const { data: profile, isLoading: isLoadingProfile } = useQuery<Profile | null>({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.from('profiles').select('name, avatar_url').eq('user_id', userId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const getPageTitle = () => {
    const path = window.location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/tasks')) return 'Tarefas';
    if (path.startsWith('/employees')) return 'Time';
    if (path.startsWith('/reports')) return 'Relatórios';
    if (path.startsWith('/programs')) return 'Programas';
    if (path.startsWith('/upload')) return 'Upload de Tarefas';
    return 'Página';
  };

  return (
    <motion.div 
      className="bg-white shadow-sm border-b border-gray-100 p-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 capitalize">{getPageTitle()}</h2>
          <p className="text-gray-500 text-sm">Bem-vindo de volta!</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          
          <motion.button
            className="relative p-2 text-gray-500 hover:text-orange-600 rounded-xl hover:bg-orange-50 transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
          </motion.button>

          {isLoadingProfile ? (
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          ) : (
            <Avatar className="w-8 h-8">
              <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.name || 'IJ'}`} alt={profile?.name || 'User'} />
              <AvatarFallback className="bg-orange-500 text-white font-medium">
                {profile?.name?.charAt(0) || 'IJ'}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className={cn("flex flex-col min-h-screen", isMobile ? "ml-0" : "ml-64")}>
        <Header />
        <main className="flex-1 p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
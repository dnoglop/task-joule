import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ListTodo, Users, BarChart2, LogOut, UploadCloud, FolderKanban, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

const navItems = [
  { id: 'dashboard', name: 'Dashboard', href: '/', icon: Home },
  { id: 'tarefas', name: 'Tarefas', href: '/tasks', icon: ListTodo },
  { id: 'relatorios', name: 'Relatórios', href: '/reports', icon: BarChart2 },
  { id: 'programas', name: 'Programas', href: '/programs', icon: FolderKanban },
  { id: 'time', name: 'Time', href: '/employees', icon: Users },
];

const Sidebar: React.FC = () => {
  const { session } = useSession();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [profile, setProfile] = React.useState<any>(null);
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (session?.user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('name, email, role, avatar_url')
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

  const renderSidebarContent = () => (
    <motion.div 
      className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-gray-100 shadow-xl"
      initial={{ x: -264 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-orange-600">Instituto Joule</h1>
        <p className="text-sm text-gray-500 mt-1">Gerenciamento de Tarefas</p>
      </div>
      
      <nav className="mt-8 flex-1">
        {navItems.map((item) => (
          <motion.div
            key={item.id}
            className={cn(
              "mx-4 mb-2 rounded-xl cursor-pointer transition-all duration-200",
              location.pathname === item.href
                ? 'bg-orange-50 text-orange-600 shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            )}
            whileHover={{ x: 4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <Link to={item.href} className="flex items-center p-4">
              <item.icon 
                size={20} 
                className={cn("mr-3", activeTab === item.id ? 'text-orange-600' : 'text-gray-500')} 
              />
              <span className="font-medium">{item.name}</span>
              {hoveredItem === item.id && (
                <motion.div
                  className="ml-auto w-2 h-2 bg-orange-400 rounded-full"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </Link>
          </motion.div>
        ))}
        {profile?.role === 'manager' && (
          <motion.div
            className={cn(
              "mx-4 mb-2 rounded-xl cursor-pointer transition-all duration-200",
              location.pathname === '/upload'
                ? 'bg-orange-50 text-orange-600 shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            )}
            whileHover={{ x: 4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onMouseEnter={() => setHoveredItem('upload')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <Link to="/upload" className="flex items-center p-4">
              <UploadCloud size={20} className={cn("mr-3", location.pathname === '/upload' ? 'text-orange-600' : 'text-gray-500')} />
              <span className="font-medium">Upload de Tarefas</span>
              {hoveredItem === 'upload' && (
                <motion.div
                  className="ml-auto w-2 h-2 bg-orange-400 rounded-full"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </Link>
          </motion.div>
        )}
      </nav>

      <div className="p-4">
        <motion.div
          className="bg-orange-50 rounded-xl p-4 cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center mb-2">
            <Settings size={18} className="text-orange-600 mr-2" />
            <span className="text-sm font-medium text-orange-800">Configurações</span>
          </div>
          <p className="text-xs text-orange-600">Personalize seu workspace</p>
        </motion.div>
        <Button
          onClick={handleLogout}
          className="w-full justify-start bg-transparent text-gray-600 hover:bg-gray-50 hover:text-orange-600 mt-4"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sair
        </Button>
      </div>
    </motion.div>
  );

  const activeTab = navItems.find(item => item.href === location.pathname)?.id || 'dashboard';

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 md:hidden">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          {renderSidebarContent()}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="w-64 h-screen fixed top-0 left-0 hidden md:block">
      {renderSidebarContent()}
    </aside>
  );
};

export default Sidebar;
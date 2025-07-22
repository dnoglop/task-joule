import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ListTodo, Users, BarChart2, LogOut, UploadCloud } from 'lucide-react'; // Adicionando UploadCloud
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
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Tarefas', href: '/tasks', icon: ListTodo },
  { name: 'Funcionários', href: '/employees', icon: Users },
  { name: 'Relatórios', href: '/reports', icon: BarChart2 },
];

const Sidebar: React.FC = () => {
  const { session } = useSession();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [profile, setProfile] = React.useState<any>(null);

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
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-2xl font-bold text-sidebar-primary">Instituto Joule</h2>
      </div>
      <div className="flex-1 p-4 space-y-2">
        {profile && (
          <div className="flex items-center space-x-3 p-2 mb-4 bg-sidebar-accent rounded-md">
            <Avatar>
              <AvatarImage src={profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}`} alt={profile.name} />
              <AvatarFallback>{profile.name?.charAt(0) || 'IJ'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sidebar-accent-foreground">{profile.name}</p>
              <p className="text-sm text-sidebar-foreground">{profile.role === 'manager' ? 'Gestor' : 'Funcionário'}</p>
            </div>
          </div>
        )}
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center p-3 rounded-md transition-colors duration-200",
                location.pathname === item.href
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          ))}
          {profile?.role === 'manager' && ( // Apenas para gestores
            <Link
              to="/upload"
              className={cn(
                "flex items-center p-3 rounded-md transition-colors duration-200",
                location.pathname === '/upload'
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <UploadCloud className="mr-3 h-5 w-5" />
              <span>Upload de Tarefas</span>
            </Link>
          )}
        </nav>
      </div>
      <div className="p-4 border-t border-sidebar-border">
        <Button
          onClick={handleLogout}
          className="w-full justify-start bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sair
        </Button>
      </div>
    </div>
  );

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
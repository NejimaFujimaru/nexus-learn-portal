import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  LayoutDashboard, 
  BookOpen, 
  Plus, 
  ClipboardList, 
  Users, 
  History, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

interface AppSidebarProps {
  userType: 'student' | 'teacher';
  userName?: string;
}

const teacherMenuItems = [
  { label: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
  { label: 'Subjects', path: '/teacher/subjects', icon: BookOpen },
  { label: 'Tests', path: '/teacher/tests', icon: ClipboardList },
  { label: 'Create Test', path: '/teacher/create-test', icon: Plus },
  { label: 'Classes', path: '/teacher/classes', icon: GraduationCap },
  { label: 'Students', path: '/teacher/students', icon: Users },
];

const studentMenuItems = [
  { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
  { label: 'Practice Hub', path: '/student/practice-hub', icon: BookOpen },
  { label: 'My Class', path: '/student/class', icon: GraduationCap },
  { label: 'History', path: '/student/history', icon: History },
];

export const AppSidebar = ({ userType, userName = 'User' }: AppSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = userType === 'teacher' ? teacherMenuItems : studentMenuItems;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      navigate('/');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo + Collapse Toggle */}
      <div className={cn(
        "flex items-center gap-2 p-4 border-b border-border",
        collapsed && "justify-center"
      )}>
        <GraduationCap className="h-8 w-8 text-primary shrink-0" />
        {!collapsed && (
          <span className="text-xl font-bold text-foreground whitespace-nowrap flex-1">
            Nexus Learn
          </span>
        )}
        {/* Collapse Toggle - Desktop Only (moved to top) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center p-1.5 hover:bg-accent rounded-md transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              "hover:bg-accent hover:text-accent-foreground",
              isActive(item.path) 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground",
              collapsed && "justify-center px-2"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Account Section with User Card Drop-up */}
      <div className="border-t border-border p-3 space-y-1 relative">
        {/* User card acts as toggle */}
        <button
          type="button"
          onClick={() => setUserMenuOpen((open) => !open)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-3 bg-accent/60 rounded-lg transition-all duration-200",
            "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            collapsed && "justify-center px-2",
          )}
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {userName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 overflow-hidden text-left">
              <p className="text-sm font-medium text-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground capitalize">{userType}</p>
            </div>
          )}
        </button>

        {/* Drop-up actions: Settings + Logout (appear ABOVE the card, sliding upward) */}
        <div
          className={cn(
            "absolute left-3 right-3 bottom-14 origin-bottom transition-all duration-200 ease-out",
            userMenuOpen
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-4 pointer-events-none",
          )}
        >
          <Link
            to="/settings"
            onClick={() => {
              setMobileOpen(false);
              setUserMenuOpen(false);
            }}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              isActive('/settings')
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground",
              collapsed && "justify-center px-2",
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="font-medium">Settings</span>}
          </Link>

          <button
            onClick={handleLogout}
            className={cn(
              "mt-1 flex items-center gap-3 px-3 py-2 rounded-lg w-full text-sm transition-colors",
              "hover:bg-destructive/10 text-muted-foreground hover:text-destructive",
              collapsed && "justify-center px-2",
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </div>

    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg shadow-lg border border-border"
      >
        {mobileOpen ? (
          <X className="h-6 w-6 text-foreground" />
        ) : (
          <Menu className="h-6 w-6 text-foreground" />
        )}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 h-screen bg-card border-r border-border z-40 flex flex-col",
          "transition-all duration-300 ease-in-out",
          // Desktop width
          collapsed ? "md:w-16" : "md:w-60",
          // Mobile offcanvas translate
          mobileOpen ? "translate-x-0 w-60" : "-translate-x-full md:translate-x-0",
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
};

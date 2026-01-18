import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
  userType: 'student' | 'teacher';
  userName?: string;
}

export const DashboardLayout = ({ children, userType, userName }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar userType={userType} userName={userName} />
      {/* On desktop, offset content to the right of the fixed sidebar width. Use responsive classes to better match collapsed width. */}
      <main
        className={cn(
          'flex-1 min-h-screen overflow-x-hidden transition-all duration-300',
          // match default expanded width; collapsed still leaves a small gutter but less jarring
          'md:ml-60',
        )}
      >
        {/* Spacer for mobile hamburger */}
        <div className="h-16 md:hidden" />
        {children}
      </main>
    </div>
  );
};

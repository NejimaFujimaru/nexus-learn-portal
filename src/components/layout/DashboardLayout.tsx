import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';

interface DashboardLayoutProps {
  children: ReactNode;
  userType: 'student' | 'teacher';
  userName?: string;
}

export const DashboardLayout = ({ children, userType, userName }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar userType={userType} userName={userName} />
      <main className="flex-1 min-h-screen overflow-x-hidden">
        {/* Spacer for mobile hamburger */}
        <div className="h-16 md:hidden" />
        {children}
      </main>
    </div>
  );
};

import { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import NotificationProvider from '../common/NotificationProvider';

interface MainLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export default function MainLayout({ children, showSidebar = true }: MainLayoutProps) {
  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
      }}
    >
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {showSidebar && <Sidebar />}

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Notification Toast Provider */}
      <NotificationProvider />
    </div>
  );
}

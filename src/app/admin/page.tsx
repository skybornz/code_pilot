'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import { AdminDashboard } from './admin-dashboard';
import { Logo } from '@/components/codepilot/logo';
import { Button } from '@/components/ui/button';

export default function AdminPage() {
  const { isAuthenticated, isAdmin, isLoading, logout } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (!isAdmin) {
        router.replace('/');
      }
    }
  }, [isAuthenticated, isAdmin, isLoading, router]);

  if (isLoading || !isAuthenticated || !isAdmin || !isClient) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
       <header className="flex items-center justify-between p-4 border-b shrink-0">
          <Logo />
          <Button variant="outline" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
          </Button>
       </header>
       <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <AdminDashboard />
       </main>
    </div>
  );
}

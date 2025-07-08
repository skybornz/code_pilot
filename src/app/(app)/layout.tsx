
'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (isAdmin) {
        router.replace('/admin');
      }
    }
  }, [isAuthenticated, isAdmin, isLoading, router]);

  if (isLoading || !isAuthenticated || isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <LoadingSpinner text="Authenticating..." />
      </div>
    );
  }

  // Certain pages have their own full-page layouts and don't need the main sidebar.
  const fullPageLayouts = ['/repo-insight', '/dashboard', '/codepilot', '/waiki', '/code-compare', '/regex-wizard', '/diagram-forge'];
  if (fullPageLayouts.some(p => pathname.startsWith(p))) {
    // This wrapper ensures that the loading.tsx file is properly centered.
    // The page components themselves have flex containers, so this won't break them.
    return (
        <div className="flex flex-col min-h-screen">
            {children}
        </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <DashboardSidebar />
      </Sidebar>
      <SidebarInset className="p-4 lg:p-8">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

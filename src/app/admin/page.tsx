'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Menu } from 'lucide-react';
import { AdminDashboard } from './admin-dashboard';
import { useIsMobile } from '@/hooks/use-mobile';
import { FileExplorer } from '@/components/codepilot/file-explorer';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Logo } from '@/components/codepilot/logo';
import { Button } from '@/components/ui/button';

export default function AdminPage() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (!isAdmin) {
        router.replace('/');
      }
    }
  }, [isAuthenticated, isAdmin, isLoading, router]);

  if (isLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleUploadClick = () => router.push('/');

  if (isMobile) {
    return (
      <div className="h-screen bg-background text-foreground flex flex-col">
        <header className="flex items-center justify-between p-4 border-b">
          <Logo />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0">
               <FileExplorer files={[]} activeFileId={null} onFileSelect={() => {}} onUploadClick={handleUploadClick} />
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 overflow-y-auto p-4">
          <AdminDashboard />
        </main>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background text-foreground flex">
        <FileExplorer 
          files={[]} 
          activeFileId={null} 
          onFileSelect={() => {}} 
          onUploadClick={handleUploadClick}
        />
        <main className="flex-1 p-4 overflow-y-auto">
          <AdminDashboard />
        </main>
    </div>
  );
}

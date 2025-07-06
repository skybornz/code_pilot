'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { SemCoPilotWorkspace } from '@/components/codepilot/codepilot-workspace';

export default function SemCoPilotPage() {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isLoading && isClient) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (isAdmin) {
        router.replace('/admin');
      }
    }
  }, [isAuthenticated, isLoading, router, isAdmin, isClient]);

  if (isLoading || !isClient || !isAuthenticated || isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <SemCoPilotWorkspace />;
}

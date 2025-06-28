'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { CodePilotWorkspace } from '@/components/codepilot/codepilot-workspace';

export default function ProtectedCodePilotPage() {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (isAdmin) {
        router.replace('/admin');
      }
    }
  }, [isAuthenticated, isLoading, router, isAdmin]);

  if (isLoading || !isAuthenticated || isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <CodePilotWorkspace />;
}

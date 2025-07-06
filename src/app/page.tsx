
'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ADLabsWorkspace } from '@/components/codepilot/codepilot-workspace';

export default function ADLabsPage() {
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

  // If auth state is loading, or if the user is not authenticated/is an admin (and will be redirected)
  // show a loader.
  if (isLoading || !isAuthenticated || isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Only render the workspace if auth has loaded, user is authenticated, and is not an admin.
  return <ADLabsWorkspace />;
}

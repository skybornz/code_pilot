
'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function HomePage() {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (isAdmin) {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, router, isAdmin]);

  // If auth state is loading, or if the user is not authenticated/is an admin (and will be redirected)
  // show a loader.
  if (isLoading || !isAuthenticated || isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  // Fallback loader while redirecting the authenticated user
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <LoadingSpinner text="Redirecting..." />
    </div>
  );
}

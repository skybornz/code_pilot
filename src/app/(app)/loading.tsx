import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Loading() {
  return (
    <div className="flex flex-1 w-full items-center justify-center">
      <LoadingSpinner text="Loading page..." />
    </div>
  );
}

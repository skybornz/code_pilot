import { cn } from '@/lib/utils';
import { LogoMark } from './logo-mark';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)} aria-label="AD Labs Logo">
      <LogoMark />
      <h1 className="text-2xl font-bold font-headline">
        AD Labs
      </h1>
    </div>
  );
}

import { LogoMark } from '@/components/codepilot/logo-mark';
import { cn } from '@/lib/utils';

export function LoadingSpinner({
  className,
  text,
}: {
  className?: string;
  text?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 text-muted-foreground',
        className
      )}
    >
      <div className="relative h-12 w-12">
        <LogoMark className="h-full w-full animate-spin-slow" />
        <LogoMark className="absolute left-0 top-0 h-full w-full animate-ping-slow opacity-50" />
      </div>
      {text && <p className="text-lg animate-pulse">{text}</p>}
    </div>
  );
}

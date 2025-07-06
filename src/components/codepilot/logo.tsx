import { LogoMark } from './logo-mark';

export function Logo() {
  return (
    <div className="flex items-center gap-2" aria-label="AD Labs Logo">
      <LogoMark />
      <h1 className="text-2xl font-bold font-headline bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        AD Labs
      </h1>
    </div>
  );
}

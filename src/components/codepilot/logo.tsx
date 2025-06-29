import { LogoMark } from './logo-mark';

export function Logo() {
  return (
    <div className="flex items-center gap-2" aria-label="SemCo-Pilot Logo">
      <LogoMark />
      <h1 className="text-2xl font-bold font-headline bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        SemCo-Pilot
      </h1>
    </div>
  );
}

import { Wand2 } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2" aria-label="CodePilot Logo">
      <Wand2 className="h-7 w-7 text-accent" />
      <h1 className="text-2xl font-bold text-foreground font-headline">CodePilot</h1>
    </div>
  );
}

'use client';

import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { WaikiChatPanel } from '@/components/waiki/waiki-chat-panel';

export default function WaikiPage() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1 min-h-0">
        <WaikiChatPanel />
      </main>
    </div>
  );
}

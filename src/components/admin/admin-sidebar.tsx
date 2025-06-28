'use client';

import { useAuth } from '@/context/auth-context';
import { Logo } from '@/components/codepilot/logo';
import { 
    SidebarHeader, 
    SidebarContent, 
    SidebarFooter, 
    SidebarMenu, 
    SidebarMenuItem, 
    SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Users, Settings, Link as LinkIcon, LogOut, UserCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export function AdminSidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    const menuItems = [
        { href: '/admin/user-management', label: 'User Management', icon: Users },
        { href: '/admin/connections', label: 'Connections', icon: LinkIcon },
        { href: '/admin/model-settings', label: 'Model Settings', icon: Settings },
    ];

    return (
        <TooltipProvider>
            <SidebarHeader>
                <Logo />
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    {menuItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                             <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)} tooltip={item.label}>
                                <Link href={item.href}>
                                    <item.icon className="h-5 w-5" />
                                    <span>{item.label}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
              {user && (
                  <Card className="bg-card/50">
                      <CardHeader className="p-3 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-2 overflow-hidden">
                              <UserCircle className="w-6 h-6 flex-shrink-0" />
                              <div className="text-sm overflow-hidden">
                                  <p className="font-semibold truncate">{user.email}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-1">
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout}>
                                          <LogOut className="w-4 h-4" />
                                      </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Logout</p></TooltipContent>
                              </Tooltip>
                      </div>
                      </CardHeader>
                  </Card>
              )}
            </SidebarFooter>
        </TooltipProvider>
    )
}

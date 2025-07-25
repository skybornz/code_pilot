
'use client';

import React from 'react';
import { useAuth } from '@/context/auth-context';
import { Logo } from '@/components/codepilot/logo';
import { 
    SidebarHeader, 
    SidebarContent, 
    SidebarFooter, 
    SidebarMenu, 
    SidebarMenuItem, 
    SidebarMenuButton,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import { Users, Settings, BarChart2, LogOut, UserCircle, KeyRound, MoreVertical, LayoutDashboard } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChangePasswordDialog } from '../profile/change-password-dialog';
import { ThemeToggle } from '../ui/theme-toggle';

export function AdminSidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);

    const menuItems = [
        { href: '/admin/connections', label: 'Usage Statistics', icon: BarChart2 },
        { href: '/admin/user-management', label: 'Users', icon: Users },
        { href: '/admin/model-settings', label: 'Model Settings', icon: Settings },
    ];
    
    const userName = React.useMemo(() => {
        if (!user?.email) return '';
        return user.email.split('@')[0]
            .replace(/[._]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }, [user?.email]);

    return (
        <>
            <SidebarHeader className='flex-row items-center justify-between'>
                <Link href="/admin">
                    <Logo />
                </Link>
                <ThemeToggle className="text-primary hover:text-primary/90" />
            </SidebarHeader>
            <SidebarSeparator />
            <SidebarContent className="p-2">
                <SidebarMenu className="mt-4">
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
            <SidebarSeparator />
            <SidebarFooter>
              {user && (
                  <Card className="bg-card/50">
                      <CardHeader className="p-3 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-2 overflow-hidden">
                              <UserCircle className="w-6 h-6 flex-shrink-0" />
                              <div className="text-sm overflow-hidden">
                                  <p className="font-semibold truncate" title={userName}>{userName}</p>
                                  <p className="text-xs text-muted-foreground truncate" title={user.email}>{user.email}</p>
                              </div>
                          </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                        <Link href="/dashboard">
                                            <LayoutDashboard className="mr-2 h-4 w-4" />
                                            <span>View Dashboard</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setIsPasswordDialogOpen(true)}>
                                        <KeyRound className="mr-2 h-4 w-4" />
                                        <span>Change Password</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={logout}>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Logout</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                      </CardHeader>
                  </Card>
              )}
            </SidebarFooter>
            {user && <ChangePasswordDialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen} userId={user.id} />}
        </>
    )
}

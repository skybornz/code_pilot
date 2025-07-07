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
import { Users, Settings, GitBranch, LogOut, UserCircle, KeyRound, MoreVertical, LayoutDashboard, FolderGit, FileTerminal, Bot, GitCompare } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChangePasswordDialog } from '../profile/change-password-dialog';
import { BitbucketCredsDialog } from '../profile/bitbucket-creds-dialog';

export function DashboardSidebar() {
    const pathname = usePathname();
    const { user, isAdmin, logout } = useAuth();
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);
    const [isBitbucketDialogOpen, setIsBitbucketDialogOpen] = React.useState(false);

    const menuItems = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/repo-insight', label: 'RepoInsight', icon: FolderGit },
        { href: '/codepilot', label: 'CodePilot', icon: FileTerminal },
        { href: '/waiki', label: 'W.A.I.K.I', icon: Bot },
        { href: '/code-compare', label: 'CodeCompare', icon: GitCompare },
    ];

    return (
        <>
            <SidebarHeader>
                <Logo />
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
                                  <p className="font-semibold truncate">{user.email}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                              </div>
                          </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {isAdmin && (
                                      <>
                                          <DropdownMenuItem asChild>
                                              <Link href="/admin">
                                                  <Settings className="mr-2 h-4 w-4" />
                                                  <span>Admin Dashboard</span>
                                              </Link>
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                      </>
                                    )}
                                    <DropdownMenuItem onClick={() => setIsBitbucketDialogOpen(true)}>
                                        <GitBranch className="mr-2 h-4 w-4" />
                                        <span>Bitbucket Credentials</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsPasswordDialogOpen(true)}>
                                        <KeyRound className="mr-2 h-4 w-4" />
                                        <span>Change Password</span>
                                    </DropdownMenuItem>
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
            {user && <BitbucketCredsDialog open={isBitbucketDialogOpen} onOpenChange={setIsBitbucketDialogOpen} />}
        </>
    )
}

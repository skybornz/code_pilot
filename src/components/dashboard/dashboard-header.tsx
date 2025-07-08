'use client';

import React from 'react';
import { useAuth } from '@/context/auth-context';
import { Logo } from '@/components/codepilot/logo';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserCircle, Settings, KeyRound, LogOut, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { ChangePasswordDialog } from '../profile/change-password-dialog';
import { usePathname } from 'next/navigation';

export function DashboardHeader() {
    const { user, isAdmin, logout } = useAuth();
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);
    const pathname = usePathname();
    
    const userName = React.useMemo(() => {
        if (!user?.email) return '';
        return user.email.split('@')[0]
            .replace(/[._]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }, [user?.email]);

    return (
        <>
            <header className="sticky top-0 z-50 p-4 border-b bg-card/50 backdrop-blur-sm">
                <div className="container mx-auto flex justify-between items-center">
                    <Link href="/dashboard">
                        <Logo />
                    </Link>
                    {user && (
                         <div className="flex items-center gap-2">
                             {pathname !== '/dashboard' && (
                                <Button asChild variant="ghost">
                                    <Link href="/dashboard">
                                        <LayoutDashboard className="mr-2 h-4 w-4" />
                                        Dashboard
                                    </Link>
                                </Button>
                             )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="flex items-center gap-2 h-12">
                                        <UserCircle className="w-8 h-8" />
                                        <div className="text-left leading-tight hidden md:block">
                                            <p className="font-semibold truncate" title={userName}>{userName}</p>
                                            <p className="text-xs text-muted-foreground truncate" title={user.email}>{user.email}</p>
                                        </div>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
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
                                    <DropdownMenuItem onClick={() => setIsPasswordDialogOpen(true)}>
                                        <KeyRound className="mr-2 h-4 w-4" />
                                        <span>Change Password</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => logout()}>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Logout</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                         </div>
                    )}
                </div>
            </header>
            {user && <ChangePasswordDialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen} userId={user.id} />}
        </>
    )
}

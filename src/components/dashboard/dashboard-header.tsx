
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
import { cn } from '@/lib/utils';
import { ThemeToggle } from '../ui/theme-toggle';

interface ThemeClasses {
    color: string;
    hover: string;
    focus: string;
    iconColor?: string;
}

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

    const getThemeClasses = (): ThemeClasses => {
        if (pathname.startsWith('/repo-insight')) return { color: 'text-purple-400', hover: 'hover:bg-purple-400/10 hover:text-purple-400', focus: 'focus:bg-purple-400/20 focus:text-purple-400' };
        if (pathname.startsWith('/codepilot')) return { color: 'text-blue-400', hover: 'hover:bg-blue-400/10 hover:text-blue-400', focus: 'focus:bg-blue-400/20 focus:text-blue-400' };
        if (pathname.startsWith('/waiki')) return { color: 'text-red-400', hover: 'hover:bg-red-400/10 hover:text-red-400', focus: 'focus:bg-red-400/20 focus:text-red-400' };
        if (pathname.startsWith('/code-compare')) return { color: 'text-orange-400', hover: 'hover:bg-orange-400/10 hover:text-orange-400', focus: 'focus:bg-orange-400/20 focus:text-orange-400' };
        if (pathname.startsWith('/regex-wizard')) return { color: 'text-green-400', hover: 'hover:bg-green-400/10 hover:text-green-400', focus: 'focus:bg-green-400/20 focus:text-green-400' };
        if (pathname.startsWith('/diagram-forge')) return { color: 'text-cyan-400', hover: 'hover:bg-cyan-400/10 hover:text-cyan-400', focus: 'focus:bg-cyan-400/20 focus:text-cyan-400' };
        if (pathname.startsWith('/code-gpt')) return { color: 'text-pink-400', hover: 'hover:bg-pink-400/10 hover:text-pink-400', focus: 'focus:bg-pink-400/20 focus:text-pink-400' };
        if (pathname.startsWith('/code-fiddle')) return { color: 'text-yellow-400', hover: 'hover:bg-yellow-400/10 hover:text-yellow-400', focus: 'focus:bg-yellow-400/20 focus:text-yellow-400' };
        if (pathname.startsWith('/word-craft')) return { color: 'text-indigo-400', hover: 'hover:bg-indigo-400/10 hover:text-indigo-400', focus: 'focus:bg-indigo-400/20 focus:text-indigo-400' };
        return { color: 'text-primary', hover: 'hover:bg-primary/10 hover:text-primary', focus: 'focus:bg-primary/20 focus:text-primary' };
    };

    const theme = getThemeClasses();

    return (
        <>
            <header className="sticky top-0 z-50 p-4 border-b bg-card/50 backdrop-blur-sm">
                <div className="container mx-auto flex justify-between items-center">
                    <Link href="/dashboard">
                        <Logo className={theme.color} />
                    </Link>
                    {user && (
                         <div className="flex items-center gap-2">
                            <ThemeToggle className={cn(theme.color, theme.hover)} />
                             {pathname !== '/dashboard' && (
                                <Button asChild variant="ghost" className={cn(theme.color, theme.hover)}>
                                    <Link href="/dashboard">
                                        <LayoutDashboard className="mr-2 h-4 w-4" />
                                        Dashboard
                                    </Link>
                                </Button>
                             )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className={cn("flex items-center gap-2 h-12", theme.color, theme.hover)}>
                                        <UserCircle className="w-8 h-8" />
                                        <div className="text-left leading-tight hidden md:block">
                                            <p className="font-semibold truncate" title={userName}>{userName}</p>
                                            <p className={cn("text-xs truncate", theme.color)} title={user.email}>{user.email}</p>
                                        </div>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    {isAdmin && (
                                    <>
                                        <DropdownMenuItem asChild className={theme.focus}>
                                            <Link href="/admin">
                                                <Settings className="mr-2 h-4 w-4" />
                                                <span>Admin Dashboard</span>
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </>
                                    )}
                                    <DropdownMenuItem onClick={() => setIsPasswordDialogOpen(true)} className={theme.focus}>
                                        <KeyRound className="mr-2 h-4 w-4" />
                                        <span>Change Password</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => logout()} className={theme.focus}>
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

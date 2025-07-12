
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

    const getThemeColorClass = () => {
        if (pathname.startsWith('/repo-insight')) return 'text-blue-400';
        if (pathname.startsWith('/codepilot')) return 'text-purple-400';
        if (pathname.startsWith('/waiki')) return 'text-red-400';
        if (pathname.startsWith('/code-compare')) return 'text-orange-400';
        if (pathname.startsWith('/regex-wizard')) return 'text-green-400';
        if (pathname.startsWith('/diagram-forge')) return 'text-cyan-400';
        if (pathname.startsWith('/code-gpt')) return 'text-pink-400';
        if (pathname.startsWith('/code-fiddle')) return 'text-yellow-400';
        if (pathname.startsWith('/word-craft')) return 'text-indigo-400';
        return 'text-primary';
    };

    const getThemeHoverClass = () => {
        if (pathname.startsWith('/repo-insight')) return 'hover:bg-blue-400/10 hover:text-blue-400';
        if (pathname.startsWith('/codepilot')) return 'hover:bg-purple-400/10 hover:text-purple-400';
        if (pathname.startsWith('/waiki')) return 'hover:bg-red-400/10 hover:text-red-400';
        if (pathname.startsWith('/code-compare')) return 'hover:bg-orange-400/10 hover:text-orange-400';
        if (pathname.startsWith('/regex-wizard')) return 'hover:bg-green-400/10 hover:text-green-400';
        if (pathname.startsWith('/diagram-forge')) return 'hover:bg-cyan-400/10 hover:text-cyan-400';
        if (pathname.startsWith('/code-gpt')) return 'hover:bg-pink-400/10 hover:text-pink-400';
        if (pathname.startsWith('/code-fiddle')) return 'hover:bg-yellow-400/10 hover:text-yellow-400';
        if (pathname.startsWith('/word-craft')) return 'hover:bg-indigo-400/10 hover:text-indigo-400';
        return 'hover:bg-primary/10 hover:text-primary';
    }

    const getThemeFocusClass = () => {
        if (pathname.startsWith('/repo-insight')) return 'focus:bg-blue-400/90 focus:text-white';
        if (pathname.startsWith('/codepilot')) return 'focus:bg-purple-400/90 focus:text-white';
        if (pathname.startsWith('/waiki')) return 'focus:bg-red-400/90 focus:text-white';
        if (pathname.startsWith('/code-compare')) return 'focus:bg-orange-400/90 focus:text-white';
        if (pathname.startsWith('/regex-wizard')) return 'focus:bg-green-400/90 focus:text-white';
        if (pathname.startsWith('/diagram-forge')) return 'focus:bg-cyan-400/90 focus:text-white';
        if (pathname.startsWith('/code-gpt')) return 'focus:bg-pink-400/90 focus:text-white';
        if (pathname.startsWith('/code-fiddle')) return 'focus:bg-yellow-400/90 focus:text-white';
        if (pathname.startsWith('/word-craft')) return 'focus:bg-indigo-400/90 focus:text-white';
        return 'focus:bg-primary focus:text-primary-foreground';
    };

    const themeColorClass = getThemeColorClass();
    const themeFocusClass = getThemeFocusClass();
    const themeHoverClass = getThemeHoverClass();

    return (
        <>
            <header className="sticky top-0 z-50 p-4 border-b bg-card/50 backdrop-blur-sm">
                <div className="container mx-auto flex justify-between items-center">
                    <Link href="/dashboard">
                        <Logo className={themeColorClass} />
                    </Link>
                    {user && (
                         <div className="flex items-center gap-2">
                            <ThemeToggle className={cn(themeColorClass, themeHoverClass)} />
                             {pathname !== '/dashboard' && (
                                <Button asChild variant="ghost" className={cn(themeColorClass, themeHoverClass)}>
                                    <Link href="/dashboard">
                                        <LayoutDashboard className="mr-2 h-4 w-4" />
                                        Dashboard
                                    </Link>
                                </Button>
                             )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className={cn("flex items-center gap-2 h-12", themeColorClass, themeHoverClass)}>
                                        <UserCircle className="w-8 h-8" />
                                        <div className="text-left leading-tight hidden md:block">
                                            <p className="font-semibold truncate" title={userName}>{userName}</p>
                                            <p className={cn("text-xs truncate", themeColorClass)} title={user.email}>{user.email}</p>
                                        </div>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    {isAdmin && (
                                    <>
                                        <DropdownMenuItem asChild className={themeFocusClass}>
                                            <Link href="/admin">
                                                <Settings className={cn("mr-2 h-4 w-4", themeColorClass)} />
                                                <span>Admin Dashboard</span>
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </>
                                    )}
                                    <DropdownMenuItem onClick={() => setIsPasswordDialogOpen(true)} className={themeFocusClass}>
                                        <KeyRound className={cn("mr-2 h-4 w-4", themeColorClass)} />
                                        <span>Change Password</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => logout()} className={themeFocusClass}>
                                        <LogOut className={cn("mr-2 h-4 w-4", themeColorClass)} />
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

'use client';

import React from 'react';
import { useAuth } from '@/context/auth-context';
import { Logo } from '@/components/codepilot/logo';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserCircle, Settings, GitBranch, KeyRound, LogOut } from 'lucide-react';
import Link from 'next/link';
import { ChangePasswordDialog } from '../profile/change-password-dialog';
import { BitbucketCredsDialog } from '../profile/bitbucket-creds-dialog';

export function DashboardHeader() {
    const { user, isAdmin, logout } = useAuth();
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);
    const [isBitbucketDialogOpen, setIsBitbucketDialogOpen] = React.useState(false);

    return (
        <>
            <header className="p-4 border-b bg-card/20">
                <div className="container mx-auto flex justify-between items-center">
                    <Link href="/dashboard">
                        <Logo />
                    </Link>
                    {user && (
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2 h-12">
                                    <UserCircle className="w-8 h-8" />
                                    <div className="text-left leading-tight hidden md:block">
                                        <p className="font-semibold">{user.email}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
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
                                <DropdownMenuItem onClick={() => setIsBitbucketDialogOpen(true)}>
                                    <GitBranch className="mr-2 h-4 w-4" />
                                    <span>Bitbucket Credentials</span>
                                </DropdownMenuItem>
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
                    )}
                </div>
            </header>
            {user && <ChangePasswordDialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen} userId={user.id} />}
            {user && <BitbucketCredsDialog open={isBitbucketDialogOpen} onOpenChange={setIsBitbucketDialogOpen} />}
        </>
    )
}

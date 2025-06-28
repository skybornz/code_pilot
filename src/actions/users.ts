'use server';

import type { User } from '@/lib/schemas';
import { dbGetUsers, dbAddUser, dbUpdateUser } from '@/lib/user-database';

export async function getUsers(): Promise<Omit<User, 'password'>[]> {
  return dbGetUsers();
}

export async function updateUser(userData: Omit<User, 'password'> & { password?: string }): Promise<{ success: boolean; message?: string }> {
    return dbUpdateUser(userData);
}

export async function addUser(userData: Omit<User, 'id'>): Promise<{ success:boolean; message?: string; user?: Omit<User, 'password'> }> {
  return dbAddUser(userData);
}

'use server';

import type { User } from '@/lib/schemas';
import { dbGetUsers, dbAddUser, dbUpdateUser, dbGetUserByEmail } from '@/lib/user-database';

export async function getUsers(): Promise<Omit<User, 'password'>[]> {
  return dbGetUsers();
}

export async function updateUser(userData: Omit<User, 'password' | 'lastActive'> & { password?: string }): Promise<{ success: boolean; message?: string }> {
    return dbUpdateUser(userData);
}

export async function addUser(userData: Omit<User, 'id' | 'lastActive'>): Promise<{ success:boolean; message?: string; user?: Omit<User, 'password'> }> {
  return dbAddUser(userData);
}

export async function loginUser(credentials: Pick<User, 'email' | 'password'>): Promise<{ success: boolean; message?: string; user?: Omit<User, 'password'> }> {
    const user = dbGetUserByEmail(credentials.email);
    if (!user || user.password !== credentials.password) {
        return { success: false, message: 'Invalid email or password' };
    }
    if (!user.isActive) {
        return { success: false, message: 'This account has been deactivated.' };
    }
    
    // Update last active time
    dbUpdateUser({ id: user.id, lastActive: new Date() });
    
    const updatedUser = { ...user, lastActive: new Date() };

    const { password, ...userWithoutPassword } = updatedUser;
    return { success: true, user: userWithoutPassword };
}

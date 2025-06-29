'use server';

import type { User } from '@/lib/schemas';
import { dbGetUsers, dbAddUser, dbUpdateUser, dbGetUserByEmail, dbGetUserById, dbUpdateUserLastActive, dbGetUserWithPassword } from '@/lib/user-database';
import { logUserActivity } from './activity';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export async function getUsers(): Promise<Omit<User, 'password'>[]> {
  return dbGetUsers();
}

export async function getUserById(id: string): Promise<Omit<User, 'password'> | undefined> {
    return dbGetUserById(id);
}

export async function updateUser(userData: Omit<User, 'password' | 'lastActive'> & { password?: string }): Promise<{ success: boolean; message?: string }> {
    const dataToUpdate: Partial<User> & { id: string } = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        isActive: userData.isActive,
    };
    
    if (userData.password) {
        dataToUpdate.password = await bcrypt.hash(userData.password, SALT_ROUNDS);
    }
    
    return dbUpdateUser(dataToUpdate);
}

export async function addUser(userData: Omit<User, 'id' | 'lastActive'>): Promise<{ success:boolean; message?: string; user?: Omit<User, 'password'> }> {
  const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);
  const dataToAdd = { ...userData, password: hashedPassword };
  return dbAddUser(dataToAdd);
}

export async function loginUser(credentials: Pick<User, 'email' | 'password'>): Promise<{ success: boolean; message?: string; user?: Omit<User, 'password'> }> {
    const user = await dbGetUserByEmail(credentials.email);
    
    if (!user || !user.password) {
        return { success: false, message: 'Invalid email or password' };
    }

    const isPotentiallyHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
    let passwordMatch = false;

    try {
        if (isPotentiallyHashed) {
            passwordMatch = await bcrypt.compare(credentials.password, user.password);
        } else {
            passwordMatch = credentials.password === user.password;
        }
    } catch (error) {
        console.error('Password comparison failed:', error);
        passwordMatch = false;
    }


    if (!passwordMatch) {
        return { success: false, message: 'Invalid email or password' };
    }
    
    // If login is successful with a plaintext password, hash it for future logins
    if (!isPotentiallyHashed && passwordMatch) {
        const hashedNewPassword = await bcrypt.hash(credentials.password, SALT_ROUNDS);
        await dbUpdateUser({ id: user.id, password: hashedNewPassword });
    }

    if (!user.isActive) {
        return { success: false, message: 'This account has been deactivated.' };
    }
    
    await dbUpdateUserLastActive(user.id);
    await logUserActivity(user.id, 'Login', 'User logged in successfully.');
    
    const updatedUser = { ...user, lastActive: new Date() };

    const { password, ...userWithoutPassword } = updatedUser;
    return { success: true, user: userWithoutPassword };
}


export async function changePassword({ userId, currentPassword, newPassword }: { userId: string, currentPassword?: string, newPassword?: string }): Promise<{ success: boolean; message: string }> {
    if (!newPassword || newPassword.length < 8) {
        return { success: false, message: 'New password must be at least 8 characters long.' };
    }

    const userWithPassword = await dbGetUserWithPassword(userId);
    if (!userWithPassword) {
        return { success: false, message: 'User not found.' };
    }

    if (currentPassword) {
        if (!userWithPassword.password) {
            return { success: false, message: 'Current password is incorrect.' };
        }
        
        let passwordMatch = false;
        try {
            // Check if it's a valid bcrypt hash, otherwise it's plaintext
            const isPotentiallyHashed = userWithPassword.password.startsWith('$2a$') || userWithPassword.password.startsWith('$2b$');
            if (isPotentiallyHashed) {
                passwordMatch = await bcrypt.compare(currentPassword, userWithPassword.password);
            } else {
                passwordMatch = currentPassword === userWithPassword.password;
            }
        } catch (e) {
            // Fallback for any unexpected error during comparison
            passwordMatch = false;
        }

        if (!passwordMatch) {
            return { success: false, message: 'Current password is incorrect.' };
        }
    } else {
        return { success: false, message: 'Current password is required.' };
    }
    
    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const result = await dbUpdateUser({ id: userId, password: hashedNewPassword });

    if (result.success) {
        await logUserActivity(userId, 'Password Change', 'User successfully changed their password.');
        return { success: true, message: 'Password changed successfully.' };
    } else {
        return { success: false, message: 'Failed to update password.' };
    }
}

export async function updateUserLastActive(userId: string) {
    await dbUpdateUserLastActive(userId);
}

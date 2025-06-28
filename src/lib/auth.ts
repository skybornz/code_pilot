'use server';

import type { User } from './schemas';

// For this prototype, we'll store users in-memory.
// In a real app, this would be a database.

// This is a mock database.
let users: User[] = [
  { id: '1', email: 'admin@example.com', password: 'password', role: 'admin' },
  { id: '2', email: 'user@example.com', password: 'password', role: 'user' },
];

export async function getUsers(): Promise<Omit<User, 'password'>[]> {
  // Omit passwords when returning users
  return users.map(({ password, ...user }) => user);
}

export async function getUserById(id: string): Promise<Omit<User, 'password'> | undefined> {
    const user = users.find((u) => u.id === id);
    if (user) {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    return undefined;
}

export async function updateUser(userData: Omit<User, 'password'> & { password?: string }): Promise<{ success: boolean; message?: string }> {
    const userIndex = users.findIndex((u) => u.id === userData.id);
    if (userIndex === -1) {
        return { success: false, message: 'User not found.' };
    }
    const existingUser = users[userIndex];
    users[userIndex] = {
        ...existingUser,
        ...userData,
        password: userData.password || existingUser.password, // Keep old password if not provided
    };
    return { success: true };
}

export async function addUser(userData: Omit<User, 'id'>): Promise<{ success: boolean; message?: string; user?: Omit<User, 'password'> }> {
  if (users.some(u => u.email === userData.email)) {
    return { success: false, message: 'User with this email already exists.' };
  }
  const newUser = { ...userData, id: String(Date.now()) }; // Use timestamp for unique ID in mock
  users.push(newUser);
  const { password, ...userWithoutPassword } = newUser;
  return { success: true, user: userWithoutPassword };
}

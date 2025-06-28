import type { User } from './schemas';

// For this prototype, we'll store users in-memory.
// In a real app, this would be a database.
let users: User[] = [
  { id: '1', email: 'admin@example.com', password: 'password', role: 'admin' },
  { id: '2', email: 'user@example.com', password: 'password', role: 'user' },
];

// These are simple functions, not server actions.
export function dbGetUsers(): Omit<User, 'password'>[] {
  return users.map(({ password, ...user }) => user);
}

export function dbGetUserById(id: string): Omit<User, 'password'> | undefined {
    const user = users.find((u) => u.id === id);
    if (user) {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    return undefined;
}

export function dbUpdateUser(userData: Omit<User, 'password'> & { password?: string }): { success: boolean; message?: string } {
    const userIndex = users.findIndex((u) => u.id === userData.id);
    if (userIndex === -1) {
        return { success: false, message: 'User not found.' };
    }
    const existingUser = users[userIndex];
    users[userIndex] = {
        ...existingUser,
        ...userData,
        password: userData.password || existingUser.password,
    };
    return { success: true };
}

export function dbAddUser(userData: Omit<User, 'id'>): { success: boolean; message?: string; user?: Omit<User, 'password'> } {
  if (users.some(u => u.email === userData.email)) {
    return { success: false, message: 'User with this email already exists.' };
  }
  const newUser = { ...userData, id: String(Date.now()) };
  users.push(newUser);
  const { password, ...userWithoutPassword } = newUser;
  return { success: true, user: userWithoutPassword };
}









import sql from 'mssql';
import { getPool } from './database/db';
import type { User, NewUser } from './schemas';

export async function dbGetUsers(): Promise<Omit<User, 'password'>[]> {
  const pool = await getPool();
  const result = await pool.request().execute('sp_GetUsers');
  return result.recordset.map(record => ({
    id: String(record.UserID),
    email: record.Email,
    role: record.Role,
    isActive: record.IsActive,
    lastActive: record.LastActive,
    bitbucketUsername: record.BitbucketUsername,
    bitbucketAppPassword: record.BitbucketAppPassword
  }));
}

export async function dbGetUserByEmail(email: string): Promise<User | undefined> {
  const pool = await getPool();
  const result = await pool.request()
      .input('Email', sql.NVarChar, email)
      .execute('sp_GetUserByEmail');
  
  if (result.recordset.length > 0) {
      const userRecord = result.recordset[0];
      return {
          id: String(userRecord.UserID),
          email: userRecord.Email,
          password: userRecord.PasswordHash,
          role: userRecord.Role,
          isActive: userRecord.IsActive,
          lastActive: userRecord.LastActive,
          bitbucketUsername: userRecord.BitbucketUsername,
          bitbucketAppPassword: userRecord.BitbucketAppPassword
      };
  }
  return undefined;
}

export async function dbGetUserWithPassword(id: string): Promise<User | undefined> {
    const pool = await getPool();
    const result = await pool.request()
        .input('UserID', sql.Int, id)
        .execute('sp_GetUserByID'); // This SP returns the password hash

    if (result.recordset.length > 0) {
        const record = result.recordset[0];
        return {
            id: String(record.UserID),
            email: record.Email,
            password: record.PasswordHash,
            role: record.Role,
            isActive: record.IsActive,
            lastActive: record.LastActive,
            bitbucketUsername: record.BitbucketUsername,
            bitbucketAppPassword: record.BitbucketAppPassword
        };
    }
    return undefined;
}


export async function dbGetUserById(id: string): Promise<Omit<User, 'password'> | undefined> {
    const pool = await getPool();
    const result = await pool.request()
        .input('UserID', sql.Int, id)
        .execute('sp_GetUserByID');

    if (result.recordset.length > 0) {
        const record = result.recordset[0];
        return {
            id: String(record.UserID),
            email: record.Email,
            role: record.Role,
            isActive: record.IsActive,
            lastActive: record.LastActive,
            bitbucketUsername: record.BitbucketUsername,
            bitbucketAppPassword: record.BitbucketAppPassword
        };
    }
    return undefined;
}

export async function dbUpdateUserLastActive(userId: string): Promise<void> {
    const pool = await getPool();
    await pool.request()
        .input('UserID', sql.Int, userId)
        .execute('sp_UpdateUserLastActive');
}


export async function dbUpdateUser(userData: Partial<User> & { id: string }): Promise<{ success: boolean; message?: string }> {
    const pool = await getPool();
    const request = pool.request();

    // Always provide UserID
    request.input('UserID', sql.Int, userData.id);

    // Explicitly pass all potential parameters, sending NULL for any that are undefined.
    // This ensures the stored procedure call is always valid for partial updates.
    request.input('Email', sql.NVarChar, userData.email === undefined ? null : userData.email);
    request.input('PasswordHash', sql.NVarChar, userData.password === undefined ? null : userData.password);
    request.input('Role', sql.NVarChar, userData.role === undefined ? null : userData.role);
    request.input('IsActive', sql.Bit, userData.isActive === undefined ? null : userData.isActive);
    
    const result = await request.execute('sp_UpdateUser');

    if (result.recordset && result.recordset.length > 0 && result.recordset[0].Result === true) {
        return { success: true };
    }
    return { success: false, message: 'User not found or update failed.' };
}

export async function dbAddUser(userData: NewUser): Promise<{ success: boolean; message?: string; user?: Omit<User, 'password'> }> {
    const pool = await getPool();
    const result = await pool.request()
        .input('Email', sql.NVarChar, userData.email)
        .input('PasswordHash', sql.NVarChar, userData.password)
        .input('Role', sql.NVarChar, userData.role)
        .input('IsActive', sql.Bit, userData.isActive)
        .execute('sp_CreateUser');
    
    if (result.recordset && result.recordset.length > 0 && result.recordset[0].UserID > 0) {
        const newUser = await dbGetUserById(String(result.recordset[0].UserID));
        if (newUser) {
          return { success: true, user: newUser };
        }
    }
    
    return { success: false, message: 'User with this email already exists.' };
}


export async function dbUpdateUserBitbucketCreds(userId: string, username: string, token: string): Promise<{ success: boolean }> {
  const pool = await getPool();
  // In a production application, the token should be encrypted before being stored.
  await pool.request()
      .input('UserID', sql.Int, userId)
      .input('BitbucketUsername', sql.NVarChar, username)
      .input('BitbucketAppPassword', sql.NVarChar, token)
      .execute('sp_UpdateUserBitbucketCreds');
  return { success: true };
}

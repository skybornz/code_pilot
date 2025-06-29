'use server';

import sql from 'mssql';

const config: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE,
  options: {
    encrypt: process.env.NODE_ENV === 'production', // Use encryption for production
    trustServerCertificate: true, // Change to true for local dev / self-signed certs
  },
};

let pool: sql.ConnectionPool;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    try {
      pool = await sql.connect(config);
    } catch (err) {
      console.error('Database connection failed:', err);
      throw new Error(
        `Failed to connect to the database. Please check your DB_USER, DB_PASSWORD, DB_SERVER, and DB_DATABASE environment variables. Original error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  return pool;
}

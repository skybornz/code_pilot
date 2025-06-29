import sql from 'mssql';
import { getPool } from './database/db';
import type { User } from './schemas';

export type Activity = {
    id: string;
    name: string;
    type: 'AI Action' | 'Authentication' | 'File System';
};

export type UserActivityLog = {
    id: string;
    userId: string;
    activityId: string;
    details: string;
    timestamp: Date;
};

// This is the joined type we'll use in the application UI
export type UserActivity = {
    id: string; // This will be the UserActivityLog id
    activity: { name: string, type: string };
    details: string;
    timestamp: Date;
};

export type UsageStatistics = {
    totalActions: number;
    avgActionsPerUser: number;
    mostUsedFeature: string;
    filesAnalyzed: number;
    features: { name: string; actions: number }[];
    trend: { name:string; actions: number }[];
};


export async function dbGetUserActivity(userId: string): Promise<UserActivity[]> {
    const pool = await getPool();
    const result = await pool.request()
        .input('UserID', sql.Int, userId)
        .execute('sp_GetUserActivity');
    return result.recordset.map(record => ({
        id: record.LogID,
        activity: {
            name: record.ActivityName,
            type: record.ActivityType
        },
        details: record.Details,
        timestamp: record.Timestamp
    }));
}

export async function dbLogActivity(userId: string, activityName: string, details: string): Promise<void> {
    const pool = await getPool();

    // The activity might not exist, so we let the SP create it
    await pool.request()
        .input('UserID', sql.Int, userId)
        .input('ActivityName', sql.NVarChar, activityName)
        .input('Details', sql.NVarChar, details)
        .execute('sp_LogActivity');
}

export async function dbGetUsageStatistics(period: 'daily' | 'weekly' | 'monthly' | 'yearly'): Promise<UsageStatistics> {
    const pool = await getPool();
    const result = await pool.request()
        .input('Period', sql.NVarChar, period)
        .execute('sp_GetUsageStatistics');

    const mainStats = result.recordsets[0][0];
    const features = result.recordsets[1];
    const trend = result.recordsets[2];

    return {
        totalActions: mainStats?.TotalActions || 0,
        avgActionsPerUser: mainStats?.AvgActionsPerUser || 0,
        mostUsedFeature: mainStats?.MostUsedFeature || 'N/A',
        filesAnalyzed: mainStats?.FilesAnalyzed || 0,
        features: features.map(f => ({ name: f.Name, actions: f.Actions })),
        trend: trend.map(t => ({ name: t.Name, actions: t.Actions })),
    };
}

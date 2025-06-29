'use server';

import { dbGetUserActivity, dbLogActivity, type UserActivity } from '@/lib/activity-database';

export async function getUserActivity(userId: string): Promise<UserActivity[]> {
  return dbGetUserActivity(userId);
}

export async function logUserActivity(userId: string, activityName: string, details: string) {
  try {
    await dbLogActivity(userId, activityName, details);
    return { success: true };
  } catch (error) {
    console.error(`Failed to log activity: ${error}`);
    // In a real app, you might want more sophisticated error handling
    return { success: false, message: 'Failed to log activity' };
  }
}

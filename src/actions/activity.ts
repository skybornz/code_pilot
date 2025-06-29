'use server';

import { dbGetUserActivity, type UserActivity } from '@/lib/activity-database';

export async function getUserActivity(userId: string): Promise<UserActivity[]> {
  return dbGetUserActivity(userId);
}

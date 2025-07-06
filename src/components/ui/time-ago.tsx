'use client';

import { formatDistanceToNow } from 'date-fns';

interface TimeAgoProps {
  date: string | Date;
  addSuffix?: boolean;
}

export function TimeAgo({ date, addSuffix = true }: TimeAgoProps) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      return null;
    }
    const timeAgo = formatDistanceToNow(dateObj, { addSuffix });
    return <>{timeAgo}</>;
}

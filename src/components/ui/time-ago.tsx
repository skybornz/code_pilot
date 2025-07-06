'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface TimeAgoProps {
  date: string | Date;
  addSuffix?: boolean;
}

export function TimeAgo({ date, addSuffix = true }: TimeAgoProps) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    // This effect runs only on the client, after hydration
    const dateObj = typeof date === 'string' ? new Date(date) : date;
     if (isNaN(dateObj.getTime())) {
      // Don't set anything for invalid dates
      return;
    }
    setTimeAgo(formatDistanceToNow(dateObj, { addSuffix }));
  }, [date, addSuffix]);

  if (!timeAgo) {
    // Render nothing on the server and initial client render
    return null; 
  }

  return <>{timeAgo}</>;
}

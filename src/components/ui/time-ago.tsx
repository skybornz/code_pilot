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
    // This effect runs only on the client, after hydration.
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!isNaN(dateObj.getTime())) {
      setTimeAgo(formatDistanceToNow(dateObj, { addSuffix }));
    }
  }, [date, addSuffix]);

  // Render nothing on the server and on the initial client render to avoid hydration mismatch.
  if (!timeAgo) {
    return null;
  }

  // Render the formatted time only after the effect has run on the client.
  return <>{timeAgo}</>;
}

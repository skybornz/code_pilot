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
    activity: Activity;
    details: string;
    timestamp: Date;
};

const activities: Activity[] = [
    { id: '1', name: 'Login', type: 'Authentication' },
    { id: '2', name: 'View File', type: 'File System' },
    { id: '3', name: 'Chat', type: 'AI Action' },
    { id: '4', name: 'Explain Code', type: 'AI Action' },
    { id: '5', name: 'Refactor Code', type: 'AI Action' },
    { id: '6', name: 'Find Bugs', type: 'AI Action' },
    { id: '7', name: 'Generate Test', type: 'AI Action' },
    { id: '8', name: 'Generate Docs', type: 'AI Action' },
    { id: '9', name: 'Generate SDD', type: 'AI Action' },
    { id: '10', name: 'Analyze Diff', type: 'AI Action' },
];

// This acts as our "UserActivityLog" database table.
const mockUserActivityLogs: UserActivityLog[] = [
    // Mock logs for user '1' (admin)
    { id: '101', userId: '1', activityId: '1', details: 'User logged in successfully', timestamp: new Date(Date.now() - 1000 * 60 * 3) },
    { id: '102', userId: '1', activityId: '2', details: 'Viewed user-details-dashboard.tsx', timestamp: new Date(Date.now() - 1000 * 60 * 10) },
    { id: '103', userId: '1', activityId: '4', details: 'Explained code in user-details-dashboard.tsx', timestamp: new Date(Date.now() - 1000 * 60 * 12) },

    // Mock logs for user '2' (user)
    { id: '201', userId: '2', activityId: '1', details: 'User logged in successfully', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) },
    { id: '202', userId: '2', activityId: '2', details: 'Viewed button.tsx', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23) },
    { id: '203', userId: '2', activityId: '6', details: 'Found bugs in styles.css', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 22) },
    { id: '204', userId: '2', activityId: '5', details: 'Refactored code in utils.js', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 21) },
    { id: '205', userId: '2', activityId: '3', details: 'Asked about python syntax', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20) },
    { id: '206', userId: '2', activityId: '7', details: 'Generated unit test for utils.js', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 19) },
];

function generateMockActivitiesForUser(userId: string): UserActivityLog[] {
    const aiActions = activities.filter(a => a.type === 'AI Action');
    const generatedLogs: UserActivityLog[] = [];

    // Add a login event
    generatedLogs.push({
        id: `gen-${userId}-${Date.now()}-login`,
        userId,
        activityId: '1',
        details: 'User logged in successfully',
        timestamp: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 7)
    });

    // Add some random AI actions
    for (let i = 0; i < 14; i++) {
        const randomAiAction = aiActions[Math.floor(Math.random() * aiActions.length)];
        generatedLogs.push({
            id: `gen-${userId}-${Date.now()}-${i}`,
            userId,
            activityId: randomAiAction.id,
            details: `Used ${randomAiAction.name} on a file.`,
            timestamp: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 7)
        });
    }

    return generatedLogs;
}


export function dbGetUserActivity(userId: string): UserActivity[] {
    if (!userId) return [];
    
    // In a real app, you would fetch this from a database and join.
    // For this mock, we'll generate logs on the fly if they don't exist for a given user.
    let userLogs = mockUserActivityLogs.filter(log => log.userId === userId);
    if (userLogs.length === 0) {
        userLogs = generateMockActivitiesForUser(userId);
        mockUserActivityLogs.push(...userLogs);
    }
    
    const activitiesMap = new Map(activities.map(a => [a.id, a]));

    const joinedActivities: UserActivity[] = userLogs.map(log => {
        const activity = activitiesMap.get(log.activityId);
        if (!activity) {
            // This case should ideally not happen with good data integrity
            return null;
        }
        return {
            id: log.id,
            activity,
            details: log.details,
            timestamp: log.timestamp,
        };
    }).filter((a): a is UserActivity => a !== null)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return joinedActivities;
}

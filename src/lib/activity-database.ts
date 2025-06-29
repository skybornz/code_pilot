export type UserActivity = {
    id: string;
    action: string;
    details: string;
    timestamp: Date;
};

const MOCK_ACTIONS = [
    { action: 'AI Action', details: 'Explained code in button.tsx' },
    { action: 'AI Action', details: 'Generated unit test for utils.js' },
    { action: 'File View', details: 'Viewed styles.css' },
    { action: 'AI Action', details: 'Found bugs in styles.css' },
    { action: 'Login', details: 'User logged in successfully' },
    { action: 'AI Action', details: 'Refactored code in server.py' },
    { action: 'Chat', details: 'Started a new chat session' },
];

export function dbGetUserActivity(userId: string): UserActivity[] {
    // In a real app, you would fetch this from a database.
    // Here we generate random mock data for demonstration.
    if (!userId) return [];

    return Array.from({ length: 15 }, (_, i) => {
        const randomAction = MOCK_ACTIONS[Math.floor(Math.random() * MOCK_ACTIONS.length)];
        return {
            id: `${userId}-${Date.now()}-${i}`,
            ...randomAction,
            timestamp: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 7), // random time in the last 7 days
        };
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

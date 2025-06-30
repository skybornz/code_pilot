-- This script seeds the database with initial data required for the application.
-- It is safe to run this script multiple times; it will not create duplicate entries.

-- Seed Activities Table
-- This ensures that the basic activities are present in the database when the application starts.

IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Login')
BEGIN
    INSERT INTO Activities (Name, Type) VALUES ('Login', 'Authentication');
END

IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Explain Code')
BEGIN
    INSERT INTO Activities (Name, Type) VALUES ('Explain Code', 'AI Action');
END

IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Refactor Code')
BEGIN
    INSERT INTO Activities (Name, Type) VALUES ('Refactor Code', 'AI Action');
END

IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Find Bugs')
BEGIN
    INSERT INTO Activities (Name, Type) VALUES ('Find Bugs', 'AI Action');
END

IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Generate Test')
BEGIN
    INSERT INTO Activities (Name, Type) VALUES ('Generate Test', 'AI Action');
END

IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Generate Docs')
BEGIN
    INSERT INTO Activities (Name, Type) VALUES ('Generate Docs', 'AI Action');
END

IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Generate SDD')
BEGIN
    INSERT INTO Activities (Name, Type) VALUES ('Generate SDD', 'AI Action');
END

IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Analyze Diff')
BEGIN
    INSERT INTO Activities (Name, Type) VALUES ('Analyze Diff', 'AI Action');
END

IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Co-Pilot Chat')
BEGIN
    INSERT INTO Activities (Name, Type) VALUES ('Co-Pilot Chat', 'Authentication');
END

IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'AI Assistant Chat')
BEGIN
    INSERT INTO Activities (Name, Type) VALUES ('AI Assistant Chat', 'Authentication');
END

IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Password Change')
BEGIN
    INSERT INTO Activities (Name, Type) VALUES ('Password Change', 'Authentication');
END

IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Update Profile')
BEGIN
    INSERT INTO Activities (Name, Type) VALUES ('Update Profile', 'Authentication');
END

GO

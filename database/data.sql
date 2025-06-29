-- This script contains default data to populate the tables.
-- It should be run after schema.sql.

-- Default Activities (The system will add new AI actions automatically)
-- Type: AI Action, Authentication, File System, Profile Update
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Login')
        INSERT INTO Activities (Name, Type) VALUES ('Login', 'Authentication');
    IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Password Change')
        INSERT INTO Activities (Name, Type) VALUES ('Password Change', 'Authentication');
    IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Update Profile')
        INSERT INTO Activities (Name, Type) VALUES ('Update Profile', 'Profile Update');
    IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Explain Code')
        INSERT INTO Activities (Name, Type) VALUES ('Explain Code', 'AI Action');
    IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Refactor Code')
        INSERT INTO Activities (Name, Type) VALUES ('Refactor Code', 'AI Action');
    IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Find Bugs')
        INSERT INTO Activities (Name, Type) VALUES ('Find Bugs', 'AI Action');
    IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Generate Test')
        INSERT INTO Activities (Name, Type) VALUES ('Generate Test', 'AI Action');
    IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Generate Comments')
        INSERT INTO Activities (Name, Type) VALUES ('Generate Comments', 'AI Action');
    IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Generate SDD')
        INSERT INTO Activities (Name, Type) VALUES ('Generate SDD', 'AI Action');
    IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Analyze Diff')
        INSERT INTO Activities (Name, Type) VALUES ('Analyze Diff', 'AI Action');
    IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Co-Pilot Chat')
        INSERT INTO Activities (Name, Type) VALUES ('Co-Pilot Chat', 'AI Action');
END
GO

-- Default User (admin/password)
-- The password 'password' will be hashed by the application logic upon first login.
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'admin@example.com')
        INSERT INTO Users (Email, PasswordHash, Role, IsActive)
        VALUES ('admin@example.com', 'password', 'admin', 1);
END
GO

-- Default Model
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Models)
        INSERT INTO Models (Name, Type, IsDefault)
        VALUES ('gemini-1.5-flash-latest', 'online', 1);
END
GO

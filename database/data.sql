-- Clear existing data in a safe order (respecting foreign key constraints)
DELETE FROM UserActivityLog;
DELETE FROM Activities;
DELETE FROM Projects;
DELETE FROM Models;
DELETE FROM Users;
GO

-- Reset identity columns to start fresh
DBCC CHECKIDENT ('Users', RESEED, 0);
DBCC CHECKIDENT ('Projects', RESEED, 0);
DBCC CHECKIDENT ('Activities', RESEED, 0);
DBCC CHECKIDENT ('UserActivityLog', RESEED, 0);
DBCC CHECKIDENT ('Models', RESEED, 0);
GO


-- Seed Users
-- Note: The password for both users is 'password'. In a real app, use a more secure, unique password.
-- This hash was generated using bcrypt with 10 salt rounds for the string 'password'.
INSERT INTO Users (Email, PasswordHash, Role, IsActive) VALUES
('admin@samsung.com', '$2b$10$9sZ/..EmdE/25B4S4A4h.uI8f1YhLzBeKj9bE.wzJzQGq7hR.x.Oq', 'admin', 1),
('user@samsung.com', '$2b$10$9sZ/..EmdE/25B4S4A4h.uI8f1YhLzBeKj9bE.wzJzQGq7hR.x.Oq', 'user', 1);
GO

-- Seed Activities
INSERT INTO Activities (Name, Type) VALUES
('Login', 'Authentication'),
('Logout', 'Authentication'),
('Password Change', 'Profile'),
('Update Profile', 'Profile'),
('Explain Code', 'AI Action'),
('Find Bugs', 'AI Action'),
('Refactor Code', 'AI Action'),
('Generate Unit Test', 'AI Action'),
('Generate Comments', 'AI Action'),
('Generate SDD', 'AI Action'),
('Analyze Diff', 'AI Action'),
('Co-Pilot Chat', 'AI Action'),
('AI Assistant Chat', 'AI Action');
GO

-- Seed Models
INSERT INTO Models (Name, Type, IsDefault) VALUES
('gemini-1.5-flash-latest', 'online', 1);
GO

PRINT 'Seed data has been successfully inserted.';
GO

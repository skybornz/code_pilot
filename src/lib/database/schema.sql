-- Make sure to create the database before running this script.
-- USE YourDatabaseName;

-- =================================================================
-- 1. Table Creation
-- =================================================================

-- Users Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Users] (
        [UserID] INT IDENTITY(1,1) PRIMARY KEY,
        [Email] NVARCHAR(255) NOT NULL UNIQUE,
        [PasswordHash] NVARCHAR(255) NOT NULL,
        [Role] NVARCHAR(50) NOT NULL CHECK ([Role] IN ('admin', 'user')),
        [IsActive] BIT NOT NULL DEFAULT 1,
        [LastActive] DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );
END
GO

-- Projects Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Projects]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Projects] (
        [ProjectID] INT IDENTITY(1,1) PRIMARY KEY,
        [UserID] INT NOT NULL,
        [Name] NVARCHAR(100) NOT NULL,
        [URL] NVARCHAR(512) NOT NULL,
        CONSTRAINT FK_Projects_Users FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
        CONSTRAINT UQ_User_Project_URL UNIQUE (UserID, URL)
    );
END
GO

-- Activities Master Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Activities]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Activities] (
        [ActivityID] INT IDENTITY(1,1) PRIMARY KEY,
        [Name] NVARCHAR(100) NOT NULL UNIQUE,
        [Type] NVARCHAR(50) NOT NULL
    );
END
GO

-- UserActivityLog Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserActivityLog]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[UserActivityLog] (
        [LogID] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [UserID] INT NOT NULL,
        [ActivityID] INT NOT NULL,
        [Details] NVARCHAR(1024) NULL,
        [Timestamp] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_ActivityLog_Users FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
        CONSTRAINT FK_ActivityLog_Activities FOREIGN KEY (ActivityID) REFERENCES Activities(ActivityID)
    );
END
GO

-- ModelSettings Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ModelSettings]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ModelSettings] (
        [ModelID] INT IDENTITY(1,1) PRIMARY KEY,
        [Name] NVARCHAR(100) NOT NULL UNIQUE,
        [Type] NVARCHAR(50) NOT NULL CHECK ([Type] IN ('online')),
        [IsDefault] BIT NOT NULL DEFAULT 0
    );
END
GO

-- =================================================================
-- 2. Master Data Insertion
-- =================================================================

-- Populate Activities table
MERGE INTO Activities AS Target
USING (VALUES
    (1, 'Login', 'Authentication'),
    (2, 'View File', 'File System'),
    (3, 'Chat', 'AI Action'),
    (4, 'Explain Code', 'AI Action'),
    (5, 'Refactor Code', 'AI Action'),
    (6, 'Find Bugs', 'AI Action'),
    (7, 'Generate Test', 'AI Action'),
    (8, 'Generate Docs', 'AI Action'),
    (9, 'Generate SDD', 'AI Action'),
    (10, 'Analyze Diff', 'AI Action')
) AS Source (ActivityID, Name, Type)
ON Target.ActivityID = Source.ActivityID
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Name, Type) VALUES (Source.Name, Source.Type)
WHEN MATCHED THEN
    UPDATE SET Name = Source.Name, Type = Source.Type;
GO

-- Populate initial Users
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = 'admin@example.com')
BEGIN
    INSERT INTO dbo.Users (Email, PasswordHash, Role, IsActive, LastActive)
    VALUES ('admin@example.com', 'password', 'admin', 1, GETUTCDATE());
END
GO
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = 'user@example.com')
BEGIN
    INSERT INTO dbo.Users (Email, PasswordHash, Role, IsActive, LastActive)
    VALUES ('user@example.com', 'password', 'user', 1, GETUTCDATE());
END
GO

-- Populate initial model
IF NOT EXISTS (SELECT 1 FROM dbo.ModelSettings)
BEGIN
    INSERT INTO dbo.ModelSettings (Name, Type, IsDefault)
    VALUES ('Gemini (Cloud)', 'online', 1);
END
GO


-- =================================================================
-- 3. Stored Procedures
-- =================================================================

-- Users Stored Procedures
CREATE OR ALTER PROCEDURE sp_GetUsers
AS
BEGIN
    SELECT UserID, Email, Role, IsActive, LastActive FROM dbo.Users ORDER BY Email;
END
GO

CREATE OR ALTER PROCEDURE sp_GetUserByEmail
    @Email NVARCHAR(255)
AS
BEGIN
    SELECT UserID, Email, PasswordHash, Role, IsActive, LastActive FROM dbo.Users WHERE Email = @Email;
END
GO

CREATE OR ALTER PROCEDURE sp_GetUserByID
    @UserID INT
AS
BEGIN
    SELECT UserID, Email, Role, IsActive, LastActive FROM dbo.Users WHERE UserID = @UserID;
END
GO

CREATE OR ALTER PROCEDURE sp_AddUser
    @Email NVARCHAR(255),
    @PasswordHash NVARCHAR(255),
    @Role NVARCHAR(50),
    @IsActive BIT
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = @Email)
    BEGIN
        INSERT INTO dbo.Users (Email, PasswordHash, Role, IsActive, LastActive)
        VALUES (@Email, @PasswordHash, @Role, @IsActive, GETUTCDATE());
        SELECT SCOPE_IDENTITY() AS UserID;
    END
    ELSE
    BEGIN
        SELECT -1 AS UserID; -- Indicates user already exists
    END
END
GO

CREATE OR ALTER PROCEDURE sp_UpdateUser
    @UserID INT,
    @Email NVARCHAR(255),
    @PasswordHash NVARCHAR(255) = NULL,
    @Role NVARCHAR(50),
    @IsActive BIT
AS
BEGIN
    UPDATE dbo.Users
    SET
        Email = @Email,
        PasswordHash = ISNULL(@PasswordHash, PasswordHash),
        Role = @Role,
        IsActive = @IsActive
    WHERE UserID = @UserID;
    SELECT @@ROWCOUNT AS Result;
END
GO

CREATE OR ALTER PROCEDURE sp_UpdateUserLastActive
    @UserID INT
AS
BEGIN
    UPDATE dbo.Users
    SET LastActive = GETUTCDATE()
    WHERE UserID = @UserID;
END
GO


-- Projects Stored Procedures
CREATE OR ALTER PROCEDURE sp_GetProjectsByUser
    @UserID INT
AS
BEGIN
    SELECT ProjectID, UserID, Name, URL FROM dbo.Projects WHERE UserID = @UserID ORDER BY Name;
END
GO

CREATE OR ALTER PROCEDURE sp_AddProject
    @UserID INT,
    @Name NVARCHAR(100),
    @URL NVARCHAR(512)
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.Projects WHERE UserID = @UserID AND URL = @URL)
    BEGIN
        INSERT INTO dbo.Projects (UserID, Name, URL)
        VALUES (@UserID, @Name, @URL);
        SELECT ProjectID, UserID, Name, URL FROM dbo.Projects WHERE ProjectID = SCOPE_IDENTITY();
        RETURN 0;
    END
    ELSE
    BEGIN
        RETURN -1; -- Duplicate project for user
    END
END
GO

CREATE OR ALTER PROCEDURE sp_DeleteProject
    @ProjectID INT,
    @UserID INT
AS
BEGIN
    -- Ensure user can only delete their own projects
    DELETE FROM dbo.Projects WHERE ProjectID = @ProjectID AND UserID = @UserID;
END
GO


-- Models Stored Procedures
CREATE OR ALTER PROCEDURE sp_GetModels
AS
BEGIN
    -- Ensure there's always one default if models exist
    IF (SELECT COUNT(*) FROM dbo.ModelSettings) > 0 AND (SELECT COUNT(*) FROM dbo.ModelSettings WHERE IsDefault = 1) = 0
    BEGIN
        DECLARE @TopModelID INT;
        SELECT TOP 1 @TopModelID = ModelID FROM dbo.ModelSettings ORDER BY ModelID;
        UPDATE dbo.ModelSettings SET IsDefault = 0;
        UPDATE dbo.ModelSettings SET IsDefault = 1 WHERE ModelID = @TopModelID;
    END
    SELECT ModelID, Name, Type, IsDefault FROM dbo.ModelSettings ORDER BY Name;
END
GO

CREATE OR ALTER PROCEDURE sp_AddModel
    @Name NVARCHAR(100),
    @Type NVARCHAR(50)
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.ModelSettings WHERE Name = @Name)
    BEGIN
        -- If this is the first model, make it default
        DECLARE @IsDefault BIT = 0;
        IF (SELECT COUNT(*) FROM dbo.ModelSettings) = 0
        BEGIN
            SET @IsDefault = 1;
        END

        INSERT INTO dbo.ModelSettings (Name, Type, IsDefault)
        VALUES (@Name, @Type, @IsDefault);
        
        SELECT ModelID, Name, Type, IsDefault FROM dbo.ModelSettings WHERE ModelID = SCOPE_IDENTITY();
        RETURN 0;
    END
    ELSE
    BEGIN
        RETURN -1; -- Duplicate name
    END
END
GO

CREATE OR ALTER PROCEDURE sp_UpdateModel
    @ModelID INT,
    @Name NVARCHAR(100),
    @Type NVARCHAR(50)
AS
BEGIN
    UPDATE dbo.ModelSettings
    SET Name = @Name, Type = @Type
    WHERE ModelID = @ModelID;
    RETURN 0;
END
GO

CREATE OR ALTER PROCEDURE sp_SetDefaultModel
    @ModelID INT
AS
BEGIN
    BEGIN TRANSACTION;
    UPDATE dbo.ModelSettings SET IsDefault = 0;
    UPDATE dbo.ModelSettings SET IsDefault = 1 WHERE ModelID = @ModelID;
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE sp_DeleteModel
    @ModelID INT
AS
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.ModelSettings WHERE ModelID = @ModelID AND IsDefault = 1)
    BEGIN
        RETURN -1; -- Cannot delete default model
    END
    
    DELETE FROM dbo.ModelSettings WHERE ModelID = @ModelID;
    RETURN 0;
END
GO


-- Activity Log Stored Procedures
CREATE OR ALTER PROCEDURE sp_GetUserActivity
    @UserID INT
AS
BEGIN
    SELECT
        l.LogID,
        a.Name AS ActivityName,
        a.Type AS ActivityType,
        l.Details,
        l.Timestamp
    FROM
        dbo.UserActivityLog l
    JOIN
        dbo.Activities a ON l.ActivityID = a.ActivityID
    WHERE
        l.UserID = @UserID
    ORDER BY
        l.Timestamp DESC;
END
GO

CREATE OR ALTER PROCEDURE sp_LogActivity
    @UserID INT,
    @ActivityName NVARCHAR(100),
    @Details NVARCHAR(1024)
AS
BEGIN
    DECLARE @ActivityID INT;
    SELECT @ActivityID = ActivityID FROM dbo.Activities WHERE Name = @ActivityName;

    IF @ActivityID IS NOT NULL
    BEGIN
        INSERT INTO dbo.UserActivityLog (UserID, ActivityID, Details, Timestamp)
        VALUES (@UserID, @ActivityID, @Details, GETUTCDATE());
    END
END
GO

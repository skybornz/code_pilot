-- Create Tables if they don't exist
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY(1,1),
    Email NVARCHAR(255) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role NVARCHAR(50) NOT NULL CHECK (Role IN ('admin', 'user')),
    IsActive BIT NOT NULL DEFAULT 1,
    LastActive DATETIME2 DEFAULT GETDATE()
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Projects' and xtype='U')
CREATE TABLE Projects (
    ProjectID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL,
    Name NVARCHAR(255) NOT NULL,
    URL NVARCHAR(2048) NOT NULL,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    UNIQUE (UserID, URL)
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ModelSettings' and xtype='U')
CREATE TABLE ModelSettings (
    ModelID INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(255) NOT NULL UNIQUE,
    Type NVARCHAR(50) NOT NULL CHECK (Type IN ('online', 'local')),
    IsDefault BIT NOT NULL DEFAULT 0
);
ELSE
BEGIN
    -- Add Type column if it doesn't exist
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'Type' AND Object_ID = Object_ID(N'ModelSettings'))
    BEGIN
        ALTER TABLE ModelSettings ADD Type NVARCHAR(50) NOT NULL DEFAULT 'online';
        ALTER TABLE ModelSettings ADD CONSTRAINT CHK_ModelType CHECK (Type IN ('online', 'local'));
    END
END

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ActivityTypes' and xtype='U')
CREATE TABLE ActivityTypes (
    ActivityID INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) NOT NULL UNIQUE,
    Type NVARCHAR(50) NOT NULL CHECK (Type IN ('AI Action', 'Authentication', 'File System', 'Admin Action'))
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UserActivityLog' and xtype='U')
CREATE TABLE UserActivityLog (
    LogID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL,
    ActivityID INT NOT NULL,
    Details NVARCHAR(MAX),
    Timestamp DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (ActivityID) REFERENCES ActivityTypes(ActivityID)
);
GO

-- Seed ActivityTypes data
MERGE INTO ActivityTypes AS target
USING (VALUES
    ('Explain Code', 'AI Action'),
    ('Find Bugs', 'AI Action'),
    ('Refactor Code', 'AI Action'),
    ('Generate Test', 'AI Action'),
    ('Generate Docs', 'AI Action'),
    ('Generate SDD', 'AI Action'),
    ('Analyze Diff', 'AI Action'),
    ('Login', 'Authentication'),
    ('Logout', 'Authentication'),
    ('Password Change', 'Authentication')
) AS source (Name, Type)
ON target.Name = source.Name
WHEN NOT MATCHED THEN
    INSERT (Name, Type) VALUES (source.Name, source.Type);
GO

-- Stored Procedures
-- Drop and Create pattern for idempotency

-- ====== User Stored Procedures ======

IF OBJECT_ID('sp_AddUser', 'P') IS NOT NULL DROP PROCEDURE sp_AddUser;
GO
CREATE PROCEDURE sp_AddUser
    @Email NVARCHAR(255),
    @PasswordHash NVARCHAR(255),
    @Role NVARCHAR(50),
    @IsActive BIT
AS
BEGIN
    IF EXISTS (SELECT 1 FROM Users WHERE Email = @Email)
    BEGIN
        SELECT -1 AS UserID; -- Indicates user already exists
        RETURN;
    END

    INSERT INTO Users (Email, PasswordHash, Role, IsActive)
    VALUES (@Email, @PasswordHash, @Role, @IsActive);

    SELECT SCOPE_IDENTITY() AS UserID;
END
GO


IF OBJECT_ID('sp_GetUsers', 'P') IS NOT NULL DROP PROCEDURE sp_GetUsers;
GO
CREATE PROCEDURE sp_GetUsers
AS
BEGIN
    SELECT UserID, Email, Role, IsActive, LastActive
    FROM Users;
END
GO


IF OBJECT_ID('sp_GetUserByEmail', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserByEmail;
GO
CREATE PROCEDURE sp_GetUserByEmail
    @Email NVARCHAR(255)
AS
BEGIN
    SELECT UserID, Email, PasswordHash, Role, IsActive, LastActive
    FROM Users
    WHERE Email = @Email;
END
GO


IF OBJECT_ID('sp_GetUserByID', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserByID;
GO
CREATE PROCEDURE sp_GetUserByID
    @UserID INT
AS
BEGIN
    SELECT UserID, Email, PasswordHash, Role, IsActive, LastActive
    FROM Users
    WHERE UserID = @UserID;
END
GO


IF OBJECT_ID('sp_UpdateUser', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateUser;
GO
CREATE PROCEDURE sp_UpdateUser
    @UserID INT,
    @Email NVARCHAR(255) = NULL,
    @PasswordHash NVARCHAR(255) = NULL,
    @Role NVARCHAR(50) = NULL,
    @IsActive BIT = NULL
AS
BEGIN
    -- Check for email uniqueness if email is being changed
    IF @Email IS NOT NULL AND EXISTS (SELECT 1 FROM Users WHERE Email = @Email AND UserID != @UserID)
    BEGIN
        SELECT CAST(0 AS BIT) AS Result;
        RETURN;
    END

    UPDATE Users
    SET
        Email = ISNULL(@Email, Email),
        PasswordHash = ISNULL(@PasswordHash, PasswordHash),
        Role = ISNULL(@Role, Role),
        IsActive = ISNULL(@IsActive, IsActive)
    WHERE UserID = @UserID;
    
    SELECT CAST(1 AS BIT) AS Result;
END
GO


IF OBJECT_ID('sp_UpdateUserLastActive', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateUserLastActive;
GO
CREATE PROCEDURE sp_UpdateUserLastActive
    @UserID INT
AS
BEGIN
    UPDATE Users
    SET LastActive = GETDATE()
    WHERE UserID = @UserID;
END
GO

-- ====== Project Stored Procedures ======

IF OBJECT_ID('sp_AddProject', 'P') IS NOT NULL DROP PROCEDURE sp_AddProject;
GO
CREATE PROCEDURE sp_AddProject
    @UserID INT,
    @Name NVARCHAR(255),
    @URL NVARCHAR(2048)
AS
BEGIN
    IF EXISTS (SELECT 1 FROM Projects WHERE UserID = @UserID AND URL = @URL)
    BEGIN
        RETURN 1; -- Duplicate project for this user
    END
    
    INSERT INTO Projects (UserID, Name, URL)
    VALUES (@UserID, @Name, @URL);
    
    SELECT ProjectID, UserID, Name, URL FROM Projects WHERE ProjectID = SCOPE_IDENTITY();
    RETURN 0;
END
GO


IF OBJECT_ID('sp_GetProjectsByUser', 'P') IS NOT NULL DROP PROCEDURE sp_GetProjectsByUser;
GO
CREATE PROCEDURE sp_GetProjectsByUser
    @UserID INT
AS
BEGIN
    SELECT ProjectID, UserID, Name, URL
    FROM Projects
    WHERE UserID = @UserID;
END
GO


IF OBJECT_ID('sp_DeleteProject', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteProject;
GO
CREATE PROCEDURE sp_DeleteProject
    @ProjectID INT,
    @UserID INT
AS
BEGIN
    DELETE FROM Projects
    WHERE ProjectID = @ProjectID AND UserID = @UserID;
END
GO


-- ====== Model Settings Stored Procedures ======

IF OBJECT_ID('sp_GetModels', 'P') IS NOT NULL DROP PROCEDURE sp_GetModels;
GO
CREATE PROCEDURE sp_GetModels
AS
BEGIN
    SELECT ModelID, Name, Type, IsDefault FROM ModelSettings ORDER BY IsDefault DESC, Name ASC;
END
GO


IF OBJECT_ID('sp_GetDefaultModel', 'P') IS NOT NULL DROP PROCEDURE sp_GetDefaultModel;
GO
CREATE PROCEDURE sp_GetDefaultModel
AS
BEGIN
    SELECT ModelID, Name, Type, IsDefault FROM ModelSettings WHERE IsDefault = 1;
END
GO


IF OBJECT_ID('sp_AddModel', 'P') IS NOT NULL DROP PROCEDURE sp_AddModel;
GO
CREATE PROCEDURE sp_AddModel
    @Name NVARCHAR(255),
    @Type NVARCHAR(50)
AS
BEGIN
    IF EXISTS (SELECT 1 FROM ModelSettings WHERE Name = @Name)
    BEGIN
        RETURN 1; -- Model with this name already exists
    END

    -- If this is the first model, make it the default
    DECLARE @IsDefault BIT = 0;
    IF (SELECT COUNT(*) FROM ModelSettings) = 0
    BEGIN
        SET @IsDefault = 1;
    END

    INSERT INTO ModelSettings (Name, Type, IsDefault) VALUES (@Name, @Type, @IsDefault);
    
    SELECT ModelID, Name, Type, IsDefault FROM ModelSettings WHERE ModelID = SCOPE_IDENTITY();
    RETURN 0;
END
GO


IF OBJECT_ID('sp_UpdateModel', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateModel;
GO
CREATE PROCEDURE sp_UpdateModel
    @ModelID INT,
    @Name NVARCHAR(255),
    @Type NVARCHAR(50)
AS
BEGIN
    IF EXISTS (SELECT 1 FROM ModelSettings WHERE Name = @Name AND ModelID != @ModelID)
    BEGIN
        RETURN 1; -- Another model with this name already exists
    END

    UPDATE ModelSettings SET Name = @Name, Type = @Type WHERE ModelID = @ModelID;
    
    IF @@ROWCOUNT = 0
    BEGIN
        RETURN 2; -- Model not found
    END
    
    RETURN 0;
END
GO


IF OBJECT_ID('sp_DeleteModel', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteModel;
GO
CREATE PROCEDURE sp_DeleteModel
    @ModelID INT
AS
BEGIN
    IF EXISTS (SELECT 1 FROM ModelSettings WHERE ModelID = @ModelID AND IsDefault = 1)
    BEGIN
        RETURN 1; -- Cannot delete default model
    END
    
    DELETE FROM ModelSettings WHERE ModelID = @ModelID;
    RETURN 0;
END
GO


IF OBJECT_ID('sp_SetDefaultModel', 'P') IS NOT NULL DROP PROCEDURE sp_SetDefaultModel;
GO
CREATE PROCEDURE sp_SetDefaultModel
    @ModelID INT
AS
BEGIN
    BEGIN TRANSACTION;
    UPDATE ModelSettings SET IsDefault = 0 WHERE IsDefault = 1;
    UPDATE ModelSettings SET IsDefault = 1 WHERE ModelID = @ModelID;
    COMMIT TRANSACTION;
END
GO


-- ====== Activity Log Stored Procedures ======

IF OBJECT_ID('sp_LogActivity', 'P') IS NOT NULL DROP PROCEDURE sp_LogActivity;
GO
CREATE PROCEDURE sp_LogActivity
    @UserID INT,
    @ActivityName NVARCHAR(100),
    @Details NVARCHAR(MAX)
AS
BEGIN
    DECLARE @ActivityID INT;
    SELECT @ActivityID = ActivityID FROM ActivityTypes WHERE Name = @ActivityName;

    IF @ActivityID IS NOT NULL
    BEGIN
        INSERT INTO UserActivityLog (UserID, ActivityID, Details)
        VALUES (@UserID, @ActivityID, @Details);
    END
END
GO


IF OBJECT_ID('sp_GetUserActivity', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserActivity;
GO
CREATE PROCEDURE sp_GetUserActivity
    @UserID INT
AS
BEGIN
    SELECT 
        l.LogID, 
        a.Name as ActivityName, 
        a.Type as ActivityType, 
        l.Details, 
        l.Timestamp
    FROM UserActivityLog l
    JOIN ActivityTypes a ON l.ActivityID = a.ActivityID
    WHERE l.UserID = @UserID
    ORDER BY l.Timestamp DESC;
END
GO
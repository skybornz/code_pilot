-- This script is idempotent and can be run safely on an existing database.

-- Users Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[Users](
	[UserID] [int] IDENTITY(1,1) NOT NULL,
	[Email] [nvarchar](255) NOT NULL,
	[PasswordHash] [nvarchar](255) NOT NULL,
	[Role] [nvarchar](50) NOT NULL,
	[IsActive] [bit] NOT NULL,
	[LastActive] [datetime] NOT NULL,
 CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([UserID] ASC),
 CONSTRAINT [UQ_Users_Email] UNIQUE NONCLUSTERED ([Email] ASC)
)
END
GO

-- Projects Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Projects]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[Projects](
	[ProjectID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NOT NULL,
	[Name] [nvarchar](100) NOT NULL,
	[URL] [nvarchar](255) NOT NULL,
 CONSTRAINT [PK_Projects] PRIMARY KEY CLUSTERED ([ProjectID] ASC)
)
ALTER TABLE [dbo].[Projects]  WITH CHECK ADD  CONSTRAINT [FK_Projects_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
ON DELETE CASCADE
END
GO

-- ModelSettings Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ModelSettings]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[ModelSettings](
	[ModelID] [int] IDENTITY(1,1) NOT NULL,
	[Name] [nvarchar](100) NOT NULL,
	[IsDefault] [bit] NOT NULL,
 CONSTRAINT [PK_ModelSettings] PRIMARY KEY CLUSTERED ([ModelID] ASC),
 CONSTRAINT [UQ_ModelSettings_Name] UNIQUE NONCLUSTERED ([Name] ASC)
)
END
GO

-- Add Type column to ModelSettings if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'Type' AND Object_ID = Object_ID(N'ModelSettings'))
BEGIN
   ALTER TABLE ModelSettings ADD [Type] NVARCHAR(50) NOT NULL DEFAULT 'online';
END
GO

-- Activities Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Activities]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[Activities](
	[ActivityID] [int] IDENTITY(1,1) NOT NULL,
	[Name] [nvarchar](100) NOT NULL,
	[Type] [nvarchar](50) NOT NULL,
 CONSTRAINT [PK_Activities] PRIMARY KEY CLUSTERED ([ActivityID] ASC),
 CONSTRAINT [UQ_Activities_Name] UNIQUE NONCLUSTERED ([Name] ASC)
)
END
GO

-- UserActivityLog Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserActivityLog]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[UserActivityLog](
	[LogID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NOT NULL,
	[ActivityID] [int] NOT NULL,
	[Details] [nvarchar](max) NULL,
	[Timestamp] [datetime] NOT NULL,
 CONSTRAINT [PK_UserActivityLog] PRIMARY KEY CLUSTERED ([LogID] ASC)
)
ALTER TABLE [dbo].[UserActivityLog]  WITH CHECK ADD  CONSTRAINT [FK_UserActivityLog_Activities] FOREIGN KEY([ActivityID])
REFERENCES [dbo].[Activities] ([ActivityID])
ON DELETE CASCADE
ALTER TABLE [dbo].[UserActivityLog]  WITH CHECK ADD  CONSTRAINT [FK_UserActivityLog_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
ON DELETE CASCADE
END
GO


-- Stored Procedures

-- sp_GetUsers
IF OBJECT_ID('sp_GetUsers', 'P') IS NOT NULL DROP PROCEDURE sp_GetUsers
GO
CREATE PROCEDURE sp_GetUsers
AS
BEGIN
    SELECT UserID, Email, Role, IsActive, LastActive FROM Users;
END
GO

-- sp_GetUserByEmail
IF OBJECT_ID('sp_GetUserByEmail', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserByEmail
GO
CREATE PROCEDURE sp_GetUserByEmail
    @Email NVARCHAR(255)
AS
BEGIN
    SELECT UserID, Email, PasswordHash, Role, IsActive, LastActive FROM Users WHERE Email = @Email;
END
GO

-- sp_GetUserByID
IF OBJECT_ID('sp_GetUserByID', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserByID
GO
CREATE PROCEDURE sp_GetUserByID
    @UserID INT
AS
BEGIN
    SELECT UserID, Email, PasswordHash, Role, IsActive, LastActive FROM Users WHERE UserID = @UserID;
END
GO

-- sp_UpdateUserLastActive
IF OBJECT_ID('sp_UpdateUserLastActive', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateUserLastActive
GO
CREATE PROCEDURE sp_UpdateUserLastActive
    @UserID INT
AS
BEGIN
    UPDATE Users SET LastActive = GETDATE() WHERE UserID = @UserID;
END
GO

-- sp_UpdateUser
IF OBJECT_ID('sp_UpdateUser', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateUser
GO
CREATE PROCEDURE sp_UpdateUser
    @UserID INT,
    @Email NVARCHAR(255) = NULL,
    @PasswordHash NVARCHAR(255) = NULL,
    @Role NVARCHAR(50) = NULL,
    @IsActive BIT = NULL
AS
BEGIN
    UPDATE Users
    SET
        Email = ISNULL(@Email, Email),
        PasswordHash = ISNULL(@PasswordHash, PasswordHash),
        Role = ISNULL(@Role, Role),
        IsActive = ISNULL(@IsActive, IsActive)
    WHERE UserID = @UserID;

    IF @@ROWCOUNT > 0
        SELECT CONVERT(BIT, 1) as Result;
    ELSE
        SELECT CONVERT(BIT, 0) as Result;
END
GO

-- sp_AddUser
IF OBJECT_ID('sp_AddUser', 'P') IS NOT NULL DROP PROCEDURE sp_AddUser
GO
CREATE PROCEDURE sp_AddUser
    @Email NVARCHAR(255),
    @PasswordHash NVARCHAR(255),
    @Role NVARCHAR(50),
    @IsActive BIT
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = @Email)
    BEGIN
        INSERT INTO Users (Email, PasswordHash, Role, IsActive, LastActive)
        VALUES (@Email, @PasswordHash, @Role, @IsActive, GETDATE());
        SELECT SCOPE_IDENTITY() AS UserID;
    END
    ELSE
    BEGIN
        SELECT 0 AS UserID; -- Indicates user already exists
    END
END
GO

-- sp_GetProjectsByUser
IF OBJECT_ID('sp_GetProjectsByUser', 'P') IS NOT NULL DROP PROCEDURE sp_GetProjectsByUser
GO
CREATE PROCEDURE sp_GetProjectsByUser
    @UserID INT
AS
BEGIN
    SELECT ProjectID, UserID, Name, URL FROM Projects WHERE UserID = @UserID;
END
GO

-- sp_AddProject
IF OBJECT_ID('sp_AddProject', 'P') IS NOT NULL DROP PROCEDURE sp_AddProject
GO
CREATE PROCEDURE sp_AddProject
    @UserID INT,
    @Name NVARCHAR(100),
    @URL NVARCHAR(255)
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Projects WHERE UserID = @UserID AND URL = @URL)
    BEGIN
        INSERT INTO Projects (UserID, Name, URL)
        VALUES (@UserID, @Name, @URL);
        SELECT * FROM Projects WHERE ProjectID = SCOPE_IDENTITY();
        RETURN 0;
    END
    ELSE
    BEGIN
        RETURN 1; -- Indicates project already exists
    END
END
GO

-- sp_DeleteProject
IF OBJECT_ID('sp_DeleteProject', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteProject
GO
CREATE PROCEDURE sp_DeleteProject
    @ProjectID INT,
    @UserID INT
AS
BEGIN
    DELETE FROM Projects WHERE ProjectID = @ProjectID AND UserID = @UserID;
END
GO


-- sp_GetModels
IF OBJECT_ID('sp_GetModels', 'P') IS NOT NULL DROP PROCEDURE sp_GetModels
GO
CREATE PROCEDURE sp_GetModels
AS
BEGIN
    SELECT ModelID, Name, Type, IsDefault FROM ModelSettings;
END
GO

-- sp_GetDefaultModel
IF OBJECT_ID('sp_GetDefaultModel', 'P') IS NOT NULL DROP PROCEDURE sp_GetDefaultModel
GO
CREATE PROCEDURE sp_GetDefaultModel
AS
BEGIN
    SELECT TOP 1 ModelID, Name, Type, IsDefault FROM ModelSettings WHERE IsDefault = 1;
END
GO

-- sp_AddModel
IF OBJECT_ID('sp_AddModel', 'P') IS NOT NULL DROP PROCEDURE sp_AddModel
GO
CREATE PROCEDURE sp_AddModel
    @Name NVARCHAR(100),
    @Type NVARCHAR(50)
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM ModelSettings WHERE Name = @Name)
    BEGIN
        -- If this is the first model, make it the default
        DECLARE @IsDefault BIT;
        IF NOT EXISTS (SELECT 1 FROM ModelSettings)
            SET @IsDefault = 1;
        ELSE
            SET @IsDefault = 0;

        INSERT INTO ModelSettings (Name, Type, IsDefault)
        VALUES (@Name, @Type, @IsDefault);
        
        SELECT * FROM ModelSettings WHERE ModelID = SCOPE_IDENTITY();
        RETURN 0;
    END
    ELSE
    BEGIN
        RETURN 1; -- Indicates model name already exists
    END
END
GO

-- sp_UpdateModel
IF OBJECT_ID('sp_UpdateModel', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateModel
GO
CREATE PROCEDURE sp_UpdateModel
    @ModelID INT,
    @Name NVARCHAR(100),
    @Type NVARCHAR(50)
AS
BEGIN
    IF EXISTS (SELECT 1 FROM ModelSettings WHERE Name = @Name AND ModelID != @ModelID)
    BEGIN
        RETURN 1; -- Duplicate name
    END
    
    UPDATE ModelSettings SET Name = @Name, Type = @Type WHERE ModelID = @ModelID;
    IF @@ROWCOUNT > 0
        RETURN 0; -- Success
    ELSE
        RETURN 2; -- Not found or other error
END
GO


-- sp_SetDefaultModel
IF OBJECT_ID('sp_SetDefaultModel', 'P') IS NOT NULL DROP PROCEDURE sp_SetDefaultModel
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

-- sp_DeleteModel
IF OBJECT_ID('sp_DeleteModel', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteModel
GO
CREATE PROCEDURE sp_DeleteModel
    @ModelID INT
AS
BEGIN
    IF EXISTS (SELECT 1 FROM ModelSettings WHERE ModelID = @ModelID AND IsDefault = 1)
    BEGIN
        RETURN 1; -- Cannot delete default model
    END

    DELETE FROM ModelSettings WHERE ModelID = @ModelID AND IsDefault = 0;
    IF @@ROWCOUNT > 0
        RETURN 0; -- Success
    ELSE
        RETURN 2; -- Not found or other failure
END
GO


-- sp_LogActivity
IF OBJECT_ID('sp_LogActivity', 'P') IS NOT NULL DROP PROCEDURE sp_LogActivity
GO
CREATE PROCEDURE sp_LogActivity
    @UserID INT,
    @ActivityName NVARCHAR(100),
    @Details NVARCHAR(MAX)
AS
BEGIN
    DECLARE @ActivityID INT;
    DECLARE @ActivityType NVARCHAR(50);

    -- Determine Activity Type based on Name
    SET @ActivityType = CASE
        WHEN @ActivityName IN ('Login', 'Password Change') THEN 'Authentication'
        WHEN @ActivityName IN ('Analyze Diff', 'Explain Code', 'Find Bugs', 'Generate Test', 'Refactor Code', 'Generate Docs', 'Generate SDD') THEN 'AI Action'
        ELSE 'File System'
    END;

    -- Find or Create Activity
    SELECT @ActivityID = ActivityID FROM Activities WHERE Name = @ActivityName;

    IF @ActivityID IS NULL
    BEGIN
        INSERT INTO Activities (Name, Type) VALUES (@ActivityName, @ActivityType);
        SET @ActivityID = SCOPE_IDENTITY();
    END

    -- Log the activity
    INSERT INTO UserActivityLog (UserID, ActivityID, Details, Timestamp)
    VALUES (@UserID, @ActivityID, @Details, GETDATE());
END
GO

-- sp_GetUserActivity
IF OBJECT_ID('sp_GetUserActivity', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserActivity
GO
CREATE PROCEDURE sp_GetUserActivity
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
        UserActivityLog l
    JOIN
        Activities a ON l.ActivityID = a.ActivityID
    WHERE
        l.UserID = @UserID
    ORDER BY
        l.Timestamp DESC;
END
GO

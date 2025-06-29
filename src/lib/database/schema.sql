
-- =================================================================
-- Tables
-- =================================================================

-- Users Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[Users](
	[UserID] [int] IDENTITY(1,1) NOT NULL,
	[Email] [nvarchar](255) NOT NULL,
	[PasswordHash] [nvarchar](255) NOT NULL,
	[Role] [nvarchar](50) NOT NULL,
	[IsActive] [bit] NOT NULL,
	[LastActive] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([UserID] ASC),
 CONSTRAINT [UQ_Users_Email] UNIQUE NONCLUSTERED ([Email] ASC)
)
ALTER TABLE [dbo].[Users] ADD CONSTRAINT [DF_Users_IsActive] DEFAULT ((1)) FOR [IsActive]
ALTER TABLE [dbo].[Users] ADD CONSTRAINT [DF_Users_LastActive] DEFAULT (getdate()) FOR [LastActive]
END
GO

-- Projects Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Projects]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[Projects](
	[ProjectID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NOT NULL,
	[Name] [nvarchar](100) NOT NULL,
	[URL] [nvarchar](512) NOT NULL,
 CONSTRAINT [PK_Projects] PRIMARY KEY CLUSTERED ([ProjectID] ASC)
)
ALTER TABLE [dbo].[Projects]  WITH CHECK ADD CONSTRAINT [FK_Projects_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
ON DELETE CASCADE
ALTER TABLE [dbo].[Projects] CHECK CONSTRAINT [FK_Projects_Users]
ALTER TABLE [dbo].[Projects] ADD CONSTRAINT [UQ_Project_User_URL] UNIQUE ([UserID], [URL])
END
GO

-- Activities Master Table
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
	[LogID] [bigint] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NOT NULL,
	[ActivityID] [int] NOT NULL,
	[Details] [nvarchar](1024) NULL,
	[Timestamp] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_UserActivityLog] PRIMARY KEY CLUSTERED ([LogID] ASC)
)
ALTER TABLE [dbo].[UserActivityLog] ADD CONSTRAINT [DF_UserActivityLog_Timestamp] DEFAULT (getdate()) FOR [Timestamp]
ALTER TABLE [dbo].[UserActivityLog]  WITH CHECK ADD CONSTRAINT [FK_UserActivityLog_Activities] FOREIGN KEY([ActivityID])
REFERENCES [dbo].[Activities] ([ActivityID])
ALTER TABLE [dbo].[UserActivityLog] CHECK CONSTRAINT [FK_UserActivityLog_Activities]
ALTER TABLE [dbo].[UserActivityLog]  WITH CHECK ADD CONSTRAINT [FK_UserActivityLog_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
ON DELETE CASCADE
ALTER TABLE [dbo].[UserActivityLog] CHECK CONSTRAINT [FK_UserActivityLog_Users]
END
GO


-- ModelSettings Table (with modifications)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ModelSettings]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ModelSettings](
        [ModelID] [int] IDENTITY(1,1) NOT NULL,
        [Name] [nvarchar](100) NOT NULL,
        [Type] [nvarchar](50) NOT NULL,
        [IsDefault] [bit] NOT NULL,
     CONSTRAINT [PK_ModelSettings] PRIMARY KEY CLUSTERED ([ModelID] ASC),
     CONSTRAINT [UQ_ModelSettings_Name] UNIQUE NONCLUSTERED ([Name] ASC)
    )
    ALTER TABLE [dbo].[ModelSettings] ADD CONSTRAINT [DF_ModelSettings_IsDefault] DEFAULT ((0)) FOR [IsDefault]
END
ELSE
BEGIN
    -- Add Type column if it doesn't exist to the existing table
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'Type' AND Object_ID = Object_ID(N'dbo.ModelSettings'))
    BEGIN
        ALTER TABLE dbo.ModelSettings ADD [Type] NVARCHAR(50) NOT NULL CONSTRAINT DF_ModelSettings_Type_Default DEFAULT 'online';
        -- Remove the default constraint after setting values
        ALTER TABLE dbo.ModelSettings DROP CONSTRAINT DF_ModelSettings_Type_Default;
    END
END
GO

-- Seed Activities Table
IF NOT EXISTS (SELECT 1 FROM Activities WHERE Name = 'Login')
BEGIN
    INSERT INTO Activities (Name, Type) VALUES
    ('Login', 'Authentication'),
    ('Explain Code', 'AI Action'),
    ('Find Bugs', 'AI Action'),
    ('Refactor Code', 'AI Action'),
    ('Generate Test', 'AI Action'),
    ('Generate Docs', 'AI Action'),
    ('Generate SDD', 'AI Action'),
    ('Analyze Diff', 'AI Action')
END
GO


-- =================================================================
-- Stored Procedures
-- =================================================================

-- sp_GetUsers
IF OBJECT_ID('sp_GetUsers', 'P') IS NOT NULL DROP PROCEDURE sp_GetUsers
GO
CREATE PROCEDURE [dbo].[sp_GetUsers]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT UserID, Email, Role, IsActive, LastActive
    FROM Users
    ORDER BY Email ASC;
END
GO

-- sp_GetUserByEmail
IF OBJECT_ID('sp_GetUserByEmail', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserByEmail
GO
CREATE PROCEDURE [dbo].[sp_GetUserByEmail]
    @Email NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT UserID, Email, PasswordHash, Role, IsActive, LastActive
    FROM Users
    WHERE Email = @Email;
END
GO

-- sp_GetUserByID
IF OBJECT_ID('sp_GetUserByID', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserByID
GO
CREATE PROCEDURE [dbo].[sp_GetUserByID]
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT UserID, Email, Role, IsActive, LastActive
    FROM Users
    WHERE UserID = @UserID;
END
GO

-- sp_AddUser
IF OBJECT_ID('sp_AddUser', 'P') IS NOT NULL DROP PROCEDURE sp_AddUser
GO
CREATE PROCEDURE [dbo].[sp_AddUser]
    @Email NVARCHAR(255),
    @PasswordHash NVARCHAR(255),
    @Role NVARCHAR(50),
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = @Email)
    BEGIN
        INSERT INTO Users (Email, PasswordHash, Role, IsActive, LastActive)
        VALUES (@Email, @PasswordHash, @Role, @IsActive, GETDATE());
        SELECT SCOPE_IDENTITY() AS UserID;
    END
    ELSE
    BEGIN
        SELECT -1 AS UserID; -- Indicate user exists
    END
END
GO

-- sp_UpdateUser
IF OBJECT_ID('sp_UpdateUser', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateUser
GO
CREATE PROCEDURE [dbo].[sp_UpdateUser]
    @UserID INT,
    @Email NVARCHAR(255),
    @PasswordHash NVARCHAR(255) = NULL,
    @Role NVARCHAR(50),
    @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM Users WHERE UserID = @UserID)
    BEGIN
        UPDATE Users
        SET Email = @Email,
            PasswordHash = ISNULL(@PasswordHash, PasswordHash),
            Role = @Role,
            IsActive = @IsActive
        WHERE UserID = @UserID;
        SELECT 1 AS Result;
    END
    ELSE
    BEGIN
        SELECT 0 AS Result;
    END
END
GO

-- sp_UpdateUserLastActive
IF OBJECT_ID('sp_UpdateUserLastActive', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateUserLastActive
GO
CREATE PROCEDURE [dbo].[sp_UpdateUserLastActive]
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Users
    SET LastActive = GETDATE()
    WHERE UserID = @UserID;
END
GO

-- sp_GetProjectsByUser
IF OBJECT_ID('sp_GetProjectsByUser', 'P') IS NOT NULL DROP PROCEDURE sp_GetProjectsByUser
GO
CREATE PROCEDURE [dbo].[sp_GetProjectsByUser]
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ProjectID, UserID, Name, URL
    FROM Projects
    WHERE UserID = @UserID;
END
GO

-- sp_AddProject
IF OBJECT_ID('sp_AddProject', 'P') IS NOT NULL DROP PROCEDURE sp_AddProject
GO
CREATE PROCEDURE [dbo].[sp_AddProject]
    @UserID INT,
    @Name NVARCHAR(100),
    @URL NVARCHAR(512)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM Projects WHERE UserID = @UserID AND URL = @URL)
    BEGIN
        INSERT INTO Projects (UserID, Name, URL)
        VALUES (@UserID, @Name, @URL);

        SELECT ProjectID, UserID, Name, URL FROM Projects WHERE ProjectID = SCOPE_IDENTITY();
        RETURN 0;
    END
    ELSE
    BEGIN
        RETURN 1; -- Duplicate
    END
END
GO

-- sp_DeleteProject
IF OBJECT_ID('sp_DeleteProject', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteProject
GO
CREATE PROCEDURE [dbo].[sp_DeleteProject]
    @ProjectID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM Projects
    WHERE ProjectID = @ProjectID AND UserID = @UserID;
END
GO

-- sp_GetModels (MODIFIED)
IF OBJECT_ID('sp_GetModels', 'P') IS NOT NULL DROP PROCEDURE sp_GetModels
GO
CREATE PROCEDURE [dbo].[sp_GetModels]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ModelID, Name, Type, IsDefault
    FROM ModelSettings
    ORDER BY IsDefault DESC, Name ASC;
END
GO

-- sp_GetDefaultModel (MODIFIED)
IF OBJECT_ID('sp_GetDefaultModel', 'P') IS NOT NULL DROP PROCEDURE sp_GetDefaultModel
GO
CREATE PROCEDURE [dbo].[sp_GetDefaultModel]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 1 ModelID, Name, Type, IsDefault
    FROM ModelSettings
    WHERE IsDefault = 1;
END
GO

-- sp_AddModel (MODIFIED)
IF OBJECT_ID('sp_AddModel', 'P') IS NOT NULL DROP PROCEDURE sp_AddModel
GO
CREATE PROCEDURE [dbo].[sp_AddModel]
    @Name NVARCHAR(100),
    @Type NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM ModelSettings WHERE Name = @Name)
    BEGIN
        INSERT INTO ModelSettings (Name, Type, IsDefault)
        VALUES (@Name, @Type, 0);
        
        SELECT ModelID, Name, Type, IsDefault FROM ModelSettings WHERE ModelID = SCOPE_IDENTITY();
        RETURN 0;
    END
    ELSE
    BEGIN
        RETURN 1; -- Name exists
    END
END
GO

-- sp_UpdateModel (MODIFIED)
IF OBJECT_ID('sp_UpdateModel', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateModel
GO
CREATE PROCEDURE [dbo].[sp_UpdateModel]
    @ModelID INT,
    @Name NVARCHAR(100),
    @Type NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    -- Check if another model with the new name already exists
    IF EXISTS (SELECT 1 FROM ModelSettings WHERE Name = @Name AND ModelID != @ModelID)
    BEGIN
        RETURN 1; -- Name exists for another model
    END

    UPDATE ModelSettings
    SET Name = @Name,
        Type = @Type
    WHERE ModelID = @ModelID;

    IF @@ROWCOUNT = 0
    BEGIN
        RETURN 2; -- Model not found
    END

    RETURN 0; -- Success
END
GO

-- sp_SetDefaultModel
IF OBJECT_ID('sp_SetDefaultModel', 'P') IS NOT NULL DROP PROCEDURE sp_SetDefaultModel
GO
CREATE PROCEDURE [dbo].[sp_SetDefaultModel]
    @ModelID INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    UPDATE ModelSettings SET IsDefault = 0;
    UPDATE ModelSettings SET IsDefault = 1 WHERE ModelID = @ModelID;
    COMMIT TRANSACTION;
END
GO

-- sp_DeleteModel
IF OBJECT_ID('sp_DeleteModel', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteModel
GO
CREATE PROCEDURE [dbo].[sp_DeleteModel]
    @ModelID INT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM ModelSettings WHERE ModelID = @ModelID AND IsDefault = 1)
    BEGIN
        RETURN 1; -- Cannot delete default model
    END

    DELETE FROM ModelSettings WHERE ModelID = @ModelID;
    
    IF @@ROWCOUNT > 0
        RETURN 0; -- Success
    ELSE
        RETURN 2; -- Not found
END
GO

-- sp_LogActivity
IF OBJECT_ID('sp_LogActivity', 'P') IS NOT NULL DROP PROCEDURE sp_LogActivity
GO
CREATE PROCEDURE [dbo].[sp_LogActivity]
    @UserID INT,
    @ActivityName NVARCHAR(100),
    @Details NVARCHAR(1024)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ActivityID INT;

    SELECT @ActivityID = ActivityID FROM Activities WHERE Name = @ActivityName;

    IF @ActivityID IS NOT NULL
    BEGIN
        INSERT INTO UserActivityLog (UserID, ActivityID, Details, Timestamp)
        VALUES (@UserID, @ActivityID, @Details, GETDATE());
    END
END
GO

-- sp_GetUserActivity
IF OBJECT_ID('sp_GetUserActivity', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserActivity
GO
CREATE PROCEDURE [dbo].[sp_GetUserActivity]
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        l.LogID,
        a.Name AS ActivityName,
        a.Type AS ActivityType,
        l.Details,
        l.Timestamp
    FROM UserActivityLog l
    JOIN Activities a ON l.ActivityID = a.ActivityID
    WHERE l.UserID = @UserID
    ORDER BY l.Timestamp DESC;
END
GO

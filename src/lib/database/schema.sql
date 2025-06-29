-- Create Tables if they don't exist
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY(1,1),
    Email NVARCHAR(255) UNIQUE NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role NVARCHAR(50) NOT NULL CHECK (Role IN ('admin', 'user')),
    IsActive BIT NOT NULL DEFAULT 1,
    LastActive DATETIME2 DEFAULT GETUTCDATE()
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
    Name NVARCHAR(255) UNIQUE NOT NULL,
    Type NVARCHAR(50) NOT NULL CHECK (Type IN ('online', 'local')),
    IsDefault BIT NOT NULL DEFAULT 0
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Activities' and xtype='U')
CREATE TABLE Activities (
    ActivityID INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(255) UNIQUE NOT NULL,
    Type NVARCHAR(50) NOT NULL CHECK (Type IN ('AI Action', 'Authentication', 'File System'))
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UserActivityLog' and xtype='U')
CREATE TABLE UserActivityLog (
    LogID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL,
    ActivityID INT NOT NULL,
    Details NVARCHAR(MAX),
    Timestamp DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (ActivityID) REFERENCES Activities(ActivityID)
);
GO

-- Stored Procedures
-- Drop and Create to ensure they are up-to-date

-- User Management
IF OBJECT_ID('sp_AddUser', 'P') IS NOT NULL DROP PROCEDURE sp_AddUser;
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
        INSERT INTO Users (Email, PasswordHash, Role, IsActive)
        VALUES (@Email, @PasswordHash, @Role, @IsActive);
        SELECT SCOPE_IDENTITY() AS UserID;
    END
    ELSE
    BEGIN
        SELECT -1 AS UserID; -- Indicates user already exists
    END
END
GO

IF OBJECT_ID('sp_GetUsers', 'P') IS NOT NULL DROP PROCEDURE sp_GetUsers;
GO
CREATE PROCEDURE sp_GetUsers
AS
BEGIN
    SELECT UserID, Email, Role, IsActive, LastActive FROM Users;
END
GO

IF OBJECT_ID('sp_GetUserByEmail', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserByEmail;
GO
CREATE PROCEDURE sp_GetUserByEmail
    @Email NVARCHAR(255)
AS
BEGIN
    SELECT UserID, Email, PasswordHash, Role, IsActive, LastActive
    FROM Users WHERE Email = @Email;
END
GO

IF OBJECT_ID('sp_GetUserByID', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserByID;
GO
CREATE PROCEDURE sp_GetUserByID
    @UserID INT
AS
BEGIN
    SELECT UserID, Email, PasswordHash, Role, IsActive, LastActive
    FROM Users WHERE UserID = @UserID;
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
    UPDATE Users
    SET
        Email = ISNULL(@Email, Email),
        PasswordHash = ISNULL(@PasswordHash, PasswordHash),
        Role = ISNULL(@Role, Role),
        IsActive = ISNULL(@IsActive, IsActive)
    WHERE UserID = @UserID;
    SELECT CAST(@@ROWCOUNT AS BIT) as Result;
END
GO

IF OBJECT_ID('sp_UpdateUserLastActive', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateUserLastActive;
GO
CREATE PROCEDURE sp_UpdateUserLastActive
    @UserID INT
AS
BEGIN
    UPDATE Users SET LastActive = GETUTCDATE() WHERE UserID = @UserID;
END
GO


-- Project Management
IF OBJECT_ID('sp_GetProjectsByUser', 'P') IS NOT NULL DROP PROCEDURE sp_GetProjectsByUser;
GO
CREATE PROCEDURE sp_GetProjectsByUser
    @UserID INT
AS
BEGIN
    SELECT ProjectID, UserID, Name, URL FROM Projects WHERE UserID = @UserID;
END
GO

IF OBJECT_ID('sp_AddProject', 'P') IS NOT NULL DROP PROCEDURE sp_AddProject;
GO
CREATE PROCEDURE sp_AddProject
    @UserID INT,
    @Name NVARCHAR(255),
    @URL NVARCHAR(2048)
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Projects WHERE UserID = @UserID AND URL = @URL)
    BEGIN
        INSERT INTO Projects (UserID, Name, URL) VALUES (@UserID, @Name, @URL);
        SELECT * FROM Projects WHERE ProjectID = SCOPE_IDENTITY();
        RETURN 0;
    END
    ELSE
    BEGIN
        RETURN 1; -- Already exists
    END
END
GO

IF OBJECT_ID('sp_DeleteProject', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteProject;
GO
CREATE PROCEDURE sp_DeleteProject
    @ProjectID INT,
    @UserID INT
AS
BEGIN
    DELETE FROM Projects WHERE ProjectID = @ProjectID AND UserID = @UserID;
END
GO


-- Model Management
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
    SELECT TOP 1 ModelID, Name, Type, IsDefault FROM ModelSettings WHERE IsDefault = 1;
END
GO

IF OBJECT_ID('sp_AddModel', 'P') IS NOT NULL DROP PROCEDURE sp_AddModel;
GO
CREATE PROCEDURE sp_AddModel
    @Name NVARCHAR(255),
    @Type NVARCHAR(50)
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM ModelSettings WHERE Name = @Name)
    BEGIN
        INSERT INTO ModelSettings (Name, Type, IsDefault) VALUES (@Name, @Type, 0);
        SELECT * FROM ModelSettings WHERE ModelID = SCOPE_IDENTITY();
        RETURN 0;
    END
    ELSE
    BEGIN
        RETURN 1;
    END
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
        RETURN 1; -- Name already exists for another model
    END
    UPDATE ModelSettings SET Name = @Name, Type = @Type WHERE ModelID = @ModelID;
    IF @@ROWCOUNT > 0 RETURN 0;
    ELSE RETURN 2; -- Not found
END
GO

IF OBJECT_ID('sp_SetDefaultModel', 'P') IS NOT NULL DROP PROCEDURE sp_SetDefaultModel;
GO
CREATE PROCEDURE sp_SetDefaultModel
    @ModelID INT
AS
BEGIN
    BEGIN TRANSACTION;
    UPDATE ModelSettings SET IsDefault = 0;
    UPDATE ModelSettings SET IsDefault = 1 WHERE ModelID = @ModelID;
    COMMIT TRANSACTION;
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
    IF @@ROWCOUNT > 0 RETURN 0;
    ELSE RETURN 2;
END
GO


-- Activity Logging & Reporting
IF OBJECT_ID('sp_LogActivity', 'P') IS NOT NULL DROP PROCEDURE sp_LogActivity;
GO
CREATE PROCEDURE sp_LogActivity
    @UserID INT,
    @ActivityName NVARCHAR(255),
    @Details NVARCHAR(MAX)
AS
BEGIN
    DECLARE @ActivityID INT;
    DECLARE @ActivityType NVARCHAR(50);

    -- Determine ActivityType based on Name
    SET @ActivityType = 
        CASE 
            WHEN @ActivityName IN ('Login', 'Logout', 'Password Change') THEN 'Authentication'
            WHEN @ActivityName IN ('Explain Code', 'Find Bugs', 'Refactor Code', 'Generate Test', 'Generate Docs', 'Generate SDD', 'Analyze Diff', 'Copilot Chat') THEN 'AI Action'
            ELSE 'File System'
        END;

    -- Find or create the activity
    SELECT @ActivityID = ActivityID FROM Activities WHERE Name = @ActivityName;
    IF @ActivityID IS NULL
    BEGIN
        INSERT INTO Activities (Name, Type) VALUES (@ActivityName, @ActivityType);
        SET @ActivityID = SCOPE_IDENTITY();
    END

    -- Log the activity
    INSERT INTO UserActivityLog (UserID, ActivityID, Details)
    VALUES (@UserID, @ActivityID, @Details);
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

IF OBJECT_ID('sp_GetUsageStatistics', 'P') IS NOT NULL DROP PROCEDURE sp_GetUsageStatistics;
GO
CREATE PROCEDURE [dbo].[sp_GetUsageStatistics]
    @Period NVARCHAR(10) -- 'daily', 'weekly', 'monthly', 'yearly'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @StartDate DATETIME;
    DECLARE @EndDate DATETIME = GETUTCDATE();

    IF @Period = 'daily'
        SET @StartDate = DATEADD(day, -1, @EndDate);
    ELSE IF @Period = 'weekly'
        SET @StartDate = DATEADD(week, -1, @EndDate);
    ELSE IF @Period = 'monthly'
        SET @StartDate = DATEADD(month, -1, @EndDate);
    ELSE IF @Period = 'yearly'
        SET @StartDate = DATEADD(year, -1, @EndDate);
    ELSE
        SET @StartDate = DATEADD(week, -1, @EndDate);
    
    SELECT l.LogID, l.UserID, l.ActivityID, l.Details, l.Timestamp, a.Name as ActivityName, a.Type as ActivityType
    INTO #FilteredLogs
    FROM UserActivityLog l
    JOIN Activities a ON l.ActivityID = a.ActivityID
    WHERE l.Timestamp BETWEEN @StartDate AND @EndDate AND a.Type = 'AI Action';

    -- Result 1: Main Stats
    SELECT
        (SELECT COUNT(*) FROM #FilteredLogs) AS TotalActions,
        (SELECT COUNT(DISTINCT Details) FROM #FilteredLogs WHERE Details NOT LIKE '%unknown%') AS FilesAnalyzed,
        (
            SELECT TOP 1 ActivityName
            FROM #FilteredLogs
            GROUP BY ActivityName
            ORDER BY COUNT(*) DESC
        ) AS MostUsedFeature,
        (
            SELECT CAST(COUNT(*) AS FLOAT) / NULLIF(COUNT(DISTINCT UserID), 0)
            FROM #FilteredLogs
        ) AS AvgActionsPerUser;

    -- Result 2: Feature Breakdown
    SELECT
        ActivityName AS Name,
        COUNT(*) AS Actions
    FROM #FilteredLogs
    GROUP BY ActivityName
    ORDER BY Actions DESC;

    -- Result 3: Trend Data
    IF @Period = 'daily'
        SELECT
            FORMAT(Timestamp, 'HH:00') AS Name,
            COUNT(*) AS Actions
        FROM #FilteredLogs
        GROUP BY FORMAT(Timestamp, 'HH:00'), DATEPART(hour, Timestamp)
        ORDER BY DATEPART(hour, Timestamp);
    ELSE IF @Period = 'weekly'
        SELECT
            FORMAT(Timestamp, 'ddd') AS Name,
            COUNT(*) AS Actions
        FROM #FilteredLogs
        GROUP BY FORMAT(Timestamp, 'ddd'), DATEPART(weekday, Timestamp)
        ORDER BY DATEPART(weekday, Timestamp);
    ELSE IF @Period = 'monthly'
        SELECT
            'Day ' + CAST(DATEPART(day, Timestamp) AS NVARCHAR) AS Name,
            COUNT(*) AS Actions
        FROM #FilteredLogs
        GROUP BY DATEPART(day, Timestamp)
        ORDER BY DATEPART(day, Timestamp);
    ELSE IF @Period = 'yearly'
        SELECT
            FORMAT(Timestamp, 'MMM') AS Name,
            COUNT(*) AS Actions
        FROM #FilteredLogs
        GROUP BY FORMAT(Timestamp, 'MMM'), DATEPART(month, Timestamp)
        ORDER BY DATEPART(month, Timestamp);
    
    DROP TABLE #FilteredLogs;
END
GO

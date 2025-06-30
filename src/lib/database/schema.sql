-- Drop existing tables and procedures in reverse order of dependency if they exist
IF OBJECT_ID('sp_GetUsageStatistics', 'P') IS NOT NULL DROP PROCEDURE sp_GetUsageStatistics;
IF OBJECT_ID('sp_GetUserActivity', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserActivity;
IF OBJECT_ID('sp_LogActivity', 'P') IS NOT NULL DROP PROCEDURE sp_LogActivity;
IF OBJECT_ID('sp_DeleteProject', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteProject;
IF OBJECT_ID('sp_AddProject', 'P') IS NOT NULL DROP PROCEDURE sp_AddProject;
IF OBJECT_ID('sp_GetProjectsByUser', 'P') IS NOT NULL DROP PROCEDURE sp_GetProjectsByUser;
IF OBJECT_ID('sp_UpdateUserLastActive', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateUserLastActive;
IF OBJECT_ID('sp_UpdateUserBitbucketCreds', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateUserBitbucketCreds;
IF OBJECT_ID('sp_UpdateUser', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateUser;
IF OBJECT_ID('sp_CreateUser', 'P') IS NOT NULL DROP PROCEDURE sp_CreateUser;
IF OBJECT_ID('sp_GetUserByID', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserByID;
IF OBJECT_ID('sp_GetUserByEmail', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserByEmail;
IF OBJECT_ID('sp_GetUsers', 'P') IS NOT NULL DROP PROCEDURE sp_GetUsers;
IF OBJECT_ID('sp_DeleteModel', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteModel;
IF OBJECT_ID('sp_SetDefaultModel', 'P') IS NOT NULL DROP PROCEDURE sp_SetDefaultModel;
IF OBJECT_ID('sp_UpdateModel', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateModel;
IF OBJECT_ID('sp_AddModel', 'P') IS NOT NULL DROP PROCEDURE sp_AddModel;
IF OBJECT_ID('sp_GetDefaultModel', 'P') IS NOT NULL DROP PROCEDURE sp_GetDefaultModel;
IF OBJECT_ID('sp_GetModels', 'P') IS NOT NULL DROP PROCEDURE sp_GetModels;

IF OBJECT_ID('UserActivityLog', 'U') IS NOT NULL DROP TABLE UserActivityLog;
IF OBJECT_ID('Activities', 'U') IS NOT NULL DROP TABLE Activities;
IF OBJECT_ID('Projects', 'U') IS NOT NULL DROP TABLE Projects;
IF OBJECT_ID('Users', 'U') IS NOT NULL DROP TABLE Users;
IF OBJECT_ID('Models', 'U') IS NOT NULL DROP TABLE Models;

-- Create Tables
CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY(1,1),
    Email NVARCHAR(255) UNIQUE NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role NVARCHAR(50) NOT NULL CHECK (Role IN ('admin', 'user')),
    IsActive BIT NOT NULL DEFAULT 1,
    LastActive DATETIME NOT NULL DEFAULT GETDATE(),
    BitbucketUsername NVARCHAR(255) NULL,
    BitbucketAppPassword NVARCHAR(255) NULL
);

CREATE TABLE Projects (
    ProjectID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL,
    Name NVARCHAR(255) NOT NULL,
    URL NVARCHAR(2048) NOT NULL,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    UNIQUE (UserID, URL)
);

CREATE TABLE Activities (
    ActivityID INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) UNIQUE NOT NULL,
    Type NVARCHAR(50) NOT NULL CHECK (Type IN ('AI Action', 'Authentication', 'File System'))
);

CREATE TABLE UserActivityLog (
    LogID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL,
    ActivityID INT NOT NULL,
    Details NVARCHAR(MAX),
    Timestamp DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (ActivityID) REFERENCES Activities(ActivityID)
);

CREATE TABLE Models (
    ModelID INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(255) NOT NULL UNIQUE,
    Type NVARCHAR(50) NOT NULL CHECK (Type IN ('online', 'local')),
    IsDefault BIT NOT NULL DEFAULT 0
);
GO

-- Stored Procedures for Users
CREATE PROCEDURE sp_GetUsers
AS
BEGIN
    SELECT UserID, Email, Role, IsActive, LastActive, BitbucketUsername FROM Users;
END
GO

CREATE PROCEDURE sp_GetUserByEmail
    @Email NVARCHAR(255)
AS
BEGIN
    SELECT * FROM Users WHERE Email = @Email;
END
GO

CREATE PROCEDURE sp_GetUserByID
    @UserID INT
AS
BEGIN
    SELECT * FROM Users WHERE UserID = @UserID;
END
GO

CREATE PROCEDURE sp_CreateUser
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
        SELECT -1 AS UserID; -- Indicates user already exists
    END
END
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
    
    SELECT CAST(@@ROWCOUNT as bit) as Result;
END
GO

CREATE PROCEDURE sp_UpdateUserLastActive
    @UserID INT
AS
BEGIN
    UPDATE Users SET LastActive = GETDATE() WHERE UserID = @UserID;
END
GO

CREATE PROCEDURE sp_UpdateUserBitbucketCreds
    @UserID INT,
    @BitbucketUsername NVARCHAR(255),
    @BitbucketAppPassword NVARCHAR(255)
AS
BEGIN
    UPDATE Users
    SET BitbucketUsername = @BitbucketUsername, BitbucketAppPassword = @BitbucketAppPassword
    WHERE UserID = @UserID;
END
GO

-- Stored Procedures for Projects
CREATE PROCEDURE sp_GetProjectsByUser
    @UserID INT
AS
BEGIN
    SELECT ProjectID, UserID, Name, URL FROM Projects WHERE UserID = @UserID;
END
GO

CREATE PROCEDURE sp_AddProject
    @UserID INT,
    @Name NVARCHAR(255),
    @URL NVARCHAR(2048)
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
        RETURN 1; -- Project already exists
    END
END
GO

CREATE PROCEDURE sp_DeleteProject
    @ProjectID INT,
    @UserID INT
AS
BEGIN
    DELETE FROM Projects WHERE ProjectID = @ProjectID AND UserID = @UserID;
END
GO

-- Stored Procedures for Activity Logging
CREATE PROCEDURE sp_LogActivity
    @UserID INT,
    @ActivityName NVARCHAR(100),
    @Details NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ActivityID INT;
    DECLARE @ActivityType NVARCHAR(50);

    SET @ActivityType = CASE
        WHEN @ActivityName IN ('Login', 'Logout', 'Password Change', 'Update Profile', 'Co-Pilot Chat', 'AI Assistant Chat') THEN 'Authentication'
        ELSE 'AI Action'
    END;

    SELECT @ActivityID = ActivityID FROM Activities WHERE Name = @ActivityName;

    IF @ActivityID IS NULL
    BEGIN
        INSERT INTO Activities (Name, Type) VALUES (@ActivityName, @ActivityType);
        SET @ActivityID = SCOPE_IDENTITY();
    END

    INSERT INTO UserActivityLog (UserID, ActivityID, Details, Timestamp)
    VALUES (@UserID, @ActivityID, @Details, GETDATE());
END
GO

CREATE PROCEDURE sp_GetUserActivity
    @UserID INT
AS
BEGIN
    SELECT
        ual.LogID,
        a.Name AS ActivityName,
        a.Type AS ActivityType,
        ual.Details,
        ual.Timestamp
    FROM UserActivityLog ual
    JOIN Activities a ON ual.ActivityID = a.ActivityID
    WHERE ual.UserID = @UserID
    ORDER BY ual.Timestamp DESC;
END
GO

-- Stored Procedures for Models
CREATE PROCEDURE sp_GetModels
AS
BEGIN
    SELECT ModelID, Name, Type, IsDefault FROM Models;
END
GO

CREATE PROCEDURE sp_GetDefaultModel
AS
BEGIN
    SELECT TOP 1 ModelID, Name, Type, IsDefault FROM Models WHERE IsDefault = 1;
END
GO

CREATE PROCEDURE sp_AddModel
    @Name NVARCHAR(255),
    @Type NVARCHAR(50)
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Models WHERE Name = @Name)
    BEGIN
        -- If this is the very first model, make it the default
        IF (SELECT COUNT(*) FROM Models) = 0
        BEGIN
            INSERT INTO Models (Name, Type, IsDefault) VALUES (@Name, @Type, 1);
        END
        ELSE
        BEGIN
            INSERT INTO Models (Name, Type, IsDefault) VALUES (@Name, @Type, 0);
        END
        SELECT * FROM Models WHERE ModelID = SCOPE_IDENTITY();
        RETURN 0;
    END
    ELSE
    BEGIN
        RETURN 1; -- Model already exists
    END
END
GO

CREATE PROCEDURE sp_UpdateModel
    @ModelID INT,
    @Name NVARCHAR(255),
    @Type NVARCHAR(50)
AS
BEGIN
    IF EXISTS (SELECT 1 FROM Models WHERE Name = @Name AND ModelID != @ModelID)
    BEGIN
        RETURN 1; -- A different model with this name already exists
    END

    UPDATE Models
    SET Name = @Name, Type = @Type
    WHERE ModelID = @ModelID;
    
    IF @@ROWCOUNT > 0
        RETURN 0;
    ELSE
        RETURN 2; -- Model not found
END
GO

CREATE PROCEDURE sp_SetDefaultModel
    @ModelID INT
AS
BEGIN
    BEGIN TRANSACTION;
    UPDATE Models SET IsDefault = 0 WHERE IsDefault = 1;
    UPDATE Models SET IsDefault = 1 WHERE ModelID = @ModelID;
    COMMIT TRANSACTION;
END
GO

CREATE PROCEDURE sp_DeleteModel
    @ModelID INT
AS
BEGIN
    IF EXISTS (SELECT 1 FROM Models WHERE ModelID = @ModelID AND IsDefault = 1)
    BEGIN
        RETURN 1; -- Cannot delete default model
    END

    DELETE FROM Models WHERE ModelID = @ModelID;
    IF @@ROWCOUNT > 0
        RETURN 0;
    ELSE
        RETURN 2; -- Model not found
END
GO

-- Stored Procedure for Usage Statistics (Refactored)
CREATE PROCEDURE sp_GetUsageStatistics
    @Period NVARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @StartDate DATE;
    IF @Period = 'daily' SET @StartDate = DATEADD(day, -6, GETDATE());
    ELSE IF @Period = 'weekly' SET @StartDate = DATEADD(week, -7, GETDATE());
    ELSE IF @Period = 'monthly' SET @StartDate = DATEADD(month, -11, GETDATE());
    ELSE IF @Period = 'yearly' SET @StartDate = DATEADD(year, -4, GETDATE());
    ELSE SET @StartDate = DATEADD(day, -6, GETDATE());

    -- CTE for all AI Actions in the period.
    ;WITH AiActions AS (
        SELECT
            ual.UserID,
            a.Name AS ActivityName,
            ual.Timestamp
        FROM UserActivityLog ual
        JOIN Activities a ON ual.ActivityID = a.ActivityID
        WHERE a.Type = 'AI Action' AND ual.Timestamp >= @StartDate
    )
    -- 1. Main Statistics
    SELECT
        (SELECT COUNT(DISTINCT UserID) FROM AiActions) AS TotalUsers,
        (SELECT COUNT(*) FROM AiActions) AS TotalActions,
        CASE
            WHEN (SELECT COUNT(DISTINCT UserID) FROM AiActions) > 0
            THEN CAST((SELECT COUNT(*) FROM AiActions) AS FLOAT) / NULLIF((SELECT COUNT(DISTINCT UserID) FROM AiActions), 0)
            ELSE 0
        END AS AvgActionsPerUser,
        (SELECT TOP 1 ActivityName FROM AiActions GROUP BY ActivityName ORDER BY COUNT(*) DESC) AS MostUsedFeature;

    -- 2. AI Feature Distribution
    SELECT
        ActivityName AS Name,
        COUNT(*) AS Actions
    FROM AiActions
    GROUP BY ActivityName
    ORDER BY Actions DESC;

    -- 3. AI Actions Over Time (Trend)
    IF @Period = 'daily'
    BEGIN
        SELECT
            FORMAT(CAST(Timestamp AS DATE), 'MMM d') AS Name,
            COUNT(*) AS Actions
        FROM AiActions
        GROUP BY CAST(Timestamp AS DATE)
        ORDER BY CAST(Timestamp AS DATE);
    END
    ELSE IF @Period = 'weekly'
    BEGIN
        SELECT
            'Week ' + CONVERT(varchar, DATEPART(iso_week, Timestamp)) AS Name,
            COUNT(*) AS Actions
        FROM AiActions
        GROUP BY DATEPART(year, Timestamp), DATEPART(iso_week, Timestamp)
        ORDER BY MIN(Timestamp);
    END
    ELSE IF @Period = 'monthly'
    BEGIN
        SELECT
            FORMAT(Timestamp, 'MMM yyyy') AS Name,
            COUNT(*) AS Actions
        FROM AiActions
        GROUP BY FORMAT(Timestamp, 'yyyy-MM'), FORMAT(Timestamp, 'MMM yyyy')
        ORDER BY FORMAT(Timestamp, 'yyyy-MM');
    END
    ELSE IF @Period = 'yearly'
    BEGIN
        SELECT
            CONVERT(varchar, DATEPART(year, Timestamp)) AS Name,
            COUNT(*) AS Actions
        FROM AiActions
        GROUP BY DATEPART(year, Timestamp)
        ORDER BY NAME;
    END
END;
GO

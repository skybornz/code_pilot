-- Drop existing objects in reverse dependency order to avoid errors
IF OBJECT_ID('sp_GetUsageStatistics', 'P') IS NOT NULL DROP PROCEDURE sp_GetUsageStatistics;
IF OBJECT_ID('sp_LogActivity', 'P') IS NOT NULL DROP PROCEDURE sp_LogActivity;
IF OBJECT_ID('sp_GetUserActivity', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserActivity;
IF OBJECT_ID('sp_DeleteProject', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteProject;
IF OBJECT_ID('sp_AddProject', 'P') IS NOT NULL DROP PROCEDURE sp_AddProject;
IF OBJECT_ID('sp_GetProjectsByUser', 'P') IS NOT NULL DROP PROCEDURE sp_GetProjectsByUser;
IF OBJECT_ID('sp_UpdateUserBitbucketCreds', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateUserBitbucketCreds;
IF OBJECT_ID('sp_UpdateUserLastActive', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateUserLastActive;
IF OBJECT_ID('sp_UpdateUser', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateUser;
IF OBJECT_ID('sp_GetUserByID', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserByID;
IF OBJECT_ID('sp_GetUserByEmail', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserByEmail;
IF OBJECT_ID('sp_CreateUser', 'P') IS NOT NULL DROP PROCEDURE sp_CreateUser;
IF OBJECT_ID('sp_GetUsers', 'P') IS NOT NULL DROP PROCEDURE sp_GetUsers;
IF OBJECT_ID('sp_SetDefaultModel', 'P') IS NOT NULL DROP PROCEDURE sp_SetDefaultModel;
IF OBJECT_ID('sp_DeleteModel', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteModel;
IF OBJECT_ID('sp_UpdateModel', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateModel;
IF OBJECT_ID('sp_GetDefaultModel', 'P') IS NOT NULL DROP PROCEDURE sp_GetDefaultModel;
IF OBJECT_ID('sp_AddModel', 'P') IS NOT NULL DROP PROCEDURE sp_AddModel;
IF OBJECT_ID('sp_GetModels', 'P') IS NOT NULL DROP PROCEDURE sp_GetModels;

IF OBJECT_ID('UserActivityLog', 'U') IS NOT NULL DROP TABLE UserActivityLog;
IF OBJECT_ID('Activities', 'U') IS NOT NULL DROP TABLE Activities;
IF OBJECT_ID('Projects', 'U') IS NOT NULL DROP TABLE Projects;
IF OBJECT_ID('Users', 'U') IS NOT NULL DROP TABLE Users;
IF OBJECT_ID('Models', 'U') IS NOT NULL DROP TABLE Models;
GO

-- Create Tables
CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY(1,1),
    Email NVARCHAR(255) UNIQUE NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role NVARCHAR(50) NOT NULL CHECK (Role IN ('admin', 'user')),
    IsActive BIT NOT NULL DEFAULT 1,
    LastActive DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    BitbucketUsername NVARCHAR(255) NULL,
    BitbucketAppPassword NVARCHAR(255) NULL -- Should be encrypted in a real production environment
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
    Name NVARCHAR(255) UNIQUE NOT NULL,
    Type NVARCHAR(50) NOT NULL CHECK (Type IN ('AI Action', 'Authentication', 'File System', 'Profile'))
);

CREATE TABLE UserActivityLog (
    LogID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL,
    ActivityID INT NOT NULL,
    Details NVARCHAR(MAX),
    Timestamp DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (ActivityID) REFERENCES Activities(ActivityID)
);

CREATE TABLE Models (
    ModelID INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(255) UNIQUE NOT NULL,
    Type NVARCHAR(50) NOT NULL CHECK (Type IN ('online', 'local')),
    IsDefault BIT NOT NULL DEFAULT 0
);
GO


-- Stored Procedures for Users
CREATE PROCEDURE sp_GetUsers
AS
BEGIN
    SELECT UserID, Email, Role, IsActive, LastActive, BitbucketUsername, BitbucketAppPassword FROM Users;
END;
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
        INSERT INTO Users (Email, PasswordHash, Role, IsActive)
        VALUES (@Email, @PasswordHash, @Role, @IsActive);
        SELECT SCOPE_IDENTITY() AS UserID;
    END
    ELSE
    BEGIN
        SELECT -1 AS UserID; -- Indicates user already exists
    END
END;
GO

CREATE PROCEDURE sp_GetUserByEmail
    @Email NVARCHAR(255)
AS
BEGIN
    SELECT * FROM Users WHERE Email = @Email;
END;
GO

CREATE PROCEDURE sp_GetUserByID
    @UserID INT
AS
BEGIN
    SELECT * FROM Users WHERE UserID = @UserID;
END;
GO

CREATE PROCEDURE sp_UpdateUser
    @UserID INT,
    @Email NVARCHAR(255) = NULL,
    @PasswordHash NVARCHAR(255) = NULL,
    @Role NVARCHAR(50) = NULL,
    @IsActive BIT = NULL
AS
BEGIN
    IF EXISTS (SELECT 1 FROM Users WHERE UserID = @UserID)
    BEGIN
        -- Check for email uniqueness if email is being changed
        IF @Email IS NOT NULL AND EXISTS (SELECT 1 FROM Users WHERE Email = @Email AND UserID != @UserID)
        BEGIN
            -- Using RAISERROR to send a custom error message back
            RAISERROR ('Email already exists for another user.', 16, 1);
            RETURN;
        END

        UPDATE Users
        SET
            Email = ISNULL(@Email, Email),
            PasswordHash = ISNULL(@PasswordHash, PasswordHash),
            Role = ISNULL(@Role, Role),
            IsActive = ISNULL(@IsActive, IsActive)
        WHERE UserID = @UserID;
        
        -- Return success
        SELECT 1 AS Result;
    END
    ELSE
    BEGIN
        -- User not found
        SELECT 0 AS Result;
    END
END;
GO

CREATE PROCEDURE sp_UpdateUserLastActive
    @UserID INT
AS
BEGIN
    UPDATE Users SET LastActive = GETUTCDATE() WHERE UserID = @UserID;
END;
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
END;
GO


-- Stored Procedures for Projects
CREATE PROCEDURE sp_GetProjectsByUser
    @UserID INT
AS
BEGIN
    SELECT * FROM Projects WHERE UserID = @UserID;
END;
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
END;
GO

CREATE PROCEDURE sp_DeleteProject
    @ProjectID INT,
    @UserID INT
AS
BEGIN
    DELETE FROM Projects WHERE ProjectID = @ProjectID AND UserID = @UserID;
END;
GO


-- Stored Procedures for Activity Logging
CREATE PROCEDURE sp_GetUserActivity
    @UserID INT
AS
BEGIN
    SELECT l.LogID, a.Name AS ActivityName, a.Type AS ActivityType, l.Details, l.Timestamp
    FROM UserActivityLog l
    JOIN Activities a ON l.ActivityID = a.ActivityID
    WHERE l.UserID = @UserID
    ORDER BY l.Timestamp DESC;
END;
GO

CREATE PROCEDURE sp_LogActivity
    @UserID INT,
    @ActivityName NVARCHAR(255),
    @Details NVARCHAR(MAX)
AS
BEGIN
    DECLARE @ActivityID INT;
    DECLARE @ActivityType NVARCHAR(50);

    -- Determine activity type based on name
    SET @ActivityType = CASE
        WHEN @ActivityName IN ('Login', 'Logout') THEN 'Authentication'
        WHEN @ActivityName = 'Password Change' THEN 'Profile'
        WHEN @ActivityName = 'Update Profile' THEN 'Profile'
        ELSE 'AI Action'
    END;
    
    -- Find or create the activity
    SELECT @ActivityID = ActivityID FROM Activities WHERE Name = @ActivityName;
    IF @ActivityID IS NULL
    BEGIN
        INSERT INTO Activities (Name, Type) VALUES (@ActivityName, @ActivityType);
        SET @ActivityID = SCOPE_IDENTITY();
    END;

    -- Insert the log entry
    INSERT INTO UserActivityLog (UserID, ActivityID, Details, Timestamp)
    VALUES (@UserID, @ActivityID, @Details, GETUTCDATE());
END;
GO


-- Stored Procedures for Models
CREATE PROCEDURE sp_GetModels
AS
BEGIN
    SELECT * FROM Models;
END;
GO

CREATE PROCEDURE sp_GetDefaultModel
AS
BEGIN
    SELECT TOP 1 * FROM Models WHERE IsDefault = 1;
END;
GO

CREATE PROCEDURE sp_AddModel
    @Name NVARCHAR(255),
    @Type NVARCHAR(50)
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Models WHERE Name = @Name)
    BEGIN
        INSERT INTO Models (Name, Type, IsDefault) VALUES (@Name, @Type, 0);
        SELECT * FROM Models WHERE ModelID = SCOPE_IDENTITY();
        RETURN 0;
    END
    ELSE
    BEGIN
        RETURN 1;
    END
END;
GO

CREATE PROCEDURE sp_UpdateModel
    @ModelID INT,
    @Name NVARCHAR(255),
    @Type NVARCHAR(50)
AS
BEGIN
    IF EXISTS (SELECT 1 FROM Models WHERE Name = @Name AND ModelID != @ModelID)
    BEGIN
        RETURN 1; -- Name already exists on another model
    END

    UPDATE Models SET Name = @Name, Type = @Type WHERE ModelID = @ModelID;
    IF @@ROWCOUNT > 0
        RETURN 0;
    ELSE
        RETURN 2; -- Model not found
END;
GO

CREATE PROCEDURE sp_SetDefaultModel
    @ModelID INT
AS
BEGIN
    BEGIN TRANSACTION;
    UPDATE Models SET IsDefault = 0 WHERE IsDefault = 1;
    UPDATE Models SET IsDefault = 1 WHERE ModelID = @ModelID;
    COMMIT TRANSACTION;
END;
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
    RETURN 0;
END;
GO

-- Stored Procedure for Usage Statistics
CREATE PROCEDURE sp_GetUsageStatistics
    @Period NVARCHAR(10) -- 'daily', 'weekly', 'monthly', 'yearly'
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @StartDate DATETIME2;
    DECLARE @EndDate DATETIME2 = GETUTCDATE();
    DECLARE @Intervals INT;
    DECLARE @DatePart Varchar(10);

    -- Determine date range and intervals for trend
    IF @Period = 'daily'
    BEGIN
        SET @StartDate = DATEADD(day, -6, @EndDate);
        SET @Intervals = 7;
        SET @DatePart = 'day';
    END
    ELSE IF @Period = 'weekly'
    BEGIN
        -- Start from the beginning of the week 7 weeks ago
        SET @StartDate = DATEADD(wk, DATEDIFF(wk, 7, @EndDate), 0);
        SET @Intervals = 8;
        SET @DatePart = 'week';
    END
    ELSE IF @Period = 'monthly'
    BEGIN
        -- Start from the beginning of the month 11 months ago
        SET @StartDate = DATEADD(mm, DATEDIFF(mm, 11, @EndDate), 0);
        SET @Intervals = 12;
        SET @DatePart = 'month';
    END
    ELSE IF @Period = 'yearly'
    BEGIN
        -- Start from the beginning of the year 4 years ago
        SET @StartDate = DATEADD(yy, DATEDIFF(yy, 4, @EndDate), 0);
        SET @Intervals = 5;
        SET @DatePart = 'year';
    END
    ELSE
    BEGIN
      -- Default to daily if period is invalid
        SET @StartDate = DATEADD(day, -6, @EndDate);
        SET @Intervals = 7;
        SET @DatePart = 'day';
    END;

    -- Main Statistics
    SELECT
        (SELECT COUNT(DISTINCT UserID) FROM UserActivityLog WHERE Timestamp >= @StartDate AND Timestamp <= @EndDate) AS TotalUsers,
        (SELECT COUNT(*) FROM UserActivityLog WHERE Timestamp >= @StartDate AND Timestamp <= @EndDate AND ActivityID IN (SELECT ActivityID FROM Activities WHERE Type = 'AI Action')) AS TotalActions,
        CAST(
            CASE WHEN (SELECT COUNT(DISTINCT UserID) FROM UserActivityLog WHERE Timestamp >= @StartDate AND Timestamp <= @EndDate) > 0
            THEN CAST((SELECT COUNT(*) FROM UserActivityLog WHERE Timestamp >= @StartDate AND Timestamp <= @EndDate AND ActivityID IN (SELECT ActivityID FROM Activities WHERE Type = 'AI Action')) AS FLOAT) / (SELECT COUNT(DISTINCT UserID) FROM UserActivityLog WHERE Timestamp >= @StartDate AND Timestamp <= @EndDate)
            ELSE 0
            END
        AS DECIMAL(10, 2)) AS AvgActionsPerUser,
        (SELECT TOP 1 a.Name FROM UserActivityLog ul JOIN Activities a ON ul.ActivityID = a.ActivityID WHERE ul.Timestamp >= @StartDate AND ul.Timestamp <= @EndDate AND a.Type = 'AI Action' GROUP BY a.Name ORDER BY COUNT(*) DESC) AS MostUsedFeature;

    -- Feature Distribution
    SELECT a.Name, COUNT(*) AS Actions
    FROM UserActivityLog ul
    JOIN Activities a ON ul.ActivityID = a.ActivityID
    WHERE ul.Timestamp >= @StartDate AND ul.Timestamp <= @EndDate AND a.Type = 'AI Action'
    GROUP BY a.Name
    ORDER BY Actions DESC;

    -- Trend Analysis
    ;WITH DateSeries AS (
  SELECT TOP (@Intervals)
      CASE @DatePart
          WHEN 'day'   THEN DATEADD(DAY,   1 - ROW_NUMBER() OVER (ORDER BY (SELECT NULL)), @EndDate)
          WHEN 'week'  THEN DATEADD(WEEK,  1 - ROW_NUMBER() OVER (ORDER BY (SELECT NULL)), @EndDate)
          WHEN 'month' THEN DATEADD(MONTH, 1 - ROW_NUMBER() OVER (ORDER BY (SELECT NULL)), @EndDate)
          WHEN 'year'  THEN DATEADD(YEAR,  1 - ROW_NUMBER() OVER (ORDER BY (SELECT NULL)), @EndDate)
          ELSE              DATEADD(YEAR,  1 - ROW_NUMBER() OVER (ORDER BY (SELECT NULL)), @EndDate)
      END AS DatePoint
  FROM master.dbo.spt_values
),
    GroupedLogs AS (
      SELECT 
          CAST(Timestamp AS DATE) as LogDate,
          COUNT(*) as Actions
      FROM UserActivityLog
      JOIN Activities ON UserActivityLog.ActivityID = Activities.ActivityID
      WHERE Timestamp BETWEEN @StartDate AND @EndDate
        AND Activities.Type = 'AI Action'
      GROUP BY CAST(Timestamp AS DATE)
    )
    SELECT
        CASE
            WHEN @DatePart = 'day' THEN FORMAT(ds.DatePoint, 'ddd') -- Short day name
            WHEN @DatePart = 'week' THEN 'W' + CAST(DATEPART(iso_week, ds.DatePoint) AS NVARCHAR)
            WHEN @DatePart = 'month' THEN FORMAT(ds.DatePoint, 'MMM') -- Short month name
            WHEN @DatePart = 'year' THEN CAST(YEAR(ds.DatePoint) AS NVARCHAR)
        END AS Name,
        ISNULL(SUM(gl.Actions), 0) AS Actions
    FROM DateSeries ds
    LEFT JOIN GroupedLogs gl ON 
        CASE @DatePart
            WHEN 'day' THEN DATEDIFF(day, gl.LogDate, ds.DatePoint)
            WHEN 'week' THEN DATEDIFF(week, gl.LogDate, ds.DatePoint)
            WHEN 'month' THEN DATEDIFF(month, gl.LogDate, ds.DatePoint)
            ELSE DATEDIFF(year, gl.LogDate, ds.DatePoint)
        END = 0
    GROUP BY
        CASE
            WHEN @DatePart = 'day' THEN FORMAT(ds.DatePoint, 'ddd')
            WHEN @DatePart = 'week' THEN 'W' + CAST(DATEPART(iso_week, ds.DatePoint) AS NVARCHAR)
            WHEN @DatePart = 'month' THEN FORMAT(ds.DatePoint, 'MMM')
            WHEN @DatePart = 'year' THEN CAST(YEAR(ds.DatePoint) AS NVARCHAR)
        END,
        ds.DatePoint
    ORDER BY ds.DatePoint;
END;
GO

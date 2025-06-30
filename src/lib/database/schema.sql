-- Drop existing objects if they exist to ensure idempotency
IF OBJECT_ID('sp_GetUsageStatistics', 'P') IS NOT NULL DROP PROCEDURE sp_GetUsageStatistics;
IF OBJECT_ID('sp_GetUserActivity', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserActivity;
IF OBJECT_ID('sp_LogActivity', 'P') IS NOT NULL DROP PROCEDURE sp_LogActivity;
IF OBJECT_ID('sp_DeleteModel', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteModel;
IF OBJECT_ID('sp_SetDefaultModel', 'P') IS NOT NULL DROP PROCEDURE sp_SetDefaultModel;
IF OBJECT_ID('sp_UpdateModel', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateModel;
IF OBJECT_ID('sp_GetDefaultModel', 'P') IS NOT NULL DROP PROCEDURE sp_GetDefaultModel;
IF OBJECT_ID('sp_GetModels', 'P') IS NOT NULL DROP PROCEDURE sp_GetModels;
IF OBJECT_ID('sp_AddModel', 'P') IS NOT NULL DROP PROCEDURE sp_AddModel;
IF OBJECT_ID('sp_DeleteProject', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteProject;
IF OBJECT_ID('sp_GetProjectsByUser', 'P') IS NOT NULL DROP PROCEDURE sp_GetProjectsByUser;
IF OBJECT_ID('sp_AddProject', 'P') IS NOT NULL DROP PROCEDURE sp_AddProject;
IF OBJECT_ID('sp_UpdateUserBitbucketCreds', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateUserBitbucketCreds;
IF OBJECT_ID('sp_UpdateUserLastActive', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateUserLastActive;
IF OBJECT_ID('sp_UpdateUser', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateUser;
IF OBJECT_ID('sp_GetUserByID', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserByID;
IF OBJECT_ID('sp_GetUserByEmail', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserByEmail;
IF OBJECT_ID('sp_GetUsers', 'P') IS NOT NULL DROP PROCEDURE sp_GetUsers;
IF OBJECT_ID('sp_CreateUser', 'P') IS NOT NULL DROP PROCEDURE sp_CreateUser;

IF OBJECT_ID('UserActivityLog', 'U') IS NOT NULL DROP TABLE UserActivityLog;
IF OBJECT_ID('Activities', 'U') IS NOT NULL DROP TABLE Activities;
IF OBJECT_ID('Models', 'U') IS NOT NULL DROP TABLE Models;
IF OBJECT_ID('Projects', 'U') IS NOT NULL DROP TABLE Projects;
IF OBJECT_ID('Users', 'U') IS NOT NULL DROP TABLE Users;
GO

-- Create Tables
CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY(1,1),
    Email NVARCHAR(255) UNIQUE NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role NVARCHAR(50) NOT NULL CHECK (Role IN ('admin', 'user')),
    IsActive BIT NOT NULL DEFAULT 1,
    LastActive DATETIME NOT NULL DEFAULT GETDATE(),
    BitbucketUsername NVARCHAR(255),
    BitbucketAppPassword NVARCHAR(255) -- In a real production system, this should be encrypted
);
GO

CREATE TABLE Projects (
    ProjectID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL,
    Name NVARCHAR(255) NOT NULL,
    URL NVARCHAR(2048) NOT NULL,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    UNIQUE (UserID, URL)
);
GO

CREATE TABLE Models (
    ModelID INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(255) UNIQUE NOT NULL,
    Type NVARCHAR(50) NOT NULL CHECK (Type IN ('online', 'local')),
    IsDefault BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE Activities (
    ActivityID INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(255) UNIQUE NOT NULL,
    Type NVARCHAR(50) NOT NULL CHECK (Type IN ('AI Action', 'Authentication', 'File System', 'Profile Update'))
);
GO

CREATE TABLE UserActivityLog (
    LogID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL,
    ActivityID INT NOT NULL,
    Details NVARCHAR(MAX),
    Timestamp DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (ActivityID) REFERENCES Activities(ActivityID)
);
GO

-- Stored Procedures for Users
CREATE OR ALTER PROCEDURE sp_CreateUser
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

CREATE OR ALTER PROCEDURE sp_GetUsers
AS
BEGIN
    SELECT UserID, Email, Role, IsActive, LastActive, BitbucketUsername, BitbucketAppPassword
    FROM Users;
END
GO

CREATE OR ALTER PROCEDURE sp_GetUserByEmail
    @Email NVARCHAR(255)
AS
BEGIN
    SELECT * FROM Users WHERE Email = @Email;
END
GO

CREATE OR ALTER PROCEDURE sp_GetUserByID
    @UserID INT
AS
BEGIN
    SELECT * FROM Users WHERE UserID = @UserID;
END
GO

CREATE OR ALTER PROCEDURE sp_UpdateUser
    @UserID INT,
    @Email NVARCHAR(255) = NULL,
    @PasswordHash NVARCHAR(255) = NULL,
    @Role NVARCHAR(50) = NULL,
    @IsActive BIT = NULL
AS
BEGIN
    IF EXISTS (SELECT 1 FROM Users WHERE UserID = @UserID)
    BEGIN
        UPDATE Users
        SET
            Email = ISNULL(@Email, Email),
            PasswordHash = ISNULL(@PasswordHash, PasswordHash),
            Role = ISNULL(@Role, Role),
            IsActive = ISNULL(@IsActive, IsActive)
        WHERE UserID = @UserID;
        SELECT 1 AS Result;
    END
    ELSE
    BEGIN
        SELECT 0 AS Result;
    END
END
GO

CREATE OR ALTER PROCEDURE sp_UpdateUserLastActive
    @UserID INT
AS
BEGIN
    UPDATE Users SET LastActive = GETDATE() WHERE UserID = @UserID;
END
GO

CREATE OR ALTER PROCEDURE sp_UpdateUserBitbucketCreds
    @UserID INT,
    @BitbucketUsername NVARCHAR(255),
    @BitbucketAppPassword NVARCHAR(255)
AS
BEGIN
    UPDATE Users
    SET
        BitbucketUsername = @BitbucketUsername,
        BitbucketAppPassword = @BitbucketAppPassword
    WHERE UserID = @UserID;
END
GO

-- Stored Procedures for Projects
CREATE OR ALTER PROCEDURE sp_AddProject
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

CREATE OR ALTER PROCEDURE sp_GetProjectsByUser
    @UserID INT
AS
BEGIN
    SELECT ProjectID, UserID, Name, URL
    FROM Projects
    WHERE UserID = @UserID;
END
GO

CREATE OR ALTER PROCEDURE sp_DeleteProject
    @ProjectID INT,
    @UserID INT
AS
BEGIN
    DELETE FROM Projects
    WHERE ProjectID = @ProjectID AND UserID = @UserID;
END
GO

-- Stored Procedures for Models
CREATE OR ALTER PROCEDURE sp_AddModel
    @Name NVARCHAR(255),
    @Type NVARCHAR(50)
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Models WHERE Name = @Name)
    BEGIN
        -- If this is the first model, make it default
        DECLARE @IsDefault BIT = 0;
        IF (SELECT COUNT(*) FROM Models) = 0
        BEGIN
            SET @IsDefault = 1;
        END

        INSERT INTO Models (Name, Type, IsDefault)
        VALUES (@Name, @Type, @IsDefault);
        SELECT * FROM Models WHERE ModelID = SCOPE_IDENTITY();
        RETURN 0;
    END
    ELSE
    BEGIN
        RETURN 1; -- Model name exists
    END
END
GO

CREATE OR ALTER PROCEDURE sp_GetModels
AS
BEGIN
    SELECT ModelID, Name, Type, IsDefault FROM Models ORDER BY Name;
END
GO

CREATE OR ALTER PROCEDURE sp_GetDefaultModel
AS
BEGIN
    SELECT TOP 1 ModelID, Name, Type, IsDefault FROM Models WHERE IsDefault = 1;
END
GO

CREATE OR ALTER PROCEDURE sp_UpdateModel
    @ModelID INT,
    @Name NVARCHAR(255),
    @Type NVARCHAR(50)
AS
BEGIN
    -- Check if another model with the same name exists
    IF EXISTS (SELECT 1 FROM Models WHERE Name = @Name AND ModelID <> @ModelID)
    BEGIN
        RETURN 1; -- Name collision
    END

    UPDATE Models
    SET Name = @Name, Type = @Type
    WHERE ModelID = @ModelID;
    
    IF @@ROWCOUNT = 0
        RETURN 2; -- Model not found
    
    RETURN 0; -- Success
END
GO

CREATE OR ALTER PROCEDURE sp_SetDefaultModel
    @ModelID INT
AS
BEGIN
    BEGIN TRANSACTION;
    UPDATE Models SET IsDefault = 0 WHERE IsDefault = 1;
    UPDATE Models SET IsDefault = 1 WHERE ModelID = @ModelID;
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE sp_DeleteModel
    @ModelID INT
AS
BEGIN
    -- Prevent deleting the default model
    IF EXISTS (SELECT 1 FROM Models WHERE ModelID = @ModelID AND IsDefault = 1)
    BEGIN
        RETURN 1; -- Cannot delete default model
    END

    DELETE FROM Models WHERE ModelID = @ModelID;
    RETURN 0;
END
GO

-- Stored Procedures for Activity
CREATE OR ALTER PROCEDURE sp_LogActivity
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
        WHEN @ActivityName IN ('Change Password', 'Update Profile', 'User updated their Bitbucket credentials.') THEN 'Profile Update'
        WHEN @ActivityName IN ('File Read', 'File Write') THEN 'File System'
        ELSE 'AI Action'
    END;

    -- Find or create the activity
    SELECT @ActivityID = ActivityID FROM Activities WHERE Name = @ActivityName;
    IF @ActivityID IS NULL
    BEGIN
        INSERT INTO Activities (Name, Type) VALUES (@ActivityName, @ActivityType);
        SET @ActivityID = SCOPE_IDENTITY();
    END

    -- Log the user's activity
    INSERT INTO UserActivityLog (UserID, ActivityID, Details)
    VALUES (@UserID, @ActivityID, @Details);
END
GO

CREATE OR ALTER PROCEDURE sp_GetUserActivity
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

CREATE OR ALTER PROCEDURE sp_GetUsageStatistics
    @Period NVARCHAR(10) -- 'daily', 'weekly', 'monthly', 'yearly'
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Main Statistics
    SELECT
        (SELECT COUNT(*) FROM Users WHERE IsActive = 1) AS TotalUsers,
        (SELECT COUNT(*) FROM UserActivityLog ual JOIN Activities a ON ual.ActivityID = a.ActivityID WHERE a.Type = 'AI Action') AS TotalActions,
        CASE
            WHEN (SELECT COUNT(*) FROM Users WHERE IsActive = 1) > 0
            THEN CAST((SELECT COUNT(*) FROM UserActivityLog ual JOIN Activities a ON ual.ActivityID = a.ActivityID WHERE a.Type = 'AI Action') AS FLOAT) / (SELECT COUNT(*) FROM Users WHERE IsActive = 1)
            ELSE 0
        END AS AvgActionsPerUser,
        (SELECT TOP 1 a.Name FROM UserActivityLog ual JOIN Activities a ON ual.ActivityID = a.ActivityID WHERE a.Type = 'AI Action' GROUP BY a.Name ORDER BY COUNT(*) DESC) AS MostUsedFeature;

    -- 2. Feature Usage Breakdown
    SELECT
        a.Name,
        COUNT(ual.LogID) AS Actions
    FROM Activities a
    JOIN UserActivityLog ual ON a.ActivityID = ual.ActivityID
    WHERE a.Type = 'AI Action'
    GROUP BY a.Name
    ORDER BY Actions DESC;

    -- 3. Trend Data
    DECLARE @EndDate DATETIME = GETDATE();
    DECLARE @StartDate DATETIME;

    IF @Period = 'daily' SET @StartDate = DATEADD(day, -6, @EndDate);
    ELSE IF @Period = 'weekly' SET @StartDate = DATEADD(week, -6, @EndDate);
    ELSE IF @Period = 'monthly' SET @StartDate = DATEADD(month, -11, @EndDate);
    ELSE -- yearly
    SET @StartDate = DATEADD(year, -4, @EndDate);

    -- Sanitize start date to the beginning of the period
    IF @Period = 'daily' SET @StartDate = CAST(@StartDate AS DATE);
    IF @Period = 'weekly' SET @StartDate = DATEADD(wk, DATEDIFF(wk, 0, @StartDate), 0);
    IF @Period = 'monthly' SET @StartDate = DATEFROMPARTS(YEAR(@StartDate), MONTH(@StartDate), 1);
    IF @Period = 'yearly' SET @StartDate = DATEFROMPARTS(YEAR(@StartDate), 1, 1);

    -- Recursive CTE to generate date series
    ;WITH DateSeries(DatePoint) AS (
        SELECT @StartDate
        UNION ALL
        SELECT
            CASE @Period
                WHEN 'daily' THEN DATEADD(day, 1, DatePoint)
                WHEN 'weekly' THEN DATEADD(week, 1, DatePoint)
                WHEN 'monthly' THEN DATEADD(month, 1, DatePoint)
                ELSE DATEADD(year, 1, DatePoint)
            END
        FROM DateSeries
        WHERE
            CASE @Period
                WHEN 'daily' THEN DATEADD(day, 1, DatePoint)
                WHEN 'weekly' THEN DATEADD(week, 1, DatePoint)
                WHEN 'monthly' THEN DATEADD(month, 1, DatePoint)
                ELSE DATEADD(year, 1, DatePoint)
            END <= @EndDate
    ),
    -- Aggregate logs by the specified period
    AggregatedLogs AS (
        SELECT
            CASE @Period
                WHEN 'daily' THEN CAST(ual.Timestamp AS DATE)
                WHEN 'weekly' THEN DATEADD(wk, DATEDIFF(wk, 0, ual.Timestamp), 0)
                WHEN 'monthly' THEN DATEFROMPARTS(YEAR(ual.Timestamp), MONTH(ual.Timestamp), 1)
                ELSE DATEFROMPARTS(YEAR(ual.Timestamp), 1, 1)
            END AS PeriodStart,
            COUNT(ual.LogID) AS Actions
        FROM UserActivityLog ual
        JOIN Activities act ON ual.ActivityID = act.ActivityID
        WHERE act.Type = 'AI Action' AND ual.Timestamp >= @StartDate AND ual.Timestamp <= @EndDate
        GROUP BY
            CASE @Period
                WHEN 'daily' THEN CAST(ual.Timestamp AS DATE)
                WHEN 'weekly' THEN DATEADD(wk, DATEDIFF(wk, 0, ual.Timestamp), 0)
                WHEN 'monthly' THEN DATEFROMPARTS(YEAR(ual.Timestamp), MONTH(ual.Timestamp), 1)
                ELSE DATEFROMPARTS(YEAR(ual.Timestamp), 1, 1)
            END
    )
    -- Final SELECT joining the date series with aggregated logs
    SELECT
        CASE @Period
            WHEN 'daily' THEN FORMAT(ds.DatePoint, 'ddd')
            WHEN 'weekly' THEN 'W' + FORMAT(ds.DatePoint, 'ww')
            WHEN 'monthly' THEN FORMAT(ds.DatePoint, 'MMM')
            ELSE FORMAT(ds.DatePoint, 'yyyy')
        END AS Name,
        ISNULL(al.Actions, 0) AS Actions
    FROM DateSeries ds
    LEFT JOIN AggregatedLogs al ON ds.DatePoint = al.PeriodStart
    ORDER BY ds.DatePoint
    OPTION (MAXRECURSION 366);

END;
GO

-- Drop existing procedures and tables to ensure a clean slate
IF OBJECT_ID('sp_UpdateUserBitbucketCreds', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateUserBitbucketCreds;
IF OBJECT_ID('sp_GetUsageStatistics', 'P') IS NOT NULL DROP PROCEDURE sp_GetUsageStatistics;
IF OBJECT_ID('sp_LogActivity', 'P') IS NOT NULL DROP PROCEDURE sp_LogActivity;
IF OBJECT_ID('sp_GetUserActivity', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserActivity;
IF OBJECT_ID('sp_DeleteProject', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteProject;
IF OBJECT_ID('sp_AddProject', 'P') IS NOT NULL DROP PROCEDURE sp_AddProject;
IF OBJECT_ID('sp_GetProjectsByUser', 'P') IS NOT NULL DROP PROCEDURE sp_GetProjectsByUser;
IF OBJECT_ID('sp_DeleteModel', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteModel;
IF OBJECT_ID('sp_SetDefaultModel', 'P') IS NOT NULL DROP PROCEDURE sp_SetDefaultModel;
IF OBJECT_ID('sp_UpdateModel', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateModel;
IF OBJECT_ID('sp_AddModel', 'P') IS NOT NULL DROP PROCEDURE sp_AddModel;
IF OBJECT_ID('sp_GetDefaultModel', 'P') IS NOT NULL DROP PROCEDURE sp_GetDefaultModel;
IF OBJECT_ID('sp_GetModels', 'P') IS NOT NULL DROP PROCEDURE sp_GetModels;
IF OBJECT_ID('sp_UpdateUser', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateUser;
IF OBJECT_ID('sp_UpdateUserLastActive', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateUserLastActive;
IF OBJECT_ID('sp_CreateUser', 'P') IS NOT NULL DROP PROCEDURE sp_CreateUser;
IF OBJECT_ID('sp_GetUserByID', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserByID;
IF OBJECT_ID('sp_GetUserByEmail', 'P') IS NOT NULL DROP PROCEDURE sp_GetUserByEmail;
IF OBJECT_ID('sp_GetUsers', 'P') IS NOT NULL DROP PROCEDURE sp_GetUsers;

IF OBJECT_ID('UserActivityLog', 'U') IS NOT NULL DROP TABLE UserActivityLog;
IF OBJECT_ID('Activities', 'U') IS NOT NULL DROP TABLE Activities;
IF OBJECT_ID('Projects', 'U') IS NOT NULL DROP TABLE Projects;
IF OBJECT_ID('Models', 'U') IS NOT NULL DROP TABLE Models;
IF OBJECT_ID('Users', 'U') IS NOT NULL DROP TABLE Users;
GO

-- Create Users table
CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY(1,1),
    Email NVARCHAR(255) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role NVARCHAR(50) NOT NULL CHECK (Role IN ('admin', 'user')),
    IsActive BIT NOT NULL DEFAULT 1,
    LastActive DATETIME2 DEFAULT GETUTCDATE(),
    BitbucketUsername NVARCHAR(255) NULL,
    BitbucketAppPassword NVARCHAR(255) NULL -- This should be encrypted in a real production environment
);
GO

-- Create Models table
CREATE TABLE Models (
    ModelID INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(255) NOT NULL UNIQUE,
    Type NVARCHAR(50) NOT NULL CHECK (Type IN ('online', 'local')),
    IsDefault BIT NOT NULL DEFAULT 0
);
GO

-- Create Projects table
CREATE TABLE Projects (
    ProjectID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL,
    Name NVARCHAR(255) NOT NULL,
    ProjectKey NVARCHAR(255) NOT NULL,
    URL NVARCHAR(2048) NOT NULL,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    UNIQUE (UserID, URL)
);
GO

-- Create Activities table
CREATE TABLE Activities (
    ActivityID INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(255) NOT NULL UNIQUE,
    Type NVARCHAR(50) NOT NULL CHECK (Type IN ('AI Action', 'Authentication', 'File System', 'Profile Update'))
);
GO

-- Create UserActivityLog table
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

-- Stored Procedure to get all users (excluding password)
CREATE PROCEDURE sp_GetUsers
AS
BEGIN
    SELECT UserID, Email, Role, IsActive, LastActive, BitbucketUsername, BitbucketAppPassword FROM Users;
END
GO

-- Stored Procedure to get a user by email
CREATE PROCEDURE sp_GetUserByEmail
    @Email NVARCHAR(255)
AS
BEGIN
    SELECT UserID, Email, PasswordHash, Role, IsActive, LastActive, BitbucketUsername, BitbucketAppPassword FROM Users WHERE Email = @Email;
END
GO

-- Stored Procedure to get a user by ID
CREATE PROCEDURE sp_GetUserByID
    @UserID INT
AS
BEGIN
    SELECT UserID, Email, PasswordHash, Role, IsActive, LastActive, BitbucketUsername, BitbucketAppPassword FROM Users WHERE UserID = @UserID;
END
GO

-- Stored Procedure to create a new user
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
        VALUES (@Email, @PasswordHash, @Role, @IsActive, GETUTCDATE());
        SELECT SCOPE_IDENTITY() AS UserID;
    END
    ELSE
    BEGIN
        SELECT -1 AS UserID; -- Indicates user already exists
    END
END
GO

-- Stored Procedure to update a user's last active time
CREATE PROCEDURE sp_UpdateUserLastActive
    @UserID INT
AS
BEGIN
    UPDATE Users SET LastActive = GETUTCDATE() WHERE UserID = @UserID;
END
GO

-- Stored Procedure to update a user
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
    SELECT ModelID, Name, Type, IsDefault FROM Models WHERE IsDefault = 1;
END
GO

CREATE PROCEDURE sp_AddModel
    @Name NVARCHAR(255),
    @Type NVARCHAR(50)
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Models WHERE Name = @Name)
    BEGIN
        -- If this is the first model, make it the default
        DECLARE @isFirst BIT = 0;
        IF NOT EXISTS (SELECT 1 FROM Models)
        BEGIN
            SET @isFirst = 1;
        END

        INSERT INTO Models (Name, Type, IsDefault) VALUES (@Name, @Type, @isFirst);
        
        SELECT ModelID, Name, Type, IsDefault FROM Models WHERE ModelID = SCOPE_IDENTITY();
        RETURN 0; -- Success
    END
    ELSE
    BEGIN
        RETURN 1; -- Duplicate name
    END
END
GO

CREATE PROCEDURE sp_UpdateModel
    @ModelID INT,
    @Name NVARCHAR(255),
    @Type NVARCHAR(50)
AS
BEGIN
    -- Check for duplicate name, excluding the current model being updated
    IF EXISTS (SELECT 1 FROM Models WHERE Name = @Name AND ModelID != @ModelID)
    BEGIN
        RETURN 1; -- Duplicate name error
    END

    UPDATE Models
    SET Name = @Name, Type = @Type
    WHERE ModelID = @ModelID;

    IF @@ROWCOUNT > 0
        RETURN 0; -- Success
    ELSE
        RETURN 2; -- Not found or no change
END
GO

CREATE PROCEDURE sp_SetDefaultModel
    @ModelID INT
AS
BEGIN
    BEGIN TRANSACTION;
    UPDATE Models SET IsDefault = 0;
    UPDATE Models SET IsDefault = 1 WHERE ModelID = @ModelID;
    COMMIT TRANSACTION;
END
GO

CREATE PROCEDURE sp_DeleteModel
    @ModelID INT
AS
BEGIN
    -- Prevent deleting the default model
    IF EXISTS (SELECT 1 FROM Models WHERE ModelID = @ModelID AND IsDefault = 1)
    BEGIN
        RETURN 1; -- Cannot delete default model
    END

    DELETE FROM Models WHERE ModelID = @ModelID;
    
    IF @@ROWCOUNT > 0
        RETURN 0; -- Success
    ELSE
        RETURN 2; -- Not found
END
GO

-- Stored Procedures for Projects
CREATE PROCEDURE sp_GetProjectsByUser
    @UserID INT
AS
BEGIN
    SELECT ProjectID, UserID, Name, ProjectKey, URL FROM Projects
    WHERE UserID = @UserID
    ORDER BY Name;
END
GO

CREATE PROCEDURE sp_AddProject
    @UserID INT,
    @Name NVARCHAR(255),
    @ProjectKey NVARCHAR(255),
    @URL NVARCHAR(2048)
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Projects WHERE UserID = @UserID AND URL = @URL)
    BEGIN
        INSERT INTO Projects (UserID, Name, ProjectKey, URL)
        VALUES (@UserID, @Name, @ProjectKey, @URL);
        
        SELECT 
            P.ProjectID,
            P.UserID,
            P.Name,
            P.ProjectKey,
            P.URL
        FROM Projects P WHERE P.ProjectID = SCOPE_IDENTITY();
        RETURN 0; -- Success
    END
    ELSE
    BEGIN
        RETURN 1; -- Already exists
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

CREATE PROCEDURE sp_LogActivity
    @UserID INT,
    @ActivityName NVARCHAR(255),
    @Details NVARCHAR(MAX)
AS
BEGIN
    DECLARE @ActivityID INT;
    DECLARE @ActivityType NVARCHAR(50);

    -- Determine ActivityType based on name
    SET @ActivityType = CASE 
        WHEN @ActivityName IN ('Login', 'Password Change') THEN 'Authentication'
        WHEN @ActivityName IN ('Update Profile') THEN 'Profile Update'
        ELSE 'AI Action'
    END;

    -- Find or create the activity
    SELECT @ActivityID = ActivityID FROM Activities WHERE Name = @ActivityName;

    IF @ActivityID IS NULL
    BEGIN
        INSERT INTO Activities (Name, Type) VALUES (@ActivityName, @ActivityType);
        SET @ActivityID = SCOPE_IDENTITY();
    END

    -- Insert the log entry
    INSERT INTO UserActivityLog (UserID, ActivityID, Details)
    VALUES (@UserID, @ActivityID, @Details);
END
GO

CREATE PROCEDURE sp_GetUsageStatistics
    @Period NVARCHAR(10) -- 'daily', 'weekly', 'monthly', 'yearly'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @EndDate DATETIME = GETUTCDATE();
    DECLARE @StartDate DATETIME;
    DECLARE @Intervals INT;
    DECLARE @DatePart VARCHAR(10);

    IF @Period = 'daily'
    BEGIN
        SET @StartDate = DATEADD(DAY, -6, @EndDate);
        SET @Intervals = 7;
        SET @DatePart = 'day';
    END
    ELSE IF @Period = 'weekly'
    BEGIN
        SET @StartDate = DATEADD(WEEK, -11, @EndDate);
        SET @Intervals = 12;
        SET @DatePart = 'week';
    END
    ELSE IF @Period = 'monthly'
    BEGIN
        SET @StartDate = DATEADD(MONTH, -11, @EndDate);
        SET @Intervals = 12;
        SET @DatePart = 'month';
    END
    ELSE IF @Period = 'yearly'
    BEGIN
        SET @StartDate = DATEADD(YEAR, -4, @EndDate);
        SET @Intervals = 5;
        SET @DatePart = 'year';
    END;

    -- Main Stats
    SELECT
        (SELECT COUNT(*) FROM Users) AS TotalUsers,
        (SELECT COUNT(*) FROM UserActivityLog l JOIN Activities a ON l.ActivityID = a.ActivityID WHERE a.Type = 'AI Action' AND l.Timestamp BETWEEN @StartDate AND @EndDate) AS TotalActions,
        (SELECT TOP 1 a.Name FROM UserActivityLog l JOIN Activities a ON l.ActivityID = a.ActivityID WHERE a.Type = 'AI Action' AND l.Timestamp BETWEEN @StartDate AND @EndDate GROUP BY a.Name ORDER BY COUNT(*) DESC) AS MostUsedFeature,
        CAST(
            (SELECT COUNT(*) FROM UserActivityLog l JOIN Activities a ON l.ActivityID = a.ActivityID WHERE a.Type = 'AI Action' AND l.Timestamp BETWEEN @StartDate AND @EndDate) AS FLOAT
        ) / NULLIF((SELECT COUNT(DISTINCT UserID) FROM UserActivityLog WHERE Timestamp BETWEEN @StartDate AND @EndDate), 0) AS AvgActionsPerUser;

    -- Feature Breakdown
    SELECT 
        a.Name,
        COUNT(*) AS Actions
    FROM UserActivityLog l
    JOIN Activities a ON l.ActivityID = a.ActivityID
    WHERE a.Type = 'AI Action' AND l.Timestamp BETWEEN @StartDate AND @EndDate
    GROUP BY a.Name
    ORDER BY Actions DESC;

    -- Trend Analysis
    ;WITH DateSeries AS (
        SELECT TOP (@Intervals)
            DATEADD(
                CASE @DatePart WHEN 'day' THEN DAY WHEN 'week' THEN WEEK WHEN 'month' THEN MONTH ELSE YEAR END, 
                - (ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1), 
                @EndDate
            ) AS DatePoint
        FROM master.dbo.spt_values
    ),
    GroupedLogs AS (
        SELECT
            CAST(
                CASE 
                    WHEN @DatePart = 'day' THEN CONVERT(date, Timestamp)
                    WHEN @DatePart = 'week' THEN DATEADD(wk, DATEDIFF(wk, 7, Timestamp), 6)
                    WHEN @DatePart = 'month' THEN EOMONTH(Timestamp)
                    ELSE EOMONTH(DATEFROMPARTS(YEAR(Timestamp), 12, 31))
                END
            AS date) AS GroupingDate,
            COUNT(*) as ActionCount
        FROM UserActivityLog l
        JOIN Activities a ON l.ActivityID = a.ActivityID
        WHERE a.Type = 'AI Action' AND l.Timestamp >= @StartDate
        GROUP BY 
            CAST(
                CASE 
                    WHEN @DatePart = 'day' THEN CONVERT(date, Timestamp)
                    WHEN @DatePart = 'week' THEN DATEADD(wk, DATEDIFF(wk, 7, Timestamp), 6)
                    WHEN @DatePart = 'month' THEN EOMONTH(Timestamp)
                    ELSE EOMONTH(DATEFROMPARTS(YEAR(Timestamp), 12, 31))
                END
            AS date)
    )
    SELECT
        CASE 
            WHEN @DatePart = 'day' THEN FORMAT(d.DatePoint, 'ddd')
            WHEN @DatePart = 'week' THEN FORMAT(d.DatePoint, 'MMM dd')
            WHEN @DatePart = 'month' THEN FORMAT(d.DatePoint, 'MMM')
            ELSE FORMAT(d.DatePoint, 'yyyy')
        END AS Name,
        ISNULL(gl.ActionCount, 0) AS Actions
    FROM DateSeries d
    LEFT JOIN GroupedLogs gl ON gl.GroupingDate = CAST(
        CASE 
            WHEN @DatePart = 'day' THEN CONVERT(date, d.DatePoint)
            WHEN @DatePart = 'week' THEN DATEADD(wk, DATEDIFF(wk, 7, d.DatePoint), 6)
            WHEN @DatePart = 'month' THEN EOMONTH(d.DatePoint)
            ELSE EOMONTH(DATEFROMPARTS(YEAR(d.DatePoint), 12, 31))
        END
    AS date)
    ORDER BY d.DatePoint;

END
GO

-- Stored Procedure to update Bitbucket credentials
CREATE PROCEDURE sp_UpdateUserBitbucketCreds
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

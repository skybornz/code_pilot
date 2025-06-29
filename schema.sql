-- Check and create database if not exists
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'SemCoPilot')
BEGIN
    CREATE DATABASE SemCoPilot;
END
GO

USE SemCoPilot;
GO

-- Create Users table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
BEGIN
    CREATE TABLE Users (
        UserID INT PRIMARY KEY IDENTITY(1,1),
        Email NVARCHAR(255) UNIQUE NOT NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        Role NVARCHAR(50) NOT NULL CHECK (Role IN ('admin', 'user')),
        IsActive BIT NOT NULL DEFAULT 1,
        LastActive DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

-- Create Projects table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Projects' and xtype='U')
BEGIN
    CREATE TABLE Projects (
        ProjectID INT PRIMARY KEY IDENTITY(1,1),
        UserID INT NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        URL NVARCHAR(2048) NOT NULL,
        FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IX_User_Project_URL ON Projects(UserID, URL);
END
GO

-- Create Activities table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Activities' and xtype='U')
BEGIN
    CREATE TABLE Activities (
        ActivityID INT PRIMARY KEY IDENTITY(1,1),
        Name NVARCHAR(100) UNIQUE NOT NULL,
        Type NVARCHAR(50) NOT NULL CHECK (Type IN ('AI Action', 'Authentication', 'File System', 'Other'))
    );
END
GO

-- Create UserActivityLog table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UserActivityLog' and xtype='U')
BEGIN
    CREATE TABLE UserActivityLog (
        LogID INT PRIMARY KEY IDENTITY(1,1),
        UserID INT NOT NULL,
        ActivityID INT NOT NULL,
        Details NVARCHAR(MAX),
        Timestamp DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
        FOREIGN KEY (ActivityID) REFERENCES Activities(ActivityID)
    );
END
GO

-- Create ModelSettings table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ModelSettings' and xtype='U')
BEGIN
    CREATE TABLE ModelSettings (
        ModelID INT PRIMARY KEY IDENTITY(1,1),
        Name NVARCHAR(255) UNIQUE NOT NULL,
        Type NVARCHAR(50) NOT NULL CHECK (Type IN ('online', 'local')),
        IsDefault BIT NOT NULL DEFAULT 0
    );
END
GO

-- Stored Procedure to Add a User
IF OBJECT_ID('sp_AddUser', 'P') IS NOT NULL
    DROP PROCEDURE sp_AddUser;
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
        SELECT SCOPE_IDENTITY() as UserID;
    END
    ELSE
    BEGIN
        SELECT -1 as UserID; -- Indicates user already exists
    END
END
GO

-- Stored Procedure to Get All Users (without password hash)
IF OBJECT_ID('sp_GetUsers', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetUsers;
GO

CREATE PROCEDURE sp_GetUsers
AS
BEGIN
    SELECT UserID, Email, Role, IsActive, LastActive
    FROM Users
    ORDER BY UserID;
END
GO

-- Stored Procedure to Get User by Email
IF OBJECT_ID('sp_GetUserByEmail', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetUserByEmail;
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

-- Stored Procedure to Get User by ID
IF OBJECT_ID('sp_GetUserByID', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetUserByID;
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

-- Stored Procedure to Update User Last Active Time
IF OBJECT_ID('sp_UpdateUserLastActive', 'P') IS NOT NULL
    DROP PROCEDURE sp_UpdateUserLastActive;
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

-- Stored Procedure to Update a User
IF OBJECT_ID('sp_UpdateUser', 'P') IS NOT NULL
    DROP PROCEDURE sp_UpdateUser;
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
        UPDATE Users
        SET
            Email = ISNULL(@Email, Email),
            PasswordHash = ISNULL(@PasswordHash, PasswordHash),
            Role = ISNULL(@Role, Role),
            IsActive = ISNULL(@IsActive, IsActive)
        WHERE UserID = @UserID;
        SELECT CAST(1 AS BIT) as Result;
    END
    ELSE
    BEGIN
         SELECT CAST(0 AS BIT) as Result;
    END
END
GO


-- Stored Procedure to Add a Project
IF OBJECT_ID('sp_AddProject', 'P') IS NOT NULL
    DROP PROCEDURE sp_AddProject;
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
    END
    ELSE
    BEGIN
        -- Return empty result set if project exists
        SELECT * FROM Projects WHERE 1=0;
    END
END
GO

-- Stored Procedure to Get Projects by User
IF OBJECT_ID('sp_GetProjectsByUser', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetProjectsByUser;
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

-- Stored Procedure to Delete a Project
IF OBJECT_ID('sp_DeleteProject', 'P') IS NOT NULL
    DROP PROCEDURE sp_DeleteProject;
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

-- Stored Procedure to Get a User's Activity
IF OBJECT_ID('sp_GetUserActivity', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetUserActivity;
GO

CREATE PROCEDURE sp_GetUserActivity
    @UserID INT
AS
BEGIN
    SELECT l.LogID, a.Name as ActivityName, a.Type as ActivityType, l.Details, l.Timestamp
    FROM UserActivityLog l
    JOIN Activities a ON l.ActivityID = a.ActivityID
    WHERE l.UserID = @UserID
    ORDER BY l.Timestamp DESC;
END
GO

-- Stored Procedure to Log Activity (and create activity type if not exists)
IF OBJECT_ID('sp_LogActivity', 'P') IS NOT NULL
    DROP PROCEDURE sp_LogActivity;
GO

CREATE PROCEDURE sp_LogActivity
    @UserID INT,
    @ActivityName NVARCHAR(100),
    @Details NVARCHAR(MAX)
AS
BEGIN
    DECLARE @ActivityID INT;
    DECLARE @ActivityType NVARCHAR(50);

    -- Determine ActivityType based on ActivityName
    SET @ActivityType = CASE 
        WHEN @ActivityName IN ('Login', 'Logout', 'Password Change') THEN 'Authentication'
        WHEN @ActivityName IN ('Analyze Diff', 'Explain Code', 'Find Bugs', 'Generate Test', 'Refactor Code', 'Generate Docs', 'Generate SDD') THEN 'AI Action'
        ELSE 'Other'
    END;

    -- Check if activity exists, otherwise create it
    SELECT @ActivityID = ActivityID FROM Activities WHERE Name = @ActivityName;

    IF @ActivityID IS NULL
    BEGIN
        INSERT INTO Activities (Name, Type) VALUES (@ActivityName, @ActivityType);
        SET @ActivityID = SCOPE_IDENTITY();
    END

    -- Insert log
    INSERT INTO UserActivityLog (UserID, ActivityID, Details, Timestamp)
    VALUES (@UserID, @ActivityID, @Details, GETDATE());
END
GO

-- Stored Procedure to Get Usage Statistics
IF OBJECT_ID('sp_GetUsageStatistics', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetUsageStatistics;
GO

CREATE PROCEDURE sp_GetUsageStatistics
    @Period NVARCHAR(10) -- 'daily', 'weekly', 'monthly', 'yearly'
AS
BEGIN
    DECLARE @StartDate DATETIME2;
    DECLARE @EndDate DATETIME2 = GETDATE();
    DECLARE @Format NVARCHAR(10);
    DECLARE @DatePart Varchar(10);

    IF @Period = 'daily'
    BEGIN
        SET @StartDate = DATEADD(day, -6, @EndDate);
        SET @Format = 'ddd'; -- Day of week (e.g., Mon)
        SET @DatePart = 'day';
    END
    ELSE IF @Period = 'weekly'
    BEGIN
        SET @StartDate = DATEADD(week, -7, @EndDate);
        SET @Format = 'yyyy-MM-dd'; -- Start of week
        SET @DatePart = 'week';
    END
    ELSE IF @Period = 'monthly'
    BEGIN
        SET @StartDate = DATEADD(month, -11, @EndDate);
        SET @Format = 'MMM'; -- Month abbreviation (e.g., Jan)
        SET @DatePart = 'month';
    END
    ELSE -- yearly
    BEGIN
        SET @StartDate = DATEADD(year, -4, @EndDate);
        SET @Format = 'yyyy'; -- Year
        SET @DatePart = 'year';
    END

    -- Main Statistics (ResultSet 0)
    SELECT
        (SELECT COUNT(DISTINCT UserID) FROM UserActivityLog WHERE Timestamp BETWEEN @StartDate AND @EndDate) AS TotalUsers,
        ISNULL(COUNT(l.ID), 0) AS TotalActions,
        ISNULL(CAST(COUNT(l.ID) AS FLOAT) / NULLIF(COUNT(DISTINCT l.UserID), 0), 0) AS AvgActionsPerUser,
        (SELECT TOP 1 a.Name FROM UserActivityLog ul JOIN Activities a ON ul.ActivityID = a.ActivityID WHERE ul.Timestamp BETWEEN @StartDate AND @EndDate AND a.Type = 'AI Action' GROUP BY a.Name ORDER BY COUNT(ul.ID) DESC) AS MostUsedFeature
    FROM UserActivityLog l
    WHERE l.Timestamp BETWEEN @StartDate AND @EndDate;

    -- Feature Distribution (ResultSet 1)
    SELECT a.Name, COUNT(l.ID) AS Actions
    FROM UserActivityLog l
    JOIN Activities a ON l.ActivityID = a.ActivityID
    WHERE l.Timestamp BETWEEN @StartDate AND @EndDate AND a.Type = 'AI Action'
    GROUP BY a.Name
    ORDER BY Actions DESC;

    -- Trend Data (ResultSet 2)
    ;WITH DateSeries AS (
        SELECT @StartDate AS DateValue
        UNION ALL
        SELECT DATEADD(day, 1, DateValue)
        FROM DateSeries
        WHERE DateValue < @EndDate
    ),
    GroupedData AS (
        SELECT 
            CASE 
                WHEN @Period = 'weekly' THEN CONVERT(NVARCHAR(10), DATEADD(wk, DATEDIFF(wk, 0, Timestamp), 0), 23)
                ELSE FORMAT(Timestamp, @Format)
            END AS Name,
            COUNT(ID) AS Actions
        FROM UserActivityLog
        WHERE Timestamp BETWEEN @StartDate AND @EndDate
        GROUP BY 
            CASE 
                WHEN @Period = 'weekly' THEN CONVERT(NVARCHAR(10), DATEADD(wk, DATEDIFF(wk, 0, Timestamp), 0), 23)
                ELSE FORMAT(Timestamp, @Format)
            END
    )
    SELECT Name, SUM(Actions) as Actions
    FROM GroupedData
    GROUP BY Name
    ORDER BY 
        MIN(CASE 
            WHEN @Period = 'weekly' THEN CONVERT(datetime, Name)
            WHEN @Period = 'daily' THEN PARSENAME(REPLACE(Name, ' ', '.'), 1) -- Does not work well for sorting days
            WHEN @Period = 'monthly' THEN DATEFROMPARTS(YEAR(@EndDate), PARSENAME(REPLACE(Name, ' ', '.'), 1), 1)
            ELSE DATEFROMPARTS(CAST(Name AS INT), 1, 1)
        END);

END
GO
-- Stored Procedures for ModelSettings

-- Get all models
IF OBJECT_ID('sp_GetModels', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetModels;
GO

CREATE PROCEDURE sp_GetModels
AS
BEGIN
    SELECT ModelID, Name, Type, IsDefault FROM ModelSettings ORDER BY IsDefault DESC, Name;
END
GO

-- Get default model
IF OBJECT_ID('sp_GetDefaultModel', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetDefaultModel;
GO

CREATE PROCEDURE sp_GetDefaultModel
AS
BEGIN
    SELECT ModelID, Name, Type, IsDefault FROM ModelSettings WHERE IsDefault = 1;
END
GO

-- Add a model
IF OBJECT_ID('sp_AddModel', 'P') IS NOT NULL
    DROP PROCEDURE sp_AddModel;
GO

CREATE PROCEDURE sp_AddModel
    @Name NVARCHAR(255),
    @Type NVARCHAR(50)
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM ModelSettings WHERE Name = @Name)
    BEGIN
        -- If this is the first model, make it default
        DECLARE @IsDefault BIT = 0;
        IF (SELECT COUNT(*) FROM ModelSettings) = 0
            SET @IsDefault = 1;
        
        INSERT INTO ModelSettings (Name, Type, IsDefault) VALUES (@Name, @Type, @IsDefault);
        SELECT ModelID, Name, Type, IsDefault FROM ModelSettings WHERE ModelID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        RETURN 1; -- Name exists
    END
END
GO

-- Update a model
IF OBJECT_ID('sp_UpdateModel', 'P') IS NOT NULL
    DROP PROCEDURE sp_UpdateModel;
GO

CREATE PROCEDURE sp_UpdateModel
    @ModelID INT,
    @Name NVARCHAR(255),
    @Type NVARCHAR(50)
AS
BEGIN
    IF EXISTS (SELECT 1 FROM ModelSettings WHERE Name = @Name AND ModelID != @ModelID)
    BEGIN
        RETURN 1; -- Name exists on another model
    END

    UPDATE ModelSettings SET Name = @Name, Type = @Type WHERE ModelID = @ModelID;
    IF @@ROWCOUNT = 0
        RETURN 2; -- Not found
    
    RETURN 0; -- Success
END
GO

-- Set a default model
IF OBJECT_ID('sp_SetDefaultModel', 'P') IS NOT NULL
    DROP PROCEDURE sp_SetDefaultModel;
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

-- Delete a model
IF OBJECT_ID('sp_DeleteModel', 'P') IS NOT NULL
    DROP PROCEDURE sp_DeleteModel;
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

-- Seed initial data if tables are empty
-- Add default activities
IF (SELECT COUNT(*) FROM Activities) = 0
BEGIN
    INSERT INTO Activities (Name, Type) VALUES 
    ('Login', 'Authentication'),
    ('Logout', 'Authentication'),
    ('Password Change', 'Authentication'),
    ('Analyze Diff', 'AI Action'),
    ('Explain Code', 'AI Action'),
    ('Find Bugs', 'AI Action'),
    ('Generate Test', 'AI Action'),
    ('Refactor Code', 'AI Action'),
    ('Generate Docs', 'AI Action'),
    ('Generate SDD', 'AI Action');
END
GO

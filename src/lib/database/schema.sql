
-- This script is idempotent and can be run safely multiple times.
-- It will create tables if they don't exist and create or alter stored procedures.

-- Create Users Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
BEGIN
    CREATE TABLE Users (
        UserID INT PRIMARY KEY IDENTITY(1,1),
        Email NVARCHAR(255) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(255) NOT NULL,
        Role NVARCHAR(50) NOT NULL CHECK (Role IN ('admin', 'user')),
        IsActive BIT NOT NULL DEFAULT 1,
        LastActive DATETIME
    );
END
GO

-- Create Projects Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Projects' and xtype='U')
BEGIN
    CREATE TABLE Projects (
        ProjectID INT PRIMARY KEY IDENTITY(1,1),
        UserID INT NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        URL NVARCHAR(2048) NOT NULL,
        FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
    );
    -- Add a unique constraint for UserID and URL
    ALTER TABLE Projects ADD CONSTRAINT UQ_User_Project_URL UNIQUE (UserID, URL);
END
GO

-- Create Activities Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Activities' and xtype='U')
BEGIN
    CREATE TABLE Activities (
        ActivityID INT PRIMARY KEY IDENTITY(1,1),
        Name NVARCHAR(100) NOT NULL UNIQUE,
        Type NVARCHAR(50) NOT NULL -- e.g., 'AI Action', 'Authentication'
    );
END
GO

-- Create UserActivityLog Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UserActivityLog' and xtype='U')
BEGIN
    CREATE TABLE UserActivityLog (
        LogID INT PRIMARY KEY IDENTITY(1,1),
        UserID INT NOT NULL,
        ActivityID INT NOT NULL,
        Details NVARCHAR(1000),
        Timestamp DATETIME NOT NULL DEFAULT GETUTCDATE(),
        FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
        FOREIGN KEY (ActivityID) REFERENCES Activities(ActivityID)
    );
END
GO

-- Create ModelSettings Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ModelSettings' and xtype='U')
BEGIN
    CREATE TABLE ModelSettings (
        ModelID INT PRIMARY KEY IDENTITY(1,1),
        Name NVARCHAR(100) NOT NULL UNIQUE,
        Type NVARCHAR(50) NOT NULL,
        IsDefault BIT NOT NULL DEFAULT 0
    );
END
ELSE
BEGIN
    -- Add Type column if it doesn't exist
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'Type' AND Object_ID = Object_ID(N'ModelSettings'))
    BEGIN
        ALTER TABLE ModelSettings ADD Type NVARCHAR(50) NOT NULL DEFAULT 'online';
    END
    -- Add IsDefault column if it doesn't exist
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'IsDefault' AND Object_ID = Object_ID(N'ModelSettings'))
    BEGIN
        ALTER TABLE ModelSettings ADD IsDefault BIT NOT NULL DEFAULT 0;
    END
END
GO


--------------------------------------------------------------------------------
-- Stored Procedures
--------------------------------------------------------------------------------

-- =============================================
-- Stored Procedure: sp_GetUsers
-- Description: Retrieves all users without their passwords.
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetUsers
AS
BEGIN
    SET NOCOUNT ON;
    SELECT UserID, Email, Role, IsActive, LastActive FROM Users;
END
GO

-- =============================================
-- Stored Procedure: sp_GetUserByEmail
-- Description: Retrieves a single user by their email, including password hash.
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetUserByEmail
    @Email NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT UserID, Email, PasswordHash, Role, IsActive, LastActive
    FROM Users
    WHERE Email = @Email;
END
GO

-- =============================================
-- Stored Procedure: sp_GetUserByID
-- Description: Retrieves a single user by their ID, including password hash.
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetUserByID
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT UserID, Email, PasswordHash, Role, IsActive, LastActive
    FROM Users
    WHERE UserID = @UserID;
END
GO

-- =============================================
-- Stored Procedure: sp_UpdateUserLastActive
-- Description: Updates the LastActive timestamp for a user.
-- =============================================
CREATE OR ALTER PROCEDURE sp_UpdateUserLastActive
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Users
    SET LastActive = GETUTCDATE()
    WHERE UserID = @UserID;
END
GO

-- =============================================
-- Stored Procedure: sp_AddUser
-- Description: Adds a new user to the Users table.
-- =============================================
CREATE OR ALTER PROCEDURE sp_AddUser
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
        VALUES (@Email, @PasswordHash, @Role, @IsActive, GETUTCDATE());
        SELECT SCOPE_IDENTITY() AS UserID;
    END
    ELSE
    BEGIN
        SELECT -1 AS UserID; -- Indicates user already exists
    END
END
GO

-- =============================================
-- Stored Procedure: sp_UpdateUser
-- Description: Updates an existing user's information.
-- Parameters are nullable to allow for partial updates.
-- =============================================
CREATE OR ALTER PROCEDURE sp_UpdateUser
    @UserID INT,
    @Email NVARCHAR(255) = NULL,
    @PasswordHash NVARCHAR(255) = NULL,
    @Role NVARCHAR(50) = NULL,
    @IsActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM Users WHERE UserID = @UserID)
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

-- =============================================
-- Stored Procedure: sp_GetProjectsByUser
-- Description: Retrieves all projects for a given user.
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetProjectsByUser
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ProjectID, UserID, Name, URL
    FROM Projects
    WHERE UserID = @UserID;
END
GO

-- =============================================
-- Stored Procedure: sp_AddProject
-- Description: Adds a new project for a user.
-- =============================================
CREATE OR ALTER PROCEDURE sp_AddProject
    @UserID INT,
    @Name NVARCHAR(255),
    @URL NVARCHAR(2048)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM Projects WHERE UserID = @UserID AND URL = @URL)
    BEGIN
        INSERT INTO Projects (UserID, Name, URL)
        VALUES (@UserID, @Name, @URL);
        
        SELECT 
            ProjectID,
            UserID,
            Name,
            URL
        FROM Projects
        WHERE ProjectID = SCOPE_IDENTITY();
        
        RETURN 0;
    END
    ELSE
    BEGIN
        RETURN 1; -- Indicates project already exists
    END
END
GO

-- =============================================
-- Stored Procedure: sp_DeleteProject
-- Description: Deletes a project for a user.
-- =============================================
CREATE OR ALTER PROCEDURE sp_DeleteProject
    @ProjectID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM Projects
    WHERE ProjectID = @ProjectID AND UserID = @UserID;
END
GO


-- =============================================
-- Stored Procedure: sp_GetUserActivity
-- Description: Retrieves all activity logs for a specific user.
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetUserActivity
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
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

-- =============================================
-- Stored Procedure: sp_LogActivity
-- Description: Logs a user's activity. Creates the activity type if it doesn't exist.
-- =============================================
CREATE OR ALTER PROCEDURE sp_LogActivity
    @UserID INT,
    @ActivityName NVARCHAR(100),
    @Details NVARCHAR(1000)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ActivityID INT;
    DECLARE @ActivityType NVARCHAR(50);

    -- Determine activity type based on name
    IF @ActivityName IN ('Login', 'Logout', 'Password Change')
        SET @ActivityType = 'Authentication';
    ELSE IF @ActivityName LIKE '%Analyze%' OR @ActivityName LIKE '%Explain%' OR @ActivityName LIKE '%Bug%' OR @ActivityName LIKE '%Refactor%' OR @ActivityName LIKE '%Test%' OR @ActivityName LIKE '%Doc%' OR @ActivityName LIKE '%SDD%'
        SET @ActivityType = 'AI Action';
    ELSE
        SET @ActivityType = 'General';

    -- Find or create the activity
    SELECT @ActivityID = ActivityID FROM Activities WHERE Name = @ActivityName;

    IF @ActivityID IS NULL
    BEGIN
        INSERT INTO Activities (Name, Type) VALUES (@ActivityName, @ActivityType);
        SET @ActivityID = SCOPE_IDENTITY();
    END

    -- Insert the log entry
    INSERT INTO UserActivityLog (UserID, ActivityID, Details, Timestamp)
    VALUES (@UserID, @ActivityID, @Details, GETUTCDATE());
END
GO


-- =============================================
-- Stored Procedure: sp_GetModels
-- Description: Retrieves all configured models.
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetModels
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ModelID, Name, Type, IsDefault
    FROM ModelSettings
    ORDER BY Name;
END
GO

-- =============================================
-- Stored Procedure: sp_GetDefaultModel
-- Description: Retrieves the default model.
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetDefaultModel
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 1 ModelID, Name, Type, IsDefault
    FROM ModelSettings
    WHERE IsDefault = 1;
END
GO

-- =============================================
-- Stored Procedure: sp_AddModel
-- Description: Adds a new model configuration.
-- =============================================
CREATE OR ALTER PROCEDURE sp_AddModel
    @Name NVARCHAR(100),
    @Type NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM ModelSettings WHERE Name = @Name)
    BEGIN
        RETURN 1; -- Name must be unique
    END

    -- If this is the first model, make it the default
    DECLARE @IsDefault BIT = 0;
    IF (SELECT COUNT(*) FROM ModelSettings) = 0
    BEGIN
        SET @IsDefault = 1;
    END

    INSERT INTO ModelSettings (Name, Type, IsDefault)
    VALUES (@Name, @Type, @IsDefault);

    SELECT ModelID, Name, Type, IsDefault
    FROM ModelSettings
    WHERE ModelID = SCOPE_IDENTITY();

    RETURN 0;
END
GO


-- =============================================
-- Stored Procedure: sp_UpdateModel
-- Description: Updates an existing model configuration.
-- =============================================
CREATE OR ALTER PROCEDURE sp_UpdateModel
    @ModelID INT,
    @Name NVARCHAR(100),
    @Type NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    -- Check if another model already has the new name
    IF EXISTS (SELECT 1 FROM ModelSettings WHERE Name = @Name AND ModelID != @ModelID)
    BEGIN
        RETURN 1; -- Name must be unique
    END

    UPDATE ModelSettings
    SET Name = @Name,
        Type = @Type
    WHERE ModelID = @ModelID;
    
    IF @@ROWCOUNT = 0
        RETURN 2; -- Model not found
    
    RETURN 0;
END
GO

-- =============================================
-- Stored Procedure: sp_DeleteModel
-- Description: Deletes a model configuration.
-- =============================================
CREATE OR ALTER PROCEDURE sp_DeleteModel
    @ModelID INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Prevent deleting the default model
    IF EXISTS (SELECT 1 FROM ModelSettings WHERE ModelID = @ModelID AND IsDefault = 1)
    BEGIN
        RETURN 1; -- Cannot delete default model
    END

    DELETE FROM ModelSettings WHERE ModelID = @ModelID;
    RETURN 0;
END
GO

-- =============================================
-- Stored Procedure: sp_SetDefaultModel
-- Description: Sets a specific model as the default.
-- =============================================
CREATE OR ALTER PROCEDURE sp_SetDefaultModel
    @ModelID INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- First, unset the current default
    UPDATE ModelSettings
    SET IsDefault = 0
    WHERE IsDefault = 1;

    -- Then, set the new default
    UPDATE ModelSettings
    SET IsDefault = 1
    WHERE ModelID = @ModelID;
END
GO

-- =============================================
-- Stored Procedure: sp_GetUsageStatistics
-- Description: Gathers usage statistics for a specified period.
-- Parameters:
--   @Period: 'daily', 'weekly', 'monthly', 'yearly'
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetUsageStatistics
    @Period NVARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @StartDate DATETIME;

    -- Determine the start date based on the period
    IF @Period = 'daily'
        SET @StartDate = DATEADD(day, -1, GETUTCDATE());
    ELSE IF @Period = 'weekly'
        SET @StartDate = DATEADD(week, -1, GETUTCDATE());
    ELSE IF @Period = 'monthly'
        SET @StartDate = DATEADD(month, -1, GETUTCDATE());
    ELSE IF @Period = 'yearly'
        SET @StartDate = DATEADD(year, -1, GETUTCDATE());
    ELSE
        -- Default to weekly if an invalid period is provided
        SET @StartDate = DATEADD(week, -1, GETUTCDATE());

    -- Main statistics
    SELECT
        (SELECT COUNT(DISTINCT UserID) FROM UserActivityLog WHERE Timestamp >= @StartDate) AS TotalUsers,
        (SELECT COUNT(*) FROM UserActivityLog WHERE ActivityID IN (SELECT ActivityID FROM Activities WHERE Type = 'AI Action') AND Timestamp >= @StartDate) AS TotalActions,
        (
            CAST(
                (SELECT COUNT(*) FROM UserActivityLog WHERE ActivityID IN (SELECT ActivityID FROM Activities WHERE Type = 'AI Action') AND Timestamp >= @StartDate) AS FLOAT
            ) / 
            NULLIF((SELECT COUNT(DISTINCT UserID) FROM UserActivityLog WHERE Timestamp >= @StartDate), 0)
        ) AS AvgActionsPerUser,
        (
            SELECT TOP 1 Name 
            FROM Activities 
            WHERE ActivityID = (
                SELECT TOP 1 ActivityID 
                FROM UserActivityLog 
                WHERE Timestamp >= @StartDate AND ActivityID IN (SELECT ActivityID FROM Activities WHERE Type = 'AI Action')
                GROUP BY ActivityID 
                ORDER BY COUNT(*) DESC
            )
        ) AS MostUsedFeature;

    -- Feature breakdown
    SELECT 
        a.Name,
        COUNT(ual.ActivityID) AS Actions
    FROM UserActivityLog ual
    JOIN Activities a ON ual.ActivityID = a.ActivityID
    WHERE a.Type = 'AI Action' AND ual.Timestamp >= @StartDate
    GROUP BY a.Name
    ORDER BY Actions DESC;

    -- Trend data
    IF @Period = 'daily'
        -- Last 7 days, grouped by day
        SELECT 
            CONVERT(NVARCHAR(10), ual.Timestamp, 23) AS Name, -- YYYY-MM-DD
            COUNT(*) as Actions
        FROM UserActivityLog ual
        WHERE ual.Timestamp >= DATEADD(day, -7, GETUTCDATE()) AND ual.ActivityID IN (SELECT ActivityID FROM Activities WHERE Type = 'AI Action')
        GROUP BY CONVERT(NVARCHAR(10), ual.Timestamp, 23)
        ORDER BY Name;
    ELSE IF @Period = 'weekly'
        -- Last 8 weeks, grouped by the start of the week
        SELECT 
            CONVERT(NVARCHAR(10), DATEADD(wk, DATEDIFF(wk, 0, ual.Timestamp), 0), 23) AS Name, -- Start of week date (YYYY-MM-DD)
            COUNT(*) as Actions
        FROM UserActivityLog ual
        WHERE ual.Timestamp >= DATEADD(week, -8, GETUTCDATE()) AND ual.ActivityID IN (SELECT ActivityID FROM Activities WHERE Type = 'AI Action')
        GROUP BY DATEADD(wk, DATEDIFF(wk, 0, ual.Timestamp), 0)
        ORDER BY Name;
    ELSE IF @Period = 'monthly'
        -- Last 12 months, grouped by month
        SELECT
            FORMAT(ual.Timestamp, 'yyyy-MM') AS Name,
            COUNT(*) AS Actions
        FROM UserActivityLog ual
        WHERE ual.Timestamp >= DATEADD(month, -12, GETUTCDATE()) AND ual.ActivityID IN (SELECT ActivityID FROM Activities WHERE Type = 'AI Action')
        GROUP BY FORMAT(ual.Timestamp, 'yyyy-MM')
        ORDER BY Name;
    ELSE IF @Period = 'yearly'
        -- Last 5 years, grouped by year
        SELECT
            CAST(YEAR(ual.Timestamp) AS NVARCHAR(4)) AS Name,
            COUNT(*) AS Actions
        FROM UserActivityLog ual
        WHERE ual.Timestamp >= DATEADD(year, -5, GETUTCDATE()) AND ual.ActivityID IN (SELECT ActivityID FROM Activities WHERE Type = 'AI Action')
        GROUP BY YEAR(ual.Timestamp)
        ORDER BY Name;

END
GO
